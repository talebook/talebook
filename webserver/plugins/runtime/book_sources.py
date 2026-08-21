import base64
import hashlib
import urllib.parse
from pathlib import Path
from xml.etree import ElementTree

from .protocol import PROTOCOL_VERSION, ProviderError, ProviderItem, ProviderResult
from .safe_http import SafeHttpClient


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
    primary_action="configure",
):
    return {
        "protocol_version": PROTOCOL_VERSION,
        "id": plugin_id,
        "name": name,
        "description": description,
        "version": "1.0.0",
        "categories": ["book_sources"],
        "capabilities": capabilities,
        "runtime_kind": "http" if plugin_id != "talebook.book-source.watch-folder" else "file",
        "actions": ["test", "preview", "run", "retry", "rollback"],
        "auth_schema": auth_schema or {"type": "object", "properties": {}},
        "config_schema": config_schema,
        "permissions": ["books.read", "books.write"]
        + ([] if plugin_id == "talebook.book-source.watch-folder" else ["network.read"]),
        "data_policy": {"stores_full_text": False, "retention": "pending_review"},
        "compatibility": {"talebook": ">=0.1.0"},
        "homepage": homepage,
        "license": "GPL-3.0",
        "ui": {"icon": "mdi-bookshelf", "manage_kind": "book_source", "primary_action": primary_action},
    }


COMMON_CONFIG_PROPERTIES = {
    "target_library": {"type": "string", "title": "目标书库", "default": "main"},
    "formats": {"type": "array", "items": {"type": "string"}, "default": ["epub", "pdf", "mobi", "txt"]},
}


