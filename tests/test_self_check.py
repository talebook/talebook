#!/usr/bin/env pytest
# -*- coding: UTF-8 -*-

import json
import os
import shutil
import tempfile
import unittest
from unittest import mock

from webserver import self_check


class TestSelfCheckSteps(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmpdir, ignore_errors=True)

        self.data_dir = os.path.join(self.tmpdir, "data")
        self.status_dir = os.path.join(self.tmpdir, "status")
        os.makedirs(os.path.join(self.data_dir, "books", "library"))

        self._orig_data_dir = self_check.DATA_DIR
        self._orig_status_dir = self_check.STATUS_DIR
        self_check.DATA_DIR = self.data_dir
        self_check.STATUS_DIR = self.status_dir
        self.addCleanup(self._restore_dirs)

        env_patch = mock.patch.dict(os.environ, {"PUID": "1000", "PGID": "1000"})
        env_patch.start()
        self.addCleanup(env_patch.stop)

    def _restore_dirs(self):
        self_check.DATA_DIR = self._orig_data_dir
        self_check.STATUS_DIR = self._orig_status_dir

    def test_write_status_schema(self):
        self_check.write_status([{"name": "permission", "status": "ok", "code": None}], phase="ready")
        with open(os.path.join(self.status_dir, "status.json")) as f:
            doc = json.load(f)
        self.assertEqual(doc["schema"], 1)
        self.assertEqual(doc["phase"], "ready")
        self.assertIn("updated_at", doc)
        self.assertEqual(doc["steps"], [{"name": "permission", "status": "ok", "code": None}])

    @mock.patch("webserver.self_check.run")
    def test_check_permission_chowns_when_puid_changed(self, m_run):
        m_run.return_value = True
        ok, code = self_check.check_permission()
        self.assertTrue(ok)
        self.assertIsNone(code)
        with open(os.path.join(self.data_dir, ".permission")) as f:
            self.assertEqual(f.read().strip(), "1000:1000")
        chown_call, write_test_call = m_run.call_args_list
        self.assertEqual(chown_call.args[0][:2], ["chown", "-R"])
        self.assertEqual(write_test_call.args[0][0], "gosu")

    @mock.patch("webserver.self_check.run")
    def test_check_permission_skips_chown_when_unchanged(self, m_run):
        with open(os.path.join(self.data_dir, ".permission"), "w") as f:
            f.write("1000:1000")
        m_run.return_value = True

        ok, code = self_check.check_permission()

        self.assertTrue(ok)
        self.assertIsNone(code)
        self.assertEqual(m_run.call_count, 1)
        self.assertEqual(m_run.call_args.args[0][0], "gosu")

    @mock.patch("webserver.self_check.run")
    def test_check_permission_chown_failure(self, m_run):
        m_run.return_value = False
        ok, code = self_check.check_permission()
        self.assertFalse(ok)
        self.assertEqual(code, "permission_denied")
        self.assertFalse(os.path.exists(os.path.join(self.data_dir, ".permission")))

    @mock.patch("webserver.self_check.run")
    def test_check_permission_write_test_failure(self, m_run):
        m_run.side_effect = [True, False]
        ok, code = self_check.check_permission()
        self.assertFalse(ok)
        self.assertEqual(code, "permission_denied")

    @mock.patch("webserver.self_check.run")
    def test_check_nginx_config(self, m_run):
        m_run.return_value = True
        self.assertEqual(self_check.check_nginx_config(), (True, None))
        m_run.assert_called_once_with(["gosu", "talebook:talebook", "nginx", "-t"])

        m_run.reset_mock()
        m_run.return_value = False
        self.assertEqual(self_check.check_nginx_config(), (False, "nginx_config_invalid"))
        m_run.assert_called_once_with(["gosu", "talebook:talebook", "nginx", "-t"])

    @mock.patch("webserver.self_check.run")
    def test_check_syncdb(self, m_run):
        m_run.return_value = True
        self.assertEqual(self_check.check_syncdb(), (True, None))
        m_run.return_value = False
        self.assertEqual(self_check.check_syncdb(), (False, "syncdb_failed"))

    @mock.patch("webserver.self_check.run")
    def test_check_migrate(self, m_run):
        m_run.return_value = True
        self.assertEqual(self_check.check_migrate(), (True, None))
        m_run.return_value = False
        self.assertEqual(self_check.check_migrate(), (False, "migrate_failed"))

    @mock.patch("webserver.self_check.run")
    def test_check_update_config(self, m_run):
        m_run.return_value = True
        self.assertEqual(self_check.check_update_config(), (True, None))
        m_run.return_value = False
        self.assertEqual(self_check.check_update_config(), (False, "update_config_failed"))


class TestRunBootstrap(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmpdir, ignore_errors=True)
        self._orig_status_dir = self_check.STATUS_DIR
        self_check.STATUS_DIR = os.path.join(self.tmpdir, "status")
        self.addCleanup(self._restore)

    def _restore(self):
        self_check.STATUS_DIR = self._orig_status_dir

    def _status(self):
        with open(os.path.join(self_check.STATUS_DIR, "status.json")) as f:
            return json.load(f)

    def test_all_steps_ok_starts_tornado(self):
        checks = [("a", lambda: (True, None)), ("b", lambda: (True, None))]
        start_tornado_fn = mock.Mock()

        result = self_check.run_bootstrap(checks=checks, start_tornado_fn=start_tornado_fn)

        self.assertTrue(result)
        start_tornado_fn.assert_called_once()
        doc = self._status()
        self.assertEqual(doc["phase"], "ready")
        self.assertEqual([s["status"] for s in doc["steps"]], ["ok", "ok"])

    def test_stops_at_first_failure_and_skips_tornado(self):
        second_check = mock.Mock(return_value=(True, None))
        checks = [
            ("a", lambda: (False, "permission_denied")),
            ("b", second_check),
        ]
        start_tornado_fn = mock.Mock()

        result = self_check.run_bootstrap(checks=checks, start_tornado_fn=start_tornado_fn)

        self.assertFalse(result)
        start_tornado_fn.assert_not_called()
        second_check.assert_not_called()
        doc = self._status()
        self.assertEqual(doc["phase"], "failed")
        self.assertEqual(doc["steps"][0], {"name": "a", "status": "failed", "code": "permission_denied"})
        self.assertEqual(doc["steps"][1]["status"], "pending")

    @mock.patch("webserver.self_check.subprocess.run")
    def test_start_tornado_uses_group_process_name(self, m_run):
        # tornado 在 [group:talebook] 中，supervisorctl 必须用 group:program 形式的进程名
        self_check.start_tornado()
        m_run.assert_called_once_with(["supervisorctl", "start", "talebook:tornado"])


if __name__ == "__main__":
    unittest.main()
