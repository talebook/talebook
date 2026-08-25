import contextlib
import datetime
import functools
import logging
import os
import shutil
import tempfile

import tornado.escape
from tornado.ioloop import IOLoop

from webserver import loader, utils
from webserver.constants import META_SELECTED_SOURCES, META_SOURCE_AI
from webserver.handlers.base import BaseHandler, auth, is_admin, js
from webserver.models import (
    BookSourceModel,
    OpdsSource,
    PluginConnection,
    PluginDefinition,
    PluginInstallation,
    PluginRun,
    PluginRunItem,
    PluginSecret,
)
from webserver.plugins.runtime import (
    WEREAD_PLUGIN_KEY,
    ProviderAuthError,
    ProviderError,
    WereadProvider,
)
from webserver.plugins.texttools import (
    ANALYZE_LIMIT,
    DIRECTION_LABELS,
    OpenCC,
    analyze_bytes,
    compile_rule,
    convert_epub,
    convert_txt_file,
    fix_bytes,
    replace_epub_file,
    replace_preview,
    replace_txt_file,
)
from webserver.services.annotation_writer import all_book_ids, confirm_match
from webserver.services.async_service import AsyncService
from webserver.services.booktools import get_format_path, import_as_new_book, overwrite_format, pick_format, resolve_book
from webserver.services.plugin_jobs import execute_plugin_run
from webserver.services.plugin_runtime import (
    DEFAULT_CONNECTION_ROLE,
    DEFAULT_COUNTS,
    PluginRuntime,
    PluginRuntimeError,
    ensure_builtin_capability_installations,
    install_builtin,
    save_connection,
)
from webserver.services.plugin_secrets import SecretCipher, SecretCipherError, redact


def _body(handler):
    try:
        value = tornado.escape.json_decode(handler.request.body or b"{}")
    except ValueError as exc:
        raise PluginRuntimeError("plugin.request_invalid", "Request body must be valid JSON") from exc
    if not isinstance(value, dict):
        raise PluginRuntimeError("plugin.request_invalid", "Request body must be an object")
    return value


def _error(exc):
    return {"err": getattr(exc, "code", "plugin.error"), "msg": str(exc)}


# 这些键由服务端计算并注入，客户端传入的同名值一律丢弃，避免越权访问私有书籍。
SERVER_OWNED_INPUT_KEYS = frozenset({"allowed_book_ids"})
# 声明了这些能力的插件会做书籍匹配，需要平台注入可见书籍白名单。
BOOK_SCOPED_CAPABILITIES = frozenset({"annotations.import"})
# 内置文本工具：改书操作需落 PluginRun，审计锚点挂在各自的实例连接上。
TEXT_REPLACE_PLUGIN_KEY = "talebook.tool.text-replace"
ZH_CONVERTER_PLUGIN_KEY = "talebook.tool.zh-converter"
TXT_FIXER_PLUGIN_KEY = "talebook.tool.txt-fixer"


def _plugin_input_data(handler, connection):
    """构造插件运行输入：客户端参数经过滤后，与服务端计算的受控字段合并。"""
    req = _body(handler)
    supplied = req.get("input_data") or {}
    if not isinstance(supplied, dict):
        raise PluginRuntimeError("plugin.request_invalid", "input_data must be an object")

    input_data = {key: value for key, value in supplied.items() if key not in SERVER_OWNED_INPUT_KEYS}

    installation = handler.session.get(PluginInstallation, connection.installation_id)
    definition = handler.session.get(PluginDefinition, installation.definition_id) if installation else None
    capabilities = set((definition.capabilities if definition else None) or [])
    if capabilities & BOOK_SCOPED_CAPABILITIES:
        input_data["allowed_book_ids"] = [
            book_id for book_id in all_book_ids(handler.db) if handler.get_book(book_id, raise_exception=False) is not None
        ]
    return req, input_data


class AdminPlugins(BaseHandler):
    @js
    @is_admin
    def get(self):
        try:
            ensure_builtin_capability_installations(self.session, self.user_id(), loader.get_settings())
            definitions = self.session.query(PluginDefinition).order_by(PluginDefinition.id).all()
            installations = self.session.query(PluginInstallation).order_by(PluginInstallation.id).all()
            definition_map = {item.id: item for item in definitions}
            opds_sources = self.session.query(OpdsSource).all()
            legado_sources = self.session.query(BookSourceModel).all()
            configured_metadata = [
                value for value in loader.get_settings().get(META_SELECTED_SOURCES, []) if value != META_SOURCE_AI
            ]
            return {
                "err": "ok",
                "definitions": [item.to_public_dict() for item in definitions],
                "installations": [item.to_public_dict(definition_map.get(item.definition_id)) for item in installations],
                "builtin_state": {
                    "talebook.metadata.builtin": {
                        "configured": len(configured_metadata),
                        "enabled": len(configured_metadata),
                        "sources": configured_metadata,
                    },
                    "talebook.book-source.opds": {
                        "configured": len(opds_sources),
                        "enabled": sum(1 for item in opds_sources if item.active),
                        "service_enabled": bool(loader.get_settings().get("OPDS_ENABLED", True)),
                    },
                    "talebook.book-source.legado": {
                        "configured": len(legado_sources),
                        "enabled": sum(1 for item in legado_sources if item.enabled),
                    },
                },
            }
        except PluginRuntimeError as exc:
            return _error(exc)


