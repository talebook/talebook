#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import base64
import contextlib
import datetime
import json
import urllib.parse
from unittest import mock

from tests.test_main import BaseHandler, TestApp, get_db
from tests.test_main import setUpModule as init
from webserver import demo_mode, loader, models
from webserver.settings import settings as DEFAULT_SETTINGS


def setUpModule():
    init()


@contextlib.contextmanager
def enabled_demo_mode(username="issue886_demo"):
    conf = loader.get_settings()
    original_mode = conf.get("DEMO_MODE")
    original_username = conf.get("DEMO_USERNAME")
    conf["DEMO_MODE"] = True
    conf["DEMO_USERNAME"] = username
    try:
        yield
    finally:
        conf["DEMO_MODE"] = original_mode
        conf["DEMO_USERNAME"] = original_username


class TestDemoMode(TestApp):
    @classmethod
    def setUpClass(cls):
        session = get_db()
        session.query(models.Reader).filter(
            models.Reader.username.in_(["issue886_demo", "issue886_other", "issue886_admin"])
        ).delete(synchronize_session=False)
        now = datetime.datetime(2020, 1, 2, 3, 4, 5)
        for username in ("issue886_demo", "issue886_other", "issue886_admin"):
            user = models.Reader(
                username=username,
                name=username,
                email="%s@example.com" % username,
                active=True,
                admin=(username == "issue886_admin"),
                permission="",
                create_time=now,
                update_time=now,
                access_time=now,
                extra={"kindle_email": ""},
            )
            user.set_secure_password("demo-password")
            session.add(user)
        session.commit()

    @classmethod
    def tearDownClass(cls):
        session = get_db()
        session.query(models.Reader).filter(
            models.Reader.username.in_(["issue886_demo", "issue886_other", "issue886_admin"])
        ).delete(synchronize_session=False)
        session.commit()

    @staticmethod
    def _auth_header(username):
        token = "%s:demo-password" % username
        encoded = base64.b64encode(token.encode("utf-8")).decode("ascii")
        return "Basic %s" % encoded

    def test_only_configured_account_can_sign_in(self):
        with enabled_demo_mode():
            allowed = urllib.parse.urlencode({"username": "issue886_demo", "password": "demo-password"})
            rsp = self.json("/api/user/sign_in", method="POST", body=allowed)
            self.assertEqual(rsp["err"], "ok")

            denied = urllib.parse.urlencode({"username": "issue886_other", "password": "demo-password"})
            rsp = self.json("/api/user/sign_in", method="POST", body=denied)
            self.assertEqual(rsp["err"], "demo.account_only")

    def test_demo_login_does_not_store_ip_or_access_time(self):
        before = get_db().query(models.Reader).filter(models.Reader.username == "issue886_demo").first()
        original_access_time = before.access_time
        original_extra = dict(before.extra)

        with enabled_demo_mode():
            body = urllib.parse.urlencode({"username": "issue886_demo", "password": "demo-password"})
            rsp = self.json("/api/user/sign_in", method="POST", body=body)
            self.assertEqual(rsp["err"], "ok")

        after = get_db().query(models.Reader).filter(models.Reader.username == "issue886_demo").first()
        self.assertEqual(after.access_time, original_access_time)
        self.assertEqual(dict(after.extra), original_extra)

    def test_basic_auth_and_existing_cookie_are_limited_to_demo_account(self):
        with enabled_demo_mode():
            rsp = self.json("/api/user/info", headers={"Authorization": self._auth_header("issue886_demo")})
            self.assertTrue(rsp["user"]["is_login"])
            self.assertEqual(rsp["user"]["username"], "issue886_demo")

            rsp = self.json("/api/user/info", headers={"Authorization": self._auth_header("issue886_other")})
            self.assertFalse(rsp["user"]["is_login"])

            other = get_db().query(models.Reader).filter(models.Reader.username == "issue886_other").first()
            with mock.patch.object(BaseHandler, "user_id", return_value=other.id):
                rsp = self.json("/api/user/info")
            self.assertFalse(rsp["user"]["is_login"])

    def test_business_writes_and_mutating_gets_are_rejected(self):
        with enabled_demo_mode():
            rsp = self.json("/api/user/sign_up", method="POST", body="")
            self.assertEqual(rsp["err"], "demo.read_only")

            rsp = self.json("/api/user/active/send")
            self.assertEqual(rsp["err"], "demo.read_only")

            rsp = self.json("/api/index")
            self.assertEqual(rsp["random_books_count"], len(rsp["random_books"]))
            self.assertEqual(rsp["new_books_count"], len(rsp["new_books"]))

            rsp = self.json("/api/user/info")
            self.assertTrue(rsp["sys"]["demo_mode"])
            self.assertFalse(rsp["sys"]["allow"]["register"])
            self.assertEqual(rsp["sys"]["socials"], [])

            rsp = self.fetch("/auth/login/github")
            self.assertEqual(rsp.code, 403)

    def test_reading_does_not_update_shared_history_or_count(self):
        session = get_db()
        user = session.query(models.Reader).filter(models.Reader.username == "issue886_demo").first()
        item = session.query(models.Item).filter(models.Item.book_id == 1).first()
        original_extra = dict(user.extra)
        original_count = item.count_download

        with enabled_demo_mode(), mock.patch.object(BaseHandler, "user_id", return_value=user.id):
            rsp = self.fetch("/read/1", follow_redirects=False)
            self.assertIn(rsp.code, (200, 302))

        session = get_db()
        user = session.query(models.Reader).filter(models.Reader.username == "issue886_demo").first()
        item = session.query(models.Item).filter(models.Item.book_id == 1).first()
        self.assertEqual(dict(user.extra), original_extra)
        self.assertEqual(item.count_download, original_count)

    def test_demo_account_is_auto_created_on_first_login(self):
        session = get_db()
        session.query(models.Reader).filter(models.Reader.username == "issue886_autocreate").delete(
            synchronize_session=False
        )
        session.commit()
        try:
            with enabled_demo_mode(username="issue886_autocreate"):
                body = urllib.parse.urlencode({"username": "issue886_autocreate", "password": "wrong-password"})
                rsp = self.json("/api/user/sign_in", method="POST", body=body)
                self.assertEqual(rsp["err"], "params.invalid")

                body = urllib.parse.urlencode(
                    {"username": "issue886_autocreate", "password": demo_mode.DEMO_DEFAULT_PASSWORD}
                )
                rsp = self.json("/api/user/sign_in", method="POST", body=body)
                self.assertEqual(rsp["err"], "ok")

            created = get_db().query(models.Reader).filter(models.Reader.username == "issue886_autocreate").first()
            self.assertIsNotNone(created)
            self.assertFalse(created.admin)
        finally:
            session = get_db()
            session.query(models.Reader).filter(models.Reader.username == "issue886_autocreate").delete(
                synchronize_session=False
            )
            session.commit()

    def test_demo_account_sees_fake_admin_settings_and_cannot_persist(self):
        user = get_db().query(models.Reader).filter(models.Reader.username == "issue886_demo").first()
        self.assertFalse(user.admin)
        original_site_title = loader.get_settings()["site_title"]

        with enabled_demo_mode(), mock.patch.object(BaseHandler, "user_id", return_value=user.id):
            info = self.json("/api/user/info")
            self.assertTrue(info["user"]["is_admin"])

            rsp = self.json("/api/admin/settings")
            self.assertEqual(rsp["err"], "ok")
            self.assertEqual(rsp["settings"]["site_title"], DEFAULT_SETTINGS["site_title"])

            body = json.dumps({"site_title": "被演示账号篡改的标题"})
            rsp = self.json("/api/admin/settings", method="POST", body=body)
            self.assertEqual(rsp["err"], "ok")

        self.assertEqual(loader.get_settings()["site_title"], original_site_title)

    def test_real_admin_can_sign_in_when_demo_mode_enabled(self):
        with enabled_demo_mode():
            body = urllib.parse.urlencode({"username": "issue886_admin", "password": "demo-password"})
            rsp = self.json("/api/user/sign_in", method="POST", body=body)
            self.assertEqual(rsp["err"], "ok")

            denied = urllib.parse.urlencode({"username": "issue886_other", "password": "demo-password"})
            rsp = self.json("/api/user/sign_in", method="POST", body=denied)
            self.assertEqual(rsp["err"], "demo.account_only")

    def test_real_admin_session_persists_instead_of_being_logged_out(self):
        admin = get_db().query(models.Reader).filter(models.Reader.username == "issue886_admin").first()
        with enabled_demo_mode(), mock.patch.object(BaseHandler, "user_id", return_value=admin.id):
            rsp = self.json("/api/user/info")
            self.assertTrue(rsp["user"]["is_login"])
            self.assertEqual(rsp["user"]["username"], "issue886_admin")
            self.assertTrue(rsp["user"]["is_admin"])

    def test_real_admin_login_updates_ip_and_access_time(self):
        session = get_db()
        admin = session.query(models.Reader).filter(models.Reader.username == "issue886_admin").first()
        before_access_time = admin.access_time

        with enabled_demo_mode():
            body = urllib.parse.urlencode({"username": "issue886_admin", "password": "demo-password"})
            rsp = self.json("/api/user/sign_in", method="POST", body=body)
            self.assertEqual(rsp["err"], "ok")

        after = get_db().query(models.Reader).filter(models.Reader.username == "issue886_admin").first()
        self.assertNotEqual(after.access_time, before_access_time)
        self.assertTrue(after.extra.get("login_ip"))

    def test_real_admin_writes_are_allowed_and_demo_account_stays_read_only(self):
        session = get_db()
        admin = session.query(models.Reader).filter(models.Reader.username == "issue886_admin").first()
        demo_user = session.query(models.Reader).filter(models.Reader.username == "issue886_demo").first()
        original_site_title = loader.get_settings()["site_title"]

        try:
            with enabled_demo_mode(), mock.patch.object(BaseHandler, "user_id", return_value=admin.id):
                with mock.patch("webserver.loader.SettingsLoader.set_store_path", return_value="/tmp/"):
                    body = json.dumps({"site_title": "由真实管理员在演示模式下维护"})
                    rsp = self.json("/api/admin/settings", method="POST", body=body)
                self.assertEqual(rsp["err"], "ok")
                self.assertEqual(loader.get_settings()["site_title"], "由真实管理员在演示模式下维护")

            with enabled_demo_mode(), mock.patch.object(BaseHandler, "user_id", return_value=demo_user.id):
                body = json.dumps({"site_title": "被演示账号篡改的标题"})
                rsp = self.json("/api/admin/settings", method="POST", body=body)
                self.assertEqual(rsp["err"], "ok")
                # demo 账号的“假保存”不应影响真实管理员刚刚写入的配置
                self.assertEqual(loader.get_settings()["site_title"], "由真实管理员在演示模式下维护")
        finally:
            loader.get_settings()["site_title"] = original_site_title

    def test_real_admin_webdav_writes_still_rejected(self):
        with enabled_demo_mode():
            rsp = self.fetch(
                "/books/some-file.txt",
                method="PUT",
                headers={"Authorization": self._auth_header("issue886_admin")},
                body=b"data",
            )
            self.assertEqual(rsp.code, 403)
            self.assertEqual(rsp.body, b"Demo mode is read-only")
