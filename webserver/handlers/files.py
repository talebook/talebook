#!/usr/bin/env python3
# -*- coding: UTF-8 -*-


import logging
import os
import re
import zipfile
from gettext import gettext as _

from tornado import web
from webserver import constants, loader
from webserver.services.convert import ConvertService
from webserver.handlers.base import BaseHandler

CONF = loader.get_settings()


class ImageHandler(BaseHandler):
    def send_error_of_not_invited(self):
        self.set_header("WWW-Authenticate", "Basic")
        self.set_status(401)
        raise web.Finish()

    def get(self, fmt, id, **kwargs):
        self.write(self.get_data(fmt, id, **kwargs))

    def get_data(self, fmt, id, **kwargs):
        "Serves files, covers, thumbnails, metadata from the calibre database"
        try:
            id = int(id)
        except ValueError:
            id = id.rpartition("_")[-1].partition(".")[0]
            match = re.search(r"\d+", id)
            if not match:
                raise web.HTTPError(404, "id:%s not an integer" % id)
            id = int(match.group())
        if not self.db.has_id(id):
            raise web.HTTPError(404, "id:%d does not exist in database" % id)
        if fmt == "thumb" or fmt.startswith("thumb_"):
            try:
                width, height = map(int, fmt.split("_")[1:])
            except:
                width, height = 60, 80
            return self.get_cover(
                id, thumbnail=True, thumb_width=width, thumb_height=height
            )
        if fmt == "cover":
            return self.get_cover(id)
        if fmt == "opf":
            return self.get_metadata_as_opf(id)
        raise web.HTTPError(404, "bad url")

    # Actually get content from the database {{{
    def get_cover(self, id, thumbnail=False, thumb_width=60, thumb_height=80):
        from calibre.utils.magick.draw import thumbnail as generate_thumbnail

        try:
            self.set_header("Content-Type", "image/jpeg")
            cover = self.db.cover(id, index_is_id=True)
            if cover is None:
                cover = self.default_cover
                updated = self.build_time
            else:
                updated = self.db.cover_last_modified(id, index_is_id=True)
            self.set_header("Last-Modified", self.last_modified(updated))

            if thumbnail:
                return generate_thumbnail(
                    cover, width=thumb_width, height=thumb_height
                )[-1]
            else:
                return cover
        except Exception as err:
            import traceback

            logging.error("Failed to generate cover:")
            logging.error(traceback.print_exc())
            raise web.HTTPError(404, "Failed to generate cover: %r" % err)

    def get_metadata_as_opf(self, id_):
        from calibre.ebooks.metadata.opf2 import metadata_to_opf

        self.set_header("Content-Type", "application/oebps-package+xml; charset=UTF-8")
        mi = self.db.get_metadata(id_, index_is_id=True)
        data = metadata_to_opf(mi)
        self.set_header("Last-Modified", self.last_modified(mi.last_modified))
        return data


class ProxyImageHandler(BaseHandler):
    def is_whitelist(self, host):
        whitelist = ["bcebos.com", "doubanio.com", "bdstatic.com"]
        for w in whitelist:
            if host.endswith(w):
                return True
        return False

    def get(self):
        url = self.get_argument("url")

        import urllib

        import requests

        p = urllib.parse.urlparse(url)
        if not self.is_whitelist(p.netloc):
            self.write("yoho")
            return

        headers = dict(constants.CHROME_HEADERS)
        headers["Referer"] = url
        r = requests.get(url, headers=headers)
        for k, v in r.headers.items():
            self.set_header(k, v)
        self.write(r.content)
        return


class ProgressHandler(BaseHandler):
    def get(self, id):
        book_id = int(id)
        path = ConvertService().get_path_progress(book_id)
        if not os.path.exists(path):
            raise web.HTTPError(404, log_message="nothing")
        txt = open(path).read()

        # erase all settings values from txt content
        for hidden in CONF.values():
            if isinstance(hidden, str):
                txt.replace(hidden, "XXX")
        self.write(txt)


class EpubReader(BaseHandler):
    def get(self, bid, path):
        if not CONF["ALLOW_GUEST_READ"] and not self.current_user:
            return self.redirect("/login")

        if self.current_user:
            if self.current_user.can_read():
                if not self.current_user.is_active():
                    raise web.HTTPError(403, reason=_(u"无权在线阅读，请先登录注册邮箱激活账号。"))
            else:
                raise web.HTTPError(403, reason=_(u"无权在线阅读"))

        book = self.get_book(bid)
        fpath = book.get("fmt_epub", None)
        if not fpath:
            raise web.HTTPError(404)

        with zipfile.ZipFile(fpath, 'r') as zf:
            if path not in zf.namelist():
                raise web.HTTPError(404)
            with zf.open(path) as f:
                self.write(f.read())


def routes():
    static_config = {"path": CONF["html_path"], "default_filename": "index.html"}
    return [
        (r"/get/pcover", ProxyImageHandler),
        (r"/get/progress/([0-9]+)", ProgressHandler),
        (r"/get/extract/([0-9]+)/(.*)", EpubReader),
        (r"/get/(.*)/(.*)", ImageHandler),
        (r"/(.*)", web.StaticFileHandler, static_config),
    ]
