import base64
import io
import re
import zipfile
from xml.etree import ElementTree

from webserver.plugins.runtime.protocol import ProviderItem, ProviderResult, UpstreamError

from .base import _first, _manifest, _summary, build_field_decisions


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


PROVIDER = EmbeddedMetadataProvider()
