#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""Bounded validation and content classification for imported media files."""

import os
import posixpath
import stat
import struct
import zipfile
from dataclasses import dataclass
from pathlib import PurePosixPath
from urllib.parse import unquote, urlsplit

from lxml import etree

from webserver.constants import MEDIA_TYPE_COMIC, MEDIA_TYPE_EBOOK, MEDIA_TYPE_UNKNOWN


COMIC_ZIP_FORMATS = frozenset(("cbz", "zip"))
COMIC_RAR_FORMATS = frozenset(("cbr", "rar"))
COMIC_CONTAINER_FORMATS = COMIC_ZIP_FORMATS | COMIC_RAR_FORMATS
EBOOK_MEDIA_FORMATS = frozenset(("azw", "azw3", "epub", "mobi", "pdf", "txt"))
SUPPORTED_MEDIA_FORMATS = EBOOK_MEDIA_FORMATS | COMIC_CONTAINER_FORMATS
ONLINE_READ_FORMATS = EBOOK_MEDIA_FORMATS | COMIC_CONTAINER_FORMATS

MAX_ARCHIVE_ENTRIES = 10000
MAX_ARCHIVE_FILE_BYTES = 1024 * 1024 * 1024
MAX_ARCHIVE_UNCOMPRESSED_BYTES = 512 * 1024 * 1024
MAX_ARCHIVE_ENTRY_BYTES = 128 * 1024 * 1024
MAX_ARCHIVE_COMPRESSION_RATIO = 200
MAX_EPUB_XML_BYTES = 2 * 1024 * 1024
MAX_EPUB_XHTML_BYTES = 2 * 1024 * 1024
MAX_EPUB_SPINE_ITEMS = 2000
EPUB_COMIC_TEXT_THRESHOLD = 15

_IMAGE_EXTENSIONS = frozenset((".avif", ".bmp", ".gif", ".jpeg", ".jpg", ".jxl", ".png", ".tif", ".tiff", ".webp"))
_IMAGE_MIME_EXTENSIONS = {
    "image/avif": frozenset((".avif",)),
    "image/bmp": frozenset((".bmp",)),
    "image/gif": frozenset((".gif",)),
    "image/jpeg": frozenset((".jpeg", ".jpg")),
    "image/jxl": frozenset((".jxl",)),
    "image/png": frozenset((".png",)),
    "image/tiff": frozenset((".tif", ".tiff")),
    "image/webp": frozenset((".webp",)),
}


class InvalidMediaError(ValueError):
    """Raised when a declared media format does not match safe container checks."""

    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class MediaAnalysis:
    declared_format: str
    detected_format: str
    mime_type: str
    media_type: str
    reason: str

    def to_dict(self):
        return {
            "declared_format": self.declared_format,
            "detected_format": self.detected_format,
            "mime_type": self.mime_type,
            "media_type": self.media_type,
            "analysis_reason": self.reason,
        }


def merge_media_type(existing, incoming):
    """Keep the strongest reliable classification when a book gains a format."""
    priority = {MEDIA_TYPE_UNKNOWN: 0, MEDIA_TYPE_EBOOK: 1, MEDIA_TYPE_COMIC: 2}
    existing = existing if existing in priority else MEDIA_TYPE_UNKNOWN
    incoming = incoming if incoming in priority else MEDIA_TYPE_UNKNOWN
    return incoming if priority[incoming] > priority[existing] else existing


def normalized_media_formats(formats):
    if isinstance(formats, str):
        formats = formats.replace(",", " ").split()
    return {str(fmt).strip().lower() for fmt in (formats or ()) if str(fmt).strip()}


def has_mixed_media_formats(formats):
    formats = normalized_media_formats(formats)
    return bool(formats.intersection(EBOOK_MEDIA_FORMATS)) and bool(formats.intersection(COMIC_CONTAINER_FORMATS))


def online_readable_formats(formats):
    return bool(normalized_media_formats(formats).intersection(ONLINE_READ_FORMATS))


def _invalid(code, message):
    raise InvalidMediaError(code, message)


def _read_signature(path, size=16):
    try:
        with open(path, "rb") as stream:
            return stream.read(size)
    except OSError as err:
        _invalid("media.unreadable", "无法读取媒体文件：%s" % err)


