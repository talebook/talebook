#!/usr/bin/env python3
"""Authenticated API for creator-private, versioned SKILL assets."""

import datetime
import json
import uuid

from webserver import loader
from webserver.handlers.base import BaseHandler, auth, js
from webserver.models import AITask, Skill, SkillRun, SkillVersion
from webserver.services.skill_library import (
    SensitiveContentError,
    SkillRunService,
    SkillValidationError,
    build_skill_package,
    build_skill_zip,
    content_hash,
    default_manifest,
    run_dict,
    run_items,
    skill_dict,
    summarize_input,
    validate_schema_value,
    validate_version_payload,
    version_dict,
)


CONF = loader.get_settings()


def _json_body(handler):
    try:
        value = json.loads(handler.request.body or b"{}")
    except (TypeError, ValueError):
        raise SkillValidationError("请求 JSON 无效")
    if not isinstance(value, dict):
        raise SkillValidationError("请求 JSON 必须是对象")
    return value


def _error(exc):
    if isinstance(exc, SensitiveContentError):
        return {
            "err": "skill.sensitive_content",
            "msg": str(exc),
            "findings": exc.findings,
            "hard_block": exc.hard_block,
        }
    return {"err": "params.invalid", "msg": str(exc)}


def _default_markdown(manifest):
    steps = "\n".join(f"{index}. {step}" for index, step in enumerate(manifest["steps"], 1))
    failures = "\n".join(f"- {item}" for item in manifest["failure_conditions"])
    return (
        f"# {manifest['name']}\n\n{manifest['description']}\n\n"
        f"## 适用范围\n\n{manifest['scope']}\n\n"
        f"## 步骤\n\n{steps}\n\n"
        f"## 失败条件\n\n{failures}\n"
    )


def _source_from_task(handler, task_id):
    task = (
        handler.session.query(AITask)
        .filter(AITask.id == task_id, AITask.creator_id == handler.user_id(), AITask.status == "succeeded")
        .first()
    )
    if not task:
        raise SkillValidationError("已完成的 AI 任务不存在或无权访问")
    result = task.user_revision or task.result_data or {}
    shape = sorted(result.keys()) if isinstance(result, dict) else []
    return task, {
        "kind": "ai_task",
        "task_id": task.id,
        "feature": task.feature,
        "schema_version": task.schema_version,
        "prompt_version": task.prompt_version,
        "result_fields": shape,
    }


class _SkillBase(BaseHandler):
    def _own_skill(self, skill_id):
        return self.session.query(Skill).filter(Skill.id == skill_id, Skill.owner_id == self.user_id()).first()

    def _version(self, skill, number=None):
        return (
            self.session.query(SkillVersion)
            .filter(
                SkillVersion.skill_id == skill.id,
                SkillVersion.version == (number or skill.current_version),
            )
            .first()
        )

    def _service(self):
        service = SkillRunService()
        service.setup(self.settings["SessionMaker"], CONF)
        return service

    def _own_run(self, skill, run_id):
        return (
            self.session.query(SkillRun)
            .filter(
                SkillRun.id == run_id,
                SkillRun.skill_id == skill.id,
                SkillRun.owner_id == self.user_id(),
            )
            .first()
        )


