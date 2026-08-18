import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock

from tests import test_main
from webserver import models
from webserver.handlers import skill_library as skill_handlers
from webserver.services.ai_artifacts import AIArtifactError
from webserver.services.agent_runtime import (
    AgentRuntimeError,
    RuntimeErrorCode,
    RuntimeEvent,
    RuntimeEventType,
    RuntimeResult,
)
from webserver.services.skill_library import (
    SensitiveContentError,
    SkillRunService,
    SkillValidationError,
    build_skill_package,
    build_skill_zip,
    default_manifest,
    validate_schema_definition,
    validate_schema_value,
    validate_version_payload,
)


def setUpModule():
    if test_main._app is None:
        test_main.setup_server()
        test_main.setup_mock_user()
        test_main.setup_mock_sendmail()
        test_main.setup_mock_service()


def api_body(value):
    return {"headers": {"Content-Type": "application/json"}, "body": json.dumps(value, ensure_ascii=False)}


class SkillManifestValidationTest(unittest.TestCase):
    def test_manifest_and_schema_subset_accept_expected_values(self):
        manifest = default_manifest("摘要整理", "把输入整理为固定结构。")
        checked = validate_version_payload(manifest, "# 摘要整理\n\n只处理用户提供的内容。", False)
        validate_schema_value({"content": "有效输入"}, checked["manifest"]["input_schema"], "input")
        validate_schema_value({"result": "有效输出"}, checked["manifest"]["output_schema"], "output")
        with self.assertRaisesRegex(SkillValidationError, "缺少字段"):
            validate_schema_value({}, checked["manifest"]["input_schema"], "input")

    def test_schema_rejects_remote_refs_composition_and_deep_nesting(self):
        with self.assertRaisesRegex(SkillValidationError, "不受支持"):
            validate_schema_definition({"type": "object", "$ref": "https://example.com/schema"}, "schema")
        with self.assertRaisesRegex(SkillValidationError, "不受支持"):
            validate_schema_definition({"type": "object", "allOf": []}, "schema")
        nested = {"type": "string"}
        for _index in range(10):
            nested = {"type": "array", "items": nested}
        with self.assertRaisesRegex(SkillValidationError, "嵌套过深"):
            validate_schema_definition(nested, "schema")

    def test_sensitive_scanner_never_allows_credentials_and_requires_ack_for_contact_data(self):
        manifest = default_manifest()
        with self.assertRaises(SensitiveContentError) as credentials:
            validate_version_payload(manifest, "api_key = super-secret-value", True)
        self.assertTrue(credentials.exception.hard_block)
        self.assertNotIn("super-secret-value", json.dumps(credentials.exception.findings))
        with self.assertRaises(SensitiveContentError) as email:
            validate_version_payload(manifest, "联系 reader@example.com 获取样例", False)
        self.assertFalse(email.exception.hard_block)
        self.assertEqual(validate_version_payload(manifest, "联系 reader@example.com 获取样例", True)["findings"][0]["kind"], "email")

    def test_package_name_and_progressive_disclosure_limits(self):
        manifest = default_manifest()
        manifest["package_name"] = "Bad_Name"
        with self.assertRaisesRegex(SkillValidationError, "package_name"):
            validate_version_payload(manifest, "# Invalid package name", False)
        manifest = default_manifest()
        with self.assertRaisesRegex(SkillValidationError, "500 行"):
            validate_version_payload(manifest, "\n".join(f"step {index}" for index in range(500)), False)


class FakeRuntime:
    name = "fake_skill_runtime"

    def generate(self, request, on_event):
        on_event(RuntimeEvent(RuntimeEventType.STARTED, "开始运行", "thread-skill"))
        on_event(RuntimeEvent(RuntimeEventType.PROGRESS, "正在处理", "thread-skill"))
        on_event(RuntimeEvent(RuntimeEventType.COMPLETED, "运行完成", "thread-skill", {"outputTokens": 4}))
        return RuntimeResult({"result": "结构化结果"}, {"outputTokens": 4}, "thread-skill")

    def cancel(self, _task_id):
        return True


class InvalidOutputRuntime(FakeRuntime):
    def generate(self, _request, _on_event):
        return RuntimeResult({"unexpected": "field"}, {}, "thread-invalid")


