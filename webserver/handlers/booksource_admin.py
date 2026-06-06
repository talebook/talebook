#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""书源管理 Handler（管理员）。"""

import datetime
import json
import logging
import os
import socket
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse, urlunparse

import requests
import tornado

from webserver import loader
from webserver.handlers.base import BaseHandler, is_admin, js
from webserver.i18n import _
from webserver.models import BookSourceModel
from webserver.services.async_service import AsyncService
from webserver.services.booksource import BookSource, BookSourceEngine, JsRuleUnsupported
from webserver.services.booksource.http_client import build_session


CONF = loader.get_settings()

SEED_FILE = os.path.join(os.path.dirname(__file__), "..", "services", "booksource", "seeds", "booksources.seed.json")

_JS_MARKERS = ("@js:", "<js>")


def _has_js(value):
    if not isinstance(value, str):
        return False
    low = value.lower()
    return any(m in low for m in _JS_MARKERS)


def _requires_js(raw):
    """判断书源的关键规则是否只能靠 JS 完成（无法用本引擎解析）。"""
    rule_search = raw.get("ruleSearch") or {}
    rule_content = raw.get("ruleContent") or {}
    search_url = raw.get("searchUrl", "")
    search_js_blocked = _has_unsupported_js(search_url) or (
        _has_js(search_url) and not str(search_url).strip().startswith("@js:")
    )
    return (
        search_js_blocked or _has_js(rule_search.get("bookList", "")) or _has_unsupported_js(rule_content.get("content", ""))
    )


def _has_unsupported_js(value):
    if not isinstance(value, str):
        return False
    low = value.lower()
    return "<js>" in low or "{{js." in low or "{{java" in low or "java.ajax" in low or "java.post" in low


