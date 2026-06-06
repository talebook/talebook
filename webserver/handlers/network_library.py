#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""网络书库 Handler（普通用户）：搜索 / 发现 / 详情 / 目录 / 正文 / 保存。"""

import datetime

import tornado.escape

from webserver import loader
from webserver.handlers.base import BaseHandler, auth, js
from webserver.i18n import _
from webserver.models import BookSourceModel, OnlineBookMeta
from webserver.services.booksource import BookSource, BookSourceEngine, JsRuleUnsupported
from webserver.services.booksource_search import SearchTaskService


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
    """创建网络书库搜索任务：后台线程池并发各源，立即返回 task_id（前端轮询进度）。"""

    @js
    @auth
    def get(self):
        key = (self.get_argument("key", "") or "").strip()
        if not key:
            return {"err": "params.error", "msg": _("请输入搜索关键字")}
        page = _int(self.get_argument("page", "1"), 1)
        ids = self.get_argument("sources", "")
        group = self.get_argument("group", "").strip()
        mode = self.get_argument("mode", "top")

        order = (BookSourceModel.weight.desc(), BookSourceModel.id.asc())
        query = self.session.query(BookSourceModel).filter(BookSourceModel.enabled.is_(True))
        if ids:
            # 手选：搜指定的书源
            id_list = [int(i) for i in ids.split(",") if i.strip().isdigit()]
            sources = query.filter(BookSourceModel.id.in_(id_list)).order_by(*order).all()
        elif group:
            # 按分组搜索
            sources = query.filter(BookSourceModel.group == group).order_by(*order).all()
        elif mode == "all":
            # 全部：搜所有启用的书源（前端轮询到全部完成）
            sources = query.order_by(*order).all()
        else:
            # 近期可用（默认）：按权重取 TOP K
            top_k = CONF.get("BOOKSOURCE_SEARCH_TOP_K", 50)
            sources = query.order_by(*order).limit(top_k).all()

        if not sources:
            return {"err": "ok", "task_id": "", "total": 0, "mode": mode}

        # 把所需数据先取出来，避免在子线程里使用 SQLAlchemy session
        source_data = [(s.id, s.name, s.raw) for s in sources]
        service = SearchTaskService()
        service.configure(CONF.get("BOOKSOURCE_MAX_WORKERS", 10))
        task = service.create_task(key, page, source_data, engine_config())
        return {"err": "ok", "mode": mode, **task}


class NetworkSearchStatus(NetworkBaseHandler):
    """查询搜索任务进度：返回已完成源结果、失败源、仍在搜索的源。"""

    @js
    @auth
    def get(self):
        task_id = self.get_argument("task_id", "")
        if not task_id:
            return {"err": "params.error", "msg": _("缺少 task_id")}
        service = SearchTaskService()
        status = service.get_status(task_id)
        if status is None:
            return {"err": "task.not_found", "msg": _("搜索任务不存在或已过期")}
        # 任务完成后给「有结果」的源权重 +1（只结算一次），下次“近期可用”排前面
        if status["finished"]:
            hit_ids = service.pop_weight_updates(task_id)
            if hit_ids:
                self.session.query(BookSourceModel).filter(BookSourceModel.id.in_(hit_ids)).update(
                    {BookSourceModel.weight: BookSourceModel.weight + 1}, synchronize_session=False
                )
                self.session.commit()
        return {"err": "ok", **status}


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


class NetworkCategories(NetworkBaseHandler):
    """返回一个书源的发现页分类列表（解析自 exploreUrl）。"""

    @js
    @auth
    def get(self):
        source = self.get_source(_int(self.get_argument("source_id", "0"), 0))
        if not source:
            return {"err": "params.not_found", "msg": _("书源不存在或未启用")}
        categories = BookSource(source.raw).explore_categories()
        return {"err": "ok", "items": categories}


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
        (r"/api/network/search/status", NetworkSearchStatus),
        (r"/api/network/search", NetworkSearch),
        (r"/api/network/explore", NetworkExplore),
        (r"/api/network/categories", NetworkCategories),
        (r"/api/network/book", NetworkBook),
        (r"/api/network/toc", NetworkToc),
        (r"/api/network/content", NetworkContent),
        (r"/api/network/save", NetworkSave),
        (r"/api/network/status", NetworkStatus),
        (r"/api/library/online", NetworkLibraryOnline),
    ]
