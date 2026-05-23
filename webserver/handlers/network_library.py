#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""网络书库 Handler（普通用户）：搜索 / 发现 / 详情 / 目录 / 正文 / 保存。"""

import concurrent.futures
import datetime
import logging

import tornado.escape

from webserver import loader
from webserver.handlers.base import BaseHandler, auth, js
from webserver.i18n import _
from webserver.models import BookSourceModel, OnlineBookMeta
from webserver.services.booksource import BookSource, BookSourceEngine, JsRuleUnsupported


CONF = loader.get_settings()


def engine_config():
    return {
        "BOOKSOURCE_HTTP_TIMEOUT": CONF.get("BOOKSOURCE_HTTP_TIMEOUT", 20),
        "BOOKSOURCE_MAX_TOC_PAGES": CONF.get("BOOKSOURCE_MAX_TOC_PAGES", 30),
        "BOOKSOURCE_MAX_CONTENT_PAGES": CONF.get("BOOKSOURCE_MAX_CONTENT_PAGES", 20),
        "BOOKSOURCE_AD_PATTERNS": CONF.get("BOOKSOURCE_AD_PATTERNS", []),
        "BOOKSOURCE_CLEAN_ENABLED": CONF.get("BOOKSOURCE_CLEAN_ENABLED", True),
    }


class NetworkBaseHandler(BaseHandler):
    def get_source(self, source_id):
        if not source_id:
            return None
        return (
            self.session.query(BookSourceModel)
            .filter(BookSourceModel.id == source_id, BookSourceModel.enabled.is_(True))
            .first()
        )

    def get_engine(self, source_model):
        return BookSourceEngine(BookSource(source_model.raw), config=engine_config())


class NetworkSources(NetworkBaseHandler):
    @js
    @auth
    def get(self):
        sources = (
            self.session.query(BookSourceModel)
            .filter(BookSourceModel.enabled.is_(True))
            .order_by(BookSourceModel.weight.desc(), BookSourceModel.id.asc())
            .all()
        )
        items = [{"id": s.id, "name": s.name, "group": s.group or ""} for s in sources]
        return {"err": "ok", "items": items}


class NetworkSearch(NetworkBaseHandler):
    @js
    @auth
    def get(self):
        key = (self.get_argument("key", "") or "").strip()
        if not key:
            return {"err": "params.error", "msg": _("请输入搜索关键字")}
        page = _int(self.get_argument("page", "1"), 1)
        ids = self.get_argument("sources", "")

        query = self.session.query(BookSourceModel).filter(BookSourceModel.enabled.is_(True))
        if ids:
            id_list = [int(i) for i in ids.split(",") if i.strip().isdigit()]
            query = query.filter(BookSourceModel.id.in_(id_list))
        sources = query.order_by(BookSourceModel.weight.desc(), BookSourceModel.id.asc()).all()
        if not sources:
            return {"err": "ok", "results": [], "partial": []}

        # 把所需数据先取出来，避免在子线程里使用 SQLAlchemy session
        source_data = [(s.id, s.name, s.raw) for s in sources]
        cfg = engine_config()

        def run_one(item):
            sid, name, raw = item
            try:
                engine = BookSourceEngine(BookSource(raw), config=cfg)
                books = engine.search(key, page)
                return {"source_id": sid, "source_name": name, "books": [b.to_dict() for b in books]}
            except JsRuleUnsupported:
                return {"source_id": sid, "source_name": name, "error": "js_unsupported"}
            except Exception as e:
                logging.info("network search [%s] failed: %s", name, e)
                return {"source_id": sid, "source_name": name, "error": "fetch_failed"}

        results, partial = [], []
        max_workers = max(1, min(CONF.get("BOOKSOURCE_MAX_WORKERS", 6), len(source_data)))
        timeout = CONF.get("BOOKSOURCE_SEARCH_TIMEOUT", 15)
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_map = {executor.submit(run_one, item): item for item in source_data}
            done, not_done = concurrent.futures.wait(future_map, timeout=timeout)
            for f in not_done:
                item = future_map[f]
                partial.append({"source_id": item[0], "source_name": item[1], "error": "timeout"})
            for f in done:
                r = f.result()
                if "books" in r:
                    results.append(r)
                else:
                    partial.append(r)
        return {"err": "ok", "results": results, "partial": partial}


class NetworkExplore(NetworkBaseHandler):
    @js
    @auth
    def get(self):
        source = self.get_source(_int(self.get_argument("source_id", "0"), 0))
        if not source:
            return {"err": "params.not_found", "msg": _("书源不存在或未启用")}
        url = (self.get_argument("url", "") or "").strip()
        if not url:
            return {"err": "params.error", "msg": _("缺少发现页 URL")}
        page = _int(self.get_argument("page", "1"), 1)
        try:
            books = self.get_engine(source).explore(url, page)
        except JsRuleUnsupported:
            return {"err": "source.js_unsupported", "msg": _("该书源依赖 JS，暂不支持")}
        return {"err": "ok", "books": [b.to_dict() for b in books]}


class NetworkBook(NetworkBaseHandler):
    @js
    @auth
    def get(self):
        source = self.get_source(_int(self.get_argument("source_id", "0"), 0))
        if not source:
            return {"err": "params.not_found", "msg": _("书源不存在或未启用")}
        book_url = (self.get_argument("book_url", "") or "").strip()
        if not book_url:
            return {"err": "params.error", "msg": _("缺少书籍 URL")}
        try:
            detail = self.get_engine(source).book_info(book_url)
        except JsRuleUnsupported:
            return {"err": "source.js_unsupported", "msg": _("该书源依赖 JS，暂不支持")}
        return {"err": "ok", "book": detail.to_dict(), "toc_url": detail.toc_url}


