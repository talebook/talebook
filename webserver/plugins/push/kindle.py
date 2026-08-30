"""Kindle 邮箱推送插件。"""

from webserver.plugins.push.base import PUSH_CAPABILITY
from webserver.plugins.runtime import CheckReport, PROTOCOL_VERSION, UpstreamError


class KindleProvider:
    default_port = 0
    manifest = {
        "protocol_version": PROTOCOL_VERSION,
        "id": "talebook.push.kindle",
        "name": "Kindle 邮箱推送",
        "description": "通过 Talebook 配置的 SMTP 服务把书籍发送到 Kindle 邮箱。",
        "version": "1.0.0",
        "categories": ["integrations"],
        "capabilities": [PUSH_CAPABILITY],
        "runtime_kind": "builtin",
        "actions": ["test"],
        "auth_schema": {"type": "object", "properties": {}},
        "config_schema": {"type": "object", "properties": {}},
        "permissions": ["books.read", "network.write"],
        "data_policy": {"stores_full_text": False, "retention": "device_owned"},
        "compatibility": {"talebook": ">=0.1.0"},
        "connection_owners": ["user"],
        "homepage": "https://www.amazon.com/sendtokindle",
        "license": "GPL-3.0",
        "ui": {
            "icon": "mdi-email-fast-outline",
            "brand_icon": "/images/plugin-icons/kindle.png",
            "primary_action": "configure",
            "manage_route": "/me/devices",
            "device_type": "kindle",
            "default_port": 0,
        },
    }

    @staticmethod
    def initial_enabled(_settings):
        # Kindle 邮箱推送是升级前就存在的系统能力；物化成插件后默认保持可用。
        return True

    @staticmethod
    def self_check(_context):
        return CheckReport(healthy=True, message="使用 Talebook SMTP 配置发送到 Kindle 邮箱")

    @staticmethod
    def push(_book_file, target, context):
        mailbox = str(target or "").strip()
        if not mailbox:
            raise UpstreamError("Kindle email address is required")

        platform = context.get("platform") or {}
        book = platform.get("book") or {}
        user_id = platform.get("user_id")
        site_url = str(platform.get("site_url") or "")

        from webserver.services.convert import ConvertService
        from webserver.services.mail import MailService

        for fmt in ("epub", "pdf", "txt"):
            path = book.get("fmt_%s" % fmt)
            if path:
                MailService().send_book(user_id, site_url, book, mailbox, fmt, path)
                return {"success": True, "queued": True, "converting": False}

        if book.get("fmt_azw3") or book.get("fmt_mobi"):
            ConvertService().convert_and_send(user_id, site_url, book, mailbox)
            return {"success": True, "queued": True, "converting": True}

        return {"success": False, "error_code": "format.not_supported"}


PROVIDER = KindleProvider()
