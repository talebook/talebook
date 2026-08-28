#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import datetime
import logging
import os
import traceback

import sqlalchemy
import tornado

from webserver import loader
from webserver.handlers.base import BaseHandler, auth, is_admin, js
from webserver.i18n import _
from webserver.models import ScanFile
from webserver.services.media_analysis import SUPPORTED_MEDIA_FORMATS
from webserver.services.scan import IMPORT_MODE_MOVE, ScanService, normalize_import_mode


CONF = loader.get_settings()
SCAN_EXT = sorted(SUPPORTED_MEDIA_FORMATS)
SCAN_DIR_PREFIX = "/data/"  # 限定扫描必须在/data/目录下，以防黑客扫描到其他系统目录


def _json_body(request):
    if not request.body:
        return {}
    return tornado.escape.json_decode(request.body)


def _normalize_path(path):
    if not path:
        return ""
    return os.path.realpath(os.path.abspath(os.path.expanduser(str(path))))


def _configured_allowed_roots():
    roots = CONF.get("import_allowed_roots") or [CONF.get("scan_upload_path", "/data/books/imports/")]
    if isinstance(roots, str):
        roots = [item.strip() for item in roots.split(",") if item.strip()]
    roots = list(roots)
    if CONF.get("scan_upload_path"):
        roots.append(CONF["scan_upload_path"])
    normalized = []
    for root in roots:
        path = _normalize_path(root)
        if path and path not in normalized:
            normalized.append(path)
    return normalized or [_normalize_path(SCAN_DIR_PREFIX)]


def _is_path_in_roots(path, roots=None):
    path = _normalize_path(path)
    if not path:
        return False
    roots = roots or _configured_allowed_roots()
    for root in roots:
        try:
            if os.path.commonpath([path, root]) == root:
                return True
        except ValueError:
            continue
    return False


def _safe_directory_for_listing(requested, roots):
    fallback = roots[0] if roots else _normalize_path(SCAN_DIR_PREFIX)
    requested_path = _normalize_path(requested)
    if not requested_path:
        return fallback

    for root in roots:
        if not _is_path_in_roots(requested_path, [root]):
            continue
        relative = os.path.relpath(requested_path, root)
        if relative in ("", "."):
            return root

        parts = [part for part in relative.split(os.sep) if part and part != "."]
        if any(part == ".." or (os.path.altsep and os.path.altsep in part) for part in parts):
            continue

        current = root
        valid = True
        for part in parts:
            matched_name = None
            try:
                for name in os.listdir(current):
                    if name == part:
                        matched_name = name
                        break
            except OSError:
                valid = False
                break
            if matched_name is None:
                valid = False
                break

            child = os.path.join(current, matched_name)
            if os.path.islink(child) or not os.path.isdir(child):
                valid = False
                break
            current = _normalize_path(child)

        if valid:
            return current

    return fallback


def _directory_message(result):
    if not result["in_allowed_roots"]:
        return _("该目录不在允许的导入范围内，请选择允许的导入目录。")
    if not result["exists"]:
        return _("目录不存在，请检查路径或先在服务器上创建目录。")
    if not result["is_dir"]:
        return _("该路径不是目录，请选择文件夹。")
    if result["is_symlink"]:
        return _("默认不跟随软链接目录。")
    if not result["readable"]:
        return _("Talebook 无法读取该目录，请检查目录权限。")
    if not result["writable"]:
        return _("目录不可写，仍可读取导入；剪切模式将不可用。")
    if result["supported_file_count"] == 0:
        return _("目录当前为空。保存后可手动扫描或开启自动监控。")
    if result["truncated"]:
        return _("目录内文件较多，系统将分批扫描并异步导入。")
    return _("目录可用。发现 %d 个支持格式文件。") % result["supported_file_count"]


