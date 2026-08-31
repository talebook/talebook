"""内置文本工具的 HTTP 编排（正文查找替换 / 繁简转换 / TXT 编码修复）。

三个工具均为 builtin capability 插件（provider 与纯处理核心位于
webserver/plugins/tool/{text_replace,zh_converter,txt_fixer}/），并由
webserver/plugins/register.py 汇总注册；本模块负责书籍定位、权限校验、临时文件编排、
写回入库与审计。
"""

import logging
import os
import shutil
import tempfile

from webserver import loader
from webserver.handlers.base import BaseHandler, auth, is_admin, js
from webserver.handlers.plugins_common import body as _body
from webserver.plugins.runtime import ToolInput
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


def _tool_runtime(handler, manage_route):
    """按声明式 UI 入口选择 typed transform，不在 handler 硬编码插件身份。"""
    settings = loader.get_settings()
    ensure_builtin_installations(handler.session, handler.user_id(), settings)
    runtime = PluginRuntime(handler.session, settings)
    for connection in runtime.connections_for(TRANSFORM_CAPABILITY, handler.user_id()):
        provider = runtime.registry.get(runtime.plugin_key_of(connection))
        if (provider.manifest.get("ui") or {}).get("manage_route") == manage_route:
            return runtime, connection
    raise BookToolsError("正文工具未启用")


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


class UserTextReplacePreview(BaseHandler):
    @js
    @auth
    def post(self):
        req = _body(self)
        try:
            book_id = _tool_book_id(req)
            pattern = str(req.get("pattern") or "")
            replacement = str(req.get("replacement") or "")
            use_regex = bool(req.get("use_regex"))
            book = _tool_resolve_book(self, book_id)
            fmt = pick_format(book, candidates=("TXT", "EPUB"))
            if fmt is None:
                raise BookToolsError("该书籍没有 TXT 或 EPUB 格式，无法执行替换")
            src = get_format_path(self.db, book_id, fmt)
            runtime, connection = _tool_runtime(self, "/plugins/text-replace")
            result = runtime.read(
                connection,
                "preview",
                ToolInput.from_dict(
                    {
                        "path": src,
                        "format": fmt,
                        "pattern": pattern,
                        "replacement": replacement,
                        "use_regex": use_regex,
                    }
                ),
                required_scopes=("books.read",),
                requested_by=self.user_id(),
            ).to_dict()
            result["err"] = "ok"
            result["book_id"] = book_id
            return result
        except (BookToolsError, RuntimeError) as exc:
            return _tool_error(exc)


class UserTextReplaceRun(BaseHandler):
    @js
    @is_admin
    def post(self):
        req = _body(self)
        work_dir = None
        try:
            book_id = _tool_book_id(req)
            pattern = str(req.get("pattern") or "")
            replacement = str(req.get("replacement") or "")
            use_regex = bool(req.get("use_regex"))
            output_mode = req.get("output_mode") or "new"
            if output_mode not in ("new", "overwrite"):
                raise BookToolsError("参数错误：output_mode 必须为 new 或 overwrite")
            book = _tool_resolve_book(self, book_id)
            title = book.get("title") or "Unknown"
            fmt = pick_format(book, candidates=("TXT", "EPUB"))
            if fmt is None:
                raise BookToolsError("该书籍没有 TXT 或 EPUB 格式，无法执行替换")
            src = get_format_path(self.db, book_id, fmt)

            work_dir = _tool_workdir()
            runtime, connection = _tool_runtime(self, "/plugins/text-replace")
            rollback_state = {}

            def finalize(output):
                value = output.to_dict()
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
                    rsp["book_id"] = book_id
                else:
                    suffix = str(req.get("suffix") or "").strip() or "（正文替换版）"
                    rsp["book_id"] = import_as_new_book(
                        self.db, self.session, book_id, value["path"], title_suffix=suffix, collector_id=self.user_id()
                    )
                rsp["backup_path"] = rollback_state.get("backup_path") or ""
                return rsp

            rsp = runtime.write(
                connection,
                "apply",
                ToolInput.from_dict(
                    {
                        "path": src,
                        "format": fmt,
                        "pattern": pattern,
                        "replacement": replacement,
                        "use_regex": use_regex,
                    }
                ),
                work_dir,
                required_scopes=("books.write",),
                requested_by=self.user_id(),
                finalize=finalize,
                rollback=lambda: _restore_backup(self.db, book_id, fmt, rollback_state),
                audit_data={"book_id": book_id, "format": fmt, "output_mode": output_mode, "pattern": pattern},
            )
            logging.info(
                "[booktools] text-replace done: %s book=%s hits=%d mode=%s [uid:%s]",
                fmt,
                title,
                rsp["matches"],
                output_mode,
                self.user_id(),
            )
            return rsp
        except (BookToolsError, RuntimeError) as exc:
            return _tool_error(exc)
        finally:
            if work_dir:
                shutil.rmtree(work_dir, ignore_errors=True)


