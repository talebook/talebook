"""Preview-gated API for AI-assisted tag organization."""

import datetime
import hashlib
import json
import uuid

from sqlalchemy.exc import IntegrityError

from webserver import loader
from webserver.handlers.base import BaseHandler, auth, js
from webserver.models import TagOrganizationChange, TagOrganizationTask
from webserver.services.tag_organizer import (
    PROMPT_VERSION,
    SCHEMA_VERSION,
    TagOrganizerService,
    TagOrganizerValidationError,
    apply_adjustments,
    changed_tags,
    request_key,
    tag_key,
    tag_version,
    task_dict,
    task_items,
)


CONF = loader.get_settings()
MAX_SCOPE_BOOKS = 5000
MAX_SCOPE_TAGS = 500


def _json_body(handler):
    try:
        value = json.loads(handler.request.body or b"{}")
    except (TypeError, ValueError):
        raise TagOrganizerValidationError("请求 JSON 无效")
    if not isinstance(value, dict):
        raise TagOrganizerValidationError("请求 JSON 必须是对象")
    return value


def _editor(handler):
    return bool(handler.current_user and handler.current_user.can_edit())


def _can_edit_book(handler, book_id):
    return _editor(handler) and (handler.is_admin() or handler.is_book_owner(book_id, handler.user_id()))


def _book_state(handler, book_id):
    if not _can_edit_book(handler, book_id):
        return None
    book = handler.get_book(book_id, raise_exception=False)
    if not book:
        return None
    metadata = handler.db.get_metadata(book_id, index_is_id=True)
    tags = list(metadata.tags or [])
    return {
        "id": int(book_id),
        "title": str(book.get("title") or "")[:512],
        "tags": tags,
        "version": tag_version(tags),
    }


def _scope(body):
    value = body.get("scope") or {"type": "all"}
    if not isinstance(value, dict) or value.get("type") not in {"all", "books", "tags"}:
        raise TagOrganizerValidationError("整理范围无效")
    scope_type = value["type"]
    if scope_type == "books":
        ids = value.get("book_ids")
        if not isinstance(ids, list) or not ids or len(ids) > MAX_SCOPE_BOOKS:
            raise TagOrganizerValidationError("书籍范围为空或过大")
        if any(isinstance(item, bool) or not isinstance(item, int) or item <= 0 for item in ids):
            raise TagOrganizerValidationError("书籍编号无效")
        return {"type": "books", "book_ids": sorted(set(ids))}
    if scope_type == "tags":
        tags = value.get("tags")
        if not isinstance(tags, list) or not tags or len(tags) > MAX_SCOPE_TAGS:
            raise TagOrganizerValidationError("标签范围为空或过大")
        cleaned = []
        for tag in tags:
            if not isinstance(tag, str) or not tag.strip() or len(tag) > 100:
                raise TagOrganizerValidationError("标签范围无效")
            cleaned.append(tag)
        return {"type": "tags", "tags": sorted(set(cleaned))}
    return {"type": "all"}


def _collect(handler, scope):
    ids = scope.get("book_ids", handler.books_by_id())
    if len(ids) > MAX_SCOPE_BOOKS:
        raise TagOrganizerValidationError("可编辑书籍超过单次分析上限，请缩小范围")
    selected_tags = set(scope.get("tags", []))
    books = []
    for book_id in ids:
        state = _book_state(handler, int(book_id))
        if not state:
            continue
        if selected_tags and not selected_tags.intersection(state["tags"]):
            continue
        books.append(state)
    counts = {}
    book_ids = {}
    for book in books:
        for tag in book["tags"]:
            if selected_tags and tag not in selected_tags:
                continue
            counts[tag] = counts.get(tag, 0) + 1
            book_ids.setdefault(tag, []).append(book["id"])
    tags = [{"name": name, "count": count, "book_ids": book_ids[name]} for name, count in sorted(counts.items())]
    return books, tags


def _service(handler):
    service = TagOrganizerService()
    service.setup(handler.settings["SessionMaker"], CONF)
    return service


def _hash_idempotency(task_id, value, purpose):
    if not isinstance(value, str) or not 8 <= len(value) <= 128:
        raise TagOrganizerValidationError("幂等键长度应为 8 到 128 个字符")
    return hashlib.sha256(f"{purpose}:{task_id}:{value}".encode("utf-8")).hexdigest()


def _validate_no_cycles(items):
    edges = {
        tag_key(item["source"]): tag_key(item["target"])
        for item in items
        if item.get("selected") and item["action"] in {"merge", "rename"}
    }
    for start in edges:
        seen = set()
        value = start
        while value in edges:
            if value in seen:
                raise TagOrganizerValidationError("选中的标签变更形成循环，请修改目标")
            seen.add(value)
            value = edges[value]


