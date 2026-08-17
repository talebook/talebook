import tempfile
import unittest
import uuid
import zipfile
from pathlib import Path
from stat import S_IMODE
from types import SimpleNamespace

from webserver.services.ai_artifacts import AIArtifactError, AIArtifactStore
from webserver.services.skill_library import (
    build_skill_package,
    build_skill_zip,
    default_manifest,
    delete_skill_artifacts,
    materialize_skill_package,
    read_skill_package_zip,
)


class AIArtifactStoreTest(unittest.TestCase):
    def test_skill_versions_persist_below_shared_feature_root_and_delete_together(self):
        with tempfile.TemporaryDirectory() as root:
            skill_id = str(uuid.uuid4())
            version = SimpleNamespace(
                skill_id=skill_id,
                version=2,
                manifest=default_manifest("Reading Summary", "Summarize supplied reading material."),
                markdown="# Reading summary\n\nSummarize only supplied material.",
                content_hash="artifact-test",
            )

            package = materialize_skill_package(version, 7, root)
            expected_version = Path(root) / "skills" / "7" / skill_id / "v2"
            expected_folder = expected_version / package["folder"]
            expected_archive = expected_version / package["filename"]
            self.assertEqual(package["storage_path"], expected_folder.relative_to(root).as_posix())
            self.assertEqual(package["archive_path"], expected_archive.relative_to(root).as_posix())
            self.assertEqual((expected_folder / "SKILL.md").read_text(), package["files"][0]["content"])
            self.assertTrue((expected_folder / "references" / "contract.json").is_file())
            for directory in (
                Path(root),
                Path(root) / "skills",
                Path(root) / "skills" / "7",
                Path(root) / "skills" / "7" / skill_id,
                expected_version,
                expected_folder,
                expected_folder / "references",
            ):
                self.assertEqual(S_IMODE(directory.stat().st_mode), 0o700)
            self.assertEqual(S_IMODE((expected_folder / "SKILL.md").stat().st_mode), 0o600)
            self.assertEqual(S_IMODE(expected_archive.stat().st_mode), 0o600)
            with zipfile.ZipFile(expected_archive) as archive:
                self.assertEqual(
                    archive.namelist(),
                    [f"{package['folder']}/SKILL.md", f"{package['folder']}/references/contract.json"],
                )

            expected_archive.write_bytes(b"corrupt")
            stored, payload = read_skill_package_zip(version, 7, root)
            self.assertEqual(payload, build_skill_zip(build_skill_package(version)))
            self.assertEqual(stored["archive_path"], package["archive_path"])

            delete_skill_artifacts(7, skill_id, root)
            self.assertFalse((Path(root) / "skills" / "7" / skill_id).exists())

    def test_rejects_path_traversal_and_invalid_coordinates(self):
        with tempfile.TemporaryDirectory() as root:
            store = AIArtifactStore(root)
            with self.assertRaises(AIArtifactError):
                store.materialize("skills", 1, "safe-id", 1, {"../SKILL.md": b"invalid"})
            with self.assertRaises(AIArtifactError):
                store.version_path("../skills", 1, "safe-id", 1)
            with self.assertRaises(AIArtifactError):
                store.version_path("skills", 0, "safe-id", 1)


if __name__ == "__main__":
    unittest.main()
