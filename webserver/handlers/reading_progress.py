import asyncio
import json
import logging
import re
import uuid

import tornado.escape
from sqlalchemy.exc import SQLAlchemyError

from webserver import demo_mode, loader
from webserver.handlers.base import BaseHandler, auth, js
from webserver.handlers.captcha import require_book_captcha
from webserver.i18n import _
from webserver.models import ProgressReceipt, ReadingState
from webserver.services import reading_progress as progress_service


CONF = loader.get_settings()
MAX_REQUEST_BYTES = 8 * 1024
VERSION = re.compile(r"[0-9a-f]{64}")
FILE_VERSION = re.compile(r"sha256:[0-9a-f]{64}")
CFI = re.compile(r"epubcfi\([^\x00-\x1f]+\)")


def parse_write(body):
    if len(body) > MAX_REQUEST_BYTES:
        raise ValueError("body too large")
    data = json.loads(body)
    if not isinstance(data, dict):
        raise ValueError("expected JSON object")

    required = {"instance_id", "account_id", "file_version", "expected_progress_version", "write_id", "operation"}
    operation = data.get("operation")
    if operation == "save":
        required.add("position")
    if operation not in ("save", "keep") or data.keys() != required:
        raise ValueError("unknown or missing fields")

    for key, pattern in (("instance_id", VERSION), ("account_id", VERSION), ("file_version", FILE_VERSION)):
        if not isinstance(data[key], str) or not pattern.fullmatch(data[key]):
            raise ValueError(key)
    expected = data["expected_progress_version"]
    if expected is not None and (not isinstance(expected, str) or not VERSION.fullmatch(expected)):
        raise ValueError("expected_progress_version")
    write_id = data["write_id"]
    if not isinstance(write_id, str) or len(write_id) != 36 or str(uuid.UUID(write_id)) != write_id:
        raise ValueError("write_id")

    if operation == "save":
        position = data["position"]
        if (
            not isinstance(position, dict)
            or position.keys() - {"kind", "cfi", "percentage"}
            or position.get("kind") != progress_service.POSITION_KIND
            or not isinstance(position.get("cfi"), str)
            or not CFI.fullmatch(position["cfi"])
        ):
            raise ValueError("position")
        if "percentage" in position:
            percentage = position["percentage"]
            if type(percentage) not in (int, float) or not 0 <= percentage <= 100:
                raise ValueError("percentage")
    return data


class BookReadingProgress(BaseHandler):
    """跨端同步指定书籍的阅读进度（如章节、CFI、百分比等，由客户端自定义结构）。"""

    MAX_PROGRESS_BYTES = 8 * 1024

    @js
    @auth
    def post(self, id):
        book_id = int(id)
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "params.book.invalid", "msg": _("书籍已不存在")}
        user_id = self.user_id()
        data = tornado.escape.json_decode(self.request.body)
        progress = data.get("progress")
        if not isinstance(progress, dict):
            return {"err": "params.invalid", "msg": _("阅读进度参数错误")}
        if len(json.dumps(progress)) > self.MAX_PROGRESS_BYTES:
            return {"err": "params.invalid", "msg": _("阅读进度数据过大")}
        progress_service.lock_progress_transaction(self.session)
        reading_state = progress_service.save_progress(self.session, book_id, user_id, progress)
        self.session.commit()
        return {"err": "ok", "msg": _("阅读进度已保存"), "progress": reading_state.get_progress()}

    @js
    @auth
    def get(self, id):
        book_id = int(id)
        user_id = self.user_id()
        reading_state = (
            self.session.query(ReadingState).filter(ReadingState.book_id == book_id, ReadingState.reader_id == user_id).first()
        )
        if not reading_state:
            return {"err": "ok", "progress": {}, "update_time": None}
        update_time = reading_state.progress_update_time.isoformat() if reading_state.progress_update_time else None
        return {"err": "ok", "progress": reading_state.get_progress(), "update_time": update_time}


class ProgressHandler(BaseHandler):
    def prepare(self):
        self.set_header("Cache-Control", "private, no-store")
        super().prepare()

    def supported(self):
        return bool(self.cache.library_id) and progress_service.supports_conditional_progress(self.session)

    def authenticated_account(self):
        reader = self.current_user
        if reader is None or not reader.can_login() or demo_mode.is_demo_restricted(CONF, reader):
            return None
        return progress_service.account_id(reader)

    def refresh_principal(self):
        # Re-read authorization inside the write transaction after the file preflight.
        self.admin_user = None
        self.current_user = self.get_current_user()
        if self.admin_user is not None and not self.admin_user.is_admin():
            self.admin_user = None


class ReadingProgressCapability(ProgressHandler):
    @js
    @auth
    def get(self):
        if not self.supported():
            return {"err": "progress.unsupported"}
        try:
            progress_service.lock_progress_transaction(self.session)
            self.refresh_principal()
            account = self.authenticated_account()
            if account is None:
                return {"err": "user.need_login"}
            instance = progress_service.instance_id(self.session, self.cache.library_id)
            # Check that the receipt schema is available before advertising the capability.
            self.session.query(ProgressReceipt.write_id).limit(1).first()
            self.session.commit()
        except SQLAlchemyError:
            logging.exception("Conditional progress capability unavailable")
            return {"err": "progress.unavailable"}
        return {
            "err": "ok",
            "protocol": progress_service.PROTOCOL,
            "instance_id": instance,
            "account_id": account,
            "formats": {"EPUB": {"file_version": "sha256", "position": progress_service.POSITION_KIND}},
        }