def _safe_archive_name(name):
    if not name or "\x00" in name:
        return False
    normalized = name.replace("\\", "/")
    if normalized.startswith("/"):
        return False
    path = PurePosixPath(normalized)
    if any(part in ("", ".", "..") for part in path.parts):
        return False
    if path.parts and ":" in path.parts[0]:
        return False
    return True


def _ignored_comic_entry(name):
    normalized = name.replace("\\", "/")
    parts = PurePosixPath(normalized).parts
    basename = parts[-1].lower() if parts else ""
    return bool(
        (parts and parts[0].lower() == "__macosx")
        or basename in (".ds_store", "thumbs.db", "comicinfo.xml")
        or basename.startswith("._")
    )


def _check_archive_budget(entries):
    if len(entries) > MAX_ARCHIVE_ENTRIES:
        _invalid("archive.too_many_entries", "压缩包条目过多")

    total_uncompressed = 0
    total_compressed = 0
    for name, file_size, compressed_size, encrypted, is_link in entries:
        if not _safe_archive_name(name):
            _invalid("archive.unsafe_path", "压缩包包含不安全路径")
        if encrypted:
            _invalid("archive.encrypted", "暂不支持加密压缩包")
        if is_link:
            _invalid("archive.link", "压缩包不能包含符号链接")
        if file_size < 0 or compressed_size < 0:
            _invalid("archive.invalid_size", "压缩包条目大小不合法")
        if file_size > MAX_ARCHIVE_ENTRY_BYTES:
            _invalid("archive.entry_too_large", "压缩包单个条目过大")
        if file_size and compressed_size == 0:
            _invalid("archive.suspicious_ratio", "压缩包压缩比异常")
        if compressed_size and file_size / compressed_size > MAX_ARCHIVE_COMPRESSION_RATIO:
            _invalid("archive.suspicious_ratio", "压缩包压缩比过高")
        total_uncompressed += file_size
        total_compressed += compressed_size
        if total_uncompressed > MAX_ARCHIVE_UNCOMPRESSED_BYTES:
            _invalid("archive.too_large", "压缩包展开后体积过大")

    if total_compressed and total_uncompressed / total_compressed > MAX_ARCHIVE_COMPRESSION_RATIO:
        _invalid("archive.suspicious_ratio", "压缩包总压缩比过高")


def _preflight_archive_file(path):
    try:
        if os.path.getsize(path) > MAX_ARCHIVE_FILE_BYTES:
            _invalid("archive.file_too_large", "压缩包文件体积超过检测上限")
    except OSError as err:
        _invalid("media.unreadable", "无法读取媒体文件：%s" % err)


def _preflight_zip_directory(path):
    """Read EOCD before ZipFile builds an attacker-controlled in-memory entry list."""
    _preflight_archive_file(path)
    try:
        size = os.path.getsize(path)
        with open(path, "rb") as stream:
            stream.seek(max(0, size - (65535 + 22)))
            tail = stream.read()
    except OSError as err:
        _invalid("media.unreadable", "无法读取 ZIP 目录：%s" % err)

    marker = tail.rfind(b"PK\x05\x06")
    if marker < 0 or len(tail) - marker < 22:
        _invalid("archive.corrupt", "ZIP 压缩包缺少中央目录")
    try:
        (
            _signature,
            disk_number,
            directory_disk,
            disk_entries,
            total_entries,
            directory_size,
            _offset,
            comment_size,
        ) = struct.unpack("<4s4H2LH", tail[marker : marker + 22])
    except struct.error:
        _invalid("archive.corrupt", "ZIP 中央目录不完整")
    if marker + 22 + comment_size != len(tail):
        _invalid("archive.corrupt", "ZIP 中央目录长度不匹配")
    if disk_number or directory_disk or disk_entries != total_entries:
        _invalid("archive.multidisk", "暂不支持分卷 ZIP 压缩包")
    if total_entries == 0xFFFF or directory_size == 0xFFFFFFFF:
        _invalid("archive.zip64", "暂不支持 ZIP64 漫画或 EPUB 容器")
    if total_entries > MAX_ARCHIVE_ENTRIES:
        _invalid("archive.too_many_entries", "压缩包条目过多")


