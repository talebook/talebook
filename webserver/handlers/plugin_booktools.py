"""书籍工具（integrations.tool）的统一 HTTP 编排。

所有书籍工具共用 ``/api/plugins/<plugin_key>/tool``、``/tool/preview``、``/tool/run``
三条路由，本模块按 plugin_key 分发，只负责书籍定位、权限校验、临时文件编排、写回入库
与审计；取哪种格式、接受哪些参数、允许的写回方式、新书后缀与元数据同步都由
provider 按 ``TransformProvider`` 契约自述（内置工具见 ``webserver/plugins/tool/base.py``）。新增工具只需在
``webserver/plugins/register.py`` 注册 provider，不再新增 handler 或路由。
"""

import logging
import os
import shutil
import tempfile

from webserver import loader
from webserver.handlers.base import BaseHandler, auth, is_admin, js
from webserver.handlers.plugins_common import body as _body
from webserver.plugins.runtime import ToolInput, TransformProvider
from webserver.services.booktools import (
    get_format_path,
    import_as_new_book,
    overwrite_format,
    pick_format,
    resolve_book,
)
from webserver.services.plugin_runtime import PluginRuntime, ensure_builtin_installations


TRANSFORM_CAPABILITY = "integrations.tool"


class BookToolsError(RuntimeError):
    """内置文本工具的业务错误（消息已面向用户）。"""


def _tool_error(exc):
    return {"err": "booktools.failed", "msg": str(exc)}


def _tool_book_id(req):
    try:
        book_id = int(req.get("book_id") or 0)
    except (TypeError, ValueError):
        raise BookToolsError("参数错误：book_id 无效")
    if book_id <= 0:
        raise BookToolsError("参数错误：缺少 book_id")
    return book_id


def _tool_resolve_book(handler, book_id):
    """按当前访问者权限解析书籍；无权查看时抛出与「不存在」一致的错误，避免探测私有书籍。"""
    if not handler.can_view_book(book_id):
        raise BookToolsError("书籍不存在：ID=%d" % book_id)
    return resolve_book(handler.db, book_id)


def _tool_workdir():
    return tempfile.mkdtemp(prefix="talebook-texttools-")


def _tool_backup_dir():
    convert_path = loader.get_settings().get("convert_path") or tempfile.gettempdir()
    path = os.path.join(str(convert_path), "texttools-backups")
    os.makedirs(path, exist_ok=True)
    return path


def _book_option(book):
    formats = [fmt.upper() for fmt in (book.get("available_formats") or [])]
    usable = [fmt for fmt in ("EPUB", "TXT") if fmt in formats]
    return {
        "id": book["id"],
        "title": book.get("title") or "",
        "authors": [str(author) for author in (book.get("authors") or [])],
        "formats": usable,
        "timestamp": str(book.get("timestamp") or ""),
    }


def _tool_runtime(handler, plugin_key):
    """按 plugin_key 定位已启用的书籍工具连接，handler 不硬编码任何插件身份。"""
    settings = loader.get_settings()
    ensure_builtin_installations(handler.session, handler.user_id(), settings)
    runtime = PluginRuntime(handler.session, settings)
    for connection in runtime.connections_for(TRANSFORM_CAPABILITY, handler.user_id()):
        if runtime.plugin_key_of(connection) == plugin_key:
            provider = runtime.registry.get(plugin_key)
            if not isinstance(provider, TransformProvider):
                break
            return runtime, connection, provider
    raise BookToolsError("书籍工具不存在或未启用：%s" % plugin_key)


def _restore_backup(db, book_id, fmt, state):
    backup_path = state.get("backup_path")
    if not backup_path or not os.path.isfile(backup_path):
        return False
    with open(backup_path, "rb") as handle:
        db.add_format(book_id, fmt, handle, index_is_id=True)
    return True