def _iter_rule_values(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for v in value.values():
            yield from _iter_rule_values(v)
    elif isinstance(value, list):
        for v in value:
            yield from _iter_rule_values(v)


def _source_rule_values(raw):
    keys = ("searchUrl", "exploreUrl", "header", "loginUrl", "ruleSearch", "ruleBookInfo", "ruleToc", "ruleContent")
    for key in keys:
        yield from _iter_rule_values(raw.get(key))


def _source_tags(raw):
    tags = []
    if not isinstance(raw, dict):
        return tags
    if raw.get("bookSourceType") is not None:
        tags.append("text" if str(raw.get("bookSourceType") or "0") == "0" else "non-text")
    url = (raw.get("bookSourceUrl") or "").strip()
    if url.lower().startswith("https://"):
        tags.append("https")
    elif url:
        tags.append("http")

    rule_search = raw.get("ruleSearch") or {}
    rule_book = raw.get("ruleBookInfo") or {}
    rule_toc = raw.get("ruleToc") or {}
    rule_content = raw.get("ruleContent") or {}
    if raw.get("searchUrl") and rule_search.get("bookList"):
        tags.append("search")
    if rule_book:
        tags.append("info")
    if rule_toc.get("chapterList"):
        tags.append("toc")
    if rule_content.get("content"):
        tags.append("content")
    if raw.get("exploreUrl"):
        tags.append("explore")

    values = list(_source_rule_values(raw))
    if any(v.strip().startswith(("$", "@json:")) for v in values):
        tags.append("json")
    if any("@css:" in v or "class." in v or "tag." in v or "id." in v for v in values):
        tags.append("html")
    if _requires_js(raw):
        tags.append("js-blocked")
    elif any(_has_js(v) for v in values):
        tags.append("js-runtime")
    return tags


def _missing_required_features(raw):
    rule_search = raw.get("ruleSearch") or {}
    rule_book = raw.get("ruleBookInfo") or {}
    rule_toc = raw.get("ruleToc") or {}
    rule_content = raw.get("ruleContent") or {}
    checks = [
        ("searchUrl", raw.get("searchUrl")),
        ("ruleSearch.bookList", rule_search.get("bookList")),
        ("ruleSearch.bookUrl", rule_search.get("bookUrl")),
        ("ruleBookInfo.name", rule_book.get("name")),
        ("ruleToc.chapterList", rule_toc.get("chapterList")),
        ("ruleToc.chapterUrl", rule_toc.get("chapterUrl")),
        ("ruleContent.content", rule_content.get("content")),
    ]
    return [name for name, value in checks if not value]


def _normalized_probe_url(source_url):
    url = (source_url or "").strip()
    if url and "://" not in url:
        url = "http://" + url
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return "", None
    return urlunparse((parsed.scheme, parsed.netloc, "/", "", "", "")), parsed


def _probe_source_network(raw, timeout):
    source_url = (raw.get("bookSourceUrl") or "").strip()
    probe_url, parsed = _normalized_probe_url(source_url)
    tags = []
    if not parsed:
        return {"ok": False, "status": "invalid", "message": _("书源 URL 无效"), "tags": tags}

    host = parsed.hostname
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    try:
        socket.getaddrinfo(host, port)
        tags.append("dns-ok")
    except OSError as err:
        tags.append("dns-failed")
        return {
            "ok": False,
            "status": "dns_failed",
            "message": _("DNS 解析失败：{}").format(str(err)),
            "tags": tags,
        }

    try:
        session = build_session(BookSource(raw))
        resp = session.get(probe_url, timeout=timeout, allow_redirects=True, stream=True)
        resp.close()
        tags.append("connect-ok")
        tags.append("http-%s" % resp.status_code)
        return {
            "ok": resp.status_code < 500,
            "status": "ok" if resp.status_code < 500 else "connect_failed",
            "message": _("HTTP 状态 {}").format(resp.status_code),
            "tags": tags,
        }
    except requests.exceptions.SSLError as err:
        tags.append("ssl-failed")
        return {
            "ok": False,
            "status": "ssl_failed",
            "message": _("SSL 校验失败：{}").format(str(err)),
            "tags": tags,
        }
    except Exception as err:
        tags.append("connect-failed")
        return {
            "ok": False,
            "status": "connect_failed",
            "message": _("连通性测试失败：{}").format(str(err)),
            "tags": tags,
        }


def validate_source_raw(raw):
    if not isinstance(raw, dict):
        return {"ok": False, "status": "invalid", "message": _("书源格式无效"), "tags": []}
    tags = _source_tags(raw)
    if not (raw.get("bookSourceName") or "").strip() or not (raw.get("bookSourceUrl") or "").strip():
        return {"ok": False, "status": "invalid", "message": _("缺少 bookSourceName 或 bookSourceUrl"), "tags": tags}

    timeout = min(8, CONF.get("BOOKSOURCE_HTTP_TIMEOUT", 20))
    network = _probe_source_network(raw, timeout)
    tags = sorted(set(tags + network.get("tags", [])))

    missing = _missing_required_features(raw)
    if _requires_js(raw):
        return {
            "ok": False,
            "status": "js_unsupported",
            "message": _("关键规则依赖 JS，暂不支持"),
            "tags": tags,
        }
    if missing:
        return {
            "ok": False,
            "status": "incomplete",
            "message": _("缺少关键规则：{}").format(", ".join(missing[:4])),
            "tags": tags,
        }
    if not network.get("ok"):
        return {
            "ok": False,
            "status": network.get("status") or "connect_failed",
            "message": network.get("message") or _("连通性测试失败"),
            "tags": tags,
        }
    return {"ok": True, "status": "ok", "message": network.get("message") or _("检测通过"), "tags": tags}


def _normalize_source_ids(source_ids):
    ids = []
    seen = set()
    for source_id in source_ids or []:
        try:
            source_id = int(source_id)
        except (TypeError, ValueError):
            continue
        if source_id and source_id not in seen:
            ids.append(source_id)
            seen.add(source_id)
    return ids


def _validate_source_item(item):
    source_id, name, url, raw = item
    raw = dict(raw or {})
    raw["bookSourceName"] = raw.get("bookSourceName") or name
    raw["bookSourceUrl"] = raw.get("bookSourceUrl") or url
    try:
        check = validate_source_raw(raw)
    except Exception as err:
        check = {
            "ok": False,
            "status": "check_failed",
            "message": _("检测异常：{}").format(str(err)),
            "tags": ["check-failed"],
        }
    check["tags"] = sorted(set(_source_tags(raw) + (check.get("tags") or [])))
    return source_id, check


def _validate_sources_concurrently(items, progress=None):
    if not items:
        return {}
    max_workers = min(len(items), CONF.get("BOOKSOURCE_IMPORT_CHECK_WORKERS", 20))
    results = {}
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(_validate_source_item, item): item[0] for item in items}
        for future in as_completed(futures):
            source_id = futures[future]
            try:
                source_id, check = future.result()
            except Exception as err:
                check = {
                    "ok": False,
                    "status": "check_failed",
                    "message": _("检测异常：{}").format(str(err)),
                    "tags": ["check-failed"],
                }
            results[source_id] = check
            if progress:
                progress()
    return results


