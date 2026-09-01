import base64

from webserver.plugins.runtime.domains import ItemFailure, Page, PushReceipt, Review
from webserver.plugins.runtime.protocol import PROTOCOL_VERSION, ProviderItem, ProviderResult, UpstreamError
from webserver.plugins.runtime.safe_http import SafeHttpClient


_CLIENT = SafeHttpClient()


def _http_json(method, url, headers=None, params=None, timeout=30, data=None, json=None):
    return _CLIENT.json(
        method,
        url,
        headers={"Accept": "application/json", **dict(headers or {})},
        params=params,
        data=data,
        json=json,
        timeout=timeout,
    )


def _chapter_review(row, endpoint, external_id, mapped_book, chapter, segment):
    return {
        "source": "talebook_brs",
        "review_kind": "chapter_comment",
        "external_id": external_id,
        "book_id": mapped_book,
        "domain_id": "",
        "series_id": "",
        "rating": {"value": row.get("rating"), "scale": row.get("rating_scale") or 5, "sample_count": None},
        "source_time": row.get("updated_at") or row.get("created_at") or "",
        "source_url": row.get("url") or "%s/comments/%s" % (endpoint, row.get("id")),
        "summary": " ".join(str(row.get("summary") or row.get("content") or "").split())[:500],
        "domain": "chapter_reviews",
        "chapter": chapter,
        "segment": segment,
        "remote_book_id": str(row.get("book_id") or ""),
        "remote_chapter_id": str(row.get("chapter_id") or ""),
        "remote_segment_id": str(row.get("segment_id") or ""),
    }


