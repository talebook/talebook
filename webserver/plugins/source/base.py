import base64
import hashlib
import mimetypes
import urllib.parse
from pathlib import Path
from xml.etree import ElementTree

from webserver.plugins.runtime.domains import BookFile, Category, CheckReport, Page, SourceBook, SourceBookDetail
from webserver.plugins.runtime.protocol import PROTOCOL_VERSION, ProviderItem, ProviderResult, UpstreamError
from webserver.plugins.runtime.safe_http import SafeHttpClient


ALLOWED_FORMATS = frozenset({"azw", "azw3", "cbr", "cbz", "epub", "fb2", "mobi", "pdf", "txt"})
MIME_FORMATS = {
    "application/epub+zip": "epub",
    "application/pdf": "pdf",
    "application/x-mobipocket-ebook": "mobi",
    "application/vnd.amazon.ebook": "azw",
    "application/x-fictionbook+xml": "fb2",
    "application/vnd.comicbook+zip": "cbz",
    "application/vnd.comicbook-rar": "cbr",
    "text/plain": "txt",
}
ATOM_NS = {"atom": "http://www.w3.org/2005/Atom", "dc": "http://purl.org/dc/terms/"}
DAV_NS = {"d": "DAV:"}


def _format_from(url="", mime=""):
    content_type = str(mime or "").split(";", 1)[0].strip().lower()
    if content_type in MIME_FORMATS:
        return MIME_FORMATS[content_type]
    suffix = Path(urllib.parse.urlsplit(url).path).suffix.lower().lstrip(".")
    return suffix if suffix in ALLOWED_FORMATS else ""


def _isbn(value):
    digits = "".join(char for char in str(value or "").upper() if char.isdigit() or char == "X")
    return digits if len(digits) in {10, 13} else ""


def _external_id(source, value):
    raw = "%s:%s" % (source, value)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _manifest(
    plugin_id,
    name,
    description,
    capabilities,
    config_schema,
    auth_schema=None,
    homepage="",
    runtime_kind="http",
    network_read=True,
):
    return {
        "protocol_version": PROTOCOL_VERSION,
        "id": plugin_id,
        "name": name,
        "description": description,
        "version": "1.0.0",
        "categories": ["book_sources"],
        "capabilities": capabilities,
        "runtime_kind": runtime_kind,
        "actions": ["test", "preview", "run", "retry", "rollback"],
        "auth_schema": auth_schema or {"type": "object", "properties": {}},
        "config_schema": config_schema,
        "permissions": ["books.read", "books.write"] + (["network.read"] if network_read else []),
        "data_policy": {"stores_full_text": False, "retention": "pending_review"},
        "compatibility": {"talebook": ">=0.1.0"},
        # 书源由管理员统一配置后供全站使用。
        "connection_owners": ["instance"],
        "download_mode": "single_book",
        "homepage": homepage,
        "license": "GPL-3.0",
        "ui": {"icon": "mdi-bookshelf", "manage_kind": "book_source", "primary_action": "configure"},
    }


COMMON_CONFIG_PROPERTIES = {
    "target_library": {"type": "string", "title": "目标书库", "default": "main"},
    "formats": {"type": "array", "items": {"type": "string"}, "default": ["epub", "pdf", "mobi", "txt"]},
}