class _TagTaskBase(BaseHandler):
    def _own(self, task_id):
        return (
            self.session.query(TagOrganizationTask)
            .filter(TagOrganizationTask.id == task_id, TagOrganizationTask.creator_id == self.user_id())
            .first()
        )

    def _require(self, task_id):
        record = self._own(task_id)
        if not record:
            return None, {"err": "ai.not_found", "msg": "标签整理任务不存在"}
        if not _editor(self):
            return None, {"err": "user.no_permission", "msg": "无权整理标签"}
        return record, None


class TagTaskCollection(_TagTaskBase):
    @js
    @auth
    def get(self):
        records = (
            self.session.query(TagOrganizationTask)
            .filter(TagOrganizationTask.creator_id == self.user_id())
            .order_by(TagOrganizationTask.create_time.desc())
            .limit(50)
            .all()
        )
        return {"err": "ok", "tasks": task_items(records)}

    @js
    @auth
    def post(self):
        if not CONF.get("AI_ENABLED", True) or not CONF.get("AI_TAG_ORGANIZER_ENABLED", True):
            return {"err": "ai.disabled", "msg": "AI 标签整理未启用"}
        if not _editor(self):
            return {"err": "user.no_permission", "msg": "无权整理标签"}
        try:
            body = _json_body(self)
            scope = _scope(body)
            books, tags = _collect(self, scope)
        except TagOrganizerValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        if not books or not tags:
            return {"err": "tag_organizer.empty", "msg": "范围内没有可整理的标签"}
        key = request_key(self.user_id(), scope, books)
        existing = self.session.query(TagOrganizationTask).filter(TagOrganizationTask.request_key == key).first()
        if existing:
            if existing.creator_id != self.user_id():
                return {"err": "ai.conflict", "msg": "无法创建标签整理任务"}
            return {"err": "ok", "task": task_dict(existing, include_books=True), "idempotent": True}
        record = TagOrganizationTask(
            id=str(uuid.uuid4()),
            request_key=key,
            creator_id=self.user_id(),
            status="analyzing",
            scope_data={**scope, "books": books, "tags": tags},
            schema_version=SCHEMA_VERSION,
            prompt_version=PROMPT_VERSION,
        )
        self.session.add(record)
        try:
            self.session.commit()
        except IntegrityError:
            self.session.rollback()
            record = self.session.query(TagOrganizationTask).filter(TagOrganizationTask.request_key == key).first()
            if not record or record.creator_id != self.user_id():
                return {"err": "ai.conflict", "msg": "无法创建标签整理任务"}
            return {"err": "ok", "task": task_dict(record, include_books=True), "idempotent": True}
        _service(self).submit(record.id)
        return {"err": "ok", "task": task_dict(record, include_books=True), "idempotent": False}


class TagTaskItem(_TagTaskBase):
    @js
    @auth
    def get(self, task_id):
        record, error = self._require(task_id)
        return error or {"err": "ok", "task": task_dict(record, include_books=True)}

    @js
    @auth
    def patch(self, task_id):
        record, error = self._require(task_id)
        if error:
            return error
        if record.status not in {"ready", "previewed"}:
            return {"err": "tag_organizer.not_editable", "msg": "当前任务不可调整"}
        try:
            body = _json_body(self)
            raw = body.get("adjustments", [])
            if not isinstance(raw, list):
                raise TagOrganizerValidationError("调整列表无效")
            valid_ids = {item["id"] for item in (record.suggestions or {}).get("items", [])}
            scope_ids = {book["id"] for book in (record.scope_data or {}).get("books", [])}
            by_id = {}
            for item in raw:
                if not isinstance(item, dict) or item.get("id") not in valid_ids:
                    raise TagOrganizerValidationError("调整项不存在")
                excluded = item.get("excluded_book_ids", [])
                if not isinstance(excluded, list) or not set(excluded).issubset(scope_ids):
                    raise TagOrganizerValidationError("排除书籍不在任务范围")
                edit = {"selected": bool(item.get("selected")), "excluded_book_ids": sorted(set(excluded))}
                if "target" in item:
                    edit["target"] = item["target"]
                by_id[item["id"]] = edit
            apply_adjustments((record.suggestions or {}).get("items", []), {"by_id": by_id})
        except TagOrganizerValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        record.adjustments = {"by_id": by_id}
        record.preview_data = {}
        record.status = "ready"
        record.update_time = datetime.datetime.now()
        self.session.commit()
        return {"err": "ok", "task": task_dict(record, include_books=True)}


