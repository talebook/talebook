import os
import signal
import subprocess
import tempfile
import time
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools" / "proot-talebook.sh"


def start_ticks(pid):
    stat = Path(f"/proc/{pid}/stat").read_text()
    return stat.rsplit(") ", 1)[1].split()[19]


class ProotTalebookLifecycleTest(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.base = Path(self.tempdir.name)
        self.data = self.base / "data"
        python = self.base / "venv" / "bin" / "python"
        python.parent.mkdir(parents=True)
        python.write_text("#!/bin/sh\nexec sleep 300\n")
        python.chmod(0o755)
        self.env = os.environ.copy()
        self.env.update(
            TALEBOOK_DATA_DIR=str(self.data),
            TALEBOOK_VENV_DIR=str(self.base / "venv"),
        )
        self.owned_pids = set()
        self.processes = []

    def tearDown(self):
        for pid in self.owned_pids:
            try:
                os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        for process in self.processes:
            process.wait(timeout=5)
        self.tempdir.cleanup()

    def run_script(self, action, expected=0):
        result = subprocess.run(
            [str(SCRIPT), action],
            env=self.env,
            text=True,
            capture_output=True,
            timeout=40,
        )
        self.assertEqual(result.returncode, expected, result.stdout + result.stderr)
        return result

    @property
    def pid_file(self):
        return self.data / "run" / "talebook.pid"

    def pid_from_file(self):
        return int(self.pid_file.read_text().splitlines()[0])

    def test_unrelated_process_is_not_signalled(self):
        unrelated = subprocess.Popen(["sleep", "300"])
        self.processes.append(unrelated)
        self.owned_pids.add(unrelated.pid)
        self.pid_file.parent.mkdir(parents=True)
        self.pid_file.write_text(
            f"{unrelated.pid}\n{start_ticks(unrelated.pid)}\nnot-its-token\n"
        )

        result = self.run_script("stop")

        self.assertIsNone(unrelated.poll())
        self.assertFalse(self.pid_file.exists())
        self.assertIn("no process was signalled", result.stdout)

    def test_expired_pid_is_removed(self):
        self.pid_file.parent.mkdir(parents=True)
        self.pid_file.write_text("99999999\n1\nexpired\n")

        result = self.run_script("stop")

        self.assertFalse(self.pid_file.exists())
        self.assertIn("no process was signalled", result.stdout)

    def test_start_status_stop_and_restart(self):
        self.run_script("start")
        first_pid = self.pid_from_file()
        self.owned_pids.add(first_pid)
        self.run_script("status")

        self.run_script("restart")
        second_pid = self.pid_from_file()
        self.owned_pids.add(second_pid)
        self.assertNotEqual(first_pid, second_pid)
        with self.assertRaises(ProcessLookupError):
            os.kill(first_pid, 0)
        self.run_script("status")

        self.run_script("stop")
        with self.assertRaises(ProcessLookupError):
            os.kill(second_pid, 0)
        self.assertFalse(self.pid_file.exists())


if __name__ == "__main__":
    unittest.main()
