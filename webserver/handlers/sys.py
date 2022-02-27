#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import os
import logging
import subprocess
import ssl
import tempfile
from gettext import gettext as _

from webserver import loader
from webserver.handlers.base import BaseHandler, auth, js

CONF = loader.get_settings()


class SSLHandlerLogic():
    def check_ssl_chain(self, crt_body, key_body):
        """return None if ok, else Err"""
        with tempfile.NamedTemporaryFile() as crt_file, tempfile.NamedTemporaryFile() as key_file:
            crt_file.write(crt_body)
            key_file.write(key_body)
            crt_file.flush()
            key_file.flush()
            return self.check_ssl_chain_files(crt_file.name, key_file.name)

    def check_ssl_chain_files(self, crt_file, key_file):
        ctx = ssl.SSLContext()
        try:
            ctx.load_cert_chain(crt_file, key_file)
        except ssl.SSLError as err:
            return err
        return None

    def save_files(self, crt_body, key_body):
        with open(CONF["ssl_crt_file"], "w+b") as f:
            f.write(crt_body)

        with open(CONF["ssl_key_file"], "w+b") as f:
            f.write(key_body)

    def nginx_check(self):
        return subprocess.run(["nginx", "-t"], check=True)

    def nginx_reload(self):
        return subprocess.run(["service", "nginx", "reload"], check=True)

    def run(self, ssl_crt, ssl_key):
        err = self.check_ssl_chain(ssl_crt, ssl_key)
        if err is not None:
            return {"err": "params.ssl_error", "msg": _(u"证书或密钥校验失败: %s" % err)}

        try:
            self.save_files(ssl_crt, ssl_key)
        except Exception as err:
            import traceback

            logging.error(traceback.format_exc())
            return {"err": "internal.ssl_save_error", "msg": _(u"证书存储失败: %s" % err)}

        # testing nginx config
        try:
            self.nginx_check()
        except subprocess.CalledProcessError as err:
            return {"err": "internal.nginx_test_error", "msg": _(u"NGINX配置异常: %s") % err}

        # reload nginx config
        try:
            self.nginx_reload()
        except subprocess.CalledProcessError as err:
            return {"err": "internal.nginx_reload_error", "msg": _(u"NGINX重新加载配置异常: %s") % err}

        return {"err": "ok"}


class SSLHandler(BaseHandler):
    def get_upload_file(self):
        # for unittest mock
        ssl_crt = self.request.files["ssl_crt"][0]
        ssl_key = self.request.files["ssl_key"][0]
        return (ssl_crt["body"], ssl_key["body"])

    # TODO:
    #   - add GET interface to show the hostname/outdate of certifacates

    @js
    @auth
    def post(self):
        logic = SSLHandlerLogic()

        logging.error("got request")
        if not self.is_admin():
            return {"err": "permission", "msg": _(u"无权操作")}

        ssl_crt, ssl_key = self.get_upload_file()
        return logic.run(ssl_crt, ssl_key)

def routes():
    return [
        (r"/api/sys/ssl", SSLHandler),
    ]