class TagTaskPreview(_TagTaskBase):
    @js
    @auth
    def post(self, task_id):
        record, error = self._require(task_id)
        if error:
            return error
        if record.status not in {"ready", "previewed"}:
            return {"err": "tag_organizer.not_ready", "msg": "建议尚未准备完成"}
        try:
            items = apply_adjustments((record.suggestions or {}).get("items", []), record.adjustments or {})
            _validate_no_cycles(items)
        except TagOrganizerValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        baseline = {book["id"]: book for book in (record.scope_data or {}).get("books", [])}
        changes = []
        conflicts = []
        for book_id, original in baseline.items():
            current = _book_state(self, book_id)
            if not current:
                conflicts.append({"book_id": book_id, "title": original.get("title", ""), "code": "permission_changed"})
                continue
            if current["version"] != original["version"]:
                conflicts.append({"book_id": book_id, "title": current["title"], "code": "tags_changed"})
                continue
            after = changed_tags(current["tags"], items, book_id)
            if after != current["tags"]:
                changes.append(
                    {
                        "book_id": book_id,
                        "title": current["title"],
                        "before_tags": current["tags"],
                        "after_tags": after,
                        "before_version": current["version"],
                        "after_version": tag_version(after),
                    }
                )
        token_source = json.dumps([record.id, record.adjustments or {}, changes], ensure_ascii=False, sort_keys=True)
        token = hashlib.sha256(token_source.encode("utf-8")).hexdigest()
        record.preview_data = {
            "token": token,
            "changes": changes,
            "conflicts": conflicts,
            "summary": {"changed_books": len(changes), "conflicts": len(conflicts)},
        }
        record.status = "previewed"
        record.update_time = datetime.datetime.now()
        self.session.commit()
        return {"err": "ok", "task": task_dict(record, include_books=True)}


class TagTaskExecute(_TagTaskBase):
    @js
    @auth
    def post(self, task_id):
        record, error = self._require(task_id)
        if error:
            return error
        try:
            body = _json_body(self)
            execute_key = _hash_idempotency(task_id, body.get("idempotency_key"), "execute")
        except TagOrganizerValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        if record.execute_key:
            if record.execute_key != execute_key:
                return {"err": "tag_organizer.already_executed", "msg": "任务已用其他幂等键执行"}
            return {"err": "ok", "task": task_dict(record, include_books=True), "idempotent": True}
        preview = record.preview_data or {}
        if record.status != "previewed" or body.get("preview_token") != preview.get("token"):
            return {"err": "tag_organizer.preview_stale", "msg": "预览已失效，请重新预览"}
        return self._apply(record, preview.get("changes", []), execute_key)

    def _apply(self, record, changes, execute_key):
        for item in changes:
            existing = (
                self.session.query(TagOrganizationChange)
                .filter(TagOrganizationChange.task_id == record.id, TagOrganizationChange.book_id == item["book_id"])
                .first()
            )
            if existing and existing.status == "succeeded":
                continue
            change = existing or TagOrganizationChange(task_id=record.id, book_id=item["book_id"])
            change.title = item["title"]
            change.before_tags = item["before_tags"]
            change.after_tags = item["after_tags"]
            change.before_version = item["before_version"]
            change.after_version = item["after_version"]
            current = _book_state(self, item["book_id"])
            if not current:
                change.status = "skipped"
                change.error_code = "permission_changed"
                change.error_message = "权限或书籍状态已变化"
            elif current["version"] != item["before_version"]:
                change.status = "conflict"
                change.error_code = "tags_changed"
                change.error_message = "标签在确认前已变化"
            else:
                try:
                    with self._db_lock:
                        self.db.set_tags(item["book_id"], item["after_tags"])
                    change.status = "succeeded"
                    change.error_code = ""
                    change.error_message = ""
                except Exception:
                    change.status = "failed"
                    change.error_code = "write_failed"
                    change.error_message = "标签写入失败，可稍后重试"
            change.update_time = datetime.datetime.now()
            if not existing:
                self.session.add(change)
        record.execute_key = execute_key
        record.status = "executed"
        self.session.flush()
        statuses = [
            item.status
            for item in self.session.query(TagOrganizationChange.status)
            .filter(TagOrganizationChange.task_id == record.id)
            .all()
        ]
        succeeded = statuses.count("succeeded")
        skipped = statuses.count("skipped") + statuses.count("conflict")
        failed = statuses.count("failed")
        record.result_data = {"succeeded": succeeded, "skipped": skipped, "failed": failed, "undone": 0}
        metrics = dict(record.metrics or {})
        metrics.update({"executed": succeeded, "skipped": skipped, "failed": failed})
        record.metrics = metrics
        record.finished_at = datetime.datetime.now()
        record.update_time = record.finished_at
        self.session.commit()
        return {"err": "ok", "task": task_dict(record, include_books=True), "idempotent": False}