class SkillCollection(_SkillBase):
    @js
    @auth
    def get(self):
        query = self.session.query(Skill).filter(Skill.owner_id == self.user_id())
        status = self.get_argument("status", "").strip()
        if status:
            if status not in {"draft", "enabled", "disabled"}:
                return {"err": "params.invalid", "msg": "status 无效"}
            query = query.filter(Skill.status == status)
        keyword = self.get_argument("q", "").strip()[:120]
        if keyword:
            pattern = f"%{keyword}%"
            query = query.filter((Skill.name.like(pattern)) | (Skill.description.like(pattern)))
        records = query.order_by(Skill.update_time.desc()).limit(100).all()
        return {"err": "ok", "skills": [skill_dict(record) for record in records]}

    @js
    @auth
    def post(self):
        if not CONF.get("AI_ENABLED", True) or not CONF.get("AI_SKILLS_ENABLED", True):
            return {"err": "ai.disabled", "msg": "SKILL 功能未启用"}
        try:
            body = _json_body(self)
            source = {"kind": "blank"}
            task = None
            if body.get("source_task_id"):
                task, source = _source_from_task(self, str(body["source_task_id"]))
            if body.get("manifest") is None:
                name = str(body.get("name") or (f"{task.feature} 工作方法" if task else "未命名 SKILL"))
                description = str(body.get("description") or "把已验证的方法整理为可复用的结构化工作流。")
                manifest = default_manifest(name, description)
                if task:
                    manifest["sources"] = [
                        {
                            "type": "ai_task",
                            "reference": task.id,
                            "note": f"{task.feature} / {task.prompt_version}",
                        }
                    ]
            else:
                manifest = body["manifest"]
            markdown = body.get("markdown")
            if markdown is None:
                markdown = _default_markdown(manifest)
            acknowledged = body.get("sensitive_acknowledged") is True
            checked = validate_version_payload(
                manifest,
                markdown,
                acknowledged,
                int(CONF.get("AI_SKILL_MAX_MARKDOWN_CHARACTERS", 40_000)),
            )
        except (SkillValidationError, SensitiveContentError) as exc:
            return _error(exc)
        now = datetime.datetime.now()
        skill = Skill(
            id=str(uuid.uuid4()),
            owner_id=self.user_id(),
            name=checked["manifest"]["name"],
            description=checked["manifest"]["description"],
            status="draft",
            current_version=1,
            create_time=now,
            update_time=now,
        )
        version = SkillVersion(
            skill_id=skill.id,
            version=1,
            manifest=checked["manifest"],
            markdown=checked["markdown"],
            source=source,
            content_hash=content_hash(checked["manifest"], checked["markdown"]),
            sensitive_acknowledged=acknowledged,
            created_by=self.user_id(),
            create_time=now,
        )
        self.session.add(skill)
        self.session.add(version)
        self.session.commit()
        return {"err": "ok", "skill": skill_dict(skill, version), "findings": checked["findings"]}


class SkillItem(_SkillBase):
    @js
    @auth
    def get(self, skill_id):
        skill = self._own_skill(skill_id)
        if not skill:
            return {"err": "skill.not_found", "msg": "SKILL 不存在"}
        return {"err": "ok", "skill": skill_dict(skill, self._version(skill))}

    @js
    @auth
    def patch(self, skill_id):
        skill = self._own_skill(skill_id)
        if not skill:
            return {"err": "skill.not_found", "msg": "SKILL 不存在"}
        try:
            body = _json_body(self)
            base_version = int(body.get("base_version", 0))
            if base_version != skill.current_version:
                return {
                    "err": "skill.version_conflict",
                    "msg": "SKILL 已有更新版本，请刷新后再保存",
                    "current_version": skill.current_version,
                }
            acknowledged = body.get("sensitive_acknowledged") is True
            checked = validate_version_payload(
                body.get("manifest"),
                body.get("markdown"),
                acknowledged,
                int(CONF.get("AI_SKILL_MAX_MARKDOWN_CHARACTERS", 40_000)),
            )
        except (TypeError, ValueError, SkillValidationError, SensitiveContentError) as exc:
            return _error(exc if isinstance(exc, SkillValidationError) else SkillValidationError("base_version 无效"))
        now = datetime.datetime.now()
        next_version = skill.current_version + 1
        version = SkillVersion(
            skill_id=skill.id,
            version=next_version,
            manifest=checked["manifest"],
            markdown=checked["markdown"],
            source={"kind": "edit", "from_version": skill.current_version},
            content_hash=content_hash(checked["manifest"], checked["markdown"]),
            sensitive_acknowledged=acknowledged,
            created_by=self.user_id(),
            create_time=now,
        )
        skill.name = checked["manifest"]["name"]
        skill.description = checked["manifest"]["description"]
        skill.current_version = next_version
        skill.status = "draft"
        skill.update_time = now
        self.session.add(version)
        self.session.commit()
        return {"err": "ok", "skill": skill_dict(skill, version), "findings": checked["findings"]}

    @js
    @auth
    def delete(self, skill_id):
        skill = self._own_skill(skill_id)
        if not skill:
            return {"err": "skill.not_found", "msg": "SKILL 不存在"}
        active = (
            self.session.query(SkillRun)
            .filter(SkillRun.skill_id == skill.id, SkillRun.status.in_(["queued", "running"]))
            .count()
        )
        if active:
            return {"err": "skill.active_runs", "msg": "请先取消正在运行的任务"}
        self.session.delete(skill)
        self.session.commit()
        return {"err": "ok", "msg": "SKILL 已删除"}


