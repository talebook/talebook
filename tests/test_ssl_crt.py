#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import os
import stat
import subprocess
import tempfile
import unittest
import warnings
from pathlib import Path
from unittest import mock

from tests.test_main import TestWithAdminUser, testdir
from tests.test_main import setUpModule as init
from webserver.handlers.admin import SSLHandlerLogic
from webserver.services.ssl_certificate import (
    CertificateRollbackError,
    CertificateSaveError,
    CertificateValidationError,
    NginxConfigError,
    NginxReloadError,
    SSLCertificateManager,
)


def setUpModule():
    init()


def fixture_bytes(name):
    return Path(testdir, "cases", name).read_bytes()


class TestUploadSSL(TestWithAdminUser):
    @mock.patch("webserver.handlers.admin.AdminSSL.get_upload_file")
    @mock.patch("webserver.handlers.admin.SSLHandlerLogic.run")
    def test_good_crt(self, m_run, m_upload):
        warnings.simplefilter("ignore", ResourceWarning)
        m_upload.return_value = (fixture_bytes("ssl.crt"), fixture_bytes("ssl.key"))
        m_run.return_value = {"err": "ok"}

        result = self.json("/api/admin/ssl", method="POST", body="k=1", request_timeout=30)

        self.assertEqual(result["err"], "ok", result.get("msg"))
        m_run.assert_called_once_with(m_upload.return_value[0], m_upload.return_value[1])


class TestSSLHandlerLogic(unittest.TestCase):
    def setUp(self):
        self.manager = mock.Mock()
        self.logic = SSLHandlerLogic(manager=self.manager)
        self.crt = fixture_bytes("ssl.crt")
        self.key = fixture_bytes("ssl.key")

    def test_success(self):
        self.assertEqual(self.logic.run(self.crt, self.key), {"err": "ok"})
        self.manager.install.assert_called_once_with(self.crt, self.key)

    def test_maps_validation_error(self):
        self.manager.install.side_effect = CertificateValidationError("bad certificate")
        result = self.logic.run(self.crt, self.key)
        self.assertEqual(result["err"], "params.ssl_error")

    def test_maps_save_error(self):
        self.manager.install.side_effect = CertificateSaveError("save failed")
        result = self.logic.run(self.crt, self.key)
        self.assertEqual(result["err"], "internal.ssl_save_error")

    def test_maps_nginx_config_error(self):
        self.manager.install.side_effect = NginxConfigError("test failed")
        result = self.logic.run(self.crt, self.key)
        self.assertEqual(result["err"], "internal.nginx_test_error")

    def test_maps_nginx_reload_error(self):
        self.manager.install.side_effect = NginxReloadError("reload failed")
        result = self.logic.run(self.crt, self.key)
        self.assertEqual(result["err"], "internal.nginx_reload_error")

    def test_maps_rollback_error(self):
        self.manager.install.side_effect = CertificateRollbackError("rollback failed")
        result = self.logic.run(self.crt, self.key)
        self.assertEqual(result["err"], "internal.ssl_rollback_error")