class AdminPluginInstall(BaseHandler):
    @js
    @is_admin
    def post(self):
        try:
            req = _body(self)
            installation = install_builtin(
                self.session,
                req.get("plugin_key", ""),
                self.user_id(),
                config=req.get("config"),
                approved_permissions=req.get("permissions"),
            )
            definition = self.session.get(PluginDefinition, installation.definition_id)
            return {"err": "ok", "installation": installation.to_public_dict(definition)}
        except PluginRuntimeError as exc:
            return _error(exc)


class AdminPluginInstallationState(BaseHandler):
    @js
    @is_admin
    def post(self, installation_id):
        try:
            req = _body(self)
            if not isinstance(req.get("enabled"), bool):
                raise PluginRuntimeError("plugin.request_invalid", "enabled must be a boolean")
            installation = self.session.get(PluginInstallation, int(installation_id))
            if installation is None:
                raise PluginRuntimeError("plugin.installation_missing", "Plugin installation was not found")
            installation.enabled = req["enabled"]
            self.session.commit()
            definition = self.session.get(PluginDefinition, installation.definition_id)
            return {"err": "ok", "installation": installation.to_public_dict(definition)}
        except (PluginRuntimeError, TypeError, ValueError) as exc:
            return _error(exc)


class AdminPluginOpdsService(BaseHandler):
    @js
    @is_admin
    def post(self):
        try:
            req = _body(self)
            if not isinstance(req.get("enabled"), bool):
                raise PluginRuntimeError("plugin.request_invalid", "enabled must be a boolean")

            args = loader.SettingsLoader()
            args.update(loader.get_settings())
            args["OPDS_ENABLED"] = req["enabled"]

            from webserver.handlers.admin import SettingsSaverLogic

            result = SettingsSaverLogic().save_extra_settings(args)
            if result.get("err") != "ok":
                return result
            return {"err": "ok", "enabled": req["enabled"]}
        except (PluginRuntimeError, TypeError, ValueError) as exc:
            return _error(exc)


class AdminPluginConnections(BaseHandler):
    @js
    @is_admin
    def get(self):
        connections = self.session.query(PluginConnection).order_by(PluginConnection.id).all()
        instance_connections = [item for item in connections if item.owner_type == "instance"]
        secrets = {
            item.id: item
            for item in self.session.query(PluginSecret)
            .filter(PluginSecret.id.in_([c.secret_id for c in instance_connections]))
            .all()
        }
        user_health = {}
        for item in connections:
            if item.owner_type != "user":
                continue
            key = (item.installation_id, item.health)
            user_health[key] = user_health.get(key, 0) + 1
        return {
            "err": "ok",
            "connections": [item.to_public_dict(secrets.get(item.secret_id)) for item in instance_connections],
            "user_connection_health": [
                {"installation_id": installation_id, "health": health, "count": count}
                for (installation_id, health), count in sorted(user_health.items())
            ],
        }

    @js
    @is_admin
    def post(self):
        try:
            req = _body(self)
            if req.get("owner_type", "instance") != "instance":
                raise PluginRuntimeError("plugin.owner_forbidden", "Administrators cannot manage another user's connection")
            connection = save_connection(
                self.session,
                loader.get_settings(),
                int(req.get("installation_id", 0)),
                "instance",
                0,
                req.get("credentials"),
                name=req.get("name", "default"),
                config=req.get("config"),
                scopes=req.get("scopes"),
                schedule=req.get("schedule", ""),
            )
            secret = self.session.get(PluginSecret, connection.secret_id)
            return {"err": "ok", "connection": connection.to_public_dict(secret)}
        except (PluginRuntimeError, SecretCipherError, TypeError, ValueError) as exc:
            return _error(exc)


