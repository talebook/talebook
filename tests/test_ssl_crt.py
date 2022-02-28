#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import ssl
import subprocess
import warnings
from unittest import mock
from tests.test_main import TestWithAdminUser, setUpModule as init, testdir
from webserver.handlers.admin import SSLHandlerLogic


def setUpModule():
    init()


class TestUploadSSL(TestWithAdminUser):
    @mock.patch("webserver.handlers.admin.AdminSSL.get_upload_file")
    @mock.patch("webserver.handlers.admin.SSLHandlerLogic.save_files")
    @mock.patch("webserver.handlers.admin.SSLHandlerLogic.nginx_check")
    @mock.patch("webserver.handlers.admin.SSLHandlerLogic.nginx_reload")
    def test_good_crt(self, m4, m3, m2, m1):
        warnings.simplefilter("ignore", ResourceWarning)
        with open(testdir + "/cases/ssl.crt", "rb") as crt, open(testdir + "/cases/ssl.key", "rb") as key:
            m1.return_value = (crt.read(), key.read())
            m2.return_value = True
            m3.return_value = True
            m4.return_value = True

        d = self.json("/api/admin/ssl", method="POST", body="k=1", request_timeout=30)
        self.assertEqual(d["err"], "ok", d["msg"])

    @mock.patch("webserver.handlers.admin.AdminSSL.get_upload_file")
    @mock.patch("webserver.handlers.admin.SSLHandlerLogic.save_files")
    @mock.patch("webserver.handlers.admin.SSLHandlerLogic.nginx_check")
    @mock.patch("webserver.handlers.admin.SSLHandlerLogic.nginx_reload")
    def test_exception(self, m4, m3, m2, m1):
        warnings.simplefilter("ignore", ResourceWarning)
        with open(testdir + "/cases/ssl.crt", "rb") as crt, open(testdir + "/cases/ssl.key", "rb") as key:
            m1.return_value = (crt.read(), key.read())

        m2.side_effect = RuntimeError("save error")
        m3.side_effect = subprocess.CalledProcessError(1, "nginx error")
        m4.side_effect = subprocess.CalledProcessError(1, "nginx error")

        d = self.json("/api/admin/ssl", method="POST", body="k=1", request_timeout=30)
        self.assertEqual(d["err"], "internal.ssl_save_error", d["msg"])

        m2.side_effect = None
        d = self.json("/api/admin/ssl", method="POST", body="k=1", request_timeout=30)
        self.assertEqual(d["err"], "internal.nginx_test_error", d["msg"])

        m3.side_effect = None
        d = self.json("/api/admin/ssl", method="POST", body="k=1", request_timeout=30)
        self.assertEqual(d["err"], "internal.nginx_reload_error", d["msg"])

    def test_ssl_check_files(self):
        h = SSLHandlerLogic()

        crt = testdir + "/cases/ssl.crt"
        key = testdir + "/cases/ssl.key"
        self.assertEqual(h.check_ssl_chain_files(crt, key), None)

    def test_ssl_check_bad_files(self):
        h = SSLHandlerLogic()

        crt = testdir + "/cases/new.epub"
        key = testdir + "/cases/old.epub"
        self.assertIsInstance(h.check_ssl_chain_files(crt, key), ssl.SSLError)