class ConditionalReadingProgress(ProgressHandler):
    @js
    @auth
    async def get(self, book_id, book_format):
        return await self.handle_progress(int(book_id), book_format.upper(), None)

    @js
    @auth
    async def post(self, book_id, book_format):
        try:
            data = parse_write(self.request.body)
        except (ValueError, RecursionError):
            return {"err": "params.invalid"}
        return await self.handle_progress(int(book_id), book_format.upper(), data)

    def check_access(self, book_id, data):
        account = self.authenticated_account()
        if account is None:
            return "user.need_login"
        if data is not None and account != data["account_id"]:
            return "progress.account_mismatch"
        if not self.current_user.is_active():
            return "user.activation_required"
        if not self.current_user.can_read():
            return "user.no_permission"
        if not self.cache.has_id(book_id) or not self.can_view_book(book_id):
            return "params.book.invalid"
        if not require_book_captcha(self, book_id, "read"):
            return "captcha.required"
        return None

    async def handle_progress(self, book_id, book_format, data):
        if not self.supported():
            return {"err": "progress.unsupported"}
        if book_format != "EPUB":
            return {"err": "progress.unsupported_format"}
        error = self.check_access(book_id, data)
        if error:
            return {"err": error}
        path = self.cache.format_abspath(book_id, book_format)
        if path is None:
            return {"err": "progress.file_unavailable"}
        self.session.rollback()
        try:
            fingerprint = await asyncio.to_thread(progress_service.BookFingerprint.read, path)
        except OSError:
            return {"err": "progress.file_unavailable"}
        try:
            return self.finish_progress(book_id, book_format, fingerprint, data)
        except SQLAlchemyError:
            logging.exception("Conditional progress transaction unavailable")
            return {"err": "progress.unavailable"}

    def finish_progress(self, book_id, book_format, fingerprint, data):
        progress_service.lock_progress_transaction(self.session)
        with self.cache.read_lock:
            self.refresh_principal()
            error = self.check_access(book_id, data)
            if error:
                return {"err": error}
            instance = progress_service.instance_id(self.session, self.cache.library_id)
            if data is not None and data["instance_id"] != instance:
                return {"err": "progress.instance_mismatch"}
            path = self.cache.format_abspath(book_id, book_format)
            if not fingerprint.matches(path):
                return {"err": "progress.file_unavailable"}

            scope = {
                "instance_id": instance,
                "account_id": self.authenticated_account(),
                "book_id": book_id,
                "format": book_format,
                "file_version": fingerprint.version,
            }
            state = self.session.get(ReadingState, (book_id, self.current_user.id))
            current = progress_service.progress_snapshot(self.session, state, scope)
            result = {"err": "ok", **scope, "current": current}
            if data is not None:
                result = self.apply_write(result, data)
            self.session.flush()
            if not fingerprint.matches(path):
                self.session.rollback()
                return {"err": "progress.file_unavailable"}
            self.session.commit()
            return result

    def apply_write(self, result, data):
        if result["file_version"] != data["file_version"]:
            return {**result, "err": "progress.file_version_changed"}

        current = result["current"]
        instance, account, book_id = result["instance_id"], result["account_id"], result["book_id"]
        write_id = data["write_id"]
        payload_hash = progress_service.digest([book_id, result["format"], data])
        receipt = self.session.get(ProgressReceipt, (instance, account, write_id))
        if receipt is not None:
            if receipt.payload_hash != payload_hash:
                return {**result, "err": "progress.write_id_reused"}
            return {**result, "receipt": self.receipt_data(receipt, replayed=True)}
        if current["progress_version"] != data["expected_progress_version"]:
            return {**result, "err": "progress.version_conflict"}

        file_version = None
        if data["operation"] == "save":
            location = dict(data["position"])
            del location["kind"]
            state = progress_service.save_progress(self.session, book_id, self.current_user.id, location)
            file_version = result["file_version"]
            current = {
                "progress_version": progress_service.progress_version(state),
                "position": data["position"],
                "source": "conditional",
                "preview_progress": None,
            }
        receipt = ProgressReceipt(
            instance_id=instance,
            account_id=account,
            write_id=write_id,
            book_id=book_id,
            payload_hash=payload_hash,
            progress_version=current["progress_version"],
            file_version=file_version,
        )
        self.session.add(receipt)
        return {**result, "current": current, "receipt": self.receipt_data(receipt, replayed=False)}

    @staticmethod
    def receipt_data(receipt, replayed):
        return {"write_id": receipt.write_id, "progress_version": receipt.progress_version, "replayed": replayed}


def routes():
    return [
        (r"/api/book/([0-9]+)/progress", BookReadingProgress),
        (r"/api/reading-progress/conditional", ReadingProgressCapability),
        (r"/api/book/([0-9]+)/progress/conditional/([A-Za-z0-9]+)", ConditionalReadingProgress),
    ]
