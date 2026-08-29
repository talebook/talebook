#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""网络书库用户接口测试。"""

import json
import time
import urllib.parse
from unittest import mock

from tests.test_booksource_admin import CSS_SOURCE
from tests.test_booksource_engine import FakeSession, text
from tests.test_main import BID_EPUB, TestWithUserLogin, get_db
from tests.test_main import setUpModule as init
from webserver import models


def setUpModule():
    init()


def Q(s):
    return urllib.parse.quote(str(s).encode("UTF-8"))


def make_source(raw=None):
    session = get_db()
    session.query(models.BookSourceModel).delete()
    session.commit()
    source = models.BookSourceModel(raw or CSS_SOURCE)
    source.save()
    return source.id


class TestNetworkLibrary(TestWithUserLogin):
    def setUp(self):
        super().setUp()
        self.sid = make_source()

    def _fake(self):
        return FakeSession(
            {
                "/search": text("search.html"),
                "/toc": text("toc.html"),
                "/c/1": text("content.html"),
                "/book/1001": text("bookinfo.html"),
            }
        )

    def _wait_finished(self, task_id, timeout=5):
        # 搜索任务在后台线程池执行，轮询 status 直到完成（mock 很快）
        deadline = time.time() + timeout
        d = self.json("/api/network/search/status?task_id=%s" % task_id)
        while not d.get("finished") and time.time() < deadline:
            time.sleep(0.05)
            d = self.json("/api/network/search/status?task_id=%s" % task_id)
        return d

    def test_sources(self):
        d = self.json("/api/network/sources")
        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["items"][0]["id"], self.sid)
        self.assertEqual(d["items"][0]["source_key"], "legado:%d" % self.sid)

    def test_generic_sources_report_ready_availability(self):
        d = self.json("/api/book-sources")
        self.assertEqual(d["availability"]["state"], "ready")
        self.assertGreaterEqual(d["availability"]["enabled_plugins"], 1)
        self.assertEqual(d["availability"]["configured_sources"], len(d["items"]))

    def test_generic_sources_distinguish_disabled_plugins_from_missing_configuration(self):
        from webserver.plugins.register import SOURCE_PROVIDERS

        source_keys = [provider.manifest["id"] for provider in SOURCE_PROVIDERS]
        session = get_db()
        installations = (
            session.query(models.PluginInstallation).filter(models.PluginInstallation.plugin_key.in_(source_keys)).all()
        )
        previous = {item.id: (item.enabled, item.status) for item in installations}
        try:
            for installation in installations:
                installation.enabled = False
            session.commit()
            disabled = self.json("/api/book-sources")
            self.assertEqual(disabled["availability"]["state"], "no_enabled_plugins")
            self.assertEqual(disabled["availability"]["enabled_plugins"], 0)

            legado = next(item for item in installations if item.plugin_key == "talebook.source.legado")
            legado.enabled = True
            legado.status = "active"
            session.query(models.BookSourceModel).delete()
            session.commit()
            unconfigured = self.json("/api/book-sources")
            self.assertEqual(unconfigured["availability"]["state"], "no_configured_sources")
            self.assertEqual(unconfigured["availability"]["enabled_plugins"], 1)
            self.assertEqual(unconfigured["availability"]["configured_sources"], 0)
        finally:
            session = get_db()
            for installation_id, (enabled, status) in previous.items():
                installation = session.get(models.PluginInstallation, installation_id)
                installation.enabled = enabled
                installation.status = status
            session.commit()

    @mock.patch("webserver.services.booksource.engine.build_session")
    def test_generic_source_route_accepts_opaque_binding_key_end_to_end(self, m_session):
        """T9：Legado 只作为 SourceProvider，通过通用入口完成搜索、详情、目录和正文。"""

        def fake_session(*args, **kwargs):
            return self._fake()

        m_session.side_effect = fake_session
        source_key = "legado:%d" % self.sid

        sources = self.json("/api/book-sources")
        self.assertEqual(sources["items"][0]["source_key"], source_key)

        created = self.json("/api/book-sources/search?key=%s&sources=%s" % (Q("剑来"), Q(source_key)))
        deadline = time.time() + 5
        searched = self.json("/api/book-sources/search/status?task_id=%s" % created["task_id"])
        while not searched.get("finished") and time.time() < deadline:
            time.sleep(0.05)
            searched = self.json("/api/book-sources/search/status?task_id=%s" % created["task_id"])
        self.assertEqual(searched["results"][0]["source_id"], source_key)
        self.assertEqual(searched["results"][0]["books"][0]["name"], "剑来")

        book = self.json("/api/book-sources/book?source_id=%s&book_url=%s" % (Q(source_key), Q("/book/1001")))
        self.assertEqual(book["download_mode"], "by_chapters")
        toc = self.json("/api/book-sources/toc?source_id=%s&book_url=%s" % (Q(source_key), Q("/book/1001")))
        self.assertEqual(len(toc["chapters"]), 3, toc)
        content = self.json("/api/book-sources/content?source_id=%s&chapter_url=%s" % (Q(source_key), Q("http://x.com/c/1")))
        self.assertIn("正文第一段", content["content"])

    @mock.patch("webserver.services.booksource.engine.build_session")
    def test_search(self, m_session):
        m_session.return_value = self._fake()
        # 创建任务：立即返回 task_id，不阻塞
        d = self.json("/api/network/search?key=%s" % Q("剑来"))
        self.assertEqual(d["err"], "ok")
        self.assertTrue(d["task_id"])
        self.assertEqual(d["total"], 1)
        # 轮询进度，拿到已完成源的结果
        s = self._wait_finished(d["task_id"])
        self.assertTrue(s["finished"])
        self.assertEqual(len(s["results"]), 1)
        self.assertEqual(s["results"][0]["books"][0]["name"], "剑来")

        session = get_db()
        run = (
            session.query(models.PluginRun)
            .join(models.PluginConnection, models.PluginConnection.id == models.PluginRun.connection_id)
            .join(models.PluginInstallation, models.PluginInstallation.id == models.PluginConnection.installation_id)
            .filter(models.PluginInstallation.plugin_key == "talebook.source.legado")
            .order_by(models.PluginRun.id.desc())
            .first()
        )
        self.assertIsNotNone(run)
        self.assertEqual(run.action, "read")
        self.assertEqual(run.status, "succeeded")
        connection = session.get(models.PluginConnection, run.connection_id)
        self.assertFalse(connection.lease_token)
        self.assertIsNone(connection.lease_until)

    @mock.patch("webserver.services.booksource.engine.build_session")
    def test_search_groups_multiple_bindings_into_one_runtime_run(self, m_session):
        """Legado 多个事实书源共用一条 connection，也只占用一个 lease/run。"""
        m_session.return_value = self._fake()
        session = get_db()
        second = models.BookSourceModel(CSS_SOURCE)
        second.name = "备用书源"
        second.save()
        before = (
            session.query(models.PluginRun)
            .join(models.PluginConnection, models.PluginConnection.id == models.PluginRun.connection_id)
            .join(models.PluginInstallation, models.PluginInstallation.id == models.PluginConnection.installation_id)
            .filter(models.PluginInstallation.plugin_key == "talebook.source.legado")
            .count()
        )

        created = self.json("/api/network/search?key=%s&mode=all" % Q("剑来"))
        result = self._wait_finished(created["task_id"])
        self.assertTrue(result["finished"])

        session = get_db()
        runs = (
            session.query(models.PluginRun)
            .join(models.PluginConnection, models.PluginConnection.id == models.PluginRun.connection_id)
            .join(models.PluginInstallation, models.PluginInstallation.id == models.PluginConnection.installation_id)
            .filter(models.PluginInstallation.plugin_key == "talebook.source.legado")
            .order_by(models.PluginRun.id)
            .all()
        )
        self.assertEqual(len(runs), before + 1)
        self.assertEqual(runs[-1].counts["fetched"], 2)

    @mock.patch("webserver.services.booksource.engine.build_session")
    def test_search_audit_finalizes_without_status_polling(self, m_session):
        """客户端离开页面也不得把 durable PluginRun 永久留在 running。"""
        m_session.return_value = self._fake()
        created = self.json("/api/network/search?key=%s" % Q("剑来"))
        self.assertTrue(created["task_id"])

        deadline = time.time() + 5
        run = None
        while time.time() < deadline:
            session = get_db()
            run = (
                session.query(models.PluginRun)
                .join(models.PluginConnection, models.PluginConnection.id == models.PluginRun.connection_id)
                .join(models.PluginInstallation, models.PluginInstallation.id == models.PluginConnection.installation_id)
                .filter(models.PluginInstallation.plugin_key == "talebook.source.legado")
                .order_by(models.PluginRun.id.desc())
                .first()
            )
            if run is not None and run.status != "running":
                break
            time.sleep(0.05)

        self.assertIsNotNone(run)
        self.assertEqual(run.status, "succeeded")
        connection = session.get(models.PluginConnection, run.connection_id)
        self.assertFalse(connection.lease_token)

    def test_search_empty_key(self):
        d = self.json("/api/network/search?key=")
        self.assertEqual(d["err"], "params.error")

    @mock.patch("webserver.services.booksource.engine.build_session")
    def test_search_empty_result(self, m_session):
        m_session.return_value = FakeSession({})  # 无任何响应 -> 空结果
        d = self.json("/api/network/search?key=%s" % Q("剑来"))
        self.assertEqual(d["err"], "ok")
        s = self._wait_finished(d["task_id"])
        self.assertTrue(s["finished"])
        # 空 HTML 解析不到书：源成功完成但 books 为空，不进 results 也不进 partial
        self.assertEqual(len(s["results"]), 0)

    def test_search_status_not_found(self):
        d = self.json("/api/network/search/status?task_id=not-exist")
        self.assertEqual(d["err"], "task.not_found")

    @mock.patch("webserver.services.booksource.engine.build_session")
    def test_search_weight_increment(self, m_session):
        m_session.return_value = self._fake()
        # 搜索并等完成：命中的源权重应 +1（用于“近期可用”排序）
        d = self.json("/api/network/search?key=%s" % Q("剑来"))
        s = self._wait_finished(d["task_id"])
        self.assertTrue(s["finished"])
        self.assertEqual(len(s["results"]), 1)
        session = get_db()
        session.expire_all()
        src = session.query(models.BookSourceModel).filter(models.BookSourceModel.id == self.sid).first()
        self.assertEqual(src.weight, 1)

    @mock.patch("webserver.services.booksource.engine.build_session")
    def test_book(self, m_session):
        m_session.return_value = self._fake()
        d = self.json("/api/network/book?source_id=%d&book_url=%s" % (self.sid, Q("/book/1001")))
        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["book"]["name"], "剑来")
        self.assertTrue(d["toc_url"].endswith("/toc"))

    @mock.patch("webserver.services.booksource.engine.build_session")
    def test_toc(self, m_session):
        m_session.return_value = self._fake()
        d = self.json("/api/network/toc?source_id=%d&toc_url=%s" % (self.sid, Q("http://x.com/toc")))
        self.assertEqual(d["err"], "ok")
        self.assertEqual(len(d["chapters"]), 3)

    @mock.patch("webserver.services.booksource.engine.build_session")
    def test_content(self, m_session):
        m_session.return_value = self._fake()
        url = "/api/network/content?source_id=%d&chapter_url=%s" % (self.sid, Q("http://x.com/c/1"))
        d = self.json(url)
        self.assertEqual(d["err"], "ok")
        self.assertIn("正文第一段", d["content"])
        self.assertNotIn("www.example.com", d["content"])

    def test_source_not_found(self):
        d = self.json("/api/network/book?source_id=99999&book_url=%s" % Q("/x"))
        self.assertEqual(d["err"], "params.not_found")

    def test_categories(self):
        # 替换默认 fixture：让当前源带有 exploreUrl
        session = get_db()
        session.query(models.BookSourceModel).delete()
        session.commit()
        raw = dict(CSS_SOURCE, exploreUrl="玄幻::/explore/xuanhuan?page={{page}}\n都市::/explore/dushi")
        source = models.BookSourceModel(raw)
        source.save()
        sid = source.id
        d = self.json("/api/network/categories?source_id=%d" % sid)
        self.assertEqual(d["err"], "ok")
        self.assertEqual(len(d["items"]), 2)
        self.assertEqual(d["items"][0]["name"], "玄幻")

    @mock.patch("webserver.services.booksource.engine.build_session")
    def test_explore(self, m_session):
        # 分类 URL 含 {{page}} 模板，后端应替换为实际页码后再发 HTTP 请求
        session = get_db()
        session.query(models.BookSourceModel).delete()
        session.commit()
        raw = dict(CSS_SOURCE, exploreUrl="玄幻::/explore/{{page}}.html")
        source = models.BookSourceModel(raw)
        source.save()
        sid = source.id
        m_session.return_value = FakeSession({"/explore/1.html": text("search.html")})
        category_url = "/explore/{{page}}.html"
        d = self.json("/api/network/explore?source_id=%d&url=%s&page=1" % (sid, Q(category_url)))
        self.assertEqual(d["err"], "ok")
        self.assertEqual(len(d["books"]), 2)
        self.assertEqual(d["books"][0]["name"], "剑来")
        # 验证 {{page}} 被替换为 1，即访问了 /explore/1.html
        calls = m_session.return_value.calls
        self.assertTrue(any("explore/1.html" in url for _, url in calls))

    @mock.patch("webserver.services.booksource.engine.build_session")
    def test_explore_page_substitution(self, m_session):
        # page=2 时，{{page}} 应替换为 2，访问不同 URL
        session = get_db()
        session.query(models.BookSourceModel).delete()
        session.commit()
        raw = dict(CSS_SOURCE, exploreUrl="玄幻::/explore/{{page}}.html")
        source = models.BookSourceModel(raw)
        source.save()
        sid = source.id
        m_session.return_value = FakeSession({"/explore/2.html": text("search.html")})
        category_url = "/explore/{{page}}.html"
        d = self.json("/api/network/explore?source_id=%d&url=%s&page=2" % (sid, Q(category_url)))
        self.assertEqual(d["err"], "ok")
        calls = m_session.return_value.calls
        self.assertTrue(any("explore/2.html" in url for _, url in calls))
        self.assertFalse(any("explore/1.html" in url for _, url in calls))

    def test_explore_missing_source(self):
        d = self.json("/api/network/explore?source_id=99999&url=%s&page=1" % Q("/x"))
        self.assertEqual(d["err"], "params.not_found")

    def test_explore_missing_url(self):
        d = self.json("/api/network/explore?source_id=%d&url=&page=1" % self.sid)
        self.assertEqual(d["err"], "params.error")

    def test_library_online(self):
        # /api/library/online 走 render_book_list，需 NetworkBaseHandler 继承 ListHandler
        session = get_db()
        session.query(models.OnlineBookMeta).delete()
        session.commit()
        meta = models.OnlineBookMeta(book_id=BID_EPUB, source_url="http://x.com")
        meta.serialize_status = models.OnlineBookMeta.SERIAL
        meta.save()
        try:
            d = self.json("/api/library/online")
            self.assertEqual(d["err"], "ok")
            self.assertEqual(d["title"], "网络书库")
            ids = [b["id"] for b in d["books"]]
            self.assertIn(BID_EPUB, ids)
            book = next(b for b in d["books"] if b["id"] == BID_EPUB)
            self.assertEqual(book["serialize_status"], "serial")
        finally:
            session.query(models.OnlineBookMeta).filter(models.OnlineBookMeta.book_id == BID_EPUB).delete()
            session.commit()

    def test_status_get_set(self):
        session = get_db()
        meta = models.OnlineBookMeta(book_id=123456, source_url="http://x.com")
        meta.save()

        d = self.json("/api/network/status?book_id=123456")
        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["meta"]["serialize_status"], "unknown")

        body = json.dumps({"book_id": 123456, "serialize_status": "finished"})
        d = self.json("/api/network/status", method="POST", body=body)
        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["meta"]["serialize_status"], "finished")
        self.assertTrue(d["meta"]["status_manual"])

        session.query(models.OnlineBookMeta).filter(models.OnlineBookMeta.book_id == 123456).delete()
        session.commit()