class TimeoutRuntime(FakeRuntime):
    def generate(self, _request, _on_event):
        raise AgentRuntimeError(RuntimeErrorCode.TOTAL_TIMEOUT, "AI 生成超过总时长限制")


class SkillLibraryAPITest(test_main.TestWithUserLogin):
    def setUp(self):
        self.artifact_root = tempfile.TemporaryDirectory()
        self.artifact_config = mock.patch.dict(skill_handlers.CONF, {"AI_ARTIFACT_ROOT": self.artifact_root.name})
        self.artifact_config.start()
        super().setUp()
        self.user.return_value = 1
        self._clear()

    def tearDown(self):
        self.user.return_value = 1
        self._clear()
        super().tearDown()
        self.artifact_config.stop()
        self.artifact_root.cleanup()

    def _clear(self):
        session = test_main.get_db()
        session.query(models.SkillRun).delete(synchronize_session=False)
        session.query(models.Skill).delete(synchronize_session=False)
        session.query(models.AITask).filter(models.AITask.feature == "skill-source-fixture").delete(synchronize_session=False)
        session.commit()

    def _create(self, **overrides):
        payload = {"name": "摘要整理", "description": "把阅读内容整理成固定格式。"}
        payload.update(overrides)
        return self.json("/api/ai/skills", method="POST", **api_body(payload))

    def _update(self, skill, manifest=None, markdown="# 更新\n\n更新后的方法。", **overrides):
        payload = {
            "base_hash": skill["content_hash"],
            "manifest": manifest or skill["document"]["manifest"],
            "markdown": markdown,
        }
        payload.update(overrides)
        return self.json(f"/api/ai/skills/{skill['id']}", method="PATCH", **api_body(payload))

    def _artifact_root_for(self, skill):
        return Path(self.artifact_root.name).joinpath(*Path(skill["artifact_path"]).parts[:-1])

    def test_create_edit_search_directory_authority_and_owner_isolation(self):
        created = self._create()
        self.assertEqual(created["err"], "ok")
        skill = created["skill"]
        self.assertEqual(skill["status"], "draft")
        self.assertEqual(skill["document"]["manifest"]["name"], "摘要整理")
        self.assertNotIn("manifest", models.Skill.__table__.columns)
        self.assertNotIn("markdown", models.Skill.__table__.columns)
        self.assertNotIn("current_version", models.Skill.__table__.columns)
        self.assertNotIn("skill_versions", models.Base.metadata.tables)

        listed = self.json("/api/ai/skills?q=摘要&status=draft")
        self.assertEqual([item["id"] for item in listed["skills"]], [skill["id"]])
        manifest = dict(skill["document"]["manifest"])
        manifest["description"] = "当前目录的新描述"
        updated = self._update(skill, manifest)["skill"]
        self.assertNotEqual(updated["content_hash"], skill["content_hash"])
        artifact_root = self._artifact_root_for(updated)
        self.assertEqual([path.name for path in artifact_root.iterdir()], [manifest["package_name"]])
        self.assertFalse(any(path.name.startswith("v") for path in artifact_root.iterdir()))

        conflict = self.json(
            f"/api/ai/skills/{skill['id']}",
            method="PATCH",
            **api_body({"base_hash": skill["content_hash"], "manifest": manifest, "markdown": "# stale"}),
        )
        self.assertEqual(conflict["err"], "skill.content_conflict")
        self.user.return_value = 2
        self.assertEqual(self.json(f"/api/ai/skills/{skill['id']}")["err"], "skill.not_found")
        self.assertEqual(self.json("/api/ai/skills")["skills"], [])

    def test_source_task_keeps_only_minimal_confirmed_source(self):
        session = test_main.get_db()
        task = models.AITask(
            id="22222222-2222-2222-2222-222222222222",
            request_key="2" * 64,
            feature="skill-source-fixture",
            creator_id=1,
            book_id=test_main.BID_EPUB,
            book_version="fixture",
            chapter_href="chapter.xhtml",
            chapter_title="来源章节",
            chapter_text_hash="3" * 64,
            chapter_length=100,
            status="succeeded",
            result_data={"result": "不应复制的正文与 reader@example.com"},
            schema_version="fixture.v1",
            prompt_version="fixture.zh.v1",
        )
        session.add(task)
        session.commit()
        response = self._create(source_task_id=task.id)
        serialized = json.dumps(response["skill"], ensure_ascii=False)
        self.assertIn(task.id, serialized)
        self.assertIn("skill-source-fixture", serialized)
        self.assertNotIn("不应复制的正文", serialized)
        self.assertNotIn("reader@example.com", serialized)

    def test_storage_failure_rolls_back_new_skill(self):
        with mock.patch.object(skill_handlers, "materialize_skill_package", side_effect=AIArtifactError("read only")):
            response = self._create()
        self.assertEqual(response["err"], "skill.storage_failed")
        self.assertEqual(test_main.get_db().query(models.Skill).count(), 0)

    def test_view_download_and_tamper_detection_use_current_directory(self):
        skill = self._create()["skill"]
        package = self.json(f"/api/ai/skills/{skill['id']}/package")["package"]
        self.assertEqual([item["path"] for item in package["files"]], ["SKILL.md", "references/contract.json"])
        self.assertEqual(package["storage_path"], skill["artifact_path"])
        self.assertNotIn("archive_path", package)
        self.assertEqual(package["filename"], f"{package['name']}.zip")
        package_root = Path(self.artifact_root.name).joinpath(*Path(package["storage_path"]).parts)
        self.assertTrue((package_root / "SKILL.md").is_file())
        self.assertFalse((package_root.parent / package["filename"]).exists())

        downloaded = self.fetch(package["download_url"])
        self.assertEqual(downloaded.code, 200)
        with zipfile.ZipFile(io.BytesIO(downloaded.body)) as archive:
            self.assertEqual(archive.namelist(), [f"{package['name']}/SKILL.md", f"{package['name']}/references/contract.json"])
            contract = json.loads(archive.read(f"{package['name']}/references/contract.json"))
            self.assertEqual(contract["input_schema"]["type"], "object")
        manifest = skill["document"]["manifest"]
        expected = build_skill_zip(build_skill_package(manifest, skill["document"]["markdown"]))
        self.assertEqual(expected, downloaded.body)

        (package_root / "SKILL.md").write_text("tampered", encoding="utf-8")
        self.assertEqual(self.json(f"/api/ai/skills/{skill['id']}")["err"], "skill.storage_failed")

    def test_sensitive_findings_do_not_echo_value(self):
        manifest = default_manifest("安全测试", "测试敏感内容门禁。")
        response = self._create(manifest=manifest, markdown="password: super-secret-password")
        self.assertEqual(response["err"], "skill.sensitive_content")
        self.assertTrue(response["hard_block"])
        self.assertNotIn("super-secret-password", json.dumps(response, ensure_ascii=False))

    def test_trial_gate_is_bound_to_current_hash_and_manual_run_has_no_input_body(self):
        skill = self._create()["skill"]
        blocked = self.json(f"/api/ai/skills/{skill['id']}/status", method="POST", **api_body({"status": "enabled"}))
        self.assertEqual(blocked["err"], "skill.trial_required")
        with mock.patch.object(SkillRunService, "submit"):
            trial = self.json(
                f"/api/ai/skills/{skill['id']}/runs",
                method="POST",
                **api_body({"mode": "trial", "input": {"content": "样例输入"}}),
            )["run"]
        session = test_main.get_db()
        run = session.get(models.SkillRun, trial["id"])
        run.status = "succeeded"
        session.commit()
        enabled = self.json(f"/api/ai/skills/{skill['id']}/status", method="POST", **api_body({"status": "enabled"}))
        self.assertEqual(enabled["skill"]["status"], "enabled")
        with mock.patch.object(SkillRunService, "submit"):
            manual = self.json(
                f"/api/ai/skills/{skill['id']}/runs",
                method="POST",
                **api_body({"mode": "manual", "input": {"content": "正式输入"}}),
            )
        self.assertEqual(manual["err"], "ok")
        self.assertEqual(manual["run"]["content_hash"], skill["content_hash"])
        self.assertNotIn("正式输入", json.dumps(manual["run"], ensure_ascii=False))

        changed = self._update(skill)["skill"]
        self.assertEqual(changed["status"], "draft")
        blocked_again = self.json(f"/api/ai/skills/{skill['id']}/status", method="POST", **api_body({"status": "enabled"}))
        self.assertEqual(blocked_again["err"], "skill.trial_required")

    def test_run_service_records_one_validated_terminal(self):
        skill = self._create()["skill"]
        with mock.patch.object(SkillRunService, "submit"):
            run_data = self.json(
                f"/api/ai/skills/{skill['id']}/runs",
                method="POST",
                **api_body({
                    "mode": "trial",
                    "input": {"content": "只在内存中传递"},
                    "authorization_context": {"book_ids": [test_main.BID_EPUB]},
                }),
            )["run"]
        service = SkillRunService()
        service.setup(test_main._app.settings["SessionMaker"], skill_handlers.CONF, runtime=FakeRuntime())
        service._run(run_data["id"], {"content": "只在内存中传递"})
        detail = self.json(f"/api/ai/skills/{skill['id']}/runs/{run_data['id']}")["run"]
        self.assertEqual(detail["status"], "succeeded")
        self.assertEqual(detail["result"], {"result": "结构化结果"})
        self.assertEqual(detail["content_hash"], skill["content_hash"])
        self.assertEqual(detail["authorization_context"]["book_ids"], [test_main.BID_EPUB])
        self.assertNotIn("只在内存中传递", json.dumps(detail, ensure_ascii=False))

    def test_delete_cascades_runs_and_current_directory(self):
        skill = self._create()["skill"]
        artifact_root = self._artifact_root_for(skill)
        with mock.patch.object(SkillRunService, "submit"):
            run = self.json(
                f"/api/ai/skills/{skill['id']}/runs",
                method="POST",
                **api_body({"mode": "trial", "input": {"content": "只用于删除测试"}}),
            )["run"]
        session = test_main.get_db()
        record = session.get(models.SkillRun, run["id"])
        record.status = "failed"
        session.commit()
        self.assertEqual(self.json(f"/api/ai/skills/{skill['id']}", method="DELETE")["err"], "ok")
        self.assertEqual(session.query(models.Skill).filter_by(id=skill["id"]).count(), 0)
        self.assertEqual(session.query(models.SkillRun).filter_by(skill_id=skill["id"]).count(), 0)
        self.assertFalse(artifact_root.exists())

    def test_queued_run_cancellation_is_idempotent(self):
        skill = self._create()["skill"]
        with mock.patch.object(SkillRunService, "submit"):
            run = self.json(
                f"/api/ai/skills/{skill['id']}/runs",
                method="POST",
                **api_body({"mode": "trial", "input": {"content": "等待取消"}}),
            )["run"]
        with mock.patch.object(SkillRunService, "cancel", return_value=False):
            cancelled = self.json(
                f"/api/ai/skills/{skill['id']}/runs/{run['id']}/cancel",
                method="POST",
                **api_body({}),
            )
        self.assertEqual(cancelled["run"]["status"], "cancelled")
        repeated = self.json(
            f"/api/ai/skills/{skill['id']}/runs/{run['id']}/cancel",
            method="POST",
            **api_body({}),
        )
        self.assertTrue(repeated["idempotent"])

    def test_run_service_fails_closed_on_invalid_output_and_timeout(self):
        skill = self._create()["skill"]
        run_ids = []
        with mock.patch.object(SkillRunService, "submit"):
            for content in ("非法输出", "超时输入"):
                run_ids.append(
                    self.json(
                        f"/api/ai/skills/{skill['id']}/runs",
                        method="POST",
                        **api_body({"mode": "trial", "input": {"content": content}}),
                    )["run"]["id"]
                )
        service = SkillRunService()
        service.setup(test_main._app.settings["SessionMaker"], skill_handlers.CONF, runtime=InvalidOutputRuntime())
        service._run(run_ids[0], {"content": "非法输出"})
        invalid = self.json(f"/api/ai/skills/{skill['id']}/runs/{run_ids[0]}")["run"]
        self.assertEqual(invalid["error"]["code"], "skill.output_invalid")
        service.setup(test_main._app.settings["SessionMaker"], skill_handlers.CONF, runtime=TimeoutRuntime())
        service._run(run_ids[1], {"content": "超时输入"})
        timed_out = self.json(f"/api/ai/skills/{skill['id']}/runs/{run_ids[1]}")["run"]
        self.assertEqual(timed_out["error"]["code"], "runtime.total_timeout")


if __name__ == "__main__":
    unittest.main()