def _apply_check_result(source, check):
    raw = dict(source.raw or {})
    raw["_talebook_check"] = {
        "status": check.get("status") or "unknown",
        "message": check.get("message") or "",
        "tags": check.get("tags") or [],
    }
    source.raw = raw
    source.last_check_time = datetime.datetime.now()
    source.last_check_ok = bool(check.get("ok"))


def _apply_pending_check(source):
    _apply_check_result(
        source,
        {
            "ok": False,
            "status": "pending",
            "message": _("等待后台检测"),
            "tags": ["check-pending"],
        },
    )


class BookSourceCheckService(AsyncService):
    def __init__(self):
        super(BookSourceCheckService, self).__init__()
        self._state_lock = threading.Lock()
        self._running = False
        self._pending_ids = set()
        self._total = 0
        self._done = 0
        self._last_start = None
        self._last_end = None
        self._last_error = ""

    def _snapshot_unlocked(self):
        return {
            "running": self._running,
            "total": self._total,
            "done": self._done,
            "pending": len(self._pending_ids),
            "last_start": self._last_start.strftime("%Y-%m-%d %H:%M:%S") if self._last_start else None,
            "last_end": self._last_end.strftime("%Y-%m-%d %H:%M:%S") if self._last_end else None,
            "last_error": self._last_error,
        }

    def status(self):
        with self._state_lock:
            return self._snapshot_unlocked()

    def enqueue(self, source_ids):
        source_ids = _normalize_source_ids(source_ids)
        if not source_ids:
            return False, self.status()

        with self._state_lock:
            if self._running:
                self._pending_ids.update(source_ids)
                return False, self._snapshot_unlocked()
            self._running = True
            self._pending_ids.clear()
            self._total = len(source_ids)
            self._done = 0
            self._last_start = datetime.datetime.now()
            self._last_end = None
            self._last_error = ""
            status = self._snapshot_unlocked()

        self.check_sources(source_ids)
        return True, status

    def _mark_done(self):
        with self._state_lock:
            self._done += 1

    def _run_check_batch(self, source_ids):
        source_ids = _normalize_source_ids(source_ids)
        if not source_ids:
            return

        sources = self.session.query(BookSourceModel).filter(BookSourceModel.id.in_(source_ids)).all()
        source_data = [(s.id, s.name, s.url, s.raw) for s in sources]
        with self._state_lock:
            self._total = len(source_data)
            self._done = 0

        checks = _validate_sources_concurrently(source_data, progress=self._mark_done)
        for source in sources:
            check = checks.get(source.id)
            if not check:
                continue
            _apply_check_result(source, check)
            source.enabled = bool(check.get("ok"))
            source.update_time = datetime.datetime.now()
            self.session.add(source)
        self.session.commit()

    @AsyncService.register_service
    def check_sources(self, source_ids):
        next_ids = None
        try:
            self._run_check_batch(source_ids)
        except Exception as err:
            logging.exception("book source check failed: %s", err)
            with self._state_lock:
                self._last_error = str(err)
        finally:
            with self._state_lock:
                if self._pending_ids:
                    next_ids = sorted(self._pending_ids)
                    self._pending_ids.clear()
                    self._total = len(next_ids)
                    self._done = 0
                    self._last_start = datetime.datetime.now()
                    self._last_end = None
                    self._last_error = ""
                else:
                    self._running = False
                    self._last_end = datetime.datetime.now()

        if next_ids:
            self.check_sources(next_ids)


def schedule_source_checks(source_ids):
    source_ids = _normalize_source_ids(source_ids)
    if source_ids:
        return BookSourceCheckService().enqueue(source_ids)
    return False, BookSourceCheckService().status()


