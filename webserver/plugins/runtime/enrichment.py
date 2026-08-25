import base64
import csv
import io
import json
import re
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from urllib.parse import quote
from xml.etree import ElementTree

from .domains import BookMetadata, ItemFailure, Page, Review
from .protocol import (
    PROTOCOL_VERSION,
    UpstreamError,
    ProviderItem,
    ProviderResult,
)
from .safe_http import SafeHttpClient


SUMMARY_LIMIT = 500
USER_AGENT = "Talebook plugin connector/1.0 (+https://github.com/talebook/talebook)"
EMPTY_VALUES = (None, "", [], {})


def _manifest(
    plugin_id,
    name,
    description,
    categories,
    capabilities,
    auth_schema,
    config_schema,
    permissions,
    icon,
    homepage,
    connection_owners=("instance",),
):
    return {
        "protocol_version": PROTOCOL_VERSION,
        "id": plugin_id,
        "name": name,
        "description": description,
        "version": "1.0.0",
        "categories": categories,
        "capabilities": capabilities,
        "runtime_kind": "builtin",
        "actions": ["test", "preview", "run", "retry", "rollback"],
        "auth_schema": auth_schema,
        "config_schema": config_schema,
        "permissions": permissions,
        "data_policy": {
            "stores_full_text": False,
            "retention": "rating_summary_and_source_link",
        },
        "compatibility": {"talebook": ">=0.1.0"},
        "homepage": homepage,
        "license": "GPL-3.0",
        "ui": {"icon": icon, "primary_action": "configure"},
        "connection_owners": list(connection_owners),
    }


_CLIENT = SafeHttpClient()


def _http_json(method, url, headers=None, params=None, body=None, timeout=30, allowed_hosts=()):
    """连接器统一出网入口：解析后校验 IP 段、逐跳校验重定向、限制响应体大小。

    公共目录接口（OpenLibrary / Bangumi / AniList 等）走完整策略校验；
    仅当管理员为自托管服务显式配置了私网主机白名单时才放行私有地址。
    """
    headers = {"Accept": "application/json", "User-Agent": USER_AGENT, **dict(headers or {})}
    return _CLIENT.json(
        method,
        url,
        headers=headers,
        params=params,
        json=body,
        timeout=timeout,
        allowed_hosts=allowed_hosts,
    )


def _now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _first(value, default=None):
    if isinstance(value, list):
        return value[0] if value else default
    return value if value not in EMPTY_VALUES else default


def _names(values):
    return [str(item.get("name", "")).strip() for item in values or [] if str(item.get("name", "")).strip()]


def _summary(value):
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    return text[:SUMMARY_LIMIT]


def build_field_decisions(current, candidate, locked_fields=()):
    """Describe an enrichment without mutating authoritative metadata."""
    current = dict(current or {})
    locked = {str(field) for field in locked_fields or []}
    decisions = []
    for field in sorted(candidate):
        proposed = candidate[field]
        if proposed in EMPTY_VALUES:
            continue
        existing = current.get(field)
        if field in locked:
            decision = "locked"
        elif existing in EMPTY_VALUES:
            decision = "fill_empty"
        elif existing == proposed:
            decision = "unchanged"
        else:
            decision = "candidate"
        decisions.append(
            {
                "field": field,
                "current": existing,
                "candidate": proposed,
                "decision": decision,
                "locked": field in locked,
                "will_apply": decision == "fill_empty",
            }
        )
    return decisions


def normalized_review(
    source,
    external_id,
    rating,
    scale,
    sample_count=None,
    source_url="",
    source_time="",
    summary="",
    book_id=None,
    domain_id="",
    series_id="",
    review_kind="rating",
    extra=None,
):
    value = {
        "source": source,
        "review_kind": review_kind,
        "external_id": str(external_id),
        "book_id": book_id,
        "domain_id": str(domain_id or ""),
        "series_id": str(series_id or ""),
        "rating": {"value": rating, "scale": scale, "sample_count": sample_count},
        "source_time": source_time or "",
        "source_url": source_url or "",
        "summary": _summary(summary),
    }
    value.update(dict(extra or {}))
    return value