class AdminPluginConnectionState(BaseHandler):
    @js
    @is_admin
    def post(self, connection_id):
        try:
            req = _body(self)
            if not isinstance(req.get("enabled"), bool):
                raise PluginRuntimeError("plugin.request_invalid", "enabled must be a boolean")
            connection = self.session.get(PluginConnection, int(connection_id))
            if connection is None or connection.owner_type != "instance":
                raise PluginRuntimeError("plugin.connection_forbidden", "Plugin connection is not available")
            installation = self.session.get(PluginInstallation, connection.installation_id)
            if req["enabled"] and not installation.enabled:
                raise PluginRuntimeError("plugin.installation_disabled", "Enable the plugin installation first")
            connection.enabled = req["enabled"]
            self.session.commit()
            secret = self.session.get(PluginSecret, connection.secret_id)
            return {"err": "ok", "connection": connection.to_public_dict(secret)}
        except (PluginRuntimeError, TypeError, ValueError) as exc:
            return _error(exc)


class UserPluginConnections(BaseHandler):
    @js
    @auth
    def get(self):
        connections = (
            self.session.query(PluginConnection)
            .filter(PluginConnection.owner_type == "user", PluginConnection.owner_id == self.user_id())
            .order_by(PluginConnection.id)
            .all()
        )
        secrets = {
            item.id: item
            for item in self.session.query(PluginSecret).filter(PluginSecret.id.in_([c.secret_id for c in connections])).all()
        }
        return {"err": "ok", "connections": [item.to_public_dict(secrets.get(item.secret_id)) for item in connections]}

    @js
    @auth
    def post(self):
        try:
            req = _body(self)
            connection = save_connection(
                self.session,
                loader.get_settings(),
                int(req.get("installation_id", 0)),
                "user",
                self.user_id(),
                req.get("credentials"),
                name=req.get("name", "default"),
                config=req.get("config"),
                scopes=req.get("scopes"),
                schedule=req.get("schedule", ""),
            )
            secret = self.session.get(PluginSecret, connection.secret_id)
            return {"err": "ok", "connection": connection.to_public_dict(secret)}
        except (PluginRuntimeError, SecretCipherError, TypeError, ValueError) as exc:
            return _error(exc)


class AdminPluginAction(BaseHandler):
    @js
    @is_admin
    def post(self, connection_id, action):
        try:
            connection = self.session.get(PluginConnection, int(connection_id))
            if connection is None:
                raise PluginRuntimeError("plugin.connection_missing", "Plugin connection is not available")
            req, input_data = _plugin_input_data(self, connection)
            run = PluginRuntime(self.session, loader.get_settings()).prepare_run(
                connection.id,
                action,
                self.user_id(),
                trigger=req.get("trigger", "manual"),
                parent_run_id=req.get("parent_run_id"),
                input_data=input_data,
            )
            execute_plugin_run(AsyncService(), run.id)
            self.session.refresh(run)
            return {"err": "ok", "run": run.to_public_dict()}
        except (PluginRuntimeError, TypeError, ValueError) as exc:
            return _error(exc)


class AdminPluginRuns(BaseHandler):
    @js
    @is_admin
    def get(self):
        query = self.session.query(PluginRun)
        connection_id = self.get_argument("connection_id", "")
        if connection_id:
            try:
                query = query.filter(PluginRun.connection_id == int(connection_id))
            except ValueError:
                return {"err": "plugin.request_invalid", "msg": "connection_id must be an integer"}
        runs = query.order_by(PluginRun.id.desc()).limit(100).all()
        include_items = self.get_argument("include_items", "false") == "true"
        data = []
        for run in runs:
            value = run.to_public_dict()
            if include_items:
                value["items"] = [
                    item.to_public_dict()
                    for item in self.session.query(PluginRunItem)
                    .filter(PluginRunItem.run_id == run.id)
                    .order_by(PluginRunItem.id)
                ]
            data.append(value)
        return {"err": "ok", "runs": data}


class AdminPluginRunDetail(BaseHandler):
    @js
    @is_admin
    def get(self, run_id):
        try:
            run = self.session.get(PluginRun, int(run_id))
        except (TypeError, ValueError):
            run = None
        if run is None:
            return {"err": "plugin.run_missing", "msg": "Plugin run was not found"}
        items = self.session.query(PluginRunItem).filter(PluginRunItem.run_id == run.id).order_by(PluginRunItem.id).all()
        return {"err": "ok", "run": run.to_public_dict(), "items": [item.to_public_dict(include_data=True) for item in items]}


class UserPluginAction(BaseHandler):
    @js
    @auth
    def post(self, connection_id, action):
        try:
            connection = self.session.get(PluginConnection, int(connection_id))
            if connection is None or connection.owner_type != "user" or connection.owner_id != self.user_id():
                raise PluginRuntimeError("plugin.connection_forbidden", "Plugin connection is not available")
            req, input_data = _plugin_input_data(self, connection)
            run = PluginRuntime(self.session, loader.get_settings()).prepare_run(
                connection.id,
                action,
                self.user_id(),
                trigger=req.get("trigger", "manual"),
                parent_run_id=req.get("parent_run_id"),
                input_data=input_data,
            )
            execute_plugin_run(AsyncService(), run.id)
            self.session.refresh(run)
            return {"err": "ok", "run": run.to_public_dict()}
        except (PluginRuntimeError, TypeError, ValueError) as exc:
            return _error(exc)