def _zip_file_entries(archive):
    infos = archive.infolist()
    names = [info.filename for info in infos]
    if len(names) != len(set(names)):
        _invalid("archive.duplicate_entry", "压缩包包含重复路径")

    entries = []
    for info in infos:
        mode = info.external_attr >> 16
        entries.append(
            (
                info.filename.rstrip("/") if info.is_dir() else info.filename,
                0 if info.is_dir() else info.file_size,
                0 if info.is_dir() else info.compress_size,
                bool(info.flag_bits & 0x1),
                stat.S_ISLNK(mode),
            )
        )
    _check_archive_budget(entries)
    return infos, [info for info in infos if not info.is_dir()]


def _detect_image_mime(header):
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if header.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    if header.startswith(b"BM"):
        return "image/bmp"
    if header.startswith((b"II*\x00", b"MM\x00*")):
        return "image/tiff"
    if len(header) >= 12 and header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return "image/webp"
    if header.startswith(b"\xff\x0a") or header.startswith(b"\x00\x00\x00\x0cJXL \r\n\x87\n"):
        return "image/jxl"
    if len(header) >= 12 and header[4:8] == b"ftyp" and header[8:12] in (b"avif", b"avis"):
        return "image/avif"
    return None


def _validate_comic_zip(path, declared_format):
    _preflight_zip_directory(path)
    try:
        with zipfile.ZipFile(path) as archive:
            _infos, file_infos = _zip_file_entries(archive)
            image_count = 0
            for info in file_infos:
                if _ignored_comic_entry(info.filename):
                    continue
                extension = posixpath.splitext(info.filename)[1].lower()
                if extension not in _IMAGE_EXTENSIONS:
                    _invalid("comic.non_image_entry", "漫画压缩包只能包含图片和 ComicInfo.xml")
                try:
                    with archive.open(info) as stream:
                        detected_mime = _detect_image_mime(stream.read(32))
                except (OSError, RuntimeError, zipfile.BadZipFile) as err:
                    _invalid("archive.corrupt", "无法读取漫画图片：%s" % err)
                if detected_mime is None or extension not in _IMAGE_MIME_EXTENSIONS[detected_mime]:
                    _invalid("comic.image_mismatch", "漫画图片扩展名与内容不匹配")
                image_count += 1
            if image_count == 0:
                _invalid("comic.no_images", "漫画压缩包中没有可识别的图片")
    except InvalidMediaError:
        raise
    except (OSError, zipfile.BadZipFile, zipfile.LargeZipFile) as err:
        _invalid("archive.corrupt", "ZIP 压缩包已损坏：%s" % err)

    mime_type = "application/vnd.comicbook+zip" if declared_format == "cbz" else "application/zip"
    return MediaAnalysis(declared_format, "zip", mime_type, MEDIA_TYPE_COMIC, "image_archive")


def _validate_comic_rar(path, declared_format):
    _preflight_archive_file(path)
    signature = _read_signature(path, 8)
    if not (signature.startswith(b"Rar!\x1a\x07\x00") or signature.startswith(b"Rar!\x1a\x07\x01\x00")):
        _invalid("format.mismatch", "文件内容不是有效的 RAR 容器")

    try:
        import rarfile

        with rarfile.RarFile(path) as archive:
            if archive.needs_password():
                _invalid("archive.encrypted", "暂不支持加密压缩包")
            infos = archive.infolist()
            file_infos = [info for info in infos if not info.isdir()]
            entries = [
                (
                    info.filename.rstrip("/") if info.isdir() else info.filename,
                    0 if info.isdir() else info.file_size,
                    0 if info.isdir() else info.compress_size,
                    bool(info.needs_password()),
                    bool(getattr(info, "is_symlink", lambda: False)()),
                )
                for info in infos
            ]
            _check_archive_budget(entries)
            image_count = 0
            for info in file_infos:
                if _ignored_comic_entry(info.filename):
                    continue
                if posixpath.splitext(info.filename)[1].lower() not in _IMAGE_EXTENSIONS:
                    _invalid("comic.non_image_entry", "漫画压缩包只能包含图片和 ComicInfo.xml")
                image_count += 1
            if image_count == 0:
                _invalid("comic.no_images", "漫画压缩包中没有可识别的图片")
    except InvalidMediaError:
        raise
    except (OSError, rarfile.Error) as err:
        _invalid("archive.corrupt", "RAR 压缩包已损坏或不受支持：%s" % err)

    mime_type = "application/vnd.comicbook-rar" if declared_format == "cbr" else "application/vnd.rar"
    return MediaAnalysis(declared_format, "rar", mime_type, MEDIA_TYPE_COMIC, "image_archive")