class OpenLibraryProvider:
    manifest = _manifest(
        "talebook.metadata.open-library",
        "Open Library",
        "按 ISBN 获取 Open Library 元数据与可用评分，并生成逐字段安全候选。",
        ["metadata", "reviews"],
        ["metadata.lookup", "reviews.lookup"],
        {"type": "object", "properties": {}},
        {
            "type": "object",
            "properties": {
                "queries": {"type": "array"},
            },
        },
        ["books.read", "plugin_records.write", "network.read"],
        "mdi-library-outline",
        "https://openlibrary.org/developers/api",
    )

    def __init__(self, transport=_http_json):
        self.transport = transport

    def execute(self, context):
        config = context.get("config") or {}
        endpoint = "https://openlibrary.org"
        queries = list(config.get("queries") or [])
        if context["action"] == "test" and not queries:
            self.transport("GET", endpoint + "/search.json", params={"q": "talebook", "limit": 1})
            return ProviderResult(health_message="Open Library connection healthy")
        items = []
        target_ids = set(context.get("target_external_ids") or [])
        for query in queries:
            isbn = re.sub(r"[^0-9Xx]", "", str(query.get("isbn") or ""))
            external_id = "openlibrary:%s" % isbn
            if not isbn:
                continue
            payload = self.transport(
                "GET",
                endpoint + "/api/books",
                params={"bibkeys": "ISBN:%s" % isbn, "format": "json", "jscmd": "data"},
            )
            book = payload.get("ISBN:%s" % isbn) or {}
            if not book:
                if not target_ids or external_id in target_ids:
                    items.append(
                        ProviderItem(
                            external_id=external_id,
                            entity_type="metadata",
                            data={"source": "open_library", "isbn": isbn},
                            error_code="open_library.not_found",
                            error_message="Open Library has no record for this ISBN",
                        )
                    )
                continue
            candidate = {
                "title": book.get("title"),
                "subtitle": book.get("subtitle"),
                "authors": _names(book.get("authors")),
                "publisher": _first(_names(book.get("publishers"))),
                "published": book.get("publish_date"),
                "tags": _names(book.get("subjects")),
                "cover_url": (book.get("cover") or {}).get("large") or (book.get("cover") or {}).get("medium"),
                "isbn": isbn,
            }
            data = {
                "source": "open_library",
                "book_id": query.get("book_id"),
                "isbn": isbn,
                "source_url": book.get("url") or "https://openlibrary.org/isbn/%s" % isbn,
                "fields": build_field_decisions(query.get("current_metadata"), candidate, query.get("locked_fields")),
            }
            if not target_ids or external_id in target_ids:
                items.append(ProviderItem(external_id=external_id, entity_type="metadata", data=data))
            rating = book.get("ratings") or {}
            if not rating and book.get("key"):
                edition = self.transport("GET", endpoint + str(book["key"]) + ".json")
                work_key = ((edition.get("works") or [{}])[0]).get("key")
                if work_key:
                    rating = self.transport("GET", endpoint + str(work_key) + "/ratings.json").get("summary") or {}
            if rating.get("average") is not None and (not target_ids or external_id + ":rating" in target_ids):
                review = normalized_review(
                    "open_library",
                    external_id + ":rating",
                    rating.get("average"),
                    5,
                    sample_count=rating.get("count"),
                    source_url=data["source_url"],
                    source_time=rating.get("updated_at") or "",
                    book_id=query.get("book_id"),
                )
                items.append(ProviderItem(external_id=external_id + ":rating", entity_type="review", data=review))
        return ProviderResult(items=items, next_cursor={"completed": True}, health_message="Open Library query complete")

    def search_books(self, query, context):
        value = str(query or "").strip()
        if not value:
            return []
        payload = self.transport(
            "GET",
            "https://openlibrary.org/search.json",
            params={"q": value, "limit": 20},
        )
        return [
            BookMetadata.from_dict(
                {
                    "title": item.get("title") or "",
                    "authors": item.get("author_name") or [],
                    "isbn": (item.get("isbn") or [""])[0],
                    "provider_key": self.manifest["id"],
                    "provider_value": item.get("key") or "",
                }
            )
            for item in payload.get("docs", [])
        ]

    def get_metadata(self, external_id, context):
        return BookMetadata.from_dict({"provider_key": self.manifest["id"], "provider_value": external_id})

    def get_reviews(self, query, context):
        run_context = {
            **context,
            "action": "run",
            "config": {**dict(context.get("config") or {}), "queries": [dict(query or {})]},
        }
        result = self.execute(run_context)
        return Page(
            items=[
                Review.from_dict(item.data) for item in result.items if item.entity_type == "review" and not item.error_code
            ],
            failures=[
                ItemFailure(item.external_id, item.error_code, item.error_message)
                for item in result.items
                if item.entity_type == "review" and item.error_code
            ],
            next_cursor=dict(result.next_cursor or {}),
            health_message=result.health_message,
        )