class UserPluginRuns(BaseHandler):
    @js
    @auth
    def get(self):
        connection_ids = [
            item.id
            for item in self.session.query(PluginConnection.id)
            .filter(PluginConnection.owner_type == "user", PluginConnection.owner_id == self.user_id())
            .all()
        ]
        runs = (
            self.session.query(PluginRun)
            .filter(PluginRun.connection_id.in_(connection_ids))
            .order_by(PluginRun.id.desc())
            .limit(100)
            .all()
        )
        return {"err": "ok", "runs": [run.to_public_dict() for run in runs]}


class UserPluginRunDetail(BaseHandler):
    @js
    @auth
    def get(self, run_id):
        try:
            run = self.session.get(PluginRun, int(run_id))
        except (TypeError, ValueError):
            run = None
        connection = self.session.get(PluginConnection, run.connection_id) if run is not None else None
        if connection is None or connection.owner_type != "user" or connection.owner_id != self.user_id():
            return {"err": "plugin.run_missing", "msg": "Plugin run was not found"}
        items = self.session.query(PluginRunItem).filter(PluginRunItem.run_id == run.id).order_by(PluginRunItem.id).all()
        return {"err": "ok", "run": run.to_public_dict(), "items": [item.to_public_dict(include_data=True) for item in items]}


# ---------------------------------------------------------------------------
# 内置文本工具（正文查找替换 / 繁简转换 / TXT 编码修复）
#
# 三个工具均为 builtin capability 插件（manifest 见
# webserver/plugins/runtime/builtin_capabilities.py），纯处理核心位于
# webserver/plugins/texttools/；本节负责书籍定位、临时文件编排与写回/入库。


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


@contextlib.contextmanager
def _tool_run(handler, plugin_key, params):
    """把一次改书操作记进 PluginRun。

    三个文本工具会真实改写用户书库里的文件，此前却完全在运行时之外：
    没有谁在什么时候对哪本书做了什么的记录，失败无从追溯，备份目录也不在
    任何界面里。这里补上审计锚点。
    """
    # 审计锚点必须存在：连接缺失时按需创建，而不是静默跳过记录。
    ensure_builtin_capability_installations(handler.session, handler.user_id(), loader.get_settings())
    run = None
    connection = (
        handler.session.query(PluginConnection)
        .join(PluginInstallation, PluginInstallation.id == PluginConnection.installation_id)
        .filter(
            PluginInstallation.plugin_key == plugin_key,
            PluginConnection.owner_type == "instance",
        )
        .first()
    )
    if connection is not None:
        now = datetime.datetime.now()
        run = PluginRun(
            connection_id=connection.id,
            action="run",
            trigger=params.pop("trigger", "manual"),
            status="running",
            requested_by=handler.user_id(),
            counts=dict(DEFAULT_COUNTS),
            input_data=dict(params),
            create_time=now,
            started_at=now,
        )
        handler.session.add(run)
        handler.session.commit()

    outcome = {"counts": {}, "data": {}}
    try:
        yield outcome
    except Exception as exc:
        if run is not None:
            run.status = "failed"
            run.error_code = getattr(exc, "code", "booktools.failed")
            run.error_message = str(exc)[:1000]
            run.finished_at = datetime.datetime.now()
            handler.session.commit()
        raise
    else:
        if run is not None:
            run.status = "succeeded"
            run.counts = {**DEFAULT_COUNTS, **outcome["counts"]}
            run.cursor_after = dict(outcome["data"])
            run.finished_at = datetime.datetime.now()
            handler.session.commit()


def _tool_backup_dir():
    convert_path = loader.get_settings().get("convert_path") or tempfile.gettempdir()
    path = os.path.join(str(convert_path), "texttools-backups")
    os.makedirs(path, exist_ok=True)
    return path


class UserBookToolsBooks(BaseHandler):
    @js
    @auth
    def get(self):
        keyword = (self.get_argument("query", "") or "").strip().lower()
        items = []
        for book in self.get_books():
            fmts = [f.upper() for f in (book.get("available_formats") or [])]
            usable = [fmt for fmt in ("EPUB", "TXT") if fmt in fmts]
            if not usable:
                continue
            authors = book.get("authors") or []
            if keyword:
                haystack = "%s %s" % (book.get("title") or "", " ".join(str(a) for a in authors))
                if keyword not in haystack.lower():
                    continue
            items.append(
                {
                    "id": book["id"],
                    "title": book.get("title") or "",
                    "authors": [str(a) for a in authors],
                    "formats": usable,
                    "timestamp": str(book.get("timestamp") or ""),
                }
            )
        items.sort(key=lambda item: item["timestamp"], reverse=True)
        return {"err": "ok", "books": items[:100], "total": len(items)}


