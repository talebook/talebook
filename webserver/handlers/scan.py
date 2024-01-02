#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import logging
import traceback
from gettext import gettext as _

import sqlalchemy
import tornado

from webserver import loader
from webserver.handlers.base import BaseHandler, auth, js, is_admin
from webserver.models import ScanFile
from webserver.services.scan import ScanService

CONF = loader.get_settings()
SCAN_EXT = ["azw", "azw3", "epub", "mobi", "pdf", "txt"]
SCAN_DIR_PREFIX = "/data/"  # 限定扫描必须在/data/目录下，以防黑客扫描到其他系统目录


class Scanner:
    def __init__(self, calibre_db, ScopedSession, user_id=None):
        self.db = calibre_db
        self.user_id = user_id
        self.session = ScopedSession()

    def save_or_rollback(self, row):
        try:
            row.save()
            self.session.commit()
            bid = "[ book-id=%s ]" % row.book_id
            logging.error("update: status=%-5s, path=%s %s", row.status, row.path, bid if row.book_id > 0 else "")
            return True
        except Exception as err:
            logging.error(traceback.format_exc())
            self.session.rollback()
            logging.error("save error: %s", err)
            return False

    def run_scan(self, path_dir):
        ScanService().do_scan(path_dir)

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
        query = self.session.query(ScanFile).filter(
            ScanFile.status == ScanFile.READY
        )  # .filter(ScanFile.import_id == 0)
        if isinstance(hashlist, (list, tuple)):
            query = query.filter(ScanFile.hash.in_(hashlist))
        elif isinstance(hashlist, str):
            query = query.filter(ScanFile.hash == hashlist)
        return query

    def run_import(self, hashlist):
        if self.resume_last_import():
            return 1

        total = self.build_query(hashlist).count()
        ScanService().do_import(hashlist, self.user_id)
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
        rows = query.all()
        count = {
            "total": len(rows),
            ScanFile.NEW: 0,
            ScanFile.DROP: 0,
            ScanFile.EXIST: 0,
            ScanFile.READY: 0,
            ScanFile.IMPORTED: 0,
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
            return {"err": "permission.not_admin", "msg": _(u"当前用户非管理员")}

        num = max(10, int(self.get_argument("num", 20)))
        page = max(0, int(self.get_argument("page", 1)) - 1)
        sort = self.get_argument("sort", "access_time")
        desc = self.get_argument("desc", "desc")
        logging.debug("num=%d, page=%d, sort=%s, desc=%s" % (num, page, sort, desc))

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
        total = query.count()
        start = page * num

        response = []
        for s in query.limit(num).offset(start).all():
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
                "create_time": s.create_time.strftime("%Y-%m-%d %H:%M:%S") if s.create_time else "N/A",
                "update_time": s.update_time.strftime("%Y-%m-%d %H:%M:%S") if s.update_time else "N/A",
            }
            response.append(d)
        return {"err": "ok", "items": response, "total": total, "scan_dir": CONF["scan_upload_path"]}


class ScanMark(BaseHandler):
    @js
    @is_admin
    def post(self):
        return {"err": "ok", "msg": _(u"发送成功")}


class ScanRun(BaseHandler):
    @js
    @is_admin
    def post(self):
        path = CONF["scan_upload_path"]
        if not path.startswith(SCAN_DIR_PREFIX):
            return {"err": "params.error", "msg": _(u"书籍导入目录必须是%s的子目录") % SCAN_DIR_PREFIX}
        m = Scanner(self.db, self.settings["ScopedSession"])
        total = m.run_scan(path)
        if total == 0:
            return {"err": "empty", "msg": _("目录中没有找到符合要求的书籍文件！")}
        return {"err": "ok", "msg": _(u"开始扫描了"), "total": total}


class ScanDelete(BaseHandler):
    @js
    @is_admin
    def post(self):
        req = tornado.escape.json_decode(self.request.body)
        hashlist = req["hashlist"]
        if not hashlist:
            return {"err": "params.error", "msg": _(u"参数错误")}
        if hashlist == "all":
            hashlist = None

        m = Scanner(self.db, self.settings["ScopedSession"])
        count = m.delete(hashlist)
        return {"err": "ok", "msg": _(u"删除成功"), "count": count}


class ScanStatus(BaseHandler):
    @js
    @is_admin
    def get(self):
        m = Scanner(self.db, self.settings["ScopedSession"])
        status = m.scan_status()[1]
        return {"err": "ok", "msg": _(u"成功"), "status": status}


class ImportRun(BaseHandler):
    @js
    @is_admin
    def post(self):
        req = tornado.escape.json_decode(self.request.body)
        hashlist = req["hashlist"]
        if not hashlist:
            return {"err": "params.error", "msg": _(u"参数错误")}
        if hashlist == "all":
            hashlist = None

        m = Scanner(self.db, self.settings["ScopedSession"], self.user_id())
        total = m.run_import(hashlist)
        if total == 0:
            return {"err": "empty", "msg": _("没有等待导入书库的书籍！")}
        return {"err": "ok", "msg": _(u"扫描成功")}


class ImportStatus(BaseHandler):
    @js
    @is_admin
    def get(self):
        m = Scanner(self.db, self.settings["ScopedSession"])
        status = m.import_status()[1]
        return {"err": "ok", "msg": _(u"成功"), "status": status}


def routes():
    return [
        (r"/api/admin/scan/list", ScanList),
        (r"/api/admin/scan/run", ScanRun),
        (r"/api/admin/scan/status", ScanStatus),
        (r"/api/admin/scan/delete", ScanDelete),
        (r"/api/admin/scan/mark", ScanMark),
        (r"/api/admin/import/run", ImportRun),
        (r"/api/admin/import/status", ImportStatus),
    ]