def extract_epub_metadata(archive_bytes):
    try:
        with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
            container = ElementTree.fromstring(archive.read("META-INF/container.xml"))
            rootfile = container.find(".//{*}rootfile")
            if rootfile is None or not rootfile.get("full-path"):
                raise UpstreamError("EPUB container has no package document")
            package = ElementTree.fromstring(archive.read(rootfile.get("full-path")))
    except (KeyError, zipfile.BadZipFile, ElementTree.ParseError) as exc:
        raise UpstreamError("Invalid EPUB metadata container") from exc

    def texts(name):
        return [str(node.text or "").strip() for node in package.findall(".//{*}%s" % name) if str(node.text or "").strip()]

    identifiers = texts("identifier")
    isbn = next(
        (value for value in identifiers if re.fullmatch(r"(?:97[89])?\d{9}[\dXx]", re.sub(r"[^0-9Xx]", "", value))), ""
    )
    return {
        "title": _first(texts("title")),
        "authors": texts("creator"),
        "publisher": _first(texts("publisher")),
        "published": _first(texts("date")),
        "language": _first(texts("language")),
        "tags": texts("subject"),
        "description": _summary(_first(texts("description"), "")),
        "isbn": re.sub(r"[^0-9Xx]", "", isbn),
    }


class EmbeddedMetadataProvider:
    manifest = _manifest(
        "talebook.metadata.embedded-file",
        "嵌入文件元数据",
        "从加密上传的 EPUB 文件读取嵌入元数据，只输出补空或人工候选。",
        ["metadata"],
        ["metadata.extract"],
        {
            "type": "object",
            "properties": {"archive_base64": {"type": "string", "writeOnly": True}},
            "required": ["archive_base64"],
        },
        {"type": "object", "properties": {"book": {"type": "object"}}},
        ["books.read", "plugin_records.write"],
        "mdi-file-document-outline",
        "https://www.w3.org/publishing/epub3/",
        ("instance", "user"),
    )

    def execute(self, context):
        encoded = context.get("secrets", {}).get("archive_base64", "")
        try:
            archive = base64.b64decode(encoded, validate=True)
        except ValueError as exc:
            raise UpstreamError("EPUB upload is not valid base64") from exc
        candidate = extract_epub_metadata(archive)
        if context["action"] == "test":
            return ProviderResult(health_message="EPUB metadata parsed")
        book = (context.get("config") or {}).get("book") or {}
        external_id = "embedded:%s" % (book.get("book_id") or candidate.get("isbn") or "upload")
        data = {
            "source": "embedded_file",
            "book_id": book.get("book_id"),
            "fields": build_field_decisions(book.get("current_metadata"), candidate, book.get("locked_fields")),
        }
        return ProviderResult(items=[ProviderItem(external_id=external_id, entity_type="metadata", data=data)])

    def execute_feature(self, action, params, context):
        if action != "extract":
            raise UpstreamError("Unsupported embedded metadata feature")
        result = self.execute({**context, "action": "run"})
        return {"items": [item.data.to_dict() for item in result.items]}


