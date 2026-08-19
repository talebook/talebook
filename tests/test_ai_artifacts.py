import datetime
import json
import os
import tempfile
import unittest
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from webserver import models
from webserver.services.agent_runtime import RuntimeResult
from webserver.services.ai_artifacts import (
    AIArtifactError,
    AIArtifactStore,
    migrate_legacy_summary_duck_artifacts,
    workspace_identifier,
)
from webserver.services.summary_duck import SummaryDuckService


def payload(label="原稿"):
    return {
        "items": [
            {
                "question": f"问题 {index + 1}",
                "answer": f"{label} {index + 1}",
                "citations": [{"href": "Text/chapter.xhtml", "start": index, "end": index + 1, "quote": "字"}],
            }
            for index in range(5)
        ]
    }


def record(**overrides):
    values = {
        "id": "11111111-1111-1111-1111-111111111111",
        "request_key": "a" * 64,
        "feature": "summary_duck",
        "creator_id": 7,
        "book_id": 9,
        "book_version": "book-version",
        "chapter_href": "Text/chapter.xhtml",
        "chapter_title": "章节",
        "chapter_text_hash": "b" * 64,
        "chapter_length": 120,
        "status": "succeeded",
        "schema_version": "summary_duck.v1",
        "prompt_version": "summary_duck.zh.v2",
        "create_time": datetime.datetime(2026, 8, 18, 1, 2, 3),
        "update_time": datetime.datetime(2026, 8, 18, 1, 3, 4),
        "workspace_id": "",
        "artifact_path": "",
        "artifact_sha256": "",
        "result_data": {},
        "ai_draft": {},
        "user_revision": {},
    }
    values.update(overrides)
    return models.AITask(**values)


class AIArtifactStoreTest(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.config = {"AI_ARTIFACT_ROOT": self.tempdir.name, "cookie_secret": "fixture-secret"}
        self.store = AIArtifactStore(self.config)

    def test_current_artifact_is_atomic_relative_and_digest_verified(self):
        task = record()
        digest = self.store.write_summary_duck(task, payload(), payload("用户稿"))

        self.assertEqual(task.artifact_sha256, digest)
        self.assertRegex(task.workspace_id, r"^[a-f0-9]{32}$")
        self.assertEqual(
            task.artifact_path,
            f"{task.workspace_id}/summary-duck/{task.id}.json",
        )
        self.assertNotIn("/v", task.artifact_path)
        artifact = Path(self.tempdir.name, task.artifact_path)
        self.assertTrue(artifact.is_file())
        self.assertEqual(oct(artifact.stat().st_mode & 0o777), "0o600")
        self.assertFalse(any(path.suffix == ".tmp" for path in artifact.parent.iterdir()))
        self.assertEqual(self.store.read_summary_duck(task)["user_revision"], payload("用户稿"))

        replacement = payload("第二次编辑")
        self.store.write_summary_duck(task, payload(), replacement)
        self.assertEqual(self.store.read_summary_duck(task)["user_revision"], replacement)

    def test_workspace_identifier_is_stable_across_configuration_changes(self):
        first = workspace_identifier(7, {"cookie_secret": "old"})
        second = workspace_identifier(7, {"cookie_secret": "rotated"})
        self.assertEqual(first, second)
        self.assertNotEqual(first, workspace_identifier(8, {}))

    def test_path_and_digest_tampering_fail_closed(self):
        task = record()
        self.store.write_summary_duck(task, payload(), payload())
        artifact = Path(self.tempdir.name, task.artifact_path)
        artifact.write_text(json.dumps({"tampered": True}), encoding="utf-8")
        with self.assertRaisesRegex(AIArtifactError, "校验失败"):
            self.store.read_summary_duck(task)

        task.artifact_path = "../outside.json"
        with self.assertRaisesRegex(AIArtifactError, "路径无效"):
            self.store.read_summary_duck(task)

    def test_delete_removes_current_file_and_empty_feature_directories(self):
        task = record()
        self.store.write_summary_duck(task, payload(), payload())
        workspace_dir = Path(self.tempdir.name, task.workspace_id)

        self.assertTrue(self.store.delete_summary_duck(task))
        self.assertFalse(workspace_dir.exists())
        self.assertFalse(self.store.delete_summary_duck(task))


class LegacyArtifactMigrationTest(unittest.TestCase):
    def test_migration_moves_database_blobs_and_is_idempotent(self):
        with tempfile.TemporaryDirectory() as tempdir:
            database = os.path.join(tempdir, "users.db")
            engine = create_engine(f"sqlite:///{database}")
            models.Base.metadata.create_all(engine)
            sessions = sessionmaker(bind=engine)
            session = sessions()
            legacy = record(
                result_data=payload("结果"),
                ai_draft=payload("原稿"),
                user_revision=payload("修订"),
            )
            session.add(legacy)
            session.commit()
            legacy_id = legacy.id
            session.close()

            config = {"AI_ARTIFACT_ROOT": os.path.join(tempdir, "ai"), "cookie_secret": "migration-secret"}
            self.assertEqual(
                migrate_legacy_summary_duck_artifacts(sessions, config),
                {"migrated": 1, "failed": 0},
            )
            migrated = sessions().get(models.AITask, legacy_id)
            self.assertEqual(migrated.result_data, {})
            self.assertEqual(migrated.ai_draft, {})
            self.assertEqual(migrated.user_revision, {})
            self.assertTrue(migrated.artifact_path)
            self.assertEqual(AIArtifactStore(config).read_summary_duck(migrated)["user_revision"], payload("修订"))
            self.assertEqual(
                migrate_legacy_summary_duck_artifacts(sessions, config),
                {"migrated": 0, "failed": 0},
            )


class SummaryDuckArtifactPersistenceTest(unittest.TestCase):
    def test_success_writes_file_and_keeps_database_payload_columns_empty(self):
        class Runtime:
            name = "fixture"

            def generate(self, request, on_event):
                return RuntimeResult(payload(), {"inputTokens": 10}, "session")

            def cancel(self, task_id):
                return False

        with tempfile.TemporaryDirectory() as tempdir:
            engine = create_engine(f"sqlite:///{os.path.join(tempdir, 'users.db')}")
            models.Base.metadata.create_all(engine)
            sessions = sessionmaker(bind=engine)
            session = sessions()
            task = record(status="queued")
            session.add(task)
            session.commit()
            task_id = task.id
            session.close()
            config = {"AI_ARTIFACT_ROOT": os.path.join(tempdir, "ai")}
            service = SummaryDuckService()
            service.setup(sessions, config, runtime=Runtime())
            service._run(
                task_id,
                {"text": "字" * 120, "href": "Text/chapter.xhtml", "title": "章节"},
            )

            stored = sessions().get(models.AITask, task_id)
            self.assertEqual(stored.status, "succeeded")
            self.assertEqual(stored.result_data, {})
            self.assertEqual(stored.ai_draft, {})
            self.assertEqual(stored.user_revision, {})
            self.assertTrue(stored.artifact_sha256)
            document = AIArtifactStore(config).read_summary_duck(stored)
            self.assertEqual(document["ai_draft"], payload())
            self.assertEqual(document["user_revision"], payload())


if __name__ == "__main__":
    unittest.main()
