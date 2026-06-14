#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""网络书库搜索：任务化异步执行，前端轮询进度。

搜索需要并发访问多个外部书源，各源响应速度差异很大。旧实现在同步 handler
里用 `with ThreadPoolExecutor`，块退出时的 `shutdown(wait=True)` 会等所有任务
跑完，抵消了 `wait(timeout=...)` 的超时保护，整体被拖到 nginx 504。

这里改为：创建搜索任务后立即返回 task_id（不阻塞 Tornado 事件循环），由后台
共享线程池并发执行各源，每完成一个源就写回任务状态；前端轮询 status 逐步获取
已完成结果，快源先出、慢源不拖累。
"""

import concurrent.futures
import logging
import threading
import time
import uuid

from webserver.services.booksource import BookSource, BookSourceEngine, JsRuleUnsupported


# 任务保留时长（秒），超过后清理，避免内存堆积
TASK_TTL = 300


class SearchTaskService:
    """单例：管理网络书库搜索任务（task_id -> 进度），后台线程池并发执行。"""

    _instance = None
    _instance_lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._instance_lock:
                if cls._instance is None:
                    instance = super().__new__(cls)
                    instance._init()
                    cls._instance = instance
        return cls._instance

    def _init(self):
        self._tasks = {}
        self._lock = threading.Lock()
        self._executor = None
        self._max_workers = 10

    def configure(self, max_workers):
        self._max_workers = max(1, int(max_workers))

    def _ensure_executor(self):
        # 线程池惰性初始化，按配置的并发数复用
        if self._executor is None:
            self._executor = concurrent.futures.ThreadPoolExecutor(
                max_workers=self._max_workers, thread_name_prefix="booksearch"
            )
        return self._executor

    def create_task(self, key, page, source_data, cfg):
        """创建搜索任务并把各源提交到后台线程池，立即返回 task_id。

        source_data: [(source_id, source_name, raw), ...]
        """
        self._cleanup()
        task_id = uuid.uuid4().hex
        sources = {}
        for sid, name, _raw in source_data:
            sources[sid] = {
                "source_id": sid,
                "source_name": name,
                "state": "pending",
                "books": [],
                "error": "",
            }
        task = {
            "task_id": task_id,
            "key": key,
            "page": page,
            "created_at": time.time(),
            "total": len(source_data),
            "done": 0,
            "sources": sources,
        }
        with self._lock:
            self._tasks[task_id] = task

        executor = self._ensure_executor()
        for item in source_data:
            executor.submit(self._run_one, task_id, item, key, page, cfg)
        return {"task_id": task_id, "total": task["total"]}

    def _run_one(self, task_id, item, key, page, cfg):
        sid, name, raw = item
        state, books, error = "done", [], ""
        try:
            engine = BookSourceEngine(BookSource(raw), config=cfg)
            result = engine.search(key, page)
            books = [b.to_dict() for b in result]
        except JsRuleUnsupported:
            state, error = "failed", "js_unsupported"
        except Exception as e:
            logging.info("network search [%s] failed: %s", name, e)
            state, error = "failed", "fetch_failed"

        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return
            src = task["sources"].get(sid)
            if not src or src["state"] != "pending":
                return
            src["state"] = state
            src["books"] = books
            src["error"] = error
            task["done"] += 1

    def get_status(self, task_id):
        """返回任务进度快照；任务不存在（或已过期）返回 None。"""
        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return None
            results, partial, pending = [], [], []
            for src in task["sources"].values():
                if src["state"] == "done":
                    if src["books"]:
                        results.append(
                            {
                                "source_id": src["source_id"],
                                "source_name": src["source_name"],
                                "books": src["books"],
                            }
                        )
                elif src["state"] == "failed":
                    partial.append(
                        {
                            "source_id": src["source_id"],
                            "source_name": src["source_name"],
                            "error": src["error"],
                        }
                    )
                else:
                    pending.append(
                        {
                            "source_id": src["source_id"],
                            "source_name": src["source_name"],
                        }
                    )
            return {
                "task_id": task_id,
                "total": task["total"],
                "done": task["done"],
                "finished": task["done"] >= task["total"],
                "results": results,
                "partial": partial,
                "pending": pending,
            }

    def pop_weight_updates(self, task_id):
        """任务完成后，返回本次搜索「有结果」的源 id 列表用于权重 +1。

        只在任务首次完成时返回一次（之后标记 weighted，避免轮询重复加权）。
        权重的实际写库由调用方（handler，持有 DB session）完成。
        """
        with self._lock:
            task = self._tasks.get(task_id)
            if not task or task["done"] < task["total"] or task.get("weighted"):
                return []
            task["weighted"] = True
            return [sid for sid, src in task["sources"].items() if src["state"] == "done" and src["books"]]

    def _cleanup(self):
        now = time.time()
        with self._lock:
            expired = [tid for tid, t in self._tasks.items() if now - t["created_at"] > TASK_TTL]
            for tid in expired:
                self._tasks.pop(tid, None)
