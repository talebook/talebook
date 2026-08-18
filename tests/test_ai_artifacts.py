import tempfile
import unittest
import uuid
from pathlib import Path
from stat import S_IMODE
from types import SimpleNamespace

from webserver.services.ai_artifacts import AIArtifactError, AIArtifactStore, workspace_key
from webserver.services.skill_library import (
    build_skill_package,
    build_skill_zip,
    default_manifest,
    delete_skill_artifacts,
    materialize_skill_package,
    read_skill_package,
    read_skill_package_zip,
)
from webserver.settings import settings as SETTINGS


class AIArtifactStoreTest(unittest.TestCase):
    def test_current_skill_atomically_replaces_workspace_first_directory(self):
        with tempfile.TemporaryDirectory() as root:
            skill_id = str(uuid.uuid4())
            workspace = workspace_key(7)
            manifest = default_manifest("Reading Summary", "Summarize supplied reading material.")
            markdown = "# Reading summary\n\nSummarize only supplied material."
            package = materialize_skill_package(skill_id, workspace, manifest, markdown, root)
            expected_artifact = Path(root) / workspace / "skills" / skill_id
            expected_folder = expected_artifact / package["folder"]
            self.assertEqual(package["storage_path"], expected_folder.relative_to(root).as_posix())
            self.assertEqual((expected_folder / "SKILL.md").read_text(), package["files"][0]["content"])
            self.assertFalse(any(path.name.startswith("v") for path in expected_artifact.iterdir()))
            self.assertFalse((expected_artifact / package["filename"]).exists())
            for directory in (
                Path(root),
                Path(root) / workspace,
                Path(root) / workspace / "skills",
                expected_artifact,
                expected_folder,
                expected_folder / "references",
            ):
                self.assertEqual(S_IMODE(directory.stat().st_mode), 0o700)
            self.assertEqual(S_IMODE((expected_folder / "SKILL.md").stat().st_mode), 0o600)

            manifest["description"] = "Replace the current directory atomically."
            replaced = materialize_skill_package(skill_id, workspace, manifest, "# Replaced", root)
            self.assertEqual([path.name for path in expected_artifact.iterdir()], [replaced["folder"]])
            self.assertNotIn("Summarize only supplied material", (expected_folder / "SKILL.md").read_text())

            skill = SimpleNamespace(
                id=skill_id,
                workspace_key=workspace,
                artifact_path=replaced["storage_path"],
                content_hash=replaced["content_hash"],
            )
            document = read_skill_package(skill, root)
            self.assertEqual(document["manifest"]["description"], manifest["description"])
            stored, payload = read_skill_package_zip(skill, root)
            self.assertEqual(payload, build_skill_zip(build_skill_package(manifest, "# Replaced")))
            self.assertEqual(stored["storage_path"], replaced["storage_path"])

            delete_skill_artifacts(workspace, skill_id, root)
            self.assertFalse(expected_artifact.exists())
            self.assertFalse((Path(root) / workspace).exists())

    def test_rejects_traversal_symlinks_and_content_tampering(self):
        with tempfile.TemporaryDirectory() as root, tempfile.TemporaryDirectory() as external:
            store = AIArtifactStore(root)
            workspace = workspace_key(1)
            with self.assertRaises(AIArtifactError):
                store.materialize(workspace, "skills", "safe-id", {"../SKILL.md": b"invalid"})
            with self.assertRaises(AIArtifactError):
                store.artifact_path("../workspace", "skills", "safe-id")
            with self.assertRaises(AIArtifactError):
                store.artifact_path(workspace, "../skills", "safe-id")

            package = materialize_skill_package(
                "safe-id",
                workspace,
                default_manifest("Safe Skill", "A safe package."),
                "# Safe",
                root,
            )
            skill = SimpleNamespace(
                id="safe-id",
                workspace_key=workspace,
                artifact_path=package["storage_path"],
                content_hash=package["content_hash"],
            )
            skill_md = Path(root).joinpath(*Path(package["storage_path"]).parts, "SKILL.md")
            skill_md.write_text("tampered", encoding="utf-8")
            with self.assertRaises(AIArtifactError):
                read_skill_package(skill, root)

            linked_workspace = workspace_key(2)
            external_artifact = Path(external) / "skills" / "outside-id"
            external_artifact.mkdir(parents=True)
            (external_artifact / "owned.txt").write_text("outside", encoding="utf-8")
            (Path(root) / linked_workspace).symlink_to(external, target_is_directory=True)
            with self.assertRaises(AIArtifactError):
                store.read(linked_workspace, "skills", "outside-id")
            with self.assertRaises(AIArtifactError):
                store.delete_artifact(linked_workspace, "skills", "outside-id")
            self.assertTrue((external_artifact / "owned.txt").is_file())

    def test_default_ai_root_is_covered_by_books_volume_and_indexes_are_relative(self):
        root = Path(SETTINGS["AI_ARTIFACT_ROOT"])
        self.assertEqual(root, Path("/data/books/ai"))
        self.assertTrue(root.is_relative_to(Path("/data/books")))
        with tempfile.TemporaryDirectory() as temporary_root:
            store = AIArtifactStore(temporary_root)
            relative = store.relative_path(store.artifact_path(workspace_key(9), "skills", "artifact-id"))
            self.assertFalse(Path(relative).is_absolute())
            self.assertEqual(relative.split("/")[1], "skills")


if __name__ == "__main__":
    unittest.main()