def _read_zip_entry(archive, info, limit, label):
    if info.file_size > limit:
        _invalid("epub.resource_too_large", "%s 体积过大" % label)
    try:
        with archive.open(info) as stream:
            data = stream.read(limit + 1)
    except (OSError, RuntimeError, zipfile.BadZipFile) as err:
        _invalid("epub.corrupt", "无法读取 %s：%s" % (label, err))
    if len(data) > limit:
        _invalid("epub.resource_too_large", "%s 体积过大" % label)
    return data


def _parse_xml(data, label):
    parser = etree.XMLParser(resolve_entities=False, no_network=True, recover=False, huge_tree=False)
    try:
        return etree.fromstring(data, parser=parser)
    except (etree.XMLSyntaxError, ValueError) as err:
        _invalid("epub.invalid_xml", "%s XML 不合法：%s" % (label, err))


def _normalize_href(base, href):
    parsed = urlsplit(unquote(href or ""))
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None
    raw_path = parsed.path.replace("\\", "/")
    normalized = posixpath.normpath(posixpath.join(base, raw_path))
    if not _safe_archive_name(normalized):
        return None
    return normalized


def _local_name(element):
    try:
        return etree.QName(element).localname
    except ValueError:
        return ""


def _epub_xhtml_image(archive, info, page_path, manifest_by_path):
    if info.file_size > MAX_EPUB_XHTML_BYTES:
        return "limit"
    data = _read_zip_entry(archive, info, MAX_EPUB_XHTML_BYTES, "EPUB 页面")
    parser = etree.XMLParser(resolve_entities=False, no_network=True, recover=False, huge_tree=False)
    try:
        root = etree.fromstring(data, parser=parser)
    except (etree.XMLSyntaxError, ValueError):
        return None

    body = next((node for node in root.iter() if _local_name(node).lower() == "body"), root)
    text_length = len("".join("".join(body.itertext()).split()))
    if text_length > EPUB_COMIC_TEXT_THRESHOLD:
        return None

    image_paths = set()
    for node in body.iter():
        node_name = _local_name(node).lower()
        href = None
        if node_name == "img":
            href = node.get("src")
        elif node_name == "image":
            href = next((value for key, value in node.attrib.items() if key == "href" or key.endswith("}href")), None)
        if not href:
            continue
        image_path = _normalize_href(posixpath.dirname(page_path), href)
        manifest_item = manifest_by_path.get(image_path)
        if manifest_item and manifest_item[1].lower().startswith("image/"):
            image_paths.add(image_path)

    return next(iter(image_paths)) if len(image_paths) == 1 else None