class UserTextReplacePreview(BaseHandler):
    @js
    @auth
    async def post(self):
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
            result = await IOLoop.current().run_in_executor(
                None,
                functools.partial(replace_preview, fmt, src, pattern, replacement, use_regex),
            )
            result["err"] = "ok"
            result["book_id"] = book_id
            return result
        except (BookToolsError, RuntimeError) as exc:
            return _tool_error(exc)


class UserTextReplaceRun(BaseHandler):
    @js
    @is_admin
    async def post(self):
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
            apply_fn, rule_error = compile_rule(pattern, replacement, use_regex)
            if apply_fn is None:
                raise BookToolsError(rule_error)

            book = _tool_resolve_book(self, book_id)
            title = book.get("title") or "Unknown"
            fmt = pick_format(book, candidates=("TXT", "EPUB"))
            if fmt is None:
                raise BookToolsError("该书籍没有 TXT 或 EPUB 格式，无法执行替换")
            src = get_format_path(self.db, book_id, fmt)

            work_dir = _tool_workdir()
            out_path = os.path.join(work_dir, "replaced.%s" % fmt.lower())
            audit = {"book_id": book_id, "format": fmt, "output_mode": output_mode, "pattern": pattern}
            with _tool_run(self, TEXT_REPLACE_PLUGIN_KEY, audit) as outcome:
                matches = await IOLoop.current().run_in_executor(
                    None,
                    functools.partial(replace_txt_file if fmt == "TXT" else replace_epub_file, src, out_path, apply_fn),
                )

                rsp = {"err": "ok", "format": fmt, "matches": matches, "output_mode": output_mode}
                if output_mode == "overwrite":
                    overwrite_format(self.db, book_id, fmt, out_path)
                    rsp["book_id"] = book_id
                else:
                    suffix = str(req.get("suffix") or "").strip() or "（正文替换版）"
                    rsp["book_id"] = import_as_new_book(
                        self.db, self.session, book_id, out_path, title_suffix=suffix, collector_id=self.user_id()
                    )
                outcome["counts"] = {"fetched": 1, "updated": matches}
                outcome["data"] = {"book_id": rsp["book_id"], "matches": matches}
            logging.info(
                "[booktools] text-replace done: %s book=%s hits=%d mode=%s [uid:%s]",
                fmt,
                title,
                matches,
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
    async def post(self):
        req = _body(self)
        try:
            book_id = _tool_book_id(req)
            book = _tool_resolve_book(self, book_id)
            fmts = [f.upper() for f in (book.get("available_formats") or [])]
            if "TXT" not in fmts:
                raise BookToolsError("该书籍没有 TXT 格式，无法执行检测")
            src = get_format_path(self.db, book_id, "TXT")
            with open(src, "rb") as f:
                data = f.read(ANALYZE_LIMIT)
            report = await IOLoop.current().run_in_executor(None, functools.partial(analyze_bytes, data))
            report["err"] = "ok"
            report["book_id"] = book_id
            return report
        except (BookToolsError, RuntimeError) as exc:
            return _tool_error(exc)


class UserTxtFixerRun(BaseHandler):
    @js
    @is_admin
    async def post(self):
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

            with open(src, "rb") as f:
                data = f.read()
            text, report = await IOLoop.current().run_in_executor(None, functools.partial(fix_bytes, data))
            if report.get("unrecoverable"):
                raise BookToolsError("文件疑似多重误读乱码（反转循环），无法自动修复")
            if report.get("garbage") and not report.get("mojibake"):
                raise BookToolsError("文件疑似二进制或混用编码，无法安全修复（编码：%s）" % report.get("encoding"))

            work_dir = _tool_workdir()
            out_path = os.path.join(work_dir, "fixed.txt")
            with open(out_path, "wb") as f:
                f.write(text.encode("utf-8"))  # UTF-8 无 BOM

            rsp = {
                "err": "ok",
                "encoding": report.get("encoding"),
                "mojibake": report.get("mojibake", False),
                "output_mode": output_mode,
            }
            audit = {"book_id": book_id, "output_mode": output_mode, "encoding": report.get("encoding")}
            with _tool_run(self, TXT_FIXER_PLUGIN_KEY, audit) as outcome:
                if output_mode == "overwrite":
                    overwrite_format(self.db, book_id, "TXT", out_path)
                    rsp["book_id"] = book_id
                else:
                    rsp["book_id"] = import_as_new_book(
                        self.db, self.session, book_id, out_path, title_suffix="（编码修复版）", collector_id=self.user_id()
                    )
                outcome["counts"] = {"fetched": 1, "updated": 1}
                outcome["data"] = {"book_id": rsp["book_id"], "encoding": report.get("encoding")}
            logging.info(
                "[booktools] txt-fixer done: book=%s enc=%s mode=%s [uid:%s]",
                title,
                report.get("encoding"),
                output_mode,
                self.user_id(),
            )
            return rsp
        except (BookToolsError, RuntimeError) as exc:
            return _tool_error(exc)
        finally:
            if work_dir:
                shutil.rmtree(work_dir, ignore_errors=True)


# 支持的转换方向（与 webserver/plugins/texttools/config/ 配置一致）
ZH_DIRECTIONS = ("t2s", "tw2s", "tw2sp", "s2t", "s2tw", "s2twp", "t2tw", "tw2t")
# 方向 → 目标语言代码（calibre 语言码：zh=简体，zht=繁体）
ZH_DIRECTION_LANG = {
    "t2s": "zh",
    "tw2s": "zh",
    "tw2sp": "zh",
    "s2t": "zht",
    "s2tw": "zht",
    "s2twp": "zht",
    "t2tw": "zht",
    "tw2t": "zht",
}
# 增强词表仅对繁体→简体方向生效
ZH_A5_DIRECTIONS = ("t2s", "tw2s")
A5_PHRASES_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "plugins", "texttools", "a5_phrases.txt"
)
# 另存为新书时的标题后缀
ZH_NEW_BOOK_SUFFIX = {"zh": "（简体版）", "zht": "（繁體版）"}