def discover_calibre_providers():
    try:
        from calibre.customize.ui import metadata_plugins

        plugins = metadata_plugins({"identify"})
    except Exception as exc:
        raise UpstreamError("Calibre metadata provider registry is unavailable") from exc
    return [
        {
            "name": plugin.name,
            "version": ".".join(str(value) for value in (getattr(plugin, "version", ()) or ())),
            "author": str(getattr(plugin, "author", "") or ""),
            "capabilities": sorted(getattr(plugin, "capabilities", set()) or []),
        }
        for plugin in plugins
    ]


class CalibreProviderBridge:
    manifest = _manifest(
        "talebook.metadata.calibre-provider-bridge",
        "Calibre Provider Bridge",
        "自动发现当前 Calibre 运行时已启用的 identify provider。",
        ["metadata"],
        ["metadata.discover"],
        {"type": "object", "properties": {}},
        {"type": "object", "properties": {}},
        ["books.read", "plugin_records.write"],
        "mdi-connection",
        "https://manual.calibre-ebook.com/plugins.html",
    )

    def __init__(self, discover=discover_calibre_providers):
        self.discover = discover

    def execute(self, context):
        providers = self.discover()
        if context["action"] == "test":
            return ProviderResult(health_message="Discovered %d Calibre metadata providers" % len(providers))
        target_ids = set(context.get("target_external_ids") or [])
        items = [
            ProviderItem(
                external_id="calibre-provider:%s" % provider["name"].lower().replace(" ", "-"),
                entity_type="metadata",
                data={"source": "calibre_provider_bridge", "provider": provider},
            )
            for provider in providers
            if not target_ids or "calibre-provider:%s" % provider["name"].lower().replace(" ", "-") in target_ids
        ]
        return ProviderResult(items=items, health_message="Calibre provider discovery complete")

    def execute_feature(self, action, params, context):
        if action != "discover":
            raise UpstreamError("Unsupported Calibre provider feature")
        return {"providers": self.discover()}


@dataclass(frozen=True)
class ReviewSourceSpec:
    key: str
    name: str
    homepage: str
    icon: str
    scale: float
    requires_token: bool = False


REVIEW_SPECS = {
    "hardcover": ReviewSourceSpec("hardcover", "Hardcover", "https://hardcover.app", "mdi-book-star-outline", 5, True),
    "neodb": ReviewSourceSpec("neodb", "NeoDB 评价", "https://neodb.social", "mdi-star-circle-outline", 10),
    "google_books": ReviewSourceSpec("google_books", "Google Books 评价", "https://books.google.com", "mdi-google", 5),
    "bangumi": ReviewSourceSpec("bangumi", "Bangumi 漫画评价", "https://bgm.tv", "mdi-book-open-outline", 10),
    "anilist": ReviewSourceSpec("anilist", "AniList 漫画评价", "https://anilist.co", "mdi-format-list-numbered", 100),
}