def check_import_directory(path, max_files=None):
    roots = _configured_allowed_roots()
    normalized = _normalize_path(path)
    max_files = max_files or int(CONF.get("import_scan_batch_size", 500))
    result = {
        "path": normalized,
        "allowed_roots": roots,
        "exists": os.path.exists(normalized),
        "is_dir": os.path.isdir(normalized),
        "is_symlink": os.path.islink(normalized),
        "readable": False,
        "writable": False,
        "in_allowed_roots": _is_path_in_roots(normalized, roots),
        "file_count": 0,
        "supported_file_count": 0,
        "truncated": False,
        "checked_at": datetime.datetime.now().isoformat(timespec="seconds"),
        "status": "error",
        "msg": "",
    }
    if result["exists"] and result["is_dir"]:
        result["readable"] = os.access(normalized, os.R_OK | os.X_OK)
        result["writable"] = os.access(normalized, os.W_OK)

    if (
        result["in_allowed_roots"]
        and result["exists"]
        and result["is_dir"]
        and not result["is_symlink"]
        and result["readable"]
    ):
        try:
            for dirpath, dirnames, filenames in os.walk(normalized):
                dirnames[:] = [
                    d
                    for d in dirnames
                    if not (d.startswith(".") or d.startswith("@__") or os.path.islink(os.path.join(dirpath, d)))
                ]
                for fname in filenames:
                    if fname.startswith("."):
                        continue
                    fpath = os.path.join(dirpath, fname)
                    if os.path.islink(fpath) or not os.path.isfile(fpath):
                        continue
                    result["file_count"] += 1
                    if fpath.split(".")[-1].lower() in SCAN_EXT:
                        result["supported_file_count"] += 1
                    if result["file_count"] >= max_files + 1:
                        result["truncated"] = True
                        break
                if result["truncated"]:
                    break
        except OSError as err:
            result["readable"] = False
            result["msg"] = str(err)

    hard_error = (
        not result["in_allowed_roots"]
        or not result["exists"]
        or not result["is_dir"]
        or result["is_symlink"]
        or not result["readable"]
    )
    if hard_error:
        result["status"] = "error"
    elif not result["writable"]:
        result["status"] = "warning"
    else:
        result["status"] = "ok"
    result["msg"] = result["msg"] or _directory_message(result)
    return result


class Scanner:
    def __init__(self, calibre_db, session, user_id=None):
        self.db = calibre_db
        self.user_id = user_id
        self.session = session

    def save_or_rollback(self, row):
        try:
            row.save()
            self.session.commit()
            bid = "[ book-id=%s ]" % row.book_id
            logging.error(
                "update: status=%-5s, path=%s %s",
                row.status,
                row.path,
                bid if row.book_id > 0 else "",
            )
            return True
        except Exception as err:
            logging.error(traceback.format_exc())
            self.session.rollback()
            logging.error("save error: %s", err)
            return False

    def summary(self):
        done_status = [ScanFile.EXIST, ScanFile.IMPORTED, ScanFile.INDEXED]
        query = self.session.query(ScanFile)
        total = query.count()
        done = query.filter(ScanFile.status.in_(done_status)).count()
        failed = query.filter(ScanFile.status.in_([ScanFile.FAILED, ScanFile.DELETE_FAILED])).count()
        todo = total - done - failed
        return {"total": total, "done": done, "todo": todo, "failed": failed}

    def run_scan(self, path_dir, limit=None):
        # 直接调用异步服务进行扫描
        ScanService().do_scan(path_dir, limit=limit)
        # 由于do_scan是异步的，我们无法立即知道结果，所以总是返回1表示任务已启动
        return 1

    def delete(self, hashlist):
        query = self.session.query(ScanFile)
        if isinstance(hashlist, (list, tuple)):
            query = query.filter(ScanFile.hash.in_(hashlist))
        elif isinstance(hashlist, str):
            query = query.filter(ScanFile.hash == hashlist)
        count = query.delete()
        self.session.commit()
        return count

    def resume_last_import(self):
        # TODO
        return False

    def build_query(self, hashlist):
        query = self.session.query(ScanFile).filter(ScanFile.status == ScanFile.READY)  # .filter(ScanFile.import_id == 0)
        if isinstance(hashlist, (list, tuple)):
            query = query.filter(ScanFile.hash.in_(hashlist))
        elif isinstance(hashlist, str):
            query = query.filter(ScanFile.hash == hashlist)
        return query

    def run_import(self, hashlist, delete_after=False, import_mode=None):
        if self.resume_last_import():
            return 1

        total = self.build_query(hashlist).count()
        ScanService().do_import(hashlist, self.user_id, delete_after, import_mode=import_mode)
        return total

    def import_status(self):
        import_id = self.session.query(sqlalchemy.func.max(ScanFile.import_id)).scalar()
        if import_id is None:
            return (0, {})
        query = self.session.query(ScanFile.status).filter(ScanFile.import_id == import_id)
        return (import_id, self.count(query))

    def scan_status(self):
        scan_id = self.session.query(sqlalchemy.func.max(ScanFile.scan_id)).scalar()
        if scan_id is None:
            return (0, {})
        query = self.session.query(ScanFile.status).filter(ScanFile.scan_id == scan_id)
        return (scan_id, self.count(query))

    def count(self, query):
        rows = query.all() if query else []
        count = {
            "total": len(rows),
            ScanFile.NEW: 0,
            ScanFile.DROP: 0,
            ScanFile.EXIST: 0,
            ScanFile.READY: 0,
            ScanFile.QUEUED: 0,
            ScanFile.IMPORTING: 0,
            ScanFile.IMPORTED: 0,
            ScanFile.INDEXED: 0,
            ScanFile.DELETE_FAILED: 0,
            ScanFile.FAILED: 0,
        }
        for row in rows:
            if row.status not in count:
                count[row.status] = 0
            count[row.status] += 1
        return count