class BRSProvider:
    manifest = {
        "protocol_version": PROTOCOL_VERSION,
        "id": "talebook.annotation.brs",
        "name": "talebook-brs 章评服务器",
        "description": "连接一个 talebook-brs 实例，导入公开章评，并同步 Talebook 中的公开笔记。",
        "version": "1.1.0",
        "categories": ["annotations"],
        "capabilities": ["annotations.chapter_reviews", "annotations.push"],
        "runtime_kind": "builtin",
        "actions": ["test", "preview", "run", "retry", "rollback"],
        "auth_schema": {
            "type": "object",
            "properties": {
                "email": {"type": "string", "writeOnly": True},
                "password": {"type": "string", "writeOnly": True},
            },
            "required": ["email", "password"],
        },
        "config_schema": {
            "type": "object",
            "properties": {
                "endpoint": {"type": "string", "default": "https://brs.talebook.org"},
                "book_map": {"type": "object"},
                "chapter_map": {"type": "object"},
                "segment_map": {"type": "object"},
            },
        },
        "permissions": ["books.read", "plugin_records.write", "network.read", "network.write", "annotations.write"],
        "data_policy": {"stores_full_text": True, "retention": "remote_user_controlled"},
        "compatibility": {"talebook": ">=0.1.0"},
        "homepage": "https://github.com/talebook/talebook",
        "license": "GPL-3.0",
        "ui": {
            "icon": "mdi-comment-text-multiple-outline",
            "primary_action": "configure",
            "manage_route": "/plugins/brs",
        },
        # 每个用户登录自己的 BRS 账号，endpoint、映射与账号密码都属于个人连接。
        "connection_owners": ["user"],
    }

    def __init__(self, transport=None):
        self.transport = transport

    @staticmethod
    def initial_enabled(_settings):
        return True

    def execute(self, context):
        config = context.get("config") or {}
        endpoint = str(config.get("endpoint") or "").rstrip("/")
        if not endpoint:
            raise UpstreamError("BRS endpoint is required")
        secrets = context.get("secrets") or {}
        email = str(secrets.get("email") or "")
        password = str(secrets.get("password") or "")
        credentials = base64.b64encode((email + ":" + password).encode("utf-8")).decode("ascii")
        cursor = (context.get("cursor") or {}).get("cursor", "")
        payload = (self.transport or _http_json)(
            "GET",
            endpoint + "/api/v1/comments",
            headers={"Authorization": "Basic %s" % credentials},
            params={"cursor": cursor},
        )
        if context["action"] == "test":
            return ProviderResult(health_message="BRS connection healthy")
        items = []
        targets = set(context.get("target_external_ids") or [])
        book_map = {str(key): value for key, value in (config.get("book_map") or {}).items()}
        chapter_map = {str(key): value for key, value in (config.get("chapter_map") or {}).items()}
        segment_map = {str(key): value for key, value in (config.get("segment_map") or {}).items()}
        for row in payload.get("comments") or payload.get("items") or []:
            external_id = "brs:%s" % row.get("id")
            if targets and external_id not in targets:
                continue
            remote_book = str(row.get("book_id") or "")
            remote_chapter = str(row.get("chapter_id") or "")
            remote_segment = str(row.get("segment_id") or "")
            mapped_book = book_map.get(remote_book)
            if mapped_book is None:
                items.append(
                    ProviderItem(
                        external_id=external_id,
                        entity_type="review",
                        data={"source": "talebook_brs", "remote_book_id": remote_book},
                        error_code="brs.book_unmapped",
                        error_message="BRS book has no Talebook mapping",
                    )
                )
                continue
            data = _chapter_review(
                row,
                endpoint,
                external_id,
                mapped_book,
                chapter_map.get(remote_chapter, remote_chapter),
                segment_map.get(remote_segment, remote_segment),
            )
            items.append(
                ProviderItem(external_id=external_id, entity_type="review", data=data, remote_updated_at=data["source_time"])
            )
        next_cursor = payload.get("next_cursor")
        return ProviderResult(
            items=items,
            next_cursor={"cursor": next_cursor} if next_cursor else dict(context.get("cursor") or {}),
            health_message="BRS sync complete",
        )

    def get_reviews(self, query, context):
        result = self.execute({**context, "action": "run"})
        return Page(
            items=[Review.from_dict(item.data) for item in result.items if not item.error_code],
            failures=[
                ItemFailure(item.external_id, item.error_code, item.error_message) for item in result.items if item.error_code
            ],
            has_more=bool((result.next_cursor or {}).get("cursor")),
            next_cursor=dict(result.next_cursor or {}),
            health_message=result.health_message,
        )

    def list_annotations(self, context):
        del context
        return Page(items=[], health_message="BRS annotation connection is write-only")

    def push_annotation(self, item, state, context):
        """把 Talebook 的公开批注写入当前用户绑定的 BRS 账号。"""
        del state
        config = context.get("config") or {}
        secrets = context.get("secrets") or {}
        endpoint = str(config.get("endpoint") or "").rstrip("/")
        email = str(secrets.get("email") or "").strip()
        password = str(secrets.get("password") or "")
        if not endpoint:
            raise UpstreamError("BRS endpoint is required")
        if not email or not password:
            raise UpstreamError("BRS credentials are required")

        annotation = item.to_dict()
        local_book_id = str(annotation.get("book_id") or "")
        remote_book_id = next(
            (
                str(remote_id)
                for remote_id, mapped_id in (config.get("book_map") or {}).items()
                if str(mapped_id) == local_book_id
            ),
            "",
        )

        # 登录 cookie 只能存在于本次同步调用的独立会话中，不能跨用户复用。
        if self.transport is None:
            client = SafeHttpClient()
            transport = client.json
        else:
            transport = self.transport
        login = transport(
            "POST",
            endpoint + "/api/user/sign_in",
            data={"email": email, "password": password},
        )
        if login.get("err") != "ok":
            raise UpstreamError(str(login.get("msg") or login.get("err") or "BRS login failed"))

        if not remote_book_id:
            book_title = str(annotation.get("book_title") or "").strip()
            if not book_title:
                raise UpstreamError("Talebook book title is required before syncing annotations")
            remote_book = transport(
                "GET",
                endpoint + "/api/review/book",
                params={"title": book_title},
            )
            if remote_book.get("err") != "ok":
                raise UpstreamError(str(remote_book.get("msg") or remote_book.get("err") or "BRS book lookup failed"))
            remote_book_id = str((remote_book.get("data") or {}).get("id") or "")
            if not remote_book_id:
                raise UpstreamError("BRS book lookup returned no id")

        payload = {
            "book_id": remote_book_id,
            "chapter_name": str(annotation.get("chapter") or "未命名章节")[:255],
            "segment_id": int(annotation.get("segment_id") or 0),
            "cfi": str(annotation.get("cfi") or ""),
            "content": str(annotation.get("content") or annotation.get("quote_text") or ""),
            "refer_text": str(annotation.get("quote_text") or "")[:80],
            "type": 1,
        }
        result = transport(
            "POST",
            endpoint + "/api/review/add",
            json=payload,
        )
        if result.get("err") != "ok":
            raise UpstreamError(str(result.get("msg") or result.get("err") or "BRS annotation sync failed"))
        remote = result.get("data") or {}
        return PushReceipt(
            source_annotation_id=str(remote.get("reviewId") or remote.get("id") or ""),
            source_position=str(annotation.get("cfi") or ""),
            source_updated_at=str(remote.get("updateTime") or remote.get("createTime") or ""),
        )


PROVIDER = BRSProvider()
