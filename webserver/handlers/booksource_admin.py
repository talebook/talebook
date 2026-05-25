#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""书源管理 Handler（管理员）。"""

import datetime
import json
import logging
import os
import time

import requests
import tornado

from webserver import loader
from webserver.handlers.base import BaseHandler, is_admin, js
from webserver.i18n import _
from webserver.models import BookSourceModel
from webserver.services.booksource import BookSource, BookSourceEngine, JsRuleUnsupported


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
    essentials = [
        raw.get("searchUrl", ""),
        rule_search.get("bookList", ""),
        rule_content.get("content", ""),
    ]
    return any(_has_js(v) for v in essentials)


def import_sources(session, data, overwrite=True):
    """批量导入 Legado 书源数组，返回统计结果。"""
    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        return {"err": "params.error", "msg": _("书源格式应为 JSON 数组或对象")}

    added = updated = skipped = 0
    failed = []
    for raw in data:
        if not isinstance(raw, dict):
            failed.append({"name": str(raw)[:40], "reason": "invalid"})
            continue
        name = (raw.get("bookSourceName") or "").strip()
        url = (raw.get("bookSourceUrl") or "").strip()
        if not name or not url:
            failed.append({"name": name or url or "unknown", "reason": "missing_fields"})
            continue
        if _requires_js(raw):
            failed.append({"name": name, "reason": "js_unsupported"})
            continue
        existing = session.query(BookSourceModel).filter(BookSourceModel.url == url).first()
        if existing:
            if not overwrite:
                skipped += 1
                continue
            existing.apply_raw(raw)
            existing.save()
            updated += 1
        else:
            source = BookSourceModel(raw)
            source.save()
            added += 1
    return {"err": "ok", "added": added, "updated": updated, "skipped": skipped, "failed": failed}


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
        sources = query.order_by(BookSourceModel.weight.desc(), BookSourceModel.id.asc()).all()
        items = [s.to_summary_dict() for s in sources]
        groups = sorted({s.group for s in self.session.query(BookSourceModel).all() if s.group})
        return {"err": "ok", "items": items, "count": len(items), "groups": groups}


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
        overwrite = bool(req.get("overwrite", True))
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

        return import_sources(self.session, data, overwrite)


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
        return import_sources(self.session, data, overwrite=True)


class BookSourceToggle(BaseHandler):
    """启用/禁用书源。"""

    @js
    @is_admin
    def post(self):
        req = tornado.escape.json_decode(self.request.body)
        source = self.session.query(BookSourceModel).filter(BookSourceModel.id == req.get("id")).first()
        if not source:
            return {"err": "params.not_found", "msg": _("未找到该书源")}
        source.enabled = bool(req.get("enabled", not source.enabled))
        source.update_time = datetime.datetime.now()
        source.save()
        return {"err": "ok", "enabled": bool(source.enabled)}


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

        source.last_check_time = datetime.datetime.now()
        source.last_check_ok = result["err"] == "ok" and bool(result.get("search"))
        source.save()
        return result


def routes():
    return [
        (r"/api/admin/booksource/list", BookSourceList),
        (r"/api/admin/booksource/import", BookSourceImport),
        (r"/api/admin/booksource/seed", BookSourceSeed),
        (r"/api/admin/booksource/toggle", BookSourceToggle),
        (r"/api/admin/booksource/test", BookSourceTest),
        (r"/api/admin/booksource", BookSourceCRUD),
    ]
