#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""网络书库 Handler（普通用户）：搜索 / 发现 / 详情 / 目录 / 正文 / 保存。"""

import datetime

import tornado.escape

from webserver import demo_mode, loader
from webserver.handlers.base import ListHandler, auth, js
from webserver.i18n import _
from webserver.models import BookSourceModel, OnlineBookMeta, PluginConnection
from webserver.plugins.runtime import SourceBookDetail, SourceChapter
from webserver.services.booksource import JsRuleUnsupported
from webserver.services.booksource_search import SearchTaskService
from webserver.services.plugin_runtime import PluginRuntime, PluginRuntimeError
from webserver.services.source_catalog import SourceCatalogService


CONF = loader.get_settings()


def engine_config():
    return {
        "BOOKSOURCE_HTTP_TIMEOUT": CONF.get("BOOKSOURCE_HTTP_TIMEOUT", 20),
        "BOOKSOURCE_MAX_TOC_PAGES": CONF.get("BOOKSOURCE_MAX_TOC_PAGES", 30),
        "BOOKSOURCE_MAX_CONTENT_PAGES": CONF.get("BOOKSOURCE_MAX_CONTENT_PAGES", 20),
        "BOOKSOURCE_AD_PATTERNS": CONF.get("BOOKSOURCE_AD_PATTERNS", []),
        "BOOKSOURCE_CLEAN_ENABLED": CONF.get("BOOKSOURCE_CLEAN_ENABLED", True),
    }


class NetworkBaseHandler(ListHandler):
    def get_catalog(self):
        return SourceCatalogService(self.session, CONF, self.user_id())

    def get_source(self, source_id):
        try:
            return self.get_catalog().get(source_id)
        except PluginRuntimeError:
            return None


class NetworkSources(NetworkBaseHandler):
    @js
    @auth
    def get(self):
        items = [source.to_public_dict() for source in self.get_catalog().bindings()]
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

        catalog = self.get_catalog()
        bindings = [item for item in catalog.bindings() if "book_sources.search" in item.capabilities]
        if ids:
            selected = {item.strip() for item in ids.split(",") if item.strip()}
            sources = [item for item in bindings if item.key in selected or str(item.legacy_id) in selected]
        elif group:
            sources = [item for item in bindings if item.group == group]
        elif mode == "all":
            sources = bindings
        else:
            top_k = CONF.get("BOOKSOURCE_SEARCH_TOP_K", 50)
            sources = bindings[:top_k]

        if not sources:
            return {"err": "ok", "task_id": "", "total": 0, "mode": mode}

        source_data = catalog.prepare_search(sources)
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
        # 后台独立 session 收口失败时，当前请求 session 是
        # 可靠的重试通道。只有 durable run 持久化成功才标 settled。
        if status["done"] >= status["total"]:
            runtime = PluginRuntime(self.session, CONF)
            for update in service.pop_runtime_updates(task_id):
                try:
                    runtime.finish_read_batch(update["batch"], update["outcomes"])
                except Exception:
                    service.settle_runtime_update(task_id, update["run_id"], False)
                    raise
                else:
                    service.settle_runtime_update(task_id, update["run_id"], True)
            status = service.get_status(task_id)
        # 任务完成后给「有结果」的源权重 +1（只结算一次），下次“近期可用”排前面
        if status["finished"]:
            hit_ids = service.pop_weight_updates(task_id)
            if hit_ids and not demo_mode.is_demo_restricted(CONF, self.current_user):
                self.session.query(BookSourceModel).filter(BookSourceModel.id.in_(hit_ids)).update(
                    {BookSourceModel.weight: BookSourceModel.weight + 1}, synchronize_session=False
                )
                self.session.commit()
            for update in service.pop_health_updates(task_id):
                connection = self.session.get(PluginConnection, update["connection_id"])
                if connection is not None:
                    connection.health = "healthy" if update["healthy"] else "degraded"
                    connection.health_message = update["message"][:500]
            self.session.commit()
        return {"err": "ok", **status}


class NetworkExplore(NetworkBaseHandler):
    @js
    @auth
    def get(self):
        source = self.get_source(self.get_argument("source_id", ""))
        if not source:
            return {"err": "params.not_found", "msg": _("书源不存在或未启用")}
        category_id = (self.get_argument("url", "") or "").strip()
        if not category_id:
            return {"err": "params.error", "msg": _("缺少发现页 URL")}
        page = _int(self.get_argument("page", "1"), 1)
        try:
            result = self.get_catalog().read(source, "browse", category_id, {"page": page})
        except JsRuleUnsupported:
            return {"err": "source.js_unsupported", "msg": _("该书源依赖 JS，暂不支持")}
        return {"err": "ok", "books": [book.to_dict() for book in result.items]}


class NetworkCategories(NetworkBaseHandler):
    """返回一个书源的发现页分类列表（解析自 exploreUrl）。"""

    @js
    @auth
    def get(self):
        source = self.get_source(self.get_argument("source_id", ""))
        if not source:
            return {"err": "params.not_found", "msg": _("书源不存在或未启用")}
        categories = self.get_catalog().read(source, "get_categories")
        return {"err": "ok", "items": [{"name": item.name, "url": item.id, **item.to_dict()} for item in categories]}