class UserBookToolsBooks(BaseHandler):
    @js
    @auth
    def get(self):
        requested_book_id = self.get_argument("book_id", "")
        if requested_book_id:
            try:
                book = _tool_resolve_book(self, int(requested_book_id))
            except (BookToolsError, TypeError, ValueError) as exc:
                return _tool_error(exc)
            item = _book_option(book)
            return {"err": "ok", "books": [item] if item["formats"] else [], "total": 1 if item["formats"] else 0}

        keyword = (self.get_argument("query", "") or "").strip().lower()
        items = []
        for book in self.get_books():
            item = _book_option(book)
            if not item["formats"]:
                continue
            if keyword:
                haystack = "%s %s" % (item["title"], " ".join(item["authors"]))
                if keyword not in haystack.lower():
                    continue
            items.append(item)
        items.sort(key=lambda item: item["timestamp"], reverse=True)
        return {"err": "ok", "books": items[:100], "total": len(items)}


class AdminBookToolActions(BaseHandler):
    """返回当前书籍可用的实例级 Tool 动作，前端无需识别具体插件。"""

    @js
    @is_admin
    def get(self):
        try:
            book_id = _tool_book_id({"book_id": self.get_argument("book_id", "")})
            book = _tool_resolve_book(self, book_id)
            book_formats = {fmt.upper() for fmt in (book.get("available_formats") or [])}
            settings = loader.get_settings()
            ensure_builtin_installations(self.session, self.user_id(), settings)
            runtime = PluginRuntime(self.session, settings)
            actions = []
            for provider in runtime.enabled_providers(TRANSFORM_CAPABILITY):
                supported_formats = set(getattr(provider, "supported_formats", ()) or ())
                if supported_formats and not supported_formats.intersection(book_formats):
                    continue
                manifest = provider.manifest
                ui = manifest.get("ui") or {}
                route = ui.get("manage_route")
                if not route:
                    continue
                actions.append(
                    {
                        "plugin_key": manifest["id"],
                        "name": manifest["name"],
                        "icon": ui.get("icon") or "mdi-puzzle-outline",
                        "route": route,
                    }
                )
            return {"err": "ok", "actions": actions}
        except (BookToolsError, RuntimeError, TypeError, ValueError) as exc:
            return _tool_error(exc)


def _tool_params(req):
    params = req.get("params", {})
    if params is None:
        return {}
    if not isinstance(params, dict):
        raise BookToolsError("参数错误：params 必须是对象")
    return params


def _tool_source(handler, provider, book_id):
    """按插件声明的格式优先级挑出输入文件。"""
    book = _tool_resolve_book(handler, book_id)
    fmt = pick_format(book, candidates=provider.input_formats)
    if fmt is None:
        raise BookToolsError(
            "该书籍没有 %s 格式，无法使用「%s」" % (" / ".join(provider.input_formats), provider.manifest["name"])
        )
    return book, fmt, get_format_path(handler.db, book_id, fmt)


def _tool_input(provider, params, book, fmt, src):
    return ToolInput.from_dict({**provider.tool_input(params, book), "path": src, "format": fmt})


def _sync_book_meta(db, book_id, updates):
    """覆盖写回后同步库内标题/作者/语言（不加后缀），保持与处理后文件一致。

    封面不受影响：set_metadata 只会更新提供的封面、从不删除现有封面。
    """
    if not updates:
        return
    try:
        mi = db.get_metadata(book_id, index_is_id=True)
        if updates.get("title"):
            mi.title = updates["title"]
            mi.title_sort = None
        if updates.get("authors"):
            mi.authors = list(updates["authors"])
            mi.author_sort = None
        if updates.get("language"):
            mi.languages = [updates["language"]]
        db.set_metadata(book_id, mi, force_changes=True)
    except Exception as err:
        logging.warning("[booktools] Failed to update metadata for book_id=%d: %s", book_id, err)


class BookTool(BaseHandler):
    """书籍工具描述：支持格式、写回方式与插件自述的选项（预设、方向等）。"""

    @js
    @auth
    def get(self, plugin_key):
        try:
            _runtime, _connection, provider = _tool_runtime(self, plugin_key)
            return {
                "err": "ok",
                "plugin_key": plugin_key,
                "name": provider.manifest["name"],
                "formats": list(provider.input_formats),
                "output_modes": list(provider.output_modes),
                "options": provider.describe(),
            }
        except (BookToolsError, RuntimeError) as exc:
            return _tool_error(exc)


