"""EPUB 文件内嵌元数据解析；这是导入基础能力，不参与插件生命周期。"""

import io
import re
import zipfile
from xml.etree import ElementTree

from webserver.plugins.runtime.protocol import UpstreamError


SUMMARY_LIMIT = 500


def _first(values, default=None):
    return values[0] if values else default


def _summary(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()[:SUMMARY_LIMIT]


def extract_epub_metadata(archive_bytes):
    """Read Dublin Core metadata from an EPUB archive without external I/O."""
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
        (value for value in identifiers if re.fullmatch(r"(?:97[89])?\d{9}[\dXx]", re.sub(r"[^0-9Xx]", "", value))),
        "",
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
