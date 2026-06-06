#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""书源管理接口测试。"""

import json
from unittest import mock

from tests.test_booksource_engine import FakeSession, text
from tests.test_main import TestWithAdminUser, get_db
from tests.test_main import setUpModule as init
from webserver import models


def setUpModule():
    init()


CSS_SOURCE = {
    "bookSourceName": "测试源",
    "bookSourceUrl": "http://x.com",
    "bookSourceGroup": "测试",
    "bookSourceType": 0,
    "searchUrl": "/search?key={{key}}",
    "ruleSearch": {
        "bookList": "@css:li.book-item",
        "name": "@css:.book-name a@text",
        "author": "@css:.author@text",
        "bookUrl": "@css:.book-name a@href",
        "coverUrl": "@css:img@src",
    },
    "ruleBookInfo": {"name": "@css:.name@text", "tocUrl": "@css:.toc-link@href"},
    "ruleToc": {"chapterList": "@css:a.chapter", "chapterName": "text", "chapterUrl": "href"},
    "ruleContent": {"content": "@css:#content@text"},
}

JS_SOURCE = {
    "bookSourceName": "JS源",
    "bookSourceUrl": "http://js.com",
    "bookSourceType": 0,
    "searchUrl": "@js:java.ajax('x')",
    "ruleSearch": {"bookList": "@css:li"},
    "ruleContent": {"content": "<js>get()</js>"},
}