class BookSourceProvider:
    source_name = ""
    license_name = "由来源条目决定"

    def __init__(self, http=None):
        self.http = http or SafeHttpClient()

    def execute(self, context):
        entries, cursor = self.discover(context)
        if context["action"] == "test":
            return ProviderResult(health_message="%s 连接可用" % self.source_name)
        items = [ProviderItem(item["external_id"], "book_source", item, item.get("updated_at")) for item in entries]
        return ProviderResult(items=items, next_cursor=cursor, health_message="发现 %d 个待审条目" % len(items))

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
            raise ProviderError("Book source returned an unsupported format")
        if access != "download":
            acquisition_url = ""
        return {
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
        elif secrets.get("username"):
            token = base64.b64encode((secrets["username"] + ":" + secrets.get("password", "")).encode()).decode()
            headers["Authorization"] = "Basic " + token
        return headers


class OPDSProvider(BookSourceProvider):
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
            raise ProviderError("OPDS endpoint is required")
        allowed_hosts = list(config.get("allowed_hosts") or ())
        if self.endpoint:
            allowed_hosts.append(urllib.parse.urlsplit(self.endpoint).hostname)
        response = self.http.request(
            "GET",
            endpoint,
            allowed_hosts=allowed_hosts,
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
            raise ProviderError("OPDS response is not valid XML") from exc
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


class GutenbergProvider(BookSourceProvider):
    source_name = "Project Gutenberg"
    license_name = "Project Gutenberg License"
    endpoint = "https://gutendex.com/books/"
    manifest = _manifest(
        "talebook.book-source.gutenberg",
        source_name,
        "检索 Project Gutenberg 的合法开放电子书。",
        ["book_sources.browse", "book_sources.search", "book_sources.acquire"],
        {"type": "object", "properties": COMMON_CONFIG_PROPERTIES},
        homepage="https://www.gutenberg.org/",
        primary_action="test",
    )

    def discover(self, context):
        response = self.http.request(
            "GET",
            self.endpoint,
            allowed_hosts=("gutendex.com",),
            headers={"Accept": "application/json"},
        )
        payload = response.json()
        entries = []
        for book in payload.get("results", [])[:200]:
            for mime, url in (book.get("formats") or {}).items():
                fmt = _format_from(url, mime)
                if not fmt or fmt not in self._formats(context) or not url:
                    continue
                entries.append(
                    self._normalize(
                        context,
                        identity="%s:%s" % (book.get("id"), fmt),
                        title=book.get("title"),
                        authors=[item.get("name", "") for item in book.get("authors", [])],
                        format_name=fmt,
                        source_url="https://www.gutenberg.org/ebooks/%s" % book.get("id"),
                        acquisition_url=url,
                        access="download",
                    )
                )
        return entries, {"next": payload.get("next") or "", "seen": len(entries)}


class InternetArchiveProvider(BookSourceProvider):
    source_name = "Internet Archive"
    endpoint = "https://archive.org/advancedsearch.php?q=mediatype%3Atexts&fl%5B%5D=identifier,title,creator&rows=25&page=1&output=json"
    manifest = _manifest(
        "talebook.book-source.internet-archive",
        source_name,
        "检索 Internet Archive；仅明确开放文件可进入待审取得。",
        ["book_sources.browse", "book_sources.search", "book_sources.acquire"],
        {"type": "object", "properties": COMMON_CONFIG_PROPERTIES},
        homepage="https://archive.org/details/texts",
        primary_action="test",
    )

    def discover(self, context):
        search = self.http.request(
            "GET",
            self.endpoint,
            allowed_hosts=("archive.org",),
            headers={"Accept": "application/json"},
        ).json()
        entries = []
        for doc in search.get("response", {}).get("docs", [])[:25]:
            identifier = doc.get("identifier")
            if not identifier:
                continue
            metadata_url = "https://archive.org/metadata/%s" % urllib.parse.quote(str(identifier), safe="")
            metadata = self.http.request(
                "GET",
                metadata_url,
                allowed_hosts=("archive.org",),
                headers={"Accept": "application/json"},
            ).json()
            item_meta = metadata.get("metadata") or {}
            restricted = str(item_meta.get("access-restricted-item", "false")).lower() == "true"
            downloadable = [] if restricted else self._open_files(metadata.get("files") or [], context)
            if downloadable:
                for file_info, fmt in downloadable:
                    name = file_info.get("name", "")
                    entries.append(
                        self._normalize(
                            context,
                            identity="%s:%s" % (identifier, name),
                            title=doc.get("title") or item_meta.get("title"),
                            authors=[doc.get("creator")] if isinstance(doc.get("creator"), str) else doc.get("creator") or [],
                            format_name=fmt,
                            source_url="https://archive.org/details/%s" % identifier,
                            acquisition_url="https://archive.org/download/%s/%s"
                            % (urllib.parse.quote(str(identifier), safe=""), urllib.parse.quote(name)),
                            access="download",
                            license_name=item_meta.get("licenseurl") or item_meta.get("rights") or "由条目权利声明决定",
                        )
                    )
            else:
                entries.append(
                    self._normalize(
                        context,
                        identity=identifier,
                        title=doc.get("title") or item_meta.get("title"),
                        authors=[doc.get("creator")] if isinstance(doc.get("creator"), str) else doc.get("creator") or [],
                        source_url="https://archive.org/details/%s" % identifier,
                        access="restricted" if restricted else "external_link",
                        license_name=item_meta.get("licenseurl") or item_meta.get("rights") or "需查看条目权利声明",
                    )
                )
        return entries, {"seen": len(entries)}

    def _open_files(self, files, context):
        selected = []
        for file_info in files:
            if str(file_info.get("private", "false")).lower() == "true":
                continue
            fmt = _format_from(file_info.get("name", ""), file_info.get("format", ""))
            if fmt and fmt in self._formats(context):
                selected.append((file_info, fmt))
        return selected


class WebDAVProvider(BookSourceProvider):
    source_name = "WebDAV"
    manifest = _manifest(
        "talebook.book-source.webdav",
        source_name,
        "浏览 WebDAV 目录并按扩展名增量发现待审电子书。",
        ["book_sources.browse", "book_sources.acquire"],
        {
            "type": "object",
            "properties": {
                **COMMON_CONFIG_PROPERTIES,
                "endpoint": {"type": "string", "format": "uri", "title": "WebDAV endpoint"},
                "allowed_hosts": {"type": "array", "items": {"type": "string"}, "title": "私网主机白名单"},
            },
            "required": ["endpoint"],
        },
        {
            "type": "object",
            "properties": {
                "username": {"type": "string", "writeOnly": True},
                "password": {"type": "string", "writeOnly": True},
            },
        },
    )

    def discover(self, context):
        config = context.get("config") or {}
        endpoint = str(config.get("endpoint") or "")
        if not endpoint:
            raise ProviderError("WebDAV endpoint is required")
        headers = self._headers(context)
        headers.update({"Depth": "1", "Content-Type": "application/xml"})
        response = self.http.request(
            "PROPFIND",
            endpoint,
            allowed_hosts=config.get("allowed_hosts") or (),
            headers=headers,
            data=b'<?xml version="1.0"?><propfind xmlns="DAV:"><prop><getetag/><getlastmodified/><getcontentlength/><resourcetype/></prop></propfind>',
        )
        try:
            root = ElementTree.fromstring(response.content)
        except ElementTree.ParseError as exc:
            raise ProviderError("WebDAV response is not valid XML") from exc
        old = (context.get("cursor") or {}).get("etags", {})
        etags = {}
        entries = []
        for item in root.findall("d:response", DAV_NS):
            href = item.findtext("d:href", default="", namespaces=DAV_NS)
            prop = item.find("d:propstat/d:prop", DAV_NS)
            if prop is None or prop.find("d:resourcetype/d:collection", DAV_NS) is not None:
                continue
            url = urllib.parse.urljoin(endpoint, href)
            fmt = _format_from(url)
            if not fmt or fmt not in self._formats(context):
                continue
            etag = prop.findtext("d:getetag", default="", namespaces=DAV_NS)
            etags[url] = etag
            if old.get(url) == etag and etag:
                continue
            entries.append(
                self._normalize(
                    context,
                    identity=url,
                    title=urllib.parse.unquote(Path(urllib.parse.urlsplit(url).path).stem),
                    format_name=fmt,
                    source_url=endpoint,
                    acquisition_url=url,
                    access="download",
                    remote_etag=etag.strip('"'),
                    updated_at=prop.findtext("d:getlastmodified", default="", namespaces=DAV_NS),
                )
            )
        return entries, {"etags": etags}


class WatchFolderProvider(BookSourceProvider):
    source_name = "Watch Folder"
    manifest = _manifest(
        "talebook.book-source.watch-folder",
        source_name,
        "扫描白名单内的本地目录，以内容 hash 增量发现待审电子书。",
        ["book_sources.browse", "book_sources.acquire"],
        {
            "type": "object",
            "properties": {
                **COMMON_CONFIG_PROPERTIES,
                "path": {"type": "string", "title": "监听目录"},
                "recursive": {"type": "boolean", "default": True},
            },
            "required": ["path"],
        },
        homepage="https://github.com/talebook/talebook",
    )

    def discover(self, context):
        config = context.get("config") or {}
        platform = context.get("platform") or {}
        target = self._allowed_path(config.get("path"), platform.get("import_allowed_roots") or [])
        pattern = "**/*" if config.get("recursive", True) else "*"
        old = (context.get("cursor") or {}).get("files", {})
        files = {}
        entries = []
        for path in sorted(target.glob(pattern)):
            if not path.is_file():
                continue
            resolved = path.resolve(strict=True)
            self._allowed_path(resolved, platform.get("import_allowed_roots") or [])
            fmt = resolved.suffix.lower().lstrip(".")
            if fmt not in self._formats(context):
                continue
            stat = resolved.stat()
            signature = "%d:%d" % (stat.st_mtime_ns, stat.st_size)
            files[str(resolved)] = signature
            if old.get(str(resolved)) == signature:
                continue
            digest = self._hash_file(resolved)
            entries.append(
                self._normalize(
                    context,
                    identity=str(resolved),
                    title=resolved.stem,
                    format_name=fmt,
                    source_url=str(target),
                    acquisition_url=resolved.as_uri(),
                    access="download",
                    license_name="本地文件；许可由管理员确认",
                    content_hash=digest,
                    updated_at=str(stat.st_mtime_ns),
                )
            )
        return entries, {"files": files}

    @staticmethod
    def _allowed_path(value, roots):
        if not value:
            raise ProviderError("Watch Folder path is required")
        path = Path(value).expanduser().resolve(strict=True)
        allowed = []
        for root in roots:
            try:
                allowed.append(Path(root).expanduser().resolve(strict=True))
            except OSError:
                continue
        if not any(path == root or root in path.parents for root in allowed):
            raise ProviderError("Watch Folder path is outside the configured allowlist")
        return path

    @staticmethod
    def _hash_file(path):
        digest = hashlib.sha256()
        with path.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()


BOOK_SOURCE_PROVIDERS = (
    OPDSProvider(
        "talebook.book-source.kavita",
        "Kavita",
        "Kavita 自托管书库 OPDS 连接预设。",
        "https://www.kavitareader.com/",
    ),
    OPDSProvider(
        "talebook.book-source.komga",
        "Komga",
        "Komga 自托管书库 OPDS 连接预设。",
        "https://komga.org/",
    ),
    OPDSProvider(
        "talebook.book-source.booklore",
        "BookLore",
        "BookLore 自托管书库 OPDS 连接预设。",
        "https://booklore.org/",
    ),
    OPDSProvider(
        "talebook.book-source.standard-ebooks",
        "Standard Ebooks",
        "浏览 Standard Ebooks 官方 OPDS 目录；当前需填写 Patrons Circle 邮箱。",
        "https://standardebooks.org/",
        endpoint="https://standardebooks.org/feeds/opds/all",
        license_name="Public domain / CC0",
    ),
    GutenbergProvider(),
    InternetArchiveProvider(),
    WebDAVProvider(),
    WatchFolderProvider(),
)
