#!/usr/bin/env pytest
# -*- coding: UTF-8 -*-

import json
import unittest
from unittest import mock

from webserver.services import update_checker
from webserver.services.update_checker import UpdateChecker


class _FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


class TestUpdateCheckerVersionCompare(unittest.TestCase):
    def test_compare_versions_normalizes_v_prefix(self):
        self.assertFalse(update_checker._compare_versions("v26.06.29", "26.06.29"))
        self.assertFalse(update_checker._compare_versions("26.06.29", "v26.06.29"))

    def test_compare_versions_only_true_for_newer_version(self):
        self.assertTrue(update_checker._compare_versions("26.06.28", "v26.06.29"))
        self.assertFalse(update_checker._compare_versions("26.06.29", "v26.06.28"))
        self.assertFalse(update_checker._compare_versions("26.06.29", "26.06.29"))

    def test_compare_versions_handles_git_describe_dev_version(self):
        # 非 tag 构建使用 git describe 格式：最近 tag + 距离 + 短 hash。
        dev = "v26.07.13-5-g5295717"
        # 更新的 release 应被识别为“有更新”。
        self.assertTrue(update_checker._compare_versions(dev, "v26.07.20"))
        # 领先于 release 的开发版不应误报“有更新”。
        self.assertFalse(update_checker._compare_versions(dev, "v26.07.13"))


class TestUpdateChecker(unittest.TestCase):
    def setUp(self):
        UpdateChecker._instance = None
        self.addCleanup(setattr, UpdateChecker, "_instance", None)

    def _mock_latest_release(self, tag_name):
        payload = {
            "tag_name": tag_name,
            "html_url": "https://example.test/release",
            "name": tag_name,
            "body": "release body",
        }
        return mock.patch("webserver.services.update_checker.urllib.request.urlopen", return_value=_FakeResponse(payload))

    def test_check_for_updates_does_not_report_same_version_with_v_prefix(self):
        checker = UpdateChecker()
        checker.current_version = "v26.08.11"

        with self._mock_latest_release("26.08.11"):
            checker.check_for_updates()

        self.assertFalse(checker.has_update)
        self.assertEqual(checker.latest_version, "26.08.11")
        self.assertIsNone(checker.check_error)

    def test_notify_admins_hides_same_version_notification_after_upgrade(self):
        checker = UpdateChecker()
        checker.current_version = "v26.08.11"
        checker.latest_version = "26.08.11"
        checker.has_update = False

        admin = mock.Mock(id=1, username="admin")
        existing = mock.Mock(
            data={update_checker.UPDATE_NOTIFY_VERSION_KEY: "26.08.11"},
            unread=True,
        )
        admin_query = mock.Mock()
        admin_query.filter.return_value.all.return_value = [admin]
        message_query = mock.Mock()
        message_query.filter.return_value.first.return_value = existing
        session = mock.Mock()
        session.query.side_effect = [admin_query, message_query]
        checker.set_session_maker(mock.Mock(return_value=session))

        checker._notify_admins()

        self.assertFalse(existing.unread)
        session.commit.assert_called_once_with()
        session.close.assert_called_once_with()

    def test_check_for_updates_reports_only_newer_latest_release(self):
        checker = UpdateChecker()
        checker.current_version = "v26.06.28"

        with self._mock_latest_release("v26.06.29"):
            checker.check_for_updates()

        self.assertTrue(checker.has_update)
        self.assertEqual(checker.latest_version, "26.06.29")
        self.assertIsNone(checker.check_error)


if __name__ == "__main__":
    unittest.main()
