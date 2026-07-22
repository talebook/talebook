import os
import shutil
import stat
import subprocess
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace


ROOT = Path(__file__).resolve().parents[1]
SETUP_SCRIPT = ROOT / "docker" / "setup-user.sh"
SUPERVISOR_CONFIGS = [
    ROOT / "conf" / "supervisor" / "dev.conf",
    ROOT / "conf" / "supervisor" / "server-side-render.conf",
    ROOT / "conf" / "supervisor" / "talebook.conf",
]


def write_stub(path: Path, command: str) -> None:
    path.write_text(f'#!/bin/sh\nprintf "%s\\n" "{command} $*" >> "$COMMAND_LOG"\n', encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IXUSR)


def run_setup(tmp_path: Path, puid: str, pgid: str) -> SimpleNamespace:
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    command_log = tmp_path / "commands.log"
    nginx_config = tmp_path / "nginx.conf"
    nginx_config.write_text("user talebook;\n", encoding="utf-8")
    write_stub(bin_dir / "groupmod", "groupmod")
    write_stub(bin_dir / "usermod", "usermod")

    env = os.environ.copy()
    env.update(
        {
            "COMMAND_LOG": str(command_log),
            "PATH": f"{bin_dir}:{env['PATH']}",
            "PGID": pgid,
            "PUID": puid,
            "TALEBOOK_NGINX_CONFIG": str(nginx_config),
        }
    )
    command = (
        f'. "{SETUP_SCRIPT}" && '
        'printf "%s|%s|%s" "$TALEBOOK_RUN_USER" "$TALEBOOK_RUN_GROUP" "$TALEBOOK_RUN_IDENTITY"'
    )
    result = subprocess.run(["sh", "-c", command], env=env, text=True, capture_output=True)
    return SimpleNamespace(
        command_log=command_log.read_text(encoding="utf-8") if command_log.exists() else "",
        nginx_config=nginx_config.read_text(encoding="utf-8"),
        returncode=result.returncode,
        stderr=result.stderr,
        stdout=result.stdout,
    )


class TestDockerUserSetup(unittest.TestCase):
    def setUp(self):
        self.tmpdir = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmpdir, ignore_errors=True)

    def test_zero_ids_reuse_root_without_modifying_talebook(self):
        result = run_setup(self.tmpdir, "0", "0")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, "root|root|root:root")
        self.assertEqual(result.command_log, "")
        self.assertEqual(result.nginx_config, "user root root;\n")

    def test_nonzero_ids_remap_talebook(self):
        result = run_setup(self.tmpdir, "1001", "1002")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, "talebook|talebook|talebook:talebook")
        self.assertEqual(
            result.command_log.splitlines(),
            [
                "groupmod -o -g 1002 talebook",
                "usermod -o -u 1001 talebook",
                "usermod -g talebook talebook",
            ],
        )
        self.assertEqual(result.nginx_config, "user talebook talebook;\n")

    def test_zero_uid_and_nonzero_gid_are_resolved_independently(self):
        result = run_setup(self.tmpdir, "0", "1002")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, "root|talebook|root:talebook")
        self.assertEqual(result.command_log.splitlines(), ["groupmod -o -g 1002 talebook"])
        self.assertEqual(result.nginx_config, "user root talebook;\n")

    def test_nonzero_uid_and_zero_gid_are_resolved_independently(self):
        result = run_setup(self.tmpdir, "1001", "0")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, "talebook|root|talebook:root")
        self.assertEqual(
            result.command_log.splitlines(),
            [
                "usermod -o -u 1001 talebook",
                "usermod -g root talebook",
            ],
        )
        self.assertEqual(result.nginx_config, "user talebook root;\n")

    def test_invalid_id_is_rejected_before_account_changes(self):
        result = run_setup(self.tmpdir, "root", "0")

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("PUID must be a non-negative integer", result.stderr)
        self.assertEqual(result.command_log, "")
        self.assertEqual(result.nginx_config, "user talebook;\n")

    def test_start_scripts_share_the_identity_setup(self):
        for name in ("docker/start.sh", "docker/start-dev.sh"):
            content = (ROOT / name).read_text(encoding="utf-8")
            self.assertIn('if ! . "$DOCKER_DIR/setup-user.sh"; then', content)
            self.assertNotIn("groupmod -o", content)
            self.assertNotIn("usermod -o", content)

    def test_supervisor_programs_use_the_resolved_identity(self):
        for path in SUPERVISOR_CONFIGS:
            content = path.read_text(encoding="utf-8")
            self.assertNotIn("gosu talebook:talebook", content)
            for line in content.splitlines():
                if line.startswith("command=gosu "):
                    self.assertTrue(line.startswith("command=gosu %(ENV_TALEBOOK_RUN_IDENTITY)s "))


if __name__ == "__main__":
    unittest.main()