class NetworkToc(NetworkBaseHandler):
    @js
    @auth
    def get(self):
        source = self.get_source(_int(self.get_argument("source_id", "0"), 0))
        if not source:
            return {"err": "params.not_found", "msg": _("书源不存在或未启用")}
        toc_url = (self.get_argument("toc_url", "") or "").strip()
        book_url = (self.get_argument("book_url", "") or "").strip()
        engine = self.get_engine(source)
        try:
            if not toc_url and book_url:
                detail = engine.book_info(book_url)
                toc_url = detail.toc_url
                detail_obj = detail
            else:
                detail_obj = None
            if not toc_url:
                return {"err": "params.error", "msg": _("缺少目录 URL")}
            chapters = engine.toc(toc_url)
            status = engine.detect_serialization(detail_obj, chapters) if detail_obj else "unknown"
        except JsRuleUnsupported:
            return {"err": "source.js_unsupported", "msg": _("该书源依赖 JS，暂不支持")}
        return {
            "err": "ok",
            "chapters": [c.to_dict() for c in chapters],
            "serialize_status": status,
        }


class NetworkContent(NetworkBaseHandler):
    @js
    @auth
    def get(self):
        if self.current_user and not self.current_user.can_read():
            return {"err": "permission.not_permit", "msg": _("无阅读权限")}
        source = self.get_source(_int(self.get_argument("source_id", "0"), 0))
        if not source:
            return {"err": "params.not_found", "msg": _("书源不存在或未启用")}
        chapter_url = (self.get_argument("chapter_url", "") or "").strip()
        if not chapter_url:
            return {"err": "params.error", "msg": _("缺少章节 URL")}
        title = self.get_argument("title", "")
        clean = self.get_argument("clean", "1") in ("1", "true")
        try:
            content = self.get_engine(source).content(chapter_url, clean=clean)
        except JsRuleUnsupported:
            return {"err": "source.js_unsupported", "msg": _("该书源依赖 JS，暂不支持")}
        return {"err": "ok", "title": title, "content": content}


class NetworkSave(NetworkBaseHandler):
    """把网络小说保存到本地书库（后台任务）。"""

    @js
    @auth
    def post(self):
        if self.current_user and not self.current_user.can_save():
            return {"err": "permission.not_permit", "msg": _("无保存权限")}
        req = tornado.escape.json_decode(self.request.body)
        source = self.get_source(req.get("source_id"))
        if not source:
            return {"err": "params.not_found", "msg": _("书源不存在或未启用")}
        book_url = (req.get("book_url") or "").strip()
        if not book_url:
            return {"err": "params.error", "msg": _("缺少书籍 URL")}
        fmt = req.get("fmt", "txt")
        if fmt not in ("txt", "epub"):
            return {"err": "params.error", "msg": _("仅支持 txt / epub")}
        clean = bool(req.get("clean", True))

        from webserver.services.booksource.save_service import SaveOnlineBookService

        SaveOnlineBookService().save_online_book(self.user_id(), source.raw, book_url, fmt, clean)
        return {"err": "ok", "msg": _("已开始后台保存，完成后将通知您")}


class NetworkLibraryOnline(NetworkBaseHandler):
    """本地已保存的网络书列表，可按连载状态筛选。"""

    @js
    @auth
    def get(self):
        status = self.get_argument("status", "")
        query = self.session.query(OnlineBookMeta)
        if status in (OnlineBookMeta.SERIAL, OnlineBookMeta.FINISHED, OnlineBookMeta.UNKNOWN):
            query = query.filter(OnlineBookMeta.serialize_status == status)
        metas = query.all()
        status_map = {m.book_id: m.serialize_status for m in metas}
        ids = sorted(status_map.keys(), reverse=True)
        rsp = self.render_book_list([], ids=ids, title=_("网络书库"), sort_by_id=True)
        for book in rsp.get("books", []):
            book["serialize_status"] = status_map.get(book["id"], "unknown")
        return rsp


class NetworkStatus(NetworkBaseHandler):
    """读取 / 修改本地网络书的连载状态。"""

    @js
    @auth
    def get(self):
        book_id = _int(self.get_argument("book_id", "0"), 0)
        meta = self.session.query(OnlineBookMeta).filter(OnlineBookMeta.book_id == book_id).first()
        if not meta:
            return {"err": "ok", "meta": None}
        return {"err": "ok", "meta": meta.to_dict()}

    @js
    @auth
    def post(self):
        req = tornado.escape.json_decode(self.request.body)
        book_id = req.get("book_id")
        status = req.get("serialize_status")
        if status not in (OnlineBookMeta.SERIAL, OnlineBookMeta.FINISHED, OnlineBookMeta.UNKNOWN):
            return {"err": "params.error", "msg": _("非法的连载状态")}
        meta = self.session.query(OnlineBookMeta).filter(OnlineBookMeta.book_id == book_id).first()
        if not meta:
            return {"err": "params.not_found", "msg": _("该书不是网络书或未保存")}
        meta.serialize_status = status
        meta.status_manual = True
        meta.update_time = datetime.datetime.now()
        meta.save()
        return {"err": "ok", "meta": meta.to_dict()}


def _int(value, default=0):
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def routes():
    return [
        (r"/api/network/sources", NetworkSources),
        (r"/api/network/search", NetworkSearch),
        (r"/api/network/explore", NetworkExplore),
        (r"/api/network/book", NetworkBook),
        (r"/api/network/toc", NetworkToc),
        (r"/api/network/content", NetworkContent),
        (r"/api/network/save", NetworkSave),
        (r"/api/network/status", NetworkStatus),
        (r"/api/library/online", NetworkLibraryOnline),
    ]