def import_sources(session, data, overwrite=False):
    """批量导入 Legado 书源数组，返回统计结果。"""
    # 旧接口保留 overwrite 参数做兼容，但同 URL 书源始终跳过，避免导入订阅覆盖本地已维护的书源。
    overwrite = False
    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        return {"err": "params.error", "msg": _("书源格式应为 JSON 数组或对象")}

    candidates = []
    failed = []
    for idx, raw in enumerate(data):
        if not isinstance(raw, dict):
            failed.append({"name": str(raw)[:40], "reason": "invalid"})
            continue
        name = (raw.get("bookSourceName") or "").strip()
        url = (raw.get("bookSourceUrl") or "").strip()
        if not name or not url:
            failed.append({"name": name or url or "unknown", "reason": "missing_fields"})
            continue
        candidates.append((idx, raw))

    added = updated = skipped = disabled = 0
    urls = []
    seen_urls = set()
    for _, raw in candidates:
        url = (raw.get("bookSourceUrl") or "").strip()
        if url not in seen_urls:
            urls.append(url)
            seen_urls.add(url)

    existing_by_url = {}
    if urls:
        sources = session.query(BookSourceModel).filter(BookSourceModel.url.in_(urls)).all()
        existing_by_url = {s.url: s for s in sources}

    touched = []
    for _, raw in candidates:
        url = (raw.get("bookSourceUrl") or "").strip()
        existing = existing_by_url.get(url)
        if existing:
            if not overwrite:
                skipped += 1
                continue
            existing.apply_raw(raw)
            _apply_pending_check(existing)
            existing.enabled = bool(raw.get("enabled", True))
            session.add(existing)
            updated += 1
            touched.append(existing)
        else:
            source = BookSourceModel(raw)
            _apply_pending_check(source)
            source.enabled = bool(raw.get("enabled", True))
            session.add(source)
            existing_by_url[url] = source
            added += 1
            touched.append(source)

    check_ids = []
    if touched:
        session.flush()
        seen_ids = set()
        for source in touched:
            if source.id and source.id not in seen_ids:
                check_ids.append(source.id)
                seen_ids.add(source.id)
        session.commit()
    schedule_source_checks(check_ids)
    return {
        "err": "ok",
        "added": added,
        "updated": updated,
        "skipped": skipped,
        "disabled": disabled,
        "failed": failed,
        "checking": len(check_ids),
        "check_task": "queued" if check_ids else "",
    }


def _engine_config():
    return {
        "BOOKSOURCE_HTTP_TIMEOUT": CONF.get("BOOKSOURCE_HTTP_TIMEOUT", 20),
        "BOOKSOURCE_MAX_TOC_PAGES": CONF.get("BOOKSOURCE_MAX_TOC_PAGES", 30),
        "BOOKSOURCE_MAX_CONTENT_PAGES": CONF.get("BOOKSOURCE_MAX_CONTENT_PAGES", 20),
        "BOOKSOURCE_AD_PATTERNS": CONF.get("BOOKSOURCE_AD_PATTERNS", []),
        "BOOKSOURCE_CLEAN_ENABLED": CONF.get("BOOKSOURCE_CLEAN_ENABLED", True),
    }


class BookSourceList(BaseHandler):
    """书源列表。"""

    @js
    @is_admin
    def get(self):
        query = self.session.query(BookSourceModel)
        enabled = self.get_argument("enabled", "")
        group = self.get_argument("group", "")
        keyword = self.get_argument("q", "")
        if enabled in ("1", "true", "0", "false"):
            query = query.filter(BookSourceModel.enabled.is_(enabled in ("1", "true")))
        if group:
            query = query.filter(BookSourceModel.group == group)
        if keyword:
            like = "%%%s%%" % keyword
            query = query.filter(BookSourceModel.name.like(like))
        total = query.count()
        try:
            page = max(1, int(self.get_argument("page", 1)))
            size = min(200, max(1, int(self.get_argument("size", 50))))
        except (ValueError, TypeError):
            page, size = 1, 50
        sources = (
            query.order_by(BookSourceModel.weight.desc(), BookSourceModel.id.asc()).offset((page - 1) * size).limit(size).all()
        )
        items = [s.to_summary_dict() for s in sources]
        groups = sorted({g for (g,) in self.session.query(BookSourceModel.group).distinct() if g})
        return {
            "err": "ok",
            "items": items,
            "count": total,
            "page": page,
            "size": size,
            "groups": groups,
            "check_task": BookSourceCheckService().status(),
        }