class NetworkBook(NetworkBaseHandler):
    @js
    @auth
    def get(self):
        source = self.get_source(self.get_argument("source_id", ""))
        if not source:
            return {"err": "params.not_found", "msg": _("书源不存在或未启用")}
        book_url = (self.get_argument("book_url", "") or "").strip()
        if not book_url:
            return {"err": "params.error", "msg": _("缺少书籍 URL")}
        try:
            detail = self.get_catalog().read(source, "get_book", book_url)
        except Exception as exc:
            return {"err": getattr(exc, "code", "source.fetch_failed"), "msg": str(exc)}
        return {
            "err": "ok",
            "book": detail.to_dict(),
            "toc_url": detail.toc_ref,
            "download_mode": source.download_mode,
        }


class NetworkToc(NetworkBaseHandler):
    @js
    @auth
    def get(self):
        source = self.get_source(self.get_argument("source_id", ""))
        if not source:
            return {"err": "params.not_found", "msg": _("书源不存在或未启用")}
        book_url = (self.get_argument("book_url", "") or "").strip()
        try:
            catalog = self.get_catalog()
            if book_url:
                detail = catalog.read(source, "get_book", book_url)
            else:
                toc_url = (self.get_argument("toc_url", "") or "").strip()
                if not toc_url:
                    return {"err": "params.error", "msg": _("缺少目录 URL")}
                detail = SourceBookDetail(external_id="", title="", toc_ref=toc_url)
            chapters = catalog.read(source, "get_toc", detail)
            status = detail.extra.get("serialize_status", "unknown")
        except Exception as exc:
            return {"err": getattr(exc, "code", "source.fetch_failed"), "msg": str(exc)}
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
        source = self.get_source(self.get_argument("source_id", ""))
        if not source:
            return {"err": "params.not_found", "msg": _("书源不存在或未启用")}
        chapter_url = (self.get_argument("chapter_url", "") or "").strip()
        if not chapter_url:
            return {"err": "params.error", "msg": _("缺少章节 URL")}
        title = self.get_argument("title", "")
        clean = self.get_argument("clean", "1") in ("1", "true")
        try:
            chapter = SourceChapter(external_id=chapter_url, title=title)
            content = self.get_catalog().read(source, "get_chapter", chapter, extra_config={"clean": clean})
        except Exception as exc:
            return {"err": getattr(exc, "code", "source.fetch_failed"), "msg": str(exc)}
        return {"err": "ok", "title": content.title or title, "content": content.content}


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

        from webserver.services.background_service import BackgroundService, BackgroundTask
        from webserver.services.booksource.save_service import SaveOnlineBookService

        source_id = req.get("source_id")
        tag = SaveOnlineBookService.make_tag(source_id, book_url)

        # 去重：同一本书已有运行中的保存任务则直接复用，避免并发重复整本抓取
        existing = BackgroundService().get_task_by_tag(tag)
        if existing and existing.get("status") == BackgroundTask.STATUS_RUNNING:
            return {"err": "ok", "tag": tag, "msg": _("该书籍正在保存中")}

        # 在请求线程里同步创建任务，保证前端随后轮询时任务已存在（消除注册竞态）
        title = source.name[:20]
        task = BackgroundService().add_task(BackgroundTask.SERVICE_TYPE_ONLINE_SAVE, "[online]%s" % title, tag=tag)
        SaveOnlineBookService().save_online_book(
            self.user_id(), source.key, book_url, fmt, clean, task_id=task.id if task else None
        )
        return {"err": "ok", "tag": tag, "msg": _("已开始后台保存，完成后将通知您")}


class NetworkSaveStatus(NetworkBaseHandler):
    """查询「保存到本地」后台任务进度（内存版，按 source_id + book_url 定位）。"""

    @js
    @auth
    def get(self):
        from webserver.services.background_service import BackgroundService
        from webserver.services.booksource.save_service import SaveOnlineBookService

        source_id = self.get_argument("source_id", "")
        book_url = (self.get_argument("book_url", "") or "").strip()
        if not source_id or not book_url:
            return {"err": "params.error", "msg": _("缺少 source_id 或 book_url")}

        tag = SaveOnlineBookService.make_tag(source_id, book_url)
        task = BackgroundService().get_task_by_tag(tag)
        if not task:
            return {"err": "ok", "found": False}

        data = task.get("progress_data") or {}
        return {
            "err": "ok",
            "found": True,
            "status": task.get("status"),
            "progress": task.get("progress", 0),
            "done": data.get("done", 0),
            "total": data.get("total", 0),
            "book_id": data.get("book_id", 0),
            "error": task.get("error_message") or "",
        }


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
        # 标准书源入口；/api/network/* 在 D-14 的一版过渡期内保留兼容别名。
        (r"/api/book-sources", NetworkSources),
        (r"/api/book-sources/search/status", NetworkSearchStatus),
        (r"/api/book-sources/search", NetworkSearch),
        (r"/api/book-sources/browse", NetworkExplore),
        (r"/api/book-sources/categories", NetworkCategories),
        (r"/api/book-sources/book", NetworkBook),
        (r"/api/book-sources/toc", NetworkToc),
        (r"/api/book-sources/content", NetworkContent),
        (r"/api/book-sources/save/status", NetworkSaveStatus),
        (r"/api/book-sources/save", NetworkSave),
        (r"/api/network/sources", NetworkSources),
        (r"/api/network/search/status", NetworkSearchStatus),
        (r"/api/network/search", NetworkSearch),
        (r"/api/network/explore", NetworkExplore),
        (r"/api/network/categories", NetworkCategories),
        (r"/api/network/book", NetworkBook),
        (r"/api/network/toc", NetworkToc),
        (r"/api/network/content", NetworkContent),
        (r"/api/network/save/status", NetworkSaveStatus),
        (r"/api/network/save", NetworkSave),
        (r"/api/network/status", NetworkStatus),
        (r"/api/library/online", NetworkLibraryOnline),
    ]