class ScanList(BaseHandler):
    @js
    @auth
    def get(self):
        if not self.admin_user:
            return {"err": "permission.not_admin", "msg": _("当前用户非管理员")}

        num = int(self.get_argument("num", 20))
        # 当 num <= 0 时，表示显示全部
        if num <= 0:
            num = None
        page = max(0, int(self.get_argument("page", 1)) - 1)
        sort = self.get_argument("sort", "create_time")
        desc = self.get_argument("desc", "true")
        filter = self.get_argument("filter", "all")
        logging.debug("num=%s, page=%d, sort=%s, desc=%s" % (num, page, sort, desc))

        # get order by query args
        order = {
            "id": ScanFile.id,
            "path": ScanFile.path,
            "name": ScanFile.name,
            "create_time": ScanFile.create_time,
            "update_time": ScanFile.update_time,
        }.get(sort, ScanFile.create_time)
        order = order.asc() if desc == "false" else order.desc()
        query = self.session.query(ScanFile).order_by(order)

        done_status = [ScanFile.EXIST, ScanFile.IMPORTED, ScanFile.INDEXED]
        failed_status = [ScanFile.FAILED, ScanFile.DELETE_FAILED]
        if filter == "todo":
            query = query.filter(ScanFile.status.not_in(done_status + failed_status))
        elif filter == "done":
            query = query.filter(ScanFile.status.in_(done_status))
        elif filter == "failed":
            query = query.filter(ScanFile.status.in_(failed_status))
        total = query.count()

        # 当 num 为 None 时，显示全部数据，不分页
        if num is None:
            query_results = query.all()
        else:
            start = page * num
            query_results = query.limit(num).offset(start).all()
        response = []
        for s in query_results:
            d = {
                "id": s.id,
                "path": s.path,
                "hash": s.hash,
                "title": s.title,
                "author": s.author,
                "publisher": s.publisher,
                "tags": s.tags,
                "status": s.status,
                "book_id": s.book_id,
                "data": s.data or {},
                "create_time": (s.create_time.strftime("%Y-%m-%d %H:%M:%S") if s.create_time else "N/A"),
                "update_time": (s.update_time.strftime("%Y-%m-%d %H:%M:%S") if s.update_time else "N/A"),
            }
            response.append(d)

        m = Scanner(self.db, self.session)
        return {
            "err": "ok",
            "items": response,
            "total": total,
            "summary": m.summary(),
            "scan_dir": CONF["scan_upload_path"],
            "import_mode": normalize_import_mode(CONF.get("import_mode")),
            "auto_watch_enabled": bool(CONF.get("import_auto_watch_enabled", False)),
            "watch_status": ScanService().get_watch_status(),
        }