class SourceBase:
    """单文件书源的共享实现；具体来源只负责 ``discover``。"""

    source_name = ""
    license_name = "由来源条目决定"
    download_mode = "single_book"

    def __init__(self, http=None):
        self.http = http or SafeHttpClient()

    def execute(self, context):
        entries, cursor = self.discover(context)
        if context["action"] == "test":
            return ProviderResult(health_message="%s 连接可用" % self.source_name)
        items = [ProviderItem(item["external_id"], "book_source", item, item.get("updated_at")) for item in entries]
        return ProviderResult(items=items, next_cursor=cursor, health_message="发现 %d 个待审条目" % len(items))

    def search(self, query, cursor, context):
        page = self.browse("", cursor, context)
        needle = str(query or "").strip().casefold()
        if not needle:
            return page
        items = [
            item
            for item in page.items
            if needle in item.title.casefold() or any(needle in author.casefold() for author in item.authors)
        ]
        return Page(
            items=items,
            failures=page.failures,
            has_more=page.has_more,
            next_cursor=page.next_cursor,
            health_message=page.health_message,
        )

    def browse(self, category_id, cursor, context):
        call_context = {**context, "cursor": dict(cursor or {})}
        entries, next_cursor = self.discover(call_context)
        items = [SourceBook.from_dict(item) for item in entries]
        return Page(
            items=items,
            has_more=bool(next_cursor.get("next")),
            next_cursor=next_cursor,
            health_message="发现 %d 本书" % len(items),
        )

    def get_categories(self, context):
        return [Category(id="root", name=self.source_name)]

    def get_book(self, external_id, context):
        page = self.browse("", {}, context)
        book = next((item for item in page.items if item.external_id == external_id), None)
        if book is None:
            raise UpstreamError("Book source item was not found")
        return SourceBookDetail(
            external_id=book.external_id,
            title=book.title,
            authors=book.authors,
            description=book.description,
            cover_url=book.cover_url,
            categories=book.categories,
            source_url=book.source_url,
            acquisition_url=book.acquisition_url,
            format=book.format,
            downloadable=book.access == "download" and bool(book.acquisition_url),
            source=book.source,
        )

    def download(self, book, context):
        if not book.downloadable or not book.acquisition_url:
            raise UpstreamError("Book source item is not downloadable")
        config = context.get("config") or {}
        response = self.http.request(
            "GET",
            book.acquisition_url,
            allowed_hosts=config.get("allowed_hosts") or (),
            headers=self._headers(context),
            timeout=float(config.get("timeout_seconds", 30)),
        )
        format_name = book.format or _format_from(book.acquisition_url, response.headers.get("Content-Type", ""))
        filename = Path(urllib.parse.urlsplit(book.acquisition_url).path).name or "%s.%s" % (
            book.external_id,
            format_name,
        )
        return BookFile(
            filename=filename,
            content=response.content,
            format=format_name,
            media_type=response.headers.get("Content-Type") or mimetypes.guess_type(filename)[0] or "application/octet-stream",
            source_url=book.acquisition_url,
        )

    def get_toc(self, book, context):
        raise UpstreamError("Book source does not provide chapters")

    def get_chapter(self, chapter, context):
        raise UpstreamError("Book source does not provide chapters")

    def self_check(self, context):
        page = self.browse("", {}, context)
        return CheckReport(healthy=True, message=page.health_message)

    def _normalize(
        self,
        context,
        *,
        identity,
        title,
        authors=None,
        isbn="",
        format_name="",
        source_url="",
        acquisition_url="",
        access="external_link",
        license_name="",
        content_hash="",
        remote_etag="",
        updated_at="",
    ):
        fmt = str(format_name or "").lower()
        if fmt and fmt not in ALLOWED_FORMATS:
            raise UpstreamError("Book source returned an unsupported format")
        if access != "download":
            acquisition_url = ""
        return SourceBook.from_dict(
            {
                "external_id": _external_id(self.source_name, identity),
                "title": str(title or "未知标题")[:500],
                "authors": [str(item) for item in (authors or []) if item],
                "isbn": _isbn(isbn),
                "format": fmt,
                "source": self.source_name,
                "source_url": source_url,
                "acquisition_url": acquisition_url,
                "access": access,
                "license": license_name or self.license_name,
                "target_library": str(context.get("config", {}).get("target_library") or "main"),
                "review_status": "pending",
                "content_hash": content_hash,
                "remote_etag": remote_etag,
                "updated_at": updated_at,
            }
        )

    @staticmethod
    def _formats(context):
        requested = context.get("config", {}).get("formats") or ALLOWED_FORMATS
        return {str(item).lower() for item in requested} & ALLOWED_FORMATS

    @staticmethod
    def _headers(context):
        secrets = context.get("secrets") or {}
        headers = {"Accept": "application/opds+json, application/atom+xml, application/json, application/xml"}
        if secrets.get("api_key"):
            headers["X-Api-Key"] = secrets["api_key"]
        elif secrets.get("username") and secrets.get("password"):
            token = base64.b64encode((secrets["username"] + ":" + secrets["password"]).encode()).decode()
            headers["Authorization"] = "Basic " + token
        return headers