class BookToolPreview(BaseHandler):
    """只读预览：读者可用，但只能处理自己可见的书。"""

    @js
    @auth
    def post(self, plugin_key):
        req = _body(self)
        try:
            book_id = _tool_book_id(req)
            params = _tool_params(req)
            runtime, connection, provider = _tool_runtime(self, plugin_key)
            book, fmt, src = _tool_source(self, provider, book_id)
            result = runtime.read(
                connection,
                "preview",
                _tool_input(provider, params, book, fmt, src),
                required_scopes=("books.read",),
                requested_by=self.user_id(),
                timeout=provider.preview_timeout,
            ).to_dict()
            result["err"] = "ok"
            result["book_id"] = book_id
            return result
        except (BookToolsError, RuntimeError) as exc:
            return _tool_error(exc)


class BookToolRun(BaseHandler):
    """执行并写回书库：另存为新书或覆盖原书格式（可回滚），统一留下 PluginRun 审计。"""

    @js
    @is_admin
    def post(self, plugin_key):
        req = _body(self)
        work_dir = None
        try:
            book_id = _tool_book_id(req)
            params = _tool_params(req)
            runtime, connection, provider = _tool_runtime(self, plugin_key)
            output_mode = req.get("output_mode") or "new"
            if output_mode not in provider.output_modes:
                raise BookToolsError("参数错误：output_mode 必须为 %s" % " 或 ".join(provider.output_modes))
            book, fmt, src = _tool_source(self, provider, book_id)
            title = book.get("title") or "Unknown"
            tool_input = _tool_input(provider, params, book, fmt, src)
            work_dir = _tool_workdir()
            rollback_state = {}

            def finalize(output):
                value = output.to_dict()
                updates = provider.book_updates(value)
                rsp = {"err": "ok", **value, "output_mode": output_mode}
                if output_mode == "overwrite":
                    rollback_state["backup_path"] = overwrite_format(
                        self.db,
                        book_id,
                        fmt,
                        value["path"],
                        backup_dir=_tool_backup_dir(),
                        backup_state=rollback_state,
                    )
                    _sync_book_meta(self.db, book_id, updates)
                    rsp["book_id"] = book_id
                else:
                    suffix = str(req.get("suffix") or "").strip() or provider.new_book_title_suffix(value)
                    rsp["book_id"] = import_as_new_book(
                        self.db,
                        self.session,
                        book_id,
                        value["path"],
                        title_suffix=suffix,
                        language=updates.get("language"),
                        title_override=updates.get("title"),
                        authors_override=updates.get("authors"),
                        collector_id=self.user_id(),
                    )
                rsp["backup_path"] = rollback_state.get("backup_path") or ""
                return rsp

            rsp = runtime.write(
                connection,
                "apply",
                tool_input,
                work_dir,
                required_scopes=("books.write",),
                requested_by=self.user_id(),
                timeout=provider.apply_timeout,
                finalize=finalize,
                rollback=lambda: _restore_backup(self.db, book_id, fmt, rollback_state),
                audit_data={
                    **provider.audit_fields(tool_input.to_dict()),
                    "book_id": book_id,
                    "format": fmt,
                    "output_mode": output_mode,
                },
            )
            logging.info(
                "[booktools] %s done: %s book=%s mode=%s result_book=%s [uid:%s]",
                plugin_key,
                fmt,
                title,
                output_mode,
                rsp.get("book_id"),
                self.user_id(),
            )
            return rsp
        except (BookToolsError, RuntimeError) as exc:
            return _tool_error(exc)
        finally:
            if work_dir:
                shutil.rmtree(work_dir, ignore_errors=True)


def routes():
    # 所有书籍工具共用这三条按 plugin_key 分发的路由，新增工具只需注册 provider。
    return [
        (r"/api/plugins/tools/book-actions", AdminBookToolActions),
        (r"/api/plugins/tools/books", UserBookToolsBooks),
        (r"/api/plugins/([a-z0-9.-]+)/tool", BookTool),
        (r"/api/plugins/([a-z0-9.-]+)/tool/preview", BookToolPreview),
        (r"/api/plugins/([a-z0-9.-]+)/tool/run", BookToolRun),
    ]