def _zh_sync_book_meta(db, book_id, lang, convert=None):
    """替换模式下同步库内标题/作者/语言（不加后缀），保持与转换后文件一致。

    封面不受影响：set_metadata 只会更新提供的封面、从不删除现有封面。
    """
    try:
        mi = db.get_metadata(book_id, index_is_id=True)
        if convert is not None:
            if mi.title:
                mi.title = convert(mi.title)
                mi.title_sort = utils.get_title_sort(mi.title)
            if mi.authors:
                mi.authors = [convert(a) for a in mi.authors]
                mi.author_sort = None  # 名字已转换，排序键由 calibre 按新名字重算
        mi.languages = [lang]
        db.set_metadata(book_id, mi, force_changes=True)
    except Exception as err:
        logging.warning("[booktools] Failed to update metadata for book_id=%d: %s", book_id, err)


class UserZhConverterRun(BaseHandler):
    @js
    @is_admin
    async def post(self):
        req = _body(self)
        work_dir = None
        try:
            book_id = _tool_book_id(req)
            direction = str(req.get("direction") or "")
            if direction not in ZH_DIRECTIONS:
                raise BookToolsError("不支持的转换方向：%s" % direction)
            use_a5 = bool(req.get("use_a5"))
            convert_title = bool(req.get("convert_title"))
            backup = bool(req.get("backup"))
            output_mode = req.get("output_mode") or "new"
            if output_mode not in ("new", "replace"):
                raise BookToolsError("参数错误：output_mode 必须为 new 或 replace")

            extra_dicts = [A5_PHRASES_FILE] if (use_a5 and direction in ZH_A5_DIRECTIONS) else []
            engine = OpenCC(direction, extra_dicts=extra_dicts)

            book = _tool_resolve_book(self, book_id)
            title = book.get("title") or "Unknown"
            # 繁简转换优先处理 EPUB（保留目录结构），无 EPUB 时退回 TXT
            fmt = pick_format(book, candidates=("EPUB", "TXT"))
            if fmt is None:
                raise BookToolsError("该书籍没有 EPUB / TXT 格式，无法转换")
            src = get_format_path(self.db, book_id, fmt)

            work_dir = _tool_workdir()
            out_path = os.path.join(work_dir, "converted.%s" % fmt.lower())
            lang = ZH_DIRECTION_LANG[direction]

            def _convert_job():
                if fmt == "EPUB":
                    convert_epub(src, out_path, engine.convert, convert_metadata=convert_title)
                    return ""
                return convert_txt_file(src, out_path, engine.convert)

            source_encoding = await IOLoop.current().run_in_executor(None, _convert_job)

            rsp = {
                "err": "ok",
                "direction": direction,
                "direction_label": DIRECTION_LABELS.get(direction, direction),
                "format": fmt,
                "source_encoding": source_encoding,
                "output_mode": output_mode,
            }
            audit = {"book_id": book_id, "format": fmt, "direction": direction, "output_mode": output_mode}
            with _tool_run(self, ZH_CONVERTER_PLUGIN_KEY, audit) as outcome:
                backup_dir = _tool_backup_dir() if backup else None
                if output_mode == "replace":
                    overwrite_format(self.db, book_id, fmt, out_path, backup_dir=backup_dir)
                    _zh_sync_book_meta(self.db, book_id, lang, engine.convert if convert_title else None)
                    rsp["book_id"] = book_id
                else:
                    suffix_engine = engine.convert if convert_title else None
                    rsp["book_id"] = import_as_new_book(
                        self.db,
                        self.session,
                        book_id,
                        out_path,
                        title_suffix=ZH_NEW_BOOK_SUFFIX.get(lang, ""),
                        language=lang,
                        convert_text=suffix_engine,
                        collector_id=self.user_id(),
                    )
                outcome["counts"] = {"fetched": 1, "updated": 1}
                # 备份路径此前不在任何界面里，写进 run 后可追溯。
                outcome["data"] = {"book_id": rsp["book_id"], "backup_dir": backup_dir or ""}
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