def _analyze_epub(path, declared_format):
    if not _read_signature(path, 4).startswith(b"PK"):
        _invalid("format.mismatch", "文件内容不是 ZIP 容器")
    _preflight_zip_directory(path)

    try:
        with zipfile.ZipFile(path) as archive:
            infos, _file_infos = _zip_file_entries(archive)
            info_by_name = {info.filename: info for info in infos if not info.is_dir()}
            mimetype_info = info_by_name.get("mimetype")
            if not mimetype_info:
                _invalid("epub.mimetype_missing", "EPUB 缺少 mimetype 标识")
            if mimetype_info.compress_type != zipfile.ZIP_STORED:
                _invalid("epub.mimetype_invalid", "EPUB mimetype 必须是未压缩条目")
            mimetype = _read_zip_entry(archive, mimetype_info, 64, "EPUB mimetype")
            if mimetype.strip() != b"application/epub+zip":
                _invalid("format.mismatch", "EPUB mimetype 标识不匹配")

            container_info = info_by_name.get("META-INF/container.xml")
            if not container_info:
                _invalid("epub.container_missing", "EPUB 缺少 META-INF/container.xml")
            container = _parse_xml(
                _read_zip_entry(archive, container_info, MAX_EPUB_XML_BYTES, "EPUB container.xml"),
                "EPUB container.xml",
            )
            rootfiles = [node.get("full-path") for node in container.iter() if _local_name(node) == "rootfile"]
            opf_path = next((path for path in rootfiles if path and _safe_archive_name(path)), None)
            opf_info = info_by_name.get(opf_path) if opf_path else None
            if not opf_info:
                _invalid("epub.package_missing", "EPUB package 文档不存在")
            package = _parse_xml(
                _read_zip_entry(archive, opf_info, MAX_EPUB_XML_BYTES, "EPUB package"),
                "EPUB package",
            )

            opf_dir = posixpath.dirname(opf_path)
            manifest_by_id = {}
            manifest_by_path = {}
            for node in package.iter():
                if _local_name(node) != "item":
                    continue
                item_id = node.get("id")
                item_path = _normalize_href(opf_dir, node.get("href"))
                media_type = node.get("media-type") or ""
                if not item_id or not item_path:
                    continue
                manifest_by_id[item_id] = (item_path, media_type)
                manifest_by_path[item_path] = (item_id, media_type)

            spine_ids = [node.get("idref") for node in package.iter() if _local_name(node) == "itemref"]
            if not spine_ids:
                _invalid("epub.spine_missing", "EPUB spine 为空")
            if len(spine_ids) > MAX_EPUB_SPINE_ITEMS:
                return MediaAnalysis(declared_format, "epub", "application/epub+zip", MEDIA_TYPE_UNKNOWN, "spine_limit")

            page_images = []
            for item_id in spine_ids:
                manifest_item = manifest_by_id.get(item_id)
                if not manifest_item:
                    _invalid("epub.spine_invalid", "EPUB spine 引用了不存在的 manifest 条目")
                page_path, media_type = manifest_item
                page_info = info_by_name.get(page_path)
                if not page_info:
                    _invalid("epub.spine_invalid", "EPUB spine 页面文件不存在")
                if media_type.lower().startswith("image/"):
                    page_image = page_path
                elif media_type.lower() in ("application/xhtml+xml", "text/html"):
                    page_image = _epub_xhtml_image(archive, page_info, page_path, manifest_by_path)
                    if page_image == "limit":
                        return MediaAnalysis(
                            declared_format,
                            "epub",
                            "application/epub+zip",
                            MEDIA_TYPE_UNKNOWN,
                            "page_limit",
                        )
                else:
                    page_image = None
                if not page_image:
                    return MediaAnalysis(declared_format, "epub", "application/epub+zip", MEDIA_TYPE_EBOOK, "text_spine")
                page_images.append(page_image)

            if len(page_images) == len(spine_ids):
                return MediaAnalysis(declared_format, "epub", "application/epub+zip", MEDIA_TYPE_COMIC, "image_spine")
    except InvalidMediaError:
        raise
    except (OSError, zipfile.BadZipFile, zipfile.LargeZipFile) as err:
        _invalid("epub.corrupt", "EPUB 容器已损坏：%s" % err)

    return MediaAnalysis(declared_format, "epub", "application/epub+zip", MEDIA_TYPE_EBOOK, "text_spine")


def analyze_media_file(path, declared_format):
    """Validate a file against its declared format and classify its content."""
    declared_format = (declared_format or "").lower().lstrip(".")
    if declared_format not in SUPPORTED_MEDIA_FORMATS:
        _invalid("format.unsupported", "不支持的文件格式：%s" % declared_format)
    if not os.path.isfile(path):
        _invalid("media.unreadable", "媒体文件不存在")

    if declared_format in COMIC_ZIP_FORMATS:
        if not _read_signature(path, 4).startswith(b"PK"):
            _invalid("format.mismatch", "文件内容不是有效的 ZIP 容器")
        return _validate_comic_zip(path, declared_format)
    if declared_format in COMIC_RAR_FORMATS:
        return _validate_comic_rar(path, declared_format)
    if declared_format == "epub":
        return _analyze_epub(path, declared_format)
    if declared_format == "pdf":
        if not _read_signature(path, 5).startswith(b"%PDF-"):
            _invalid("format.mismatch", "文件内容不是有效的 PDF")
        return MediaAnalysis(declared_format, "pdf", "application/pdf", MEDIA_TYPE_UNKNOWN, "pdf_unclassified")

    mime_types = {
        "txt": "text/plain",
        "mobi": "application/x-mobipocket-ebook",
        "azw": "application/vnd.amazon.ebook",
        "azw3": "application/vnd.amazon.ebook",
    }
    return MediaAnalysis(declared_format, declared_format, mime_types[declared_format], MEDIA_TYPE_EBOOK, "ebook_format")