class SkillPackage(_SkillBase):
    @js
    @auth
    def get(self, skill_id):
        skill = self._own_skill(skill_id)
        if not skill:
            return {"err": "skill.not_found", "msg": "SKILL 不存在"}
        try:
            version_number = int(self.get_argument("version", skill.current_version))
        except (TypeError, ValueError):
            return {"err": "params.invalid", "msg": "version 无效"}
        version = self._version(skill, version_number)
        if not version:
            return {"err": "skill.version_not_found", "msg": "SKILL 版本不存在"}
        try:
            package = build_skill_package(version)
        except SkillValidationError as exc:
            return _error(exc)
        package["download_url"] = f"/api/ai/skills/{skill.id}/download?version={version.version}"
        return {"err": "ok", "package": package}


class SkillDownload(_SkillBase):
    @js
    @auth
    def get(self, skill_id):
        skill = self._own_skill(skill_id)
        if not skill:
            return {"err": "skill.not_found", "msg": "SKILL 不存在"}
        try:
            version_number = int(self.get_argument("version", skill.current_version))
        except (TypeError, ValueError):
            return {"err": "params.invalid", "msg": "version 无效"}
        version = self._version(skill, version_number)
        if not version:
            return {"err": "skill.version_not_found", "msg": "SKILL 版本不存在"}
        try:
            package = build_skill_package(version)
            payload = build_skill_zip(package)
        except SkillValidationError as exc:
            return _error(exc)
        self.set_header("Content-Type", "application/zip")
        self.set_header("Content-Disposition", f'attachment; filename="{package["filename"]}"')
        self.set_header("X-Content-Type-Options", "nosniff")
        return payload


class SkillVersions(_SkillBase):
    @js
    @auth
    def get(self, skill_id):
        skill = self._own_skill(skill_id)
        if not skill:
            return {"err": "skill.not_found", "msg": "SKILL 不存在"}
        records = (
            self.session.query(SkillVersion)
            .filter(SkillVersion.skill_id == skill.id)
            .order_by(SkillVersion.version.desc())
            .all()
        )
        return {"err": "ok", "versions": [version_dict(record) for record in records]}


class SkillRollback(_SkillBase):
    @js
    @auth
    def post(self, skill_id):
        skill = self._own_skill(skill_id)
        if not skill:
            return {"err": "skill.not_found", "msg": "SKILL 不存在"}
        try:
            body = _json_body(self)
            target_number = int(body.get("version", 0))
        except (TypeError, ValueError, SkillValidationError) as exc:
            return _error(exc if isinstance(exc, SkillValidationError) else SkillValidationError("version 无效"))
        target = self._version(skill, target_number)
        if not target:
            return {"err": "skill.version_not_found", "msg": "目标版本不存在"}
        now = datetime.datetime.now()
        next_number = skill.current_version + 1
        manifest = json.loads(json.dumps(target.manifest, ensure_ascii=False))
        version = SkillVersion(
            skill_id=skill.id,
            version=next_number,
            manifest=manifest,
            markdown=target.markdown,
            source={"kind": "rollback", "from_version": skill.current_version, "target_version": target.version},
            content_hash=target.content_hash,
            sensitive_acknowledged=target.sensitive_acknowledged,
            created_by=self.user_id(),
            create_time=now,
        )
        skill.name = manifest["name"]
        skill.description = manifest["description"]
        skill.current_version = next_number
        skill.status = "draft"
        skill.update_time = now
        self.session.add(version)
        self.session.commit()
        return {"err": "ok", "skill": skill_dict(skill, version)}