def _weread_connection(handler):
    installation = handler.session.query(PluginInstallation).filter(PluginInstallation.plugin_key == WEREAD_PLUGIN_KEY).first()
    if installation is None:
        return None, None
    connection = (
        handler.session.query(PluginConnection)
        .filter(
            PluginConnection.installation_id == installation.id,
            PluginConnection.owner_type == "user",
            PluginConnection.owner_id == handler.user_id(),
            PluginConnection.role == DEFAULT_CONNECTION_ROLE,
        )
        .first()
    )
    return installation, connection


def _ensure_weread_connection(handler, api_key=None):
    installation, connection = _weread_connection(handler)
    if installation is None:
        installation = install_builtin(handler.session, WEREAD_PLUGIN_KEY, handler.user_id())
    if not installation.enabled:
        raise PluginRuntimeError("plugin.installation_disabled", "WeRead integration is disabled")
    if connection is None or api_key:
        connection = save_connection(
            handler.session,
            loader.get_settings(),
            installation.id,
            "user",
            handler.user_id(),
            {"api_key": api_key.strip()} if api_key else {},
            name="微信读书",
            role=DEFAULT_CONNECTION_ROLE,
        )
    if not connection.enabled:
        raise PluginRuntimeError("plugin.connection_disabled", "WeRead connection is disabled")
    return connection


def _weread_api_key(handler, connection):
    secret = handler.session.get(PluginSecret, connection.secret_id) if connection else None
    if secret is None:
        raise PluginRuntimeError("plugin.credentials_missing", "Provide a WeRead API key")
    values = SecretCipher(loader.get_settings()).decrypt(secret.ciphertext)
    api_key = str(values.get("api_key") or "")
    if not api_key:
        raise PluginRuntimeError("plugin.credentials_missing", "Provide a WeRead API key")
    return api_key


def _weread_state(handler):
    _, connection = _weread_connection(handler)
    if connection is None:
        return {"connection": None, "runs": []}
    secret = handler.session.get(PluginSecret, connection.secret_id)
    runs = (
        handler.session.query(PluginRun)
        .filter(PluginRun.connection_id == connection.id)
        .order_by(PluginRun.id.desc())
        .limit(20)
        .all()
    )
    return {"connection": connection.to_public_dict(secret), "runs": [run.to_public_dict() for run in runs]}


class UserWeread(BaseHandler):
    @js
    @auth
    def get(self):
        return {
            "err": "ok",
            **_weread_state(self),
            "operations": [
                "search",
                "book_info",
                "chapters",
                "progress",
                "shelf",
                "statistics",
                "notebooks",
                "highlights",
                "my_reviews",
                "popular_highlights",
                "underline_stats",
                "highlight_reviews",
                "review_detail",
                "public_reviews",
                "recommendations",
                "similar",
                "friends_reading",
            ],
            "read_only": True,
            "skill_version": "1.0.4",
        }


class UserWereadQuery(BaseHandler):
    @js
    @auth
    def post(self):
        connection = None
        try:
            req = _body(self)
            api_key = req.get("api_key")
            if api_key is not None and (not isinstance(api_key, str) or not api_key.strip()):
                raise PluginRuntimeError("plugin.credentials_invalid", "WeRead API key must be a non-empty string")
            params = req.get("params", {})
            if not isinstance(params, dict):
                raise PluginRuntimeError("params.invalid", "WeRead query parameters must be an object")
            connection = _ensure_weread_connection(self, api_key)
            stored_key = _weread_api_key(self, connection)
            data = WereadProvider().query(stored_key, req.get("operation", ""), params)
            connection.health = "healthy"
            connection.health_message = "WeRead read-only API connected"
            connection.last_tested_at = datetime.datetime.now()
            self.session.commit()
            secret = self.session.get(PluginSecret, connection.secret_id)
            return {
                "err": "ok",
                "connection": connection.to_public_dict(secret),
                "data": redact(data, {"api_key": stored_key}),
            }
        except (PluginRuntimeError, ProviderError, SecretCipherError, TypeError, ValueError) as exc:
            if connection is not None and isinstance(exc, ProviderError):
                connection.health = "unauthorized" if isinstance(exc, ProviderAuthError) else "degraded"
                connection.health_message = str(exc)
                connection.last_tested_at = datetime.datetime.now()
                self.session.commit()
            return _error(exc)