class ScanMark(BaseHandler):
    @js
    @is_admin
    def post(self):
        return {"err": "ok", "msg": _("发送成功")}


class ImportSettings(BaseHandler):
    def _settings_payload(self, directory_check=None):
        path = _normalize_path(CONF.get("scan_upload_path", ""))
        return {
            "scan_upload_path": path,
            "import_mode": normalize_import_mode(CONF.get("import_mode")),
            "auto_watch_enabled": bool(CONF.get("import_auto_watch_enabled", False)),
            "allowed_roots": _configured_allowed_roots(),
            "directory_check": directory_check or check_import_directory(path),
            "watch_status": ScanService().get_watch_status(),
        }

    @js
    @is_admin
    def get(self):
        return {"err": "ok", "settings": self._settings_payload()}

    @js
    @is_admin
    def post(self):
        req = _json_body(self.request)
        path = _normalize_path(req.get("scan_upload_path") or req.get("path") or CONF.get("scan_upload_path", ""))
        import_mode = normalize_import_mode(req.get("import_mode"))
        auto_watch_enabled = req.get(
            "auto_watch_enabled",
            req.get("import_auto_watch_enabled", CONF.get("import_auto_watch_enabled", False)),
        )
        if isinstance(auto_watch_enabled, str):
            auto_watch_enabled = auto_watch_enabled.lower() in ("1", "true", "yes", "on")
        auto_watch_enabled = bool(auto_watch_enabled)

        directory_check = check_import_directory(path)
        if directory_check["status"] == "error":
            return {"err": "params.path", "msg": directory_check["msg"], "directory_check": directory_check}
        if import_mode == IMPORT_MODE_MOVE and not directory_check["writable"]:
            return {
                "err": "params.path_not_writable",
                "msg": _("剪切到书库需要删除源文件，请选择可写目录。"),
                "directory_check": directory_check,
            }

        args = loader.SettingsLoader()
        args.update(CONF)
        args["scan_upload_path"] = path
        args["import_mode"] = import_mode
        args["import_auto_watch_enabled"] = auto_watch_enabled

        from webserver.handlers.admin import SettingsSaverLogic

        result = SettingsSaverLogic().save_extra_settings(args)
        if result.get("err") != "ok":
            return result

        service = ScanService()
        if auto_watch_enabled:
            service.start_auto_watch(path, self.user_id(), import_mode=import_mode)
            msg = _("自动监控已开启，正在扫描当前目录")
        else:
            service.stop_auto_watch(_("自动监控已关闭，已排队任务会继续完成"))
            msg = _("导入设置已保存")

        return {
            "err": "ok",
            "msg": msg,
            "settings": self._settings_payload(directory_check=directory_check),
        }


class ImportDirectoryCheck(BaseHandler):
    @js
    @is_admin
    def post(self):
        req = _json_body(self.request)
        path = req.get("path") or req.get("scan_upload_path")
        result = check_import_directory(path)
        return {"err": "ok", "directory": result, "msg": result["msg"]}


class ImportDirectoryList(BaseHandler):
    @js
    @is_admin
    def get(self):
        roots = _configured_allowed_roots()
        requested = self.get_argument("path", "") or CONF.get("scan_upload_path") or roots[0]
        path = _safe_directory_for_listing(requested, roots)

        items = []
        try:
            names = sorted(os.listdir(path), key=lambda item: item.lower())
            for name in names:
                if name.startswith(".") or name.startswith("@__"):
                    continue
                child = os.path.join(path, name)
                is_symlink = os.path.islink(child)
                if not os.path.isdir(child):
                    continue
                items.append(
                    {
                        "name": name,
                        "path": _normalize_path(child),
                        "readable": os.access(child, os.R_OK | os.X_OK),
                        "writable": os.access(child, os.W_OK),
                        "is_symlink": is_symlink,
                        "in_allowed_roots": _is_path_in_roots(child, roots),
                    }
                )
        except OSError as err:
            return {"err": "params.path", "msg": str(err), "path": path, "items": [], "allowed_roots": roots}

        parent = _normalize_path(os.path.dirname(path))
        can_go_parent = (
            _is_path_in_roots(parent, roots) and parent != path and parent not in [os.path.dirname(root) for root in roots]
        )
        return {
            "err": "ok",
            "path": path,
            "parent": parent if can_go_parent else "",
            "allowed_roots": roots,
            "items": items,
        }