class TestSSLCertificateManager(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmpdir.cleanup)
        self.ssl_dir = Path(self.tmpdir.name)
        self.crt_path = self.ssl_dir / "ssl.crt"
        self.key_path = self.ssl_dir / "ssl.key"
        self.old_crt = b"previous certificate"
        self.old_key = b"previous private key"
        self.crt_path.write_bytes(self.old_crt)
        self.key_path.write_bytes(self.old_key)
        self.crt = fixture_bytes("ssl.crt")
        self.key = fixture_bytes("ssl.key")
        self.run_command = mock.Mock(return_value=subprocess.CompletedProcess([], 0))
        self.manager = SSLCertificateManager(
            str(self.crt_path),
            str(self.key_path),
            run_command=self.run_command,
        )

    def test_install_replaces_pair_and_reloads_nginx(self):
        self.manager.install(self.crt, self.key)

        self.assertEqual(self.crt_path.read_bytes(), self.crt)
        self.assertEqual(self.key_path.read_bytes(), self.key)
        self.assertEqual(stat.S_IMODE(self.crt_path.stat().st_mode), 0o644)
        self.assertEqual(stat.S_IMODE(self.key_path.stat().st_mode), 0o600)
        self.assertEqual(
            self.run_command.call_args_list,
            [
                mock.call(["nginx", "-t"], check=True),
                mock.call(["nginx", "-s", "reload"], check=True),
            ],
        )
        self.assertEqual(
            sorted(path.name for path in self.ssl_dir.iterdir()),
            [".ssl-update.lock", "ssl.crt", "ssl.key"],
        )

    def test_invalid_pair_keeps_existing_files(self):
        with self.assertRaises(CertificateValidationError):
            self.manager.install(b"not a certificate", self.key)

        self.assertEqual(self.crt_path.read_bytes(), self.old_crt)
        self.assertEqual(self.key_path.read_bytes(), self.old_key)
        self.run_command.assert_not_called()

    def test_save_failure_restores_existing_pair(self):
        original_atomic_write = self.manager._atomic_write

        def fail_new_key(path, body, mode):
            if Path(path) == self.key_path and body == self.key:
                raise OSError("key write failed")
            return original_atomic_write(path, body, mode)

        with mock.patch.object(self.manager, "_atomic_write", side_effect=fail_new_key):
            with self.assertRaises(CertificateSaveError):
                self.manager.install(self.crt, self.key)

        self.assertEqual(self.crt_path.read_bytes(), self.old_crt)
        self.assertEqual(self.key_path.read_bytes(), self.old_key)
        self.run_command.assert_not_called()

    def test_nginx_config_failure_restores_existing_pair(self):
        self.run_command.side_effect = [
            subprocess.CalledProcessError(1, ["nginx", "-t"]),
            subprocess.CompletedProcess([], 0),
        ]

        with self.assertRaises(NginxConfigError):
            self.manager.install(self.crt, self.key)

        self.assertEqual(self.crt_path.read_bytes(), self.old_crt)
        self.assertEqual(self.key_path.read_bytes(), self.old_key)
        self.assertEqual(
            self.run_command.call_args_list,
            [
                mock.call(["nginx", "-t"], check=True),
                mock.call(["nginx", "-t"], check=True),
            ],
        )

    def test_nginx_reload_failure_restores_and_reloads_existing_pair(self):
        self.run_command.side_effect = [
            subprocess.CompletedProcess([], 0),
            subprocess.CalledProcessError(1, ["nginx", "-s", "reload"]),
            subprocess.CompletedProcess([], 0),
            subprocess.CompletedProcess([], 0),
        ]

        with self.assertRaises(NginxReloadError):
            self.manager.install(self.crt, self.key)

        self.assertEqual(self.crt_path.read_bytes(), self.old_crt)
        self.assertEqual(self.key_path.read_bytes(), self.old_key)
        self.assertEqual(
            self.run_command.call_args_list,
            [
                mock.call(["nginx", "-t"], check=True),
                mock.call(["nginx", "-s", "reload"], check=True),
                mock.call(["nginx", "-t"], check=True),
                mock.call(["nginx", "-s", "reload"], check=True),
            ],
        )

    def test_rollback_failure_is_reported_separately(self):
        self.run_command.side_effect = subprocess.CalledProcessError(1, ["nginx", "-t"])

        with mock.patch.object(self.manager, "_restore_previous", side_effect=OSError("restore failed")):
            with self.assertRaises(CertificateRollbackError):
                self.manager.install(self.crt, self.key)

    def test_check_ssl_chain_files(self):
        self.assertIsNone(
            self.manager.check_ssl_chain_files(
                str(Path(testdir, "cases", "ssl.crt")),
                str(Path(testdir, "cases", "ssl.key")),
            )
        )

    def test_check_ssl_chain_files_returns_ssl_error(self):
        error = self.manager.check_ssl_chain_files(
            str(Path(testdir, "cases", "new.epub")),
            str(Path(testdir, "cases", "old.epub")),
        )
        self.assertIsNotNone(error)

    def test_missing_previous_files_are_removed_on_rollback(self):
        os.unlink(self.crt_path)
        os.unlink(self.key_path)
        self.run_command.side_effect = [
            subprocess.CalledProcessError(1, ["nginx", "-t"]),
            subprocess.CompletedProcess([], 0),
        ]

        with self.assertRaises(NginxConfigError):
            self.manager.install(self.crt, self.key)

        self.assertFalse(self.crt_path.exists())
        self.assertFalse(self.key_path.exists())


if __name__ == "__main__":
    unittest.main()