class UserWereadImport(BaseHandler):
    def _allowed_book_ids(self):
        return [book_id for book_id in all_book_ids(self.db) if self.get_book(book_id, raise_exception=False) is not None]

    @js
    @auth
    def get(self):
        return {"err": "ok", **_weread_state(self)}

    @js
    @auth
    def post(self):
        try:
            req = _body(self)
            action = req.get("action", "preview")
            if action not in {"test", "preview", "run"}:
                raise PluginRuntimeError("plugin.action_invalid", "Unsupported WeRead import action")
            export_data = req.get("export")
            api_key = req.get("api_key")
            if api_key is not None and (not isinstance(api_key, str) or not api_key.strip()):
                raise PluginRuntimeError("plugin.credentials_invalid", "WeRead API key must be a non-empty string")

            connection = _ensure_weread_connection(self, api_key)
            if export_data is None and not api_key:
                secret = self.session.get(PluginSecret, connection.secret_id) if connection else None
                if secret is None or not secret.mask_hint:
                    raise PluginRuntimeError(
                        "plugin.credentials_missing",
                        "Provide a WeRead API key or official export JSON",
                    )

            allowed_book_ids = self._allowed_book_ids()
            matches = req.get("matches") or {}
            if not isinstance(matches, dict):
                raise PluginRuntimeError("plugin.request_invalid", "matches must be an object")
            for source_book_id, book_id in matches.items():
                try:
                    confirm_match(
                        self.session,
                        connection.id,
                        str(source_book_id),
                        int(book_id),
                        self.user_id(),
                        self.db,
                        allowed_book_ids,
                    )
                except (TypeError, ValueError) as exc:
                    raise PluginRuntimeError("plugin.match_book_forbidden", str(exc)) from exc

            input_data = {"allowed_book_ids": allowed_book_ids}
            if export_data is not None:
                input_data["export"] = export_data
            runtime = PluginRuntime(self.session, loader.get_settings(), calibre_db=self.db)
            run = runtime.prepare_run(
                connection.id,
                action,
                self.user_id(),
                trigger="manual",
                input_data=input_data,
            )
            runtime.execute(run.id)
            self.session.refresh(run)
            items = self.session.query(PluginRunItem).filter(PluginRunItem.run_id == run.id).order_by(PluginRunItem.id).all()
            return {
                "err": "ok",
                "connection": connection.to_public_dict(self.session.get(PluginSecret, connection.secret_id)),
                "run": run.to_public_dict(),
                "items": [item.to_public_dict(include_data=True) for item in items],
            }
        except (PluginRuntimeError, SecretCipherError, TypeError, ValueError) as exc:
            return _error(exc)


def routes():
    return [
        (r"/api/admin/plugins", AdminPlugins),
        (r"/api/admin/plugins/install", AdminPluginInstall),
        (r"/api/admin/plugins/opds-service", AdminPluginOpdsService),
        (r"/api/admin/plugins/installations/([0-9]+)/state", AdminPluginInstallationState),
        (r"/api/admin/plugins/connections", AdminPluginConnections),
        (r"/api/admin/plugins/connections/([0-9]+)/state", AdminPluginConnectionState),
        (r"/api/admin/plugins/connections/([0-9]+)/(test|preview|run|retry|rollback)", AdminPluginAction),
        (r"/api/admin/plugins/runs", AdminPluginRuns),
        (r"/api/admin/plugins/runs/([0-9]+)", AdminPluginRunDetail),
        (r"/api/plugins/connections", UserPluginConnections),
        (r"/api/plugins/connections/([0-9]+)/(test|preview|run|retry|rollback)", UserPluginAction),
        (r"/api/plugins/runs", UserPluginRuns),
        (r"/api/plugins/runs/([0-9]+)", UserPluginRunDetail),
        (r"/api/plugins/weread", UserWeread),
        (r"/api/plugins/weread/query", UserWereadQuery),
        (r"/api/plugins/weread/import", UserWereadImport),
        (r"/api/plugins/tools/books", UserBookToolsBooks),
        (r"/api/plugins/tools/text-replace/preview", UserTextReplacePreview),
        (r"/api/plugins/tools/text-replace/run", UserTextReplaceRun),
        (r"/api/plugins/tools/txt-fixer/analyze", UserTxtFixerAnalyze),
        (r"/api/plugins/tools/txt-fixer/run", UserTxtFixerRun),
        (r"/api/plugins/tools/zh-converter/run", UserZhConverterRun),
    ]