class TestBookSourceAdmin(TestWithAdminUser):
    def setUp(self):
        super().setUp()
        session = get_db()
        session.query(models.BookSourceModel).delete()
        session.commit()

    def test_create_and_list(self):
        d = self.json("/api/admin/booksource", method="POST", body=json.dumps({"raw": CSS_SOURCE}))
        self.assertEqual(d["err"], "ok")
        sid = d["id"]

        d = self.json("/api/admin/booksource/list")
        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["count"], 1)
        self.assertEqual(d["items"][0]["id"], sid)
        self.assertEqual(d["items"][0]["name"], "测试源")
        self.assertIn("测试", d["groups"])

    def test_create_duplicate_url(self):
        self.json("/api/admin/booksource", method="POST", body=json.dumps({"raw": CSS_SOURCE}))
        d = self.json("/api/admin/booksource", method="POST", body=json.dumps({"raw": CSS_SOURCE}))
        self.assertEqual(d["err"], "params.exist")

    @mock.patch("webserver.handlers.booksource_admin.schedule_source_checks")
    @mock.patch("webserver.handlers.booksource_admin.validate_source_raw")
    def test_import_array_queues_checks(self, m_check, m_schedule):
        body = json.dumps({"json": json.dumps([CSS_SOURCE, JS_SOURCE])})
        d = self.json("/api/admin/booksource/import", method="POST", body=body)
        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["added"], 2)
        self.assertEqual(d["disabled"], 0)
        self.assertEqual(d["checking"], 2)
        self.assertEqual(len(d["failed"]), 0)
        self.assertFalse(m_check.called)
        self.assertEqual(len(m_schedule.call_args[0][0]), 2)
        items = {i["name"]: i for i in self.json("/api/admin/booksource/list")["items"]}
        self.assertTrue(items["测试源"]["enabled"])
        self.assertTrue(items["JS源"]["enabled"])
        self.assertEqual(items["JS源"]["check_status"], "pending")
        self.assertIn("check-pending", items["JS源"]["check_tags"])

    @mock.patch("webserver.handlers.booksource_admin.schedule_source_checks")
    def test_import_duplicate_url_skips_without_overwrite(self, m_schedule):
        self.json("/api/admin/booksource/import", method="POST", body=json.dumps({"json": json.dumps([CSS_SOURCE])}))
        m_schedule.reset_mock()
        changed = dict(CSS_SOURCE, bookSourceName="改名后")
        d = self.json(
            "/api/admin/booksource/import",
            method="POST",
            body=json.dumps({"json": json.dumps([changed]), "overwrite": True}),
        )
        self.assertEqual(d["updated"], 0)
        self.assertEqual(d["skipped"], 1)
        self.assertEqual(d["checking"], 0)
        self.assertFalse(m_schedule.called)
        d = self.json("/api/admin/booksource/list")
        self.assertEqual(d["items"][0]["name"], "测试源")

    @mock.patch("webserver.handlers.booksource_admin.schedule_source_checks")
    def test_seed_import(self, m_schedule):
        d = self.json("/api/admin/booksource/seed", method="POST", body="{}")
        self.assertEqual(d["err"], "ok")
        self.assertGreaterEqual(d["added"], 1)
        self.assertGreaterEqual(d["checking"], 1)

    def test_toggle(self):
        sid = self.json("/api/admin/booksource", method="POST", body=json.dumps({"raw": CSS_SOURCE}))["id"]
        d = self.json("/api/admin/booksource/toggle", method="POST", body=json.dumps({"id": sid, "enabled": False}))
        self.assertEqual(d["err"], "ok")
        self.assertFalse(d["enabled"])

    def test_delete(self):
        sid = self.json("/api/admin/booksource", method="POST", body=json.dumps({"raw": CSS_SOURCE}))["id"]
        d = self.json("/api/admin/booksource?id=%d" % sid, method="DELETE")
        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["deleted"], 1)
        self.assertEqual(self.json("/api/admin/booksource/list")["count"], 0)

    def _two_sources(self):
        s1 = self.json("/api/admin/booksource", method="POST", body=json.dumps({"raw": CSS_SOURCE}))["id"]
        raw2 = dict(CSS_SOURCE, bookSourceUrl="http://other.example.com/", bookSourceName="源2")
        s2 = self.json("/api/admin/booksource", method="POST", body=json.dumps({"raw": raw2}))["id"]
        return s1, s2

    def test_toggle_batch(self):
        s1, s2 = self._two_sources()
        d = self.json("/api/admin/booksource/toggle", method="POST", body=json.dumps({"ids": [s1, s2], "enabled": False}))
        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["updated"], 2)
        items = {i["id"]: i for i in self.json("/api/admin/booksource/list")["items"]}
        self.assertFalse(items[s1]["enabled"])
        self.assertFalse(items[s2]["enabled"])

    def test_delete_batch(self):
        s1, s2 = self._two_sources()
        d = self.json("/api/admin/booksource?ids=%d&ids=%d" % (s1, s2), method="DELETE")
        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["deleted"], 2)
        self.assertEqual(self.json("/api/admin/booksource/list")["count"], 0)

    @mock.patch("webserver.handlers.booksource_admin.validate_source_raw")
    def test_check_sources_marks_invalid(self, m_check):
        def fake_check(raw):
            if raw["bookSourceName"] == "源2":
                return {"ok": False, "status": "dns_failed", "message": "DNS 解析失败", "tags": ["dns-failed"]}
            if raw["bookSourceName"] == "源3":
                return {"ok": False, "status": "ssl_failed", "message": "SSL 校验失败", "tags": ["ssl-failed"]}
            return {"ok": True, "status": "ok", "message": "DNS/SSL 检测通过", "tags": ["dns-ok", "ssl-ok"]}

        m_check.side_effect = fake_check
        self.json("/api/admin/booksource", method="POST", body=json.dumps({"raw": CSS_SOURCE}))
        raw2 = dict(CSS_SOURCE, bookSourceUrl="http://bad-dns.example.com/", bookSourceName="源2")
        raw3 = dict(CSS_SOURCE, bookSourceUrl="https://bad-ssl.example.com/", bookSourceName="源3")
        self.json("/api/admin/booksource", method="POST", body=json.dumps({"raw": raw2}))
        self.json("/api/admin/booksource", method="POST", body=json.dumps({"raw": raw3}))

        d = self.json("/api/admin/booksource/check", method="POST", body="{}")
        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["checked"], 3)
        self.assertEqual(d["checking"], 3)

        available = self.json("/api/admin/booksource/list?enabled=true")
        self.assertEqual(available["count"], 1)
        self.assertEqual(available["items"][0]["name"], "测试源")
        self.assertEqual(available["items"][0]["check_status"], "ok")
        self.assertIn("ssl-ok", available["items"][0]["check_tags"])

        invalid = self.json("/api/admin/booksource/list?enabled=false")
        self.assertEqual(invalid["count"], 2)
        self.assertEqual({i["check_status"] for i in invalid["items"]}, {"dns_failed", "ssl_failed"})

        status = self.json("/api/admin/booksource/check/status")
        self.assertEqual(status["err"], "ok")
        self.assertFalse(status["running"])

    def test_list_pagination(self):
        for i in range(3):
            raw = dict(CSS_SOURCE, bookSourceUrl="http://p%d.example.com/" % i, bookSourceName="源%d" % i)
            self.json("/api/admin/booksource", method="POST", body=json.dumps({"raw": raw}))
        d = self.json("/api/admin/booksource/list?page=1&size=2")
        self.assertEqual(d["count"], 3)  # count 为过滤后总数
        self.assertEqual(len(d["items"]), 2)
        self.assertEqual(len(self.json("/api/admin/booksource/list?page=2&size=2")["items"]), 1)

    @mock.patch("webserver.services.booksource.engine.build_session")
    def test_source(self, m_session):
        # 注意：FakeSession 取第一个子串匹配的 key，更具体的路径需放在前面，
        # 否则 /book/1001/toc、/book/1001/c/1 会被 /book/1001 抢先命中。
        m_session.return_value = FakeSession(
            {
                "/c/1": text("content.html"),
                "/toc": text("toc.html"),
                "/book/1001": text("bookinfo.html"),
                "/search": text("search.html"),
            }
        )
        sid = self.json("/api/admin/booksource", method="POST", body=json.dumps({"raw": CSS_SOURCE}))["id"]
        d = self.json("/api/admin/booksource/test", method="POST", body=json.dumps({"id": sid, "key": "剑来"}))
        self.assertEqual(d["err"], "ok")
        self.assertFalse(d["js_skipped"])
        self.assertGreaterEqual(len(d["search"]), 1)
        self.assertEqual(d["search"][0]["name"], "剑来")
        self.assertGreaterEqual(d["toc_count"], 1)