class UserTxtFixerAnalyze(BaseHandler):
    @js
    @auth
    def post(self):
        req = _body(self)
        try:
            book_id = _tool_book_id(req)
            book = _tool_resolve_book(self, book_id)
            fmts = [f.upper() for f in (book.get("available_formats") or [])]
            if "TXT" not in fmts:
                raise BookToolsError("该书籍没有 TXT 格式，无法执行检测")
            src = get_format_path(self.db, book_id, "TXT")
            runtime, connection = _tool_runtime(self, "/plugins/txt-fixer")
            report = runtime.read(
                connection,
                "preview",
                ToolInput.from_dict({"path": src, "format": "TXT"}),
                required_scopes=("books.read",),
                requested_by=self.user_id(),
            ).to_dict()
            report["err"] = "ok"
            report["book_id"] = book_id
            return report
        except (BookToolsError, RuntimeError) as exc:
            return _tool_error(exc)


class UserTxtFixerRun(BaseHandler):
    @js
    @is_admin
    def post(self):
        req = _body(self)
        work_dir = None
        try:
            book_id = _tool_book_id(req)
            output_mode = req.get("output_mode") or "new"
            if output_mode not in ("new", "overwrite"):
                raise BookToolsError("参数错误：output_mode 必须为 new 或 overwrite")
            book = _tool_resolve_book(self, book_id)
            title = book.get("title") or "Unknown"
            fmts = [f.upper() for f in (book.get("available_formats") or [])]
            if "TXT" not in fmts:
                raise BookToolsError("该书籍没有 TXT 格式，无法执行修复")
            src = get_format_path(self.db, book_id, "TXT")

            work_dir = _tool_workdir()
            runtime, connection = _tool_runtime(self, "/plugins/txt-fixer")
            rollback_state = {}

            def finalize(output):
                value = output.to_dict()
                rsp = {"err": "ok", **value, "output_mode": output_mode}
                if output_mode == "overwrite":
                    rollback_state["backup_path"] = overwrite_format(
                        self.db,
                        book_id,
                        "TXT",
                        value["path"],
                        backup_dir=_tool_backup_dir(),
                        backup_state=rollback_state,
                    )
                    rsp["book_id"] = book_id
                else:
                    rsp["book_id"] = import_as_new_book(
                        self.db,
                        self.session,
                        book_id,
                        value["path"],
                        title_suffix="（编码修复版）",
                        collector_id=self.user_id(),
                    )
                rsp["backup_path"] = rollback_state.get("backup_path") or ""
                return rsp

            rsp = runtime.write(
                connection,
                "apply",
                ToolInput.from_dict({"path": src, "format": "TXT"}),
                work_dir,
                required_scopes=("books.write",),
                requested_by=self.user_id(),
                finalize=finalize,
                rollback=lambda: _restore_backup(self.db, book_id, "TXT", rollback_state),
                audit_data={"book_id": book_id, "format": "TXT", "output_mode": output_mode},
            )
            logging.info(
                "[booktools] txt-fixer done: book=%s enc=%s mode=%s [uid:%s]",
                title,
                rsp.get("encoding"),
                output_mode,
                self.user_id(),
            )
            return rsp
        except (BookToolsError, RuntimeError) as exc:
            return _tool_error(exc)
        finally:
            if work_dir:
                shutil.rmtree(work_dir, ignore_errors=True)


# 另存为新书时的标题后缀
ZH_NEW_BOOK_SUFFIX = {"zh": "（简体版）", "zht": "（繁體版）"}