class SkillStatus(_SkillBase):
    @js
    @auth
    def post(self, skill_id):
        skill = self._own_skill(skill_id)
        if not skill:
            return {"err": "skill.not_found", "msg": "SKILL 不存在"}
        try:
            status = str(_json_body(self).get("status", ""))
        except SkillValidationError as exc:
            return _error(exc)
        if status not in {"draft", "enabled", "disabled"}:
            return {"err": "params.invalid", "msg": "status 无效"}
        if status == "enabled":
            version = self._version(skill)
            successful_trial = (
                self.session.query(SkillRun)
                .filter(
                    SkillRun.skill_id == skill.id,
                    SkillRun.version_id == version.id,
                    SkillRun.owner_id == self.user_id(),
                    SkillRun.mode == "trial",
                    SkillRun.status == "succeeded",
                )
                .first()
            )
            if not successful_trial:
                return {"err": "skill.trial_required", "msg": "当前版本试运行成功后才能启用"}
        skill.status = status
        skill.update_time = datetime.datetime.now()
        self.session.commit()
        return {"err": "ok", "skill": skill_dict(skill, self._version(skill))}


class SkillRuns(_SkillBase):
    @js
    @auth
    def get(self, skill_id):
        skill = self._own_skill(skill_id)
        if not skill:
            return {"err": "skill.not_found", "msg": "SKILL 不存在"}
        records = (
            self.session.query(SkillRun)
            .filter(SkillRun.skill_id == skill.id, SkillRun.owner_id == self.user_id())
            .order_by(SkillRun.create_time.desc())
            .limit(100)
            .all()
        )
        return {"err": "ok", "runs": run_items(records)}

    @js
    @auth
    def post(self, skill_id):
        if not CONF.get("AI_ENABLED", True) or not CONF.get("AI_SKILLS_ENABLED", True):
            return {"err": "ai.disabled", "msg": "SKILL 功能未启用"}
        skill = self._own_skill(skill_id)
        if not skill:
            return {"err": "skill.not_found", "msg": "SKILL 不存在"}
        try:
            body = _json_body(self)
            mode = str(body.get("mode", "manual"))
            if mode not in {"trial", "manual"}:
                raise SkillValidationError("mode 无效")
            if mode == "manual" and skill.status != "enabled":
                return {"err": "skill.not_enabled", "msg": "只有已启用的 SKILL 可以正式运行"}
            requested_version = int(body.get("version") or skill.current_version)
            version = self._version(skill, requested_version)
            if not version:
                return {"err": "skill.version_not_found", "msg": "SKILL 版本不存在"}
            if mode == "manual" and version.version != skill.current_version:
                return {"err": "skill.version_not_enabled", "msg": "正式运行只能使用当前启用版本"}
            input_data = body.get("input", {})
            serialized_size = len(json.dumps(input_data, ensure_ascii=False))
            if serialized_size > int(CONF.get("AI_SKILL_MAX_INPUT_CHARACTERS", 32_000)):
                raise SkillValidationError("输入过长")
            validate_schema_value(input_data, version.manifest["input_schema"], "input")
            raw_context = body.get("authorization_context", {})
            if not isinstance(raw_context, dict) or set(raw_context) - {"book_ids"}:
                raise SkillValidationError("authorization_context 无效")
            book_ids = raw_context.get("book_ids", [])
            if not isinstance(book_ids, list) or len(book_ids) > 20:
                raise SkillValidationError("authorization_context.book_ids 无效")
            checked_book_ids = []
            for value in book_ids:
                book_id = int(value)
                if not self.can_view_book(book_id):
                    return {"err": "book.not_found", "msg": "授权书籍不存在或无权访问"}
                checked_book_ids.append(book_id)
            active = (
                self.session.query(SkillRun)
                .filter(SkillRun.owner_id == self.user_id(), SkillRun.status.in_(["queued", "running"]))
                .count()
            )
            if active >= int(CONF.get("AI_SKILL_MAX_ACTIVE_RUNS", 2)):
                return {"err": "skill.run_limit", "msg": "同时运行的 SKILL 已达上限"}
        except (TypeError, ValueError, SkillValidationError) as exc:
            return _error(exc if isinstance(exc, SkillValidationError) else SkillValidationError("运行参数无效"))
        now = datetime.datetime.now()
        run = SkillRun(
            id=str(uuid.uuid4()),
            skill_id=skill.id,
            version_id=version.id,
            version=version.version,
            owner_id=self.user_id(),
            mode=mode,
            status="queued",
            progress_message="等待运行",
            input_summary=summarize_input(input_data),
            authorization_context={
                "book_ids": checked_book_ids,
                "verified_for_user": self.user_id(),
                "verified_at": now.isoformat(),
            },
            create_time=now,
            update_time=now,
        )
        self.session.add(run)
        self.session.commit()
        self._service().submit(run.id, input_data)
        return {"err": "ok", "run": run_dict(run)}


