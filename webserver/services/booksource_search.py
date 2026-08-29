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

    def create_task(self, key, page, source_data, cfg=None):
        """创建搜索任务并把各源提交到后台线程池，立即返回 task_id。

        ``source_data`` 兼容旧的 ``(id, name, raw)``，新路径传入已经在请求线程
        准备好的 ``{source_id, source_name, call}``，call 内不得访问 session。
        """
        self._cleanup()
        task_id = uuid.uuid4().hex
        sources = {}
        runtime_batches = {}
        for item in source_data:
            sid, name = self._identity(item)
            runtime_batch = item.get("runtime_batch") if isinstance(item, dict) else None
            runtime_batch_id = runtime_batch.get("run_id") if runtime_batch else None
            if runtime_batch_id is not None:
                runtime_batches[runtime_batch_id] = runtime_batch
            sources[sid] = {
                "source_id": sid,
                "source_name": name,
                "connection_id": item.get("connection_id") if isinstance(item, dict) else None,
                "legacy_id": item.get("legacy_id") if isinstance(item, dict) else sid,
                "state": "pending",
                "books": [],
                "error": "",
                "runtime_batch_id": runtime_batch_id,
                "_outcome": None,
            }
        task = {
            "task_id": task_id,
            "key": key,
            "page": page,
            "created_at": time.time(),
            "total": len(source_data),
            "done": 0,
            "sources": sources,
            "runtime_batches": runtime_batches,
            "settled_runtime_batches": set(),
            "settling_runtime_batches": set(),
        }
        with self._lock:
            self._tasks[task_id] = task

        executor = self._ensure_executor()
        for item in source_data:
            executor.submit(self._run_one, task_id, item, key, page, cfg)
        return {"task_id": task_id, "total": task["total"]}

    def _run_one(self, task_id, item, key, page, cfg):
        sid, name = self._identity(item)
        state, books, error = "done", [], ""
        outcome = None
        try:
            if isinstance(item, dict):
                result = item["call"](key, page)
                books = [book.to_dict() for book in result.items]
            else:
                _sid, _name, raw = item
                engine = BookSourceEngine(BookSource(raw), config=cfg)
                result = engine.search(key, page)
                books = [book.to_dict() for book in result]
            outcome = result
        except JsRuleUnsupported as exc:
            state, error = "failed", "js_unsupported"
            outcome = exc
        except Exception as e:
            # Provider message 可能包含凭据；只记 runtime 已结构化的 code。
            state, error = "failed", getattr(e, "code", "fetch_failed")
            logging.info("network search [%s] failed: %s", name, error)
            outcome = e

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
            src["_outcome"] = outcome
            task["done"] += 1
        # 不依赖客户端继续轮询：一个 connection 的所有
        # binding 结束后，立即用预绑定的独立 session 收口 run。
        self._drain_runtime_batches(task_id)

    @staticmethod
    def _identity(item):
        if isinstance(item, dict):
            return item["source_id"], item["source_name"]
        return item[0], item[1]

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
            work_finished = task["done"] >= task["total"]
            audit_finished = set(task.get("runtime_batches", {})) <= set(task.get("settled_runtime_batches", set()))
            return {
                "task_id": task_id,
                "total": task["total"],
                "done": task["done"],
                # 对前端而言，搜索与 durable run 审计都收口后才算
                # finished；避免最后一个 worker 与 status 请求之间的竞态。
                "finished": work_finished and audit_finished,
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
            return [
                src["legacy_id"]
                for src in task["sources"].values()
                if src["state"] == "done" and src["books"] and src.get("legacy_id") is not None
            ]

    def pop_health_updates(self, task_id):
        """返回一次性的连接健康更新，由请求线程负责写库。"""
        with self._lock:
            task = self._tasks.get(task_id)
            if not task or task.get("health_updated"):
                return []
            task["health_updated"] = True
            grouped = {}
            for source in task["sources"].values():
                if source.get("runtime_batch_id") is not None:
                    # typed batch 的 health 由 finish_read_batch 统一结算。
                    continue
                connection_id = source.get("connection_id")
                if connection_id is None or source["state"] == "pending":
                    continue
                current = grouped.setdefault(connection_id, {"healthy": True, "messages": []})
                if source["state"] != "done":
                    current["healthy"] = False
                    if source.get("error"):
                        current["messages"].append(str(source["error"]))
            return [
                {
                    "connection_id": connection_id,
                    "healthy": value["healthy"],
                    "message": "; ".join(value["messages"]),
                }
                for connection_id, value in grouped.items()
            ]

    def pop_runtime_updates(self, task_id):
        """后台 finalizer 失败时，返回可由 request session 重试的 batch。"""
        return self._claim_runtime_updates(task_id)

    def _claim_runtime_updates(self, task_id):
        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return []
            updates = []
            settled = task.setdefault("settled_runtime_batches", set())
            settling = task.setdefault("settling_runtime_batches", set())
            for run_id, batch in task.get("runtime_batches", {}).items():
                if run_id in settled or run_id in settling:
                    continue
                sources = [source for source in task["sources"].values() if source.get("runtime_batch_id") == run_id]
                if not sources or any(source["state"] == "pending" for source in sources):
                    continue
                settling.add(run_id)
                updates.append(
                    {
                        "run_id": run_id,
                        "batch": batch,
                        "outcomes": {source["source_id"]: source["_outcome"] for source in sources},
                    }
                )
            return updates

    def settle_runtime_update(self, task_id, run_id, succeeded):
        """只在 durable run 已成功持久化后标记 settled。"""
        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return
            task.setdefault("settling_runtime_batches", set()).discard(run_id)
            if succeeded:
                task.setdefault("settled_runtime_batches", set()).add(run_id)

    def _drain_runtime_batches(self, task_id):
        for update in self._claim_runtime_updates(task_id):
            finalizer = update["batch"].get("finalize")
            if not callable(finalizer):
                self.settle_runtime_update(task_id, update["run_id"], False)
                continue
            try:
                finalizer(update["batch"], update["outcomes"])
            except Exception as exc:
                logging.warning(
                    "network search runtime batch finalization failed: %s",
                    getattr(exc, "code", "plugin.finalize_failed"),
                )
                self.settle_runtime_update(task_id, update["run_id"], False)
            else:
                self.settle_runtime_update(task_id, update["run_id"], True)

    def _cleanup(self):
        now = time.time()
        with self._lock:
            expired = [tid for tid, t in self._tasks.items() if now - t["created_at"] > TASK_TTL]
        for task_id in expired:
            self._drain_runtime_batches(task_id)
        with self._lock:
            for tid in expired:
                task = self._tasks.get(tid)
                if task is None:
                    continue
                pending_audit = set(task.get("runtime_batches", {})) - set(task.get("settled_runtime_batches", set()))
                if pending_audit:
                    # 持久化暂时失败时保留收口材料，下一次 cleanup
                    # 再试，不把 durable run 永久留在 running。
                    task["created_at"] = now
                    continue
                self._tasks.pop(tid, None)