def _zh_sync_book_meta(db, book_id, lang, title=None, authors=None):
    """替换模式下同步库内标题/作者/语言（不加后缀），保持与转换后文件一致。

    封面不受影响：set_metadata 只会更新提供的封面、从不删除现有封面。
    """
    try:
        mi = db.get_metadata(book_id, index_is_id=True)
        if title:
            mi.title = title
            mi.title_sort = None
        if authors:
            mi.authors = list(authors)
            mi.author_sort = None
        mi.languages = [lang]
        db.set_metadata(book_id, mi, force_changes=True)
    except Exception as err:
        logging.warning("[booktools] Failed to update metadata for book_id=%d: %s", book_id, err)


class UserZhConverterRun(BaseHandler):
    @js
    @is_admin
    def post(self):
        req = _body(self)
        work_dir = None
        try:
            book_id = _tool_book_id(req)
            direction = str(req.get("direction") or "")
            use_a5 = bool(req.get("use_a5"))
            convert_title = bool(req.get("convert_title"))
            backup = bool(req.get("backup"))
            output_mode = req.get("output_mode") or "new"
            if output_mode not in ("new", "replace"):
                raise BookToolsError("参数错误：output_mode 必须为 new 或 replace")

            book = _tool_resolve_book(self, book_id)
            title = book.get("title") or "Unknown"
            # 繁简转换优先处理 EPUB（保留目录结构），无 EPUB 时退回 TXT
            fmt = pick_format(book, candidates=("EPUB", "TXT"))
            if fmt is None:
                raise BookToolsError("该书籍没有 EPUB / TXT 格式，无法转换")
            src = get_format_path(self.db, book_id, fmt)

            work_dir = _tool_workdir()
            runtime, connection = _tool_runtime(self, "/plugins/zh-converter")
            rollback_state = {}

            def finalize(output):
                value = output.to_dict()
                lang = value["language"]
                rsp = {"err": "ok", **value, "output_mode": output_mode}
                backup_dir = _tool_backup_dir() if backup else None
                if output_mode == "replace":
                    rollback_state["backup_path"] = overwrite_format(
                        self.db,
                        book_id,
                        fmt,
                        value["path"],
                        backup_dir=backup_dir or _tool_backup_dir(),
                        backup_state=rollback_state,
                    )
                    _zh_sync_book_meta(
                        self.db,
                        book_id,
                        lang,
                        value.get("converted_title"),
                        value.get("converted_authors"),
                    )
                    rsp["book_id"] = book_id
                else:
                    rsp["book_id"] = import_as_new_book(
                        self.db,
                        self.session,
                        book_id,
                        value["path"],
                        title_suffix=ZH_NEW_BOOK_SUFFIX.get(lang, ""),
                        language=lang,
                        title_override=value.get("converted_title"),
                        authors_override=value.get("converted_authors"),
                        collector_id=self.user_id(),
                    )
                rsp["backup_path"] = rollback_state.get("backup_path") or ""
                return rsp

            rsp = runtime.write(
                connection,
                "apply",
                ToolInput.from_dict(
                    {
                        "path": src,
                        "format": fmt,
                        "direction": direction,
                        "use_a5": use_a5,
                        "convert_title": convert_title,
                        "title": title,
                        "authors": book.get("authors") or [],
                    }
                ),
                work_dir,
                required_scopes=("books.write",),
                requested_by=self.user_id(),
                finalize=finalize,
                rollback=lambda: _restore_backup(self.db, book_id, fmt, rollback_state),
                audit_data={"book_id": book_id, "format": fmt, "direction": direction, "output_mode": output_mode},
            )
            logging.info(
                "[booktools] zh-converter done: %s book=%s direction=%s mode=%s [uid:%s]",
                fmt,
                title,
                direction,
                output_mode,
                self.user_id(),
            )
            return rsp
        except (BookToolsError, RuntimeError) as exc:
            return _tool_error(exc)
        finally:
            if work_dir:
                shutil.rmtree(work_dir, ignore_errors=True)


def routes():
    return [
        (r"/api/plugins/tools/book-actions", AdminBookToolActions),
        (r"/api/plugins/tools/books", UserBookToolsBooks),
        (r"/api/plugins/tools/text-replace/preview", UserTextReplacePreview),
        (r"/api/plugins/tools/text-replace/run", UserTextReplaceRun),
        (r"/api/plugins/tools/txt-fixer/analyze", UserTxtFixerAnalyze),
        (r"/api/plugins/tools/txt-fixer/run", UserTxtFixerRun),
        (r"/api/plugins/tools/zh-converter/run", UserZhConverterRun),
    ]