class CatalogReviewProvider:
    def __init__(self, spec, transport=_http_json):
        self.spec = spec
        self.transport = transport
        auth = {"type": "object", "properties": {}}
        if spec.requires_token:
            auth = {
                "type": "object",
                "properties": {"token": {"type": "string", "writeOnly": True}},
                "required": ["token"],
            }
        self.manifest = _manifest(
            "talebook.reviews.%s" % spec.key.replace("_", "-"),
            spec.name,
            "保留 %s 原始评分尺度、样本数、时间和来源链接。" % spec.name,
            ["reviews"],
            ["reviews.lookup"],
            auth,
            {"type": "object", "properties": {"queries": {"type": "array"}}},
            ["books.read", "plugin_records.write", "network.read"],
            spec.icon,
            spec.homepage,
        )

    def execute(self, context):
        queries = list((context.get("config") or {}).get("queries") or [])
        if context["action"] == "test" and not queries:
            return ProviderResult(health_message="%s configuration valid" % self.spec.name)
        items = []
        targets = set(context.get("target_external_ids") or [])
        for query in queries:
            external_id, payload = self._fetch(context, query)
            if targets and external_id not in targets:
                continue
            try:
                data = self._parse(query, external_id, payload)
                items.append(
                    ProviderItem(
                        external_id=external_id, entity_type="review", data=data, remote_updated_at=data["source_time"]
                    )
                )
            except (KeyError, TypeError, ValueError) as exc:
                items.append(
                    ProviderItem(
                        external_id=external_id,
                        entity_type="review",
                        data={"source": self.spec.key},
                        error_code="%s.invalid_response" % self.spec.key,
                        error_message="Provider response has no usable rating: %s" % exc,
                    )
                )
        return ProviderResult(
            items=items, next_cursor={"completed": True}, health_message="%s query complete" % self.spec.name
        )

    def _fetch(self, context, query):
        token = (context.get("secrets") or {}).get("token", "")
        headers = {"Authorization": "Bearer %s" % token} if token else {}
        if self.spec.key == "hardcover":
            endpoint = "https://api.hardcover.app/v1/graphql"
            isbn = str(query.get("isbn") or "")
            external_id = "hardcover:%s" % isbn
            body = {
                "query": "query($isbn:String!){books(where:{editions:{isbn_13:{_eq:$isbn}}},limit:1){id slug rating rating_count users_read_count}}",
                "variables": {"isbn": isbn},
            }
            return external_id, self.transport("POST", endpoint, headers=headers, body=body)
        if self.spec.key == "neodb":
            endpoint = "https://neodb.social/api/catalog/search"
            key = str(query.get("isbn") or query.get("title") or "")
            return "neodb:%s" % key, self.transport("GET", endpoint, headers=headers, params={"query": key})
        if self.spec.key == "google_books":
            endpoint = "https://www.googleapis.com/books/v1/volumes"
            isbn = str(query.get("isbn") or "")
            return "google-books:%s" % isbn, self.transport("GET", endpoint, params={"q": "isbn:%s" % isbn})
        if self.spec.key == "bangumi":
            subject_id = str(query.get("domain_id") or "")
            endpoint = "https://api.bgm.tv"
            return "bangumi:%s" % subject_id, self.transport("GET", endpoint + "/v0/subjects/" + quote(subject_id))
        media_id = str(query.get("domain_id") or "")
        endpoint = "https://graphql.anilist.co"
        body = {
            "query": "query($id:Int){Media(id:$id,type:MANGA){id siteUrl averageScore popularity updatedAt}}",
            "variables": {"id": int(media_id)},
        }
        return "anilist:%s" % media_id, self.transport("POST", endpoint, body=body)

    def _parse(self, query, external_id, payload):
        if self.spec.key == "hardcover":
            value = (payload.get("data", {}).get("books") or [])[0]
            rating, count = value["rating"], value.get("rating_count") or value.get("users_read_count")
            source_url = "https://hardcover.app/books/%s" % value.get("slug", value["id"])
            source_time = ""
        elif self.spec.key == "neodb":
            value = (payload.get("data") or payload.get("results") or [])[0]
            rating = value.get("rating") or value.get("rating_score")
            count = value.get("rating_count") or value.get("rating_number")
            source_url = value.get("url") or value.get("id", "")
            source_time = value.get("updated_at") or ""
        elif self.spec.key == "google_books":
            value = (payload.get("items") or [])[0]
            info = value.get("volumeInfo") or {}
            rating, count = info["averageRating"], info.get("ratingsCount")
            source_url = info.get("infoLink") or value.get("selfLink", "")
            source_time = info.get("publishedDate") or ""
        elif self.spec.key == "bangumi":
            value = payload
            rating, count = value.get("rating", {}).get("score"), value.get("rating", {}).get("total")
            source_url = "https://bgm.tv/subject/%s" % query.get("domain_id")
            source_time = value.get("date") or ""
        else:
            value = payload.get("data", {}).get("Media") or {}
            rating, count = value["averageScore"], value.get("popularity")
            source_url = value.get("siteUrl", "")
            source_time = (
                datetime.fromtimestamp(value["updatedAt"], timezone.utc).isoformat() if value.get("updatedAt") else ""
            )
        if rating is None:
            raise ValueError("rating is missing")
        return normalized_review(
            self.spec.key,
            external_id,
            rating,
            self.spec.scale,
            sample_count=count,
            source_url=source_url,
            source_time=source_time,
            book_id=query.get("book_id"),
            domain_id=query.get("domain_id", ""),
            series_id=query.get("series_id", ""),
        )

    def get_reviews(self, query, context):
        query = dict(query or {})
        try:
            external_id, payload = self._fetch(context, query)
            data = self._parse(query, external_id, payload)
            return Page(items=[Review.from_dict(data)])
        except (KeyError, TypeError, ValueError) as exc:
            external_id = locals().get("external_id", "%s:unknown" % self.spec.key)
            return Page(
                failures=[
                    ItemFailure(
                        external_id,
                        "%s.invalid_response" % self.spec.key,
                        "Provider response has no usable rating: %s" % exc,
                    )
                ]
            )