class BookSourceCRUD(BaseHandler):
    """书源单条增删改。"""

    @js
    @is_admin
    def post(self):
        req = tornado.escape.json_decode(self.request.body)
        raw = req.get("raw")
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except ValueError:
                return {"err": "params.error", "msg": _("书源 JSON 解析失败")}
        if not isinstance(raw, dict):
            return {"err": "params.error", "msg": _("缺少书源数据")}
        if not raw.get("bookSourceUrl") or not raw.get("bookSourceName"):
            return {"err": "params.error", "msg": _("书源缺少 bookSourceUrl 或 bookSourceName")}

        url = raw["bookSourceUrl"].strip()
        existing = self.session.query(BookSourceModel).filter(BookSourceModel.url == url).first()
        if existing:
            return {"err": "params.exist", "msg": _("同 URL 的书源已存在")}
        source = BookSourceModel(raw)
        source.save()
        return {"err": "ok", "id": source.id}

    @js
    @is_admin
    def put(self):
        req = tornado.escape.json_decode(self.request.body)
        source_id = req.get("id")
        source = self.session.query(BookSourceModel).filter(BookSourceModel.id == source_id).first()
        if not source:
            return {"err": "params.not_found", "msg": _("未找到该书源")}
        if "enabled" in req:
            source.enabled = bool(req["enabled"])
        if "weight" in req:
            try:
                source.weight = int(req["weight"])
            except (ValueError, TypeError):
                pass
        if "group" in req:
            source.group = str(req["group"]).strip()
        if "raw" in req and isinstance(req["raw"], dict):
            source.apply_raw(req["raw"])
        source.update_time = datetime.datetime.now()
        source.save()
        return {"err": "ok"}

    @js
    @is_admin
    def delete(self):
        # DELETE 优先从查询参数取 id/ids（Tornado 测试客户端不允许 DELETE 带 body），
        # 同时兼容请求体中的 JSON。
        ids = self.get_arguments("ids")
        single = self.get_argument("id", None)
        if single:
            ids.append(single)
        if not ids and self.request.body:
            try:
                req = tornado.escape.json_decode(self.request.body)
                ids = req.get("ids") or ([req["id"]] if req.get("id") else [])
            except Exception:
                ids = []
        ids = [int(i) for i in ids if str(i).strip()]
        if not ids:
            return {"err": "params.error", "msg": _("需要提供 id 或 ids")}
        deleted = self.session.query(BookSourceModel).filter(BookSourceModel.id.in_(ids)).delete(synchronize_session=False)
        self.session.commit()
        return {"err": "ok", "deleted": deleted}


class BookSourceImport(BaseHandler):
    """从粘贴的 JSON 或 URL 批量导入书源（Legado 数组格式）。"""

    @js
    @is_admin
    def post(self):
        req = tornado.escape.json_decode(self.request.body)
        raw_text = req.get("json")
        url = req.get("url")

        if url:
            try:
                resp = requests.get(url, timeout=CONF.get("BOOKSOURCE_HTTP_TIMEOUT", 20))
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                logging.error("import book source from url failed: %s", e)
                return {"err": "import.fetch_failed", "msg": _("拉取书源 URL 失败：{}").format(str(e))}
        elif raw_text:
            try:
                data = json.loads(raw_text) if isinstance(raw_text, str) else raw_text
            except ValueError as e:
                return {"err": "params.json", "msg": _("书源 JSON 解析失败：{}").format(str(e))}
        else:
            return {"err": "params.error", "msg": _("请提供 json 或 url")}

        return import_sources(self.session, data, overwrite=False)