class OPDSProvider(SourceBase):
    def __init__(self, plugin_id, name, description, homepage, endpoint="", license_name="由来源条目决定", http=None):
        super().__init__(http)
        self.source_name = name
        self.endpoint = endpoint
        self.license_name = license_name
        properties = dict(COMMON_CONFIG_PROPERTIES)
        if not endpoint:
            properties.update(
                {
                    "endpoint": {"type": "string", "format": "uri", "title": "OPDS endpoint"},
                    "allowed_hosts": {"type": "array", "items": {"type": "string"}, "title": "私网主机白名单"},
                }
            )
        self.manifest = _manifest(
            plugin_id,
            name,
            description,
            ["book_sources.browse", "book_sources.search", "book_sources.acquire"],
            {"type": "object", "properties": properties, "required": [] if endpoint else ["endpoint"]},
            {
                "type": "object",
                "properties": {
                    "api_key": {"type": "string", "writeOnly": True},
                    "username": {"type": "string", "writeOnly": True},
                    "password": {"type": "string", "writeOnly": True},
                },
            },
            homepage,
        )

    def discover(self, context):
        config = context.get("config") or {}
        endpoint = self.endpoint or str(config.get("endpoint") or "")
        if not endpoint:
            raise UpstreamError("OPDS endpoint is required")
        response = self.http.request(
            "GET",
            endpoint,
            allowed_hosts=config.get("allowed_hosts") or (),
            headers=self._headers(context),
            timeout=float(config.get("timeout_seconds", 30)),
        )
        content_type = response.headers.get("Content-Type", "").lower()
        if "json" in content_type or response.content.lstrip().startswith((b"{", b"[")):
            entries = self._parse_json(context, response.json(), endpoint)
        else:
            entries = self._parse_atom(context, response.content, endpoint)
        return entries, {"endpoint": endpoint, "seen": len(entries)}

    def _parse_json(self, context, payload, endpoint):
        publications = payload.get("publications", payload.get("entries", [])) if isinstance(payload, dict) else []
        entries = []
        for publication in publications[:200]:
            metadata = publication.get("metadata") or publication
            links = publication.get("links") or []
            acquisition = self._json_acquisition(links)
            fmt = _format_from(acquisition.get("href", ""), acquisition.get("type", "")) if acquisition else ""
            if fmt and fmt not in self._formats(context):
                continue
            authors = metadata.get("author") or metadata.get("authors") or []
            if isinstance(authors, (str, dict)):
                authors = [authors]
            authors = [item.get("name", "") if isinstance(item, dict) else item for item in authors]
            identifier = metadata.get("identifier") or publication.get("id") or metadata.get("title")
            isbn = next(
                (value for value in ([identifier] if isinstance(identifier, str) else identifier or []) if _isbn(value)), ""
            )
            entries.append(
                self._normalize(
                    context,
                    identity=identifier,
                    title=metadata.get("title"),
                    authors=authors,
                    isbn=isbn,
                    format_name=fmt,
                    source_url=endpoint,
                    acquisition_url=urllib.parse.urljoin(endpoint, acquisition.get("href", "")) if acquisition else "",
                    access="download" if acquisition and fmt else "external_link",
                    license_name=metadata.get("rights") or self.license_name,
                    updated_at=metadata.get("modified", ""),
                )
            )
        return entries

    @staticmethod
    def _json_acquisition(links):
        for link in links:
            rels = link.get("rel") or []
            rels = [rels] if isinstance(rels, str) else rels
            if any("acquisition" in rel for rel in rels) and _format_from(link.get("href", ""), link.get("type", "")):
                return link
        return None

    def _parse_atom(self, context, content, endpoint):
        try:
            root = ElementTree.fromstring(content)
        except ElementTree.ParseError as exc:
            raise UpstreamError("OPDS response is not valid XML") from exc
        entries = []
        for entry in root.findall("atom:entry", ATOM_NS)[:200]:
            links = entry.findall("atom:link", ATOM_NS)
            acquisition = next(
                (
                    link
                    for link in links
                    if "acquisition" in link.attrib.get("rel", "")
                    and _format_from(link.attrib.get("href", ""), link.attrib.get("type", ""))
                ),
                None,
            )
            fmt = _format_from(acquisition.attrib.get("href", ""), acquisition.attrib.get("type", "")) if acquisition else ""
            if fmt and fmt not in self._formats(context):
                continue
            identifier = entry.findtext("atom:id", default="", namespaces=ATOM_NS) or entry.findtext(
                "atom:title", default="", namespaces=ATOM_NS
            )
            authors = [
                item.findtext("atom:name", default="", namespaces=ATOM_NS) for item in entry.findall("atom:author", ATOM_NS)
            ]
            isbn = entry.findtext("dc:identifier", default="", namespaces=ATOM_NS)
            rights = entry.findtext("atom:rights", default="", namespaces=ATOM_NS)
            entries.append(
                self._normalize(
                    context,
                    identity=identifier,
                    title=entry.findtext("atom:title", default="未知标题", namespaces=ATOM_NS),
                    authors=authors,
                    isbn=isbn,
                    format_name=fmt,
                    source_url=endpoint,
                    acquisition_url=urllib.parse.urljoin(endpoint, acquisition.attrib.get("href", "")) if acquisition else "",
                    access="download" if acquisition and fmt else "external_link",
                    license_name=rights or self.license_name,
                    updated_at=entry.findtext("atom:updated", default="", namespaces=ATOM_NS),
                )
            )
        return entries
