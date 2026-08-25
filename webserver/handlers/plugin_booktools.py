"""内置文本工具的 HTTP 编排（正文查找替换 / 繁简转换 / TXT 编码修复）。

三个工具均为 builtin capability 插件（manifest 见
webserver/plugins/runtime/builtin_capabilities.py），纯处理核心位于
webserver/plugins/texttools/；本模块负责书籍定位、权限校验、临时文件编排、
写回入库与审计。
"""

import functools
import logging
import os
import shutil
import tempfile

from tornado.ioloop import IOLoop

from webserver import loader, utils
from webserver.handlers.base import BaseHandler, auth, is_admin, js
from webserver.handlers.plugins_common import audit_run
from webserver.handlers.plugins_common import body as _body
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
from webserver.services.booktools import get_format_path, import_as_new_book, overwrite_format, pick_format, resolve_book


# 内置文本工具：改书操作需落 PluginRun，审计锚点挂在各自的实例连接上。
TEXT_REPLACE_PLUGIN_KEY = "talebook.tool.text-replace"
ZH_CONVERTER_PLUGIN_KEY = "talebook.tool.zh-converter"
TXT_FIXER_PLUGIN_KEY = "talebook.tool.txt-fixer"


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
            with audit_run(self, TEXT_REPLACE_PLUGIN_KEY, audit, error_code="booktools.failed") as outcome:
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
            with audit_run(self, TXT_FIXER_PLUGIN_KEY, audit, error_code="booktools.failed") as outcome:
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
            with audit_run(self, ZH_CONVERTER_PLUGIN_KEY, audit, error_code="booktools.failed") as outcome:
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


def routes():
    return [
        (r"/api/plugins/tools/books", UserBookToolsBooks),
        (r"/api/plugins/tools/text-replace/preview", UserTextReplacePreview),
        (r"/api/plugins/tools/text-replace/run", UserTextReplaceRun),
        (r"/api/plugins/tools/txt-fixer/analyze", UserTxtFixerAnalyze),
        (r"/api/plugins/tools/txt-fixer/run", UserTxtFixerRun),
        (r"/api/plugins/tools/zh-converter/run", UserZhConverterRun),
    ]
