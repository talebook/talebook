"""Real cache ownership regression; run as root in an isolated Talebook image.

    python3 -m unittest tests.test_nginx_cache_permissions -v

Only temporary files under /tmp are changed; no application accounts are edited.
"""

import contextlib
import os
import pwd
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
HELPER = ROOT / "docker/prepare-nginx-permissions.sh"


@unittest.skipUnless(os.geteuid() == 0 and shutil.which("chown"), "requires root in an isolated test container")
class TestNginxCachePermissions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            cls.root_user = pwd.getpwnam("root")
            cls.nonroot_user = pwd.getpwnam("daemon")
            cls.worker_user = pwd.getpwnam("nobody")
        except KeyError as error:
            raise unittest.SkipTest(f"requires root, daemon and nobody system accounts: {error}")
        if cls.root_user.pw_uid != 0 or not cls.nonroot_user.pw_uid or not cls.worker_user.pw_uid:
            raise unittest.SkipTest("requires root UID 0 and distinct unprivileged daemon/nobody accounts")
        if cls.nonroot_user.pw_uid == cls.worker_user.pw_uid:
            raise unittest.SkipTest("requires distinct daemon and nobody UIDs")

    @contextlib.contextmanager
    def cache_tree(self):
        # Calibre can replace both TMPDIR and tempfile.tempdir with a private
        # parent. Give our fixture its own traversable parent without chmod'ing
        # that shared directory or making the actual cache world-accessible.
        with tempfile.TemporaryDirectory(prefix="talebook-nginx-owner-", dir="/tmp") as directory:
            outer = Path(directory)
            outer.chmod(0o755)
            cache = outer / "cache"
            cache.mkdir(mode=0o700)
            for relative in ("proxy/1/00", "client_body/old", "fastcgi/1/00", "scgi/1/00", "uwsgi/1/00"):
                leaf = cache / relative
                leaf.mkdir(parents=True, mode=0o700)
                (leaf / "old.tmp").write_bytes(b"existing cached bytes")
            for path in (cache, *cache.rglob("*")):
                os.chown(path, 0, 0)
                path.chmod(0o700 if path.is_dir() else 0o600)
            yield outer, cache

    def permissions(self, cache):
        return {
            path.relative_to(cache): (path.stat().st_gid, stat.S_IMODE(path.stat().st_mode))
            for path in (cache, *cache.rglob("*"))
        }

    def run_helper(self, app_user, cache, *, as_user=None):
        identity = {}
        if as_user:
            identity = {"user": as_user.pw_uid, "group": as_user.pw_gid, "extra_groups": []}
        # Feed the real helper to sh so an unprivileged negative control does
        # not depend on being able to traverse the source checkout's parents.
        return subprocess.run(
            ["sh", "-s", "--", app_user, str(cache)],
            input=HELPER.read_text(),
            capture_output=True,
            text=True,
            timeout=10,
            **identity,
        )

    def assert_owner_and_permissions(self, cache, expected_user, before):
        self.assertEqual(self.permissions(cache), before, "repair must preserve every existing group and mode")
        for path in (cache, *cache.rglob("*")):
            with self.subTest(path=path.relative_to(cache)):
                self.assertEqual(path.stat().st_uid, expected_user.pw_uid)

    def write_as(self, account, directory):
        return subprocess.run(
            [
                sys.executable,
                "-c",
                "from pathlib import Path; import sys; Path(sys.argv[1], 'worker-write.tmp').write_bytes(b'worker can write')",
                str(directory),
            ],
            user=account.pw_uid,
            group=account.pw_gid,
            extra_groups=[],
            capture_output=True,
            text=True,
            timeout=10,
        )

    def assert_worker_access(self, cache, worker, other):
        directories = [path for path in (cache, *cache.rglob("*")) if path.is_dir()]
        for directory in directories:
            with self.subTest(directory=directory.relative_to(cache), worker=worker.pw_name):
                # Check the negative control before creating each marker: the
                # failure must be cache traversal/write access, not an old file.
                denied = self.write_as(other, directory)
                self.assertNotEqual(denied.returncode, 0)
                self.assertIn("PermissionError", denied.stderr)
                written = self.write_as(worker, directory)
                self.assertEqual(written.returncode, 0, written.stderr)
                marker = directory / "worker-write.tmp"
                self.assertEqual(marker.read_bytes(), b"worker can write")
                self.assertEqual(marker.stat().st_uid, worker.pw_uid)
                marker.unlink()

    def test_root_application_repairs_all_existing_cache_descendants_for_nobody(self):
        with self.cache_tree() as (_, cache):
            before = self.permissions(cache)
            result = self.run_helper(self.root_user.pw_name, cache)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assert_owner_and_permissions(cache, self.worker_user, before)
            self.assert_worker_access(cache, self.worker_user, self.nonroot_user)

    def test_nonroot_application_keeps_cache_private_and_writable_by_its_uid(self):
        with self.cache_tree() as (_, cache):
            before = self.permissions(cache)
            result = self.run_helper(self.nonroot_user.pw_name, cache)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assert_owner_and_permissions(cache, self.nonroot_user, before)
            self.assert_worker_access(cache, self.nonroot_user, self.worker_user)

    def test_repeated_start_repairs_new_root_owned_descendants(self):
        with self.cache_tree() as (_, cache):
            for attempt in range(2):
                with self.subTest(attempt=attempt):
                    result = self.run_helper(self.root_user.pw_name, cache)
                    self.assertEqual(result.returncode, 0, result.stderr)
                    if attempt == 0:
                        stale = cache / "proxy/2/00"
                        stale.mkdir(parents=True, mode=0o700)
                        for path in (stale.parent, stale):
                            os.chown(path, 0, 0)
                            path.chmod(0o700)
                        before = self.permissions(cache)
            self.assert_owner_and_permissions(cache, self.worker_user, before)
            self.assert_worker_access(cache, self.worker_user, self.nonroot_user)

    def test_switch_from_root_to_nonroot_repairs_previous_worker_owned_descendants(self):
        with self.cache_tree() as (_, cache):
            before = self.permissions(cache)
            result = self.run_helper(self.root_user.pw_name, cache)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assert_owner_and_permissions(cache, self.worker_user, before)
            result = self.run_helper(self.nonroot_user.pw_name, cache)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assert_owner_and_permissions(cache, self.nonroot_user, before)
            self.assert_worker_access(cache, self.nonroot_user, self.worker_user)

    def test_unknown_application_account_fails_without_changing_cache(self):
        with self.cache_tree() as (_, cache):
            before = self.permissions(cache)
            result = self.run_helper("talebook-nginx-test-account-does-not-exist", cache)
            self.assertNotEqual(result.returncode, 0)
            self.assert_owner_and_permissions(cache, self.root_user, before)

    def test_missing_cache_directory_fails(self):
        with self.cache_tree() as (outer, _):
            result = self.run_helper(self.root_user.pw_name, outer / "does-not-exist")
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("chown", result.stderr)

    def test_failed_ownership_repair_exits_nonzero(self):
        with self.cache_tree() as (_, cache):
            before = self.permissions(cache)
            result = self.run_helper(self.root_user.pw_name, cache, as_user=self.nonroot_user)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("chown", result.stderr)
            self.assert_owner_and_permissions(cache, self.root_user, before)

    def test_private_calibre_tmpdir_is_unchanged(self):
        with tempfile.TemporaryDirectory(prefix="talebook-private-tmp-", dir="/tmp") as directory:
            private = Path(directory)
            private.chmod(0o700)
            before = private.stat()
            with (
                mock.patch.dict(os.environ, {"TMPDIR": directory}),
                mock.patch.object(tempfile, "tempdir", directory),
            ):
                self.test_root_application_repairs_all_existing_cache_descendants_for_nobody()
            after = private.stat()
            self.assertEqual(
                (after.st_uid, after.st_gid, after.st_mode),
                (before.st_uid, before.st_gid, before.st_mode),
            )


if __name__ == "__main__":
    unittest.main()