class TagTaskRetry(TagTaskExecute):
    @js
    @auth
    def post(self, task_id):
        record, error = self._require(task_id)
        if error:
            return error
        if record.status != "executed":
            return {"err": "tag_organizer.not_executed", "msg": "任务尚未执行"}
        records = (
            self.session.query(TagOrganizationChange)
            .filter(
                TagOrganizationChange.task_id == task_id, TagOrganizationChange.status.in_(["failed", "conflict", "skipped"])
            )
            .all()
        )
        changes = [
            {
                "book_id": item.book_id,
                "title": item.title,
                "before_tags": item.before_tags or [],
                "after_tags": item.after_tags or [],
                "before_version": item.before_version,
                "after_version": item.after_version,
            }
            for item in records
        ]
        if not changes:
            return {"err": "ok", "task": task_dict(record, include_books=True), "idempotent": True}
        record.execute_key = None
        self.session.commit()
        return self._apply(record, changes, _hash_idempotency(task_id, uuid.uuid4().hex, "retry"))


class TagTaskUndo(_TagTaskBase):
    @js
    @auth
    def post(self, task_id):
        record, error = self._require(task_id)
        if error:
            return error
        try:
            body = _json_body(self)
            undo_key = _hash_idempotency(task_id, body.get("idempotency_key"), "undo")
        except TagOrganizerValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        if record.undo_key:
            if record.undo_key != undo_key:
                return {"err": "tag_organizer.already_undone", "msg": "任务已用其他幂等键撤销"}
            return {"err": "ok", "task": task_dict(record, include_books=True), "idempotent": True}
        if record.status != "executed":
            return {"err": "tag_organizer.not_executed", "msg": "任务尚未执行"}
        undone = conflicts = 0
        changes = (
            self.session.query(TagOrganizationChange)
            .filter(TagOrganizationChange.task_id == task_id, TagOrganizationChange.status == "succeeded")
            .all()
        )
        for change in changes:
            current = _book_state(self, change.book_id)
            if not current:
                change.undo_status = "skipped"
                change.undo_error = "权限或书籍状态已变化"
                conflicts += 1
            elif current["version"] != change.after_version:
                change.undo_status = "conflict"
                change.undo_error = "执行后标签已被修改，未覆盖人工变更"
                conflicts += 1
            else:
                try:
                    with self._db_lock:
                        self.db.set_tags(change.book_id, change.before_tags or [])
                    change.undo_status = "undone"
                    change.undo_error = ""
                    undone += 1
                except Exception:
                    change.undo_status = "failed"
                    change.undo_error = "撤销写入失败"
                    conflicts += 1
            change.update_time = datetime.datetime.now()
        record.undo_key = undo_key
        result = dict(record.result_data or {})
        result.update({"undone": undone, "undo_conflicts": conflicts})
        record.result_data = result
        record.update_time = datetime.datetime.now()
        self.session.commit()
        return {"err": "ok", "task": task_dict(record, include_books=True), "idempotent": False}


class TagTaskAnalysisRetry(_TagTaskBase):
    @js
    @auth
    def post(self, task_id):
        record, error = self._require(task_id)
        if error:
            return error
        if record.status != "failed":
            return {"err": "tag_organizer.not_failed", "msg": "只有失败的分析可重试"}
        record.status = "analyzing"
        record.error_code = ""
        record.error_message = ""
        record.update_time = datetime.datetime.now()
        self.session.commit()
        _service(self).submit(task_id)
        return {"err": "ok", "task": task_dict(record, include_books=True)}


def routes():
    prefix = r"/api/ai/tag_organizer/tasks"
    return [
        (prefix, TagTaskCollection),
        (prefix + r"/([0-9a-f-]+)", TagTaskItem),
        (prefix + r"/([0-9a-f-]+)/preview", TagTaskPreview),
        (prefix + r"/([0-9a-f-]+)/execute", TagTaskExecute),
        (prefix + r"/([0-9a-f-]+)/retry", TagTaskRetry),
        (prefix + r"/([0-9a-f-]+)/undo", TagTaskUndo),
        (prefix + r"/([0-9a-f-]+)/analysis-retry", TagTaskAnalysisRetry),
    ]