class BRSProvider:
    manifest = _manifest(
        "talebook.annotations.brs",
        "talebook-brs 章评",
        "连接一个 talebook-brs 实例，按 book/chapter/segment 映射导入公开章评摘要。",
        ["annotations"],
        ["annotations.chapter_reviews"],
        {
            "type": "object",
            "properties": {"token": {"type": "string", "writeOnly": True}},
            "required": ["token"],
        },
        {
            "type": "object",
            "properties": {
                "endpoint": {"type": "string"},
                "allowed_hosts": {"type": "array", "items": {"type": "string"}, "title": "私网主机白名单"},
                "book_map": {"type": "object"},
                "chapter_map": {"type": "object"},
                "segment_map": {"type": "object"},
            },
        },
        ["books.read", "plugin_records.write", "network.read"],
        "mdi-comment-text-multiple-outline",
        "https://github.com/talebook/talebook",
    )

    def __init__(self, transport=_http_json):
        self.transport = transport

    def execute(self, context):
        config = context.get("config") or {}
        endpoint = str(config.get("endpoint") or "").rstrip("/")
        if not endpoint:
            raise UpstreamError("BRS endpoint is required")
        token = (context.get("secrets") or {}).get("token", "")
        headers = {"Authorization": "Bearer %s" % token}
        cursor = (context.get("cursor") or {}).get("cursor", "")
        payload = self.transport(
            "GET",
            endpoint + "/api/v1/comments",
            headers=headers,
            params={"cursor": cursor},
            allowed_hosts=config.get("allowed_hosts") or (),
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
            data = normalized_review(
                "talebook_brs",
                external_id,
                row.get("rating"),
                row.get("rating_scale") or 5,
                source_url=row.get("url") or "%s/comments/%s" % (endpoint, row.get("id")),
                source_time=row.get("updated_at") or row.get("created_at") or "",
                summary=row.get("summary") or row.get("content"),
                book_id=mapped_book,
                review_kind="chapter_comment",
                extra={
                    "domain": "chapter_reviews",
                    "chapter": chapter_map.get(remote_chapter, remote_chapter),
                    "segment": segment_map.get(remote_segment, remote_segment),
                    "remote_book_id": remote_book,
                    "remote_chapter_id": remote_chapter,
                    "remote_segment_id": remote_segment,
                },
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


GOODREADS_ALIASES = {
    "external_id": ["Book Id", "book_id"],
    "title": ["Title", "title"],
    "author": ["Author", "author"],
    "rating": ["My Rating", "rating"],
    "source_time": ["Date Read", "date_read"],
    "summary": ["My Review", "review"],
    "source_url": ["URL", "url"],
    "isbn": ["ISBN13", "ISBN", "isbn"],
}
STORYGRAPH_ALIASES = {
    "external_id": ["Book Id", "book_id", "ISBN/UID"],
    "title": ["Title", "title"],
    "author": ["Authors", "author"],
    "rating": ["Star Rating", "rating"],
    "source_time": ["Date Read", "date_read"],
    "summary": ["Review", "review"],
    "source_url": ["URL", "url"],
    "isbn": ["ISBN/UID", "isbn"],
}


def _mapped_value(row, name, aliases, mapping):
    key = mapping.get(name)
    if key:
        return row.get(key)
    return next((row.get(alias) for alias in aliases.get(name, []) if row.get(alias) not in EMPTY_VALUES), None)


def parse_review_file(content, source, file_format="csv", mapping=None):
    mapping = dict(mapping or {})
    if file_format == "json":
        parsed = json.loads(content)
        rows = parsed if isinstance(parsed, list) else parsed.get("reviews") or parsed.get("items") or []
    else:
        rows = list(csv.DictReader(io.StringIO(content.lstrip("\ufeff"))))
    aliases = GOODREADS_ALIASES if source == "goodreads" else STORYGRAPH_ALIASES if source == "storygraph" else {}
    result = []
    for index, row in enumerate(rows, 1):
        external_id = (
            _mapped_value(row, "external_id", aliases, mapping) or _mapped_value(row, "isbn", aliases, mapping) or index
        )
        rating = _mapped_value(row, "rating", aliases, mapping)
        try:
            rating = float(rating) if rating not in EMPTY_VALUES else None
        except (TypeError, ValueError):
            result.append((str(external_id), None, "review_file.invalid_rating", "Rating is not numeric"))
            continue
        if rating is None:
            result.append((str(external_id), None, "review_file.rating_missing", "Rating is missing"))
            continue
        data = normalized_review(
            source,
            "%s:%s" % (source, external_id),
            rating,
            float(mapping.get("scale") or 5),
            source_url=_mapped_value(row, "source_url", aliases, mapping) or "",
            source_time=_mapped_value(row, "source_time", aliases, mapping) or "",
            summary=_mapped_value(row, "summary", aliases, mapping) or "",
            extra={
                "title": _mapped_value(row, "title", aliases, mapping) or "",
                "author": _mapped_value(row, "author", aliases, mapping) or "",
                "isbn": _mapped_value(row, "isbn", aliases, mapping) or "",
            },
        )
        result.append((str(external_id), data, "", ""))
    return result


class ReviewFileProvider:
    manifest = _manifest(
        "talebook.reviews.file-import",
        "评价文件导入",
        "导入 Goodreads、StoryGraph 或显式字段映射的 CSV/JSON；文件正文加密保存且不进入 run log。",
        ["reviews"],
        ["reviews.import"],
        {
            "type": "object",
            "properties": {"content": {"type": "string", "writeOnly": True}},
            "required": ["content"],
        },
        {
            "type": "object",
            "properties": {
                "source": {"type": "string", "enum": ["goodreads", "storygraph", "generic"]},
                "format": {"type": "string", "enum": ["csv", "json"]},
                "mapping": {"type": "object"},
            },
        },
        ["plugin_records.write"],
        "mdi-file-delimited-outline",
        "https://github.com/talebook/talebook",
        ("instance", "user"),
    )

    def execute(self, context):
        config = context.get("config") or {}
        source = config.get("source") or "generic"
        rows = parse_review_file(
            (context.get("secrets") or {}).get("content", ""),
            source,
            config.get("format") or "csv",
            config.get("mapping"),
        )
        if context["action"] == "test":
            return ProviderResult(health_message="Parsed %d review rows" % len(rows))
        targets = set(context.get("target_external_ids") or [])
        items = []
        for row_id, data, error_code, error_message in rows:
            external_id = "%s:%s" % (source, row_id)
            if targets and external_id not in targets:
                continue
            items.append(
                ProviderItem(
                    external_id=external_id,
                    entity_type="review",
                    data=data or {"source": source, "row_id": row_id},
                    remote_updated_at=(data or {}).get("source_time"),
                    error_code=error_code,
                    error_message=error_message,
                )
            )
        return ProviderResult(items=items, next_cursor={"completed": True}, health_message="Review file import complete")

    def get_reviews(self, query, context):
        result = self.execute({**context, "action": "run"})
        items = [Review.from_dict(item.data) for item in result.items if not item.error_code]
        return Page(items=items, health_message=result.health_message)


EXTERNAL_CONNECTOR_PROVIDERS = (
    OpenLibraryProvider(),
    EmbeddedMetadataProvider(),
    CalibreProviderBridge(),
    *(CatalogReviewProvider(spec) for spec in REVIEW_SPECS.values()),
    BRSProvider(),
    ReviewFileProvider(),
)