class SkillRunItem(_SkillBase):
    @js
    @auth
    def get(self, skill_id, run_id):
        skill = self._own_skill(skill_id)
        if not skill:
            return {"err": "skill.not_found", "msg": "SKILL 不存在"}
        run = self._own_run(skill, run_id)
        if not run:
            return {"err": "skill.run_not_found", "msg": "运行记录不存在"}
        return {"err": "ok", "run": run_dict(run)}


class SkillRunCancel(_SkillBase):
    @js
    @auth
    def post(self, skill_id, run_id):
        skill = self._own_skill(skill_id)
        if not skill:
            return {"err": "skill.not_found", "msg": "SKILL 不存在"}
        run = self._own_run(skill, run_id)
        if not run:
            return {"err": "skill.run_not_found", "msg": "运行记录不存在"}
        if run.status in {"succeeded", "failed", "cancelled"}:
            return {"err": "ok", "run": run_dict(run), "idempotent": True}
        run.cancel_requested = True
        run.progress_message = "正在取消"
        run.update_time = datetime.datetime.now()
        self.session.commit()
        active = self._service().cancel(run.id)
        if not active and run.status == "queued":
            run.status = "cancelled"
            run.progress_message = "运行已取消"
            run.finished_at = datetime.datetime.now()
            run.update_time = run.finished_at
            self.session.commit()
        return {"err": "ok", "run": run_dict(run), "idempotent": False}


def routes():
    return [
        (r"/api/ai/skills", SkillCollection),
        (r"/api/ai/skills/([0-9a-f-]+)/package", SkillPackage),
        (r"/api/ai/skills/([0-9a-f-]+)/download", SkillDownload),
        (r"/api/ai/skills/([0-9a-f-]+)", SkillItem),
        (r"/api/ai/skills/([0-9a-f-]+)/versions", SkillVersions),
        (r"/api/ai/skills/([0-9a-f-]+)/rollback", SkillRollback),
        (r"/api/ai/skills/([0-9a-f-]+)/status", SkillStatus),
        (r"/api/ai/skills/([0-9a-f-]+)/runs", SkillRuns),
        (r"/api/ai/skills/([0-9a-f-]+)/runs/([0-9a-f-]+)", SkillRunItem),
        (r"/api/ai/skills/([0-9a-f-]+)/runs/([0-9a-f-]+)/cancel", SkillRunCancel),
    ]