class ImportWatchStatus(BaseHandler):
    @js
    @is_admin
    def get(self):
        return {"err": "ok", "watch_status": ScanService().get_watch_status()}


class ScanRun(BaseHandler):
    @js
    @is_admin
    def post(self):
        path = CONF["scan_upload_path"]
        if not path.startswith(SCAN_DIR_PREFIX) and not _is_path_in_roots(path):
            return {
                "err": "params.error",
                "msg": _("书籍导入目录必须是%s的子目录") % SCAN_DIR_PREFIX,
            }
        directory_check = check_import_directory(path)
        if directory_check["status"] == "error":
            return {"err": "params.path", "msg": directory_check["msg"], "directory_check": directory_check}
        m = Scanner(self.db, self.session)
        total = m.run_scan(path, limit=CONF.get("import_scan_batch_size", 500))
        if total == 0:
            return {"err": "empty", "msg": _("目录中没有找到符合要求的书籍文件！")}
        return {"err": "ok", "msg": _("开始扫描了"), "total": total}


class ScanDelete(BaseHandler):
    @js
    @is_admin
    def post(self):
        req = tornado.escape.json_decode(self.request.body)
        hashlist = req["hashlist"]
        if not hashlist:
            return {"err": "params.error", "msg": _("参数错误")}
        if hashlist == "all":
            hashlist = None

        m = Scanner(self.db, self.session)
        count = m.delete(hashlist)
        return {"err": "ok", "msg": _("删除成功"), "count": count}


class ScanStatus(BaseHandler):
    @js
    @is_admin
    def get(self):
        m = Scanner(self.db, self.session)
        status = m.scan_status()[1]
        return {"err": "ok", "msg": _("成功"), "status": status, "summary": m.summary()}


class ImportRun(BaseHandler):
    @js
    @is_admin
    def post(self):
        req = tornado.escape.json_decode(self.request.body)
        hashlist = req["hashlist"]
        delete_after = req.get("delete_after", False)
        import_mode = normalize_import_mode(req.get("import_mode"), delete_after)
        if not hashlist:
            return {"err": "params.error", "msg": _("参数错误")}
        if hashlist == "all":
            hashlist = None

        m = Scanner(self.db, self.session, self.user_id())
        total = m.run_import(hashlist, delete_after, import_mode=import_mode)
        if total == 0:
            return {"err": "empty", "msg": _("没有等待导入书库的书籍！")}
        return {"err": "ok", "msg": _("扫描成功"), "import_mode": import_mode}


class ImportStatus(BaseHandler):
    @js
    @is_admin
    def get(self):
        m = Scanner(self.db, self.session)
        status = m.import_status()[1]
        return {"err": "ok", "msg": _("成功"), "status": status, "summary": m.summary()}


def routes():
    return [
        (r"/api/admin/scan/list", ScanList),
        (r"/api/admin/scan/run", ScanRun),
        (r"/api/admin/scan/status", ScanStatus),
        (r"/api/admin/scan/delete", ScanDelete),
        (r"/api/admin/scan/mark", ScanMark),
        (r"/api/admin/import/settings", ImportSettings),
        (r"/api/admin/import/directory/check", ImportDirectoryCheck),
        (r"/api/admin/import/directory/list", ImportDirectoryList),
        (r"/api/admin/import/watch/status", ImportWatchStatus),
        (r"/api/admin/import/run", ImportRun),
        (r"/api/admin/import/status", ImportStatus),
    ]