class BookSourceSeed(BaseHandler):
    """导入仓库内置的种子书源。"""

    @js
    @is_admin
    def post(self):
        try:
            with open(os.path.realpath(SEED_FILE), "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            logging.error("load seed book sources failed: %s", e)
            return {"err": "seed.load_failed", "msg": _("加载内置书源失败：{}").format(str(e))}
        return import_sources(self.session, data, overwrite=False)


class BookSourceToggle(BaseHandler):
    """启用/禁用书源（支持单个 id 或批量 ids）。"""

    @js
    @is_admin
    def post(self):
        req = tornado.escape.json_decode(self.request.body)
        ids = req.get("ids")
        if not ids and req.get("id") is not None:
            ids = [req["id"]]
        ids = [int(i) for i in (ids or []) if str(i).strip()]
        if not ids:
            return {"err": "params.error", "msg": _("需要提供 id 或 ids")}

        if "enabled" in req:
            enabled = bool(req["enabled"])
            updated = (
                self.session.query(BookSourceModel)
                .filter(BookSourceModel.id.in_(ids))
                .update(
                    {BookSourceModel.enabled: enabled, BookSourceModel.update_time: datetime.datetime.now()},
                    synchronize_session=False,
                )
            )
            self.session.commit()
            return {"err": "ok", "updated": updated, "enabled": enabled}

        # 未指定 enabled：仅单个时按当前状态取反（兼容旧的单行开关）
        if len(ids) != 1:
            return {"err": "params.error", "msg": _("批量操作需指定 enabled")}
        source = self.session.query(BookSourceModel).filter(BookSourceModel.id == ids[0]).first()
        if not source:
            return {"err": "params.not_found", "msg": _("未找到该书源")}
        source.enabled = not source.enabled
        source.update_time = datetime.datetime.now()
        source.save()
        return {"err": "ok", "enabled": bool(source.enabled)}


class BookSourceCheckAll(BaseHandler):
    """触发全量书源有效性检测。"""

    @js
    @is_admin
    def post(self):
        source_ids = [i for (i,) in self.session.query(BookSourceModel.id).order_by(BookSourceModel.id.asc()).all()]
        started, status = BookSourceCheckService().enqueue(source_ids)
        return {"err": "ok", "checked": len(source_ids), "checking": len(source_ids), "started": started, **status}


class BookSourceCheckStatus(BaseHandler):
    """查询书源检测任务状态。"""

    @js
    @is_admin
    def get(self):
        return {"err": "ok", **BookSourceCheckService().status()}


class BookSourceCleanInvalid(BookSourceCheckAll):
    """兼容旧接口：只触发检测，不再删除书源。"""


class BookSourceTest(BaseHandler):
    """用关键词测试书源是否可用。"""

    @js
    @is_admin
    def post(self):
        req = tornado.escape.json_decode(self.request.body)
        source = self.session.query(BookSourceModel).filter(BookSourceModel.id == req.get("id")).first()
        if not source:
            return {"err": "params.not_found", "msg": _("未找到该书源")}
        key = (req.get("key") or "剑来").strip()

        engine = BookSourceEngine(BookSource(source.raw), config=_engine_config())
        result = {"err": "ok", "js_skipped": False}
        start = time.time()
        try:
            books = engine.search(key)
            result["search"] = [b.to_dict() for b in books[:5]]
            if books:
                detail = engine.book_info(books[0].book_url)
                result["info"] = detail.to_dict()
                chapters = engine.toc(detail.toc_url)
                result["toc_count"] = len(chapters)
                if chapters:
                    sample = engine.content(chapters[0].url)
                    result["sample_content"] = sample[:300]
        except JsRuleUnsupported:
            result["js_skipped"] = True
        except Exception as e:
            logging.info("book source test failed: %s", e)
            result["err"] = "test.failed"
            result["msg"] = str(e)
        result["elapsed_ms"] = int((time.time() - start) * 1000)

        ok = result["err"] == "ok" and bool(result.get("search"))
        _apply_check_result(
            source,
            {
                "ok": ok,
                "status": "ok" if ok else result["err"],
                "message": _("测试通过") if ok else (result.get("msg") or result["err"]),
                "tags": _source_tags(source.raw),
            },
        )
        source.save()
        return result


def routes():
    return [
        (r"/api/admin/booksource/list", BookSourceList),
        (r"/api/admin/booksource/import", BookSourceImport),
        (r"/api/admin/booksource/seed", BookSourceSeed),
        (r"/api/admin/booksource/toggle", BookSourceToggle),
        (r"/api/admin/booksource/check/status", BookSourceCheckStatus),
        (r"/api/admin/booksource/check", BookSourceCheckAll),
        (r"/api/admin/booksource/clean-invalid", BookSourceCleanInvalid),
        (r"/api/admin/booksource/test", BookSourceTest),
        (r"/api/admin/booksource", BookSourceCRUD),
    ]
