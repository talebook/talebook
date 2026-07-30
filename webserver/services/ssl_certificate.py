#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import fcntl
import os
import ssl
import stat
import subprocess
import tempfile
from contextlib import contextmanager
from pathlib import Path


class SSLCertificateError(Exception):
    """Base error for a certificate installation."""


class CertificateValidationError(SSLCertificateError):
    """The uploaded certificate and private key are not a valid pair."""


class CertificateSaveError(SSLCertificateError):
    """The uploaded pair could not be stored."""


class NginxConfigError(SSLCertificateError):
    """Nginx rejected the candidate certificate configuration."""


class NginxReloadError(SSLCertificateError):
    """Nginx could not activate the candidate certificate."""


class CertificateRollbackError(SSLCertificateError):
    """The previous certificate pair could not be restored."""


_MISSING = object()


class SSLCertificateManager:
    """Install a certificate pair and keep Nginx and disk state consistent."""

    def __init__(self, crt_path, key_path, run_command=subprocess.run):
        self.crt_path = Path(crt_path)
        self.key_path = Path(key_path)
        if self.crt_path.parent != self.key_path.parent:
            raise ValueError("certificate and private key must use the same directory")
        self.ssl_dir = self.crt_path.parent
        self.lock_path = self.ssl_dir / ".ssl-update.lock"
        self.run_command = run_command

    def install(self, crt_body, key_body):
        self._validate_uploaded_pair(crt_body, key_body)

        try:
            self.ssl_dir.mkdir(parents=True, exist_ok=True)
            with self._install_lock():
                previous = self._snapshot_previous()
                self._install_candidate(crt_body, key_body, previous)
                self._check_candidate(previous)
                self._activate_candidate(previous)
        except SSLCertificateError:
            raise
        except OSError as err:
            raise CertificateSaveError(str(err)) from err

    def check_ssl_chain_files(self, crt_file, key_file):
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        try:
            context.load_cert_chain(crt_file, key_file)
        except (OSError, ssl.SSLError) as err:
            return err
        return None

    def nginx_check(self):
        return self.run_command(["nginx", "-t"], check=True)

    def nginx_reload(self):
        return self.run_command(["nginx", "-s", "reload"], check=True)

    def _validate_uploaded_pair(self, crt_body, key_body):
        try:
            self.ssl_dir.mkdir(parents=True, exist_ok=True)
            crt_path = self._write_temporary(crt_body, 0o644, ".candidate-", ".crt")
            try:
                key_path = self._write_temporary(key_body, 0o600, ".candidate-", ".key")
                try:
                    error = self.check_ssl_chain_files(crt_path, key_path)
                finally:
                    self._unlink_if_exists(key_path)
            finally:
                self._unlink_if_exists(crt_path)
        except OSError as err:
            raise CertificateSaveError(str(err)) from err

        if error is not None:
            raise CertificateValidationError(str(error))

    @contextmanager
    def _install_lock(self):
        with open(self.lock_path, "a+b") as lock_file:
            os.fchmod(lock_file.fileno(), 0o600)
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)

    def _snapshot_previous(self):
        return {
            self.crt_path: self._snapshot_file(self.crt_path),
            self.key_path: self._snapshot_file(self.key_path),
        }

    def _snapshot_file(self, path):
        try:
            body = path.read_bytes()
            mode = stat.S_IMODE(path.stat().st_mode)
            return body, mode
        except FileNotFoundError:
            return _MISSING

    def _install_candidate(self, crt_body, key_body, previous):
        try:
            self._atomic_write(self.crt_path, crt_body, 0o644)
            self._atomic_write(self.key_path, key_body, 0o600)
        except OSError as err:
            try:
                self._restore_previous(previous)
            except OSError as rollback_err:
                raise CertificateRollbackError(
                    "certificate save failed (%s), and rollback failed (%s)" % (err, rollback_err)
                ) from rollback_err
            raise CertificateSaveError(str(err)) from err

    def _check_candidate(self, previous):
        try:
            self.nginx_check()
        except (OSError, subprocess.CalledProcessError) as err:
            self._rollback(previous, original_error=err, reload_nginx=False)
            raise NginxConfigError(str(err)) from err

    def _activate_candidate(self, previous):
        try:
            self.nginx_reload()
        except (OSError, subprocess.CalledProcessError) as err:
            self._rollback(previous, original_error=err, reload_nginx=True)
            raise NginxReloadError(str(err)) from err

    def _rollback(self, previous, original_error, reload_nginx):
        try:
            self._restore_previous(previous)
            self.nginx_check()
            if reload_nginx:
                self.nginx_reload()
        except (OSError, subprocess.CalledProcessError) as rollback_err:
            raise CertificateRollbackError(
                "certificate update failed (%s), and rollback failed (%s)" % (original_error, rollback_err)
            ) from rollback_err

    def _restore_previous(self, previous):
        for path, snapshot in previous.items():
            if snapshot is _MISSING:
                self._unlink_if_exists(path)
                continue
            body, mode = snapshot
            self._atomic_write(path, body, mode)

    def _atomic_write(self, path, body, mode):
        temp_path = self._write_temporary(body, mode, ".install-", ".tmp")
        try:
            os.replace(temp_path, path)
        finally:
            self._unlink_if_exists(temp_path)

    def _write_temporary(self, body, mode, prefix, suffix):
        file_descriptor, path = tempfile.mkstemp(dir=self.ssl_dir, prefix=prefix, suffix=suffix)
        try:
            os.fchmod(file_descriptor, mode)
            with os.fdopen(file_descriptor, "wb") as output:
                output.write(body)
                output.flush()
                os.fsync(output.fileno())
            return Path(path)
        except Exception:
            try:
                os.close(file_descriptor)
            except OSError:
                pass
            self._unlink_if_exists(path)
            raise

    @staticmethod
    def _unlink_if_exists(path):
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass
