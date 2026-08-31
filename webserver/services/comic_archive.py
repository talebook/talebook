#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""Resource-bounded archive adapter for the standalone comic reader.

Only this service knows archive entry names. Public callers address pages by a
contiguous numeric index and an opaque archive revision.
"""

import hashlib
import io
import os
import posixpath
import re
import threading
import unicodedata
import warnings
import zipfile
from collections import OrderedDict
from dataclasses import dataclass

from PIL import Image, UnidentifiedImageError

from webserver.services.media_analysis import InvalidMediaError, analyze_media_file


COMIC_FORMAT_PRIORITY = ("cbz", "zip", "cbr", "rar")
MAX_COMIC_PAGE_BYTES = 32 * 1024 * 1024
MAX_COMIC_PAGE_HEADER_BYTES = 2 * 1024 * 1024
MAX_COMIC_PAGE_DIMENSION = 32768
MAX_COMIC_PAGE_PIXELS = 100_000_000
MAX_COMIC_CONCURRENT_READS = 4
COMIC_READ_WAIT_SECONDS = 5
COMIC_MANIFEST_CACHE_SIZE = 32

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
_IGNORED_NAMES = frozenset((".ds_store", "thumbs.db", "comicinfo.xml"))
_NATURAL_PARTS = re.compile(r"(\d+)")


class ComicArchiveError(Exception):
    """A stable, path-free error that handlers may safely return to clients."""

    def __init__(self, code, message, status=422):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


@dataclass(frozen=True)
class ComicPage:
    index: int
    page_id: str
    entry_name: str
    byte_size: int
    mime_type: str
    width: int
    height: int

    def to_public_dict(self, book_id, revision):
        return {
            "id": self.page_id,
            "index": self.index,
            "url": "/api/book/%d/comic/pages/%d?revision=%s" % (book_id, self.index, revision),
            "width": self.width,
            "height": self.height,
            "mime_type": self.mime_type,
        }


@dataclass(frozen=True)
class ComicManifest:
    archive_path: str
    archive_format: str
    revision: str
    pages: tuple


@dataclass(frozen=True)
class ComicPageContent:
    page: ComicPage
    revision: str
    data: bytes


def natural_page_sort_key(name):
    """Return a Unicode-aware natural key for archive paths."""
    normalized = unicodedata.normalize("NFKC", name.replace("\\", "/")).casefold()
    key = []
    for part in _NATURAL_PARTS.split(normalized):
        if not part:
            continue
        if part.isdecimal():
            key.append((0, int(part), len(part)))
        else:
            key.append((1, part))
    return tuple(key)


def _ignored_entry(name):
    parts = name.replace("\\", "/").split("/")
    basename = parts[-1].lower() if parts else ""
    return bool((parts and parts[0].lower() == "__macosx") or basename in _IGNORED_NAMES or basename.startswith("._"))


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


def _safe_image_dimensions(data, mime_type):
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as image:
                width, height = image.size
                pillow_mime = Image.MIME.get(image.format)
    except (Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise ComicArchiveError("comic.page_dimensions", "漫画图片尺寸超过在线阅读上限")
    except (OSError, UnidentifiedImageError, ValueError):
        raise ComicArchiveError("comic.page_dimensions", "无法安全识别漫画图片尺寸")

    if pillow_mime and pillow_mime != mime_type:
        raise ComicArchiveError("comic.page_type", "漫画图片类型与内容不匹配")
    if (
        not isinstance(width, int)
        or not isinstance(height, int)
        or width <= 0
        or height <= 0
        or width > MAX_COMIC_PAGE_DIMENSION
        or height > MAX_COMIC_PAGE_DIMENSION
        or width * height > MAX_COMIC_PAGE_PIXELS
    ):
        raise ComicArchiveError("comic.page_dimensions", "漫画图片尺寸超过在线阅读上限")
    return width, height


def _validate_page_header(name, byte_size, header):
    if byte_size <= 0 or byte_size > MAX_COMIC_PAGE_BYTES:
        raise ComicArchiveError("comic.page_size", "漫画单页体积超过在线阅读上限")
    mime_type = _detect_image_mime(header)
    extension = posixpath.splitext(name)[1].lower()
    if not mime_type or extension not in _IMAGE_MIME_EXTENSIONS.get(mime_type, ()):
        raise ComicArchiveError("comic.page_type", "漫画图片类型与内容不匹配")
    width, height = _safe_image_dimensions(header, mime_type)
    return mime_type, width, height


def select_comic_container(book):
    """Select a supported container without accepting any client-provided path."""
    if not book or book.get("media_type") != "comic":
        raise ComicArchiveError("comic.media_type", "该书不是可在线阅读的漫画容器", status=415)
    for archive_format in COMIC_FORMAT_PRIORITY:
        archive_path = book.get("fmt_%s" % archive_format)
        if archive_path:
            return archive_path, archive_format
    raise ComicArchiveError("comic.container_missing", "该漫画没有受支持的容器格式", status=415)


class ComicArchiveService:
    """Build and cache private archive indexes, then read pages under limits."""

    def __init__(self):
        self._cache = OrderedDict()
        self._cache_lock = threading.Lock()
        self._read_slots = threading.BoundedSemaphore(MAX_COMIC_CONCURRENT_READS)
        self._archive_locks = tuple(threading.Lock() for _ in range(64))

    def clear_cache(self):
        with self._cache_lock:
            self._cache.clear()

    def _archive_lock(self, path):
        digest = hashlib.sha256(path.encode("utf-8", "surrogatepass")).digest()
        return self._archive_locks[int.from_bytes(digest[:2], "big") % len(self._archive_locks)]

    def _enter_read(self, path):
        if not self._read_slots.acquire(timeout=COMIC_READ_WAIT_SECONDS):
            raise ComicArchiveError("comic.busy", "漫画读取请求过多，请稍后重试", status=503)
        archive_lock = self._archive_lock(path)
        if not archive_lock.acquire(timeout=COMIC_READ_WAIT_SECONDS):
            self._read_slots.release()
            raise ComicArchiveError("comic.busy", "漫画正在读取，请稍后重试", status=503)
        return archive_lock

    def _leave_read(self, archive_lock):
        archive_lock.release()
        self._read_slots.release()

    @staticmethod
    def _cache_key(path, archive_format):
        try:
            real_path = os.path.realpath(path)
            stat_result = os.stat(real_path)
        except (OSError, TypeError, ValueError):
            raise ComicArchiveError("comic.container_unavailable", "漫画容器不存在或无法读取", status=404)
        if not os.path.isfile(real_path):
            raise ComicArchiveError("comic.container_unavailable", "漫画容器不存在或无法读取", status=404)
        key = (
            real_path,
            archive_format,
            stat_result.st_dev,
            stat_result.st_ino,
            stat_result.st_size,
            stat_result.st_mtime_ns,
        )
        return real_path, key

    def get_manifest(self, path, archive_format):
        real_path, key = self._cache_key(path, archive_format)
        with self._cache_lock:
            cached = self._cache.get(key)
            if cached:
                self._cache.move_to_end(key)
                return cached

        archive_lock = self._enter_read(real_path)
        try:
            with self._cache_lock:
                cached = self._cache.get(key)
                if cached:
                    self._cache.move_to_end(key)
                    return cached
            manifest = self._build_manifest(real_path, archive_format)
            with self._cache_lock:
                self._cache[key] = manifest
                self._cache.move_to_end(key)
                while len(self._cache) > COMIC_MANIFEST_CACHE_SIZE:
                    self._cache.popitem(last=False)
            return manifest
        finally:
            self._leave_read(archive_lock)

    def _build_manifest(self, path, archive_format):
        try:
            analysis = analyze_media_file(path, archive_format)
        except InvalidMediaError:
            raise ComicArchiveError("comic.invalid_container", "漫画容器无效、危险或已损坏")
        if analysis.media_type != "comic" or analysis.detected_format not in ("zip", "rar"):
            raise ComicArchiveError("comic.invalid_container", "漫画容器无效、危险或已损坏")

        try:
            entries = self._archive_entries(path, analysis.detected_format)
            if not entries:
                raise ComicArchiveError("comic.empty", "漫画容器中没有可阅读页面")
            revision = self._revision(analysis.detected_format, entries)
            pages = []
            for index, (name, byte_size, _checksum) in enumerate(entries):
                header = self._read_entry(path, analysis.detected_format, name, MAX_COMIC_PAGE_HEADER_BYTES)
                mime_type, width, height = _validate_page_header(name, byte_size, header)
                pages.append(
                    ComicPage(
                        index=index,
                        page_id="%s:%d" % (revision, index),
                        entry_name=name,
                        byte_size=byte_size,
                        mime_type=mime_type,
                        width=width,
                        height=height,
                    )
                )
        except ComicArchiveError:
            raise
        except Exception:
            raise ComicArchiveError("comic.invalid_container", "漫画容器无效、危险或已损坏")
        return ComicManifest(path, analysis.detected_format, revision, tuple(pages))

    @staticmethod
    def _archive_entries(path, detected_format):
        if detected_format == "zip":
            with zipfile.ZipFile(path) as archive:
                entries = [
                    (info.filename, info.file_size, info.CRC)
                    for info in archive.infolist()
                    if not info.is_dir() and not _ignored_entry(info.filename)
                ]
        else:
            import rarfile

            with rarfile.RarFile(path) as archive:
                entries = [
                    (info.filename, info.file_size, getattr(info, "CRC", 0))
                    for info in archive.infolist()
                    if not info.isdir() and not _ignored_entry(info.filename)
                ]
        names = [entry[0] for entry in entries]
        if len(names) != len(set(names)):
            raise ComicArchiveError("comic.invalid_container", "漫画容器无效、危险或已损坏")
        entries.sort(key=lambda entry: natural_page_sort_key(entry[0]))
        return entries

    @staticmethod
    def _revision(detected_format, entries):
        digest = hashlib.sha256()
        digest.update(("comic-manifest-v1\0" + detected_format).encode("ascii"))
        for name, byte_size, checksum in entries:
            digest.update(name.encode("utf-8", "surrogatepass"))
            digest.update(b"\0")
            digest.update(str(byte_size).encode("ascii"))
            digest.update(b"\0")
            digest.update(str(checksum).encode("ascii"))
            digest.update(b"\0")
        return digest.hexdigest()[:20]

    @staticmethod
    def _read_entry(path, detected_format, entry_name, limit):
        try:
            if detected_format == "zip":
                with zipfile.ZipFile(path) as archive, archive.open(entry_name) as stream:
                    return stream.read(limit + 1)
            import rarfile

            with rarfile.RarFile(path) as archive, archive.open(entry_name) as stream:
                return stream.read(limit + 1)
        except Exception:
            raise ComicArchiveError("comic.page_corrupt", "漫画页面已损坏或无法解压")

    def read_page(self, path, archive_format, page_index, revision):
        manifest = self.get_manifest(path, archive_format)
        if not revision or revision != manifest.revision:
            raise ComicArchiveError("comic.stale_manifest", "漫画页面列表已更新，请刷新阅读器", status=409)
        if isinstance(page_index, bool) or not isinstance(page_index, int) or not 0 <= page_index < len(manifest.pages):
            raise ComicArchiveError("comic.page_not_found", "漫画页码超出范围", status=404)
        page = manifest.pages[page_index]

        archive_lock = self._enter_read(manifest.archive_path)
        try:
            data = self._read_entry(
                manifest.archive_path,
                manifest.archive_format,
                page.entry_name,
                MAX_COMIC_PAGE_BYTES,
            )
        finally:
            self._leave_read(archive_lock)
        if len(data) != page.byte_size or len(data) > MAX_COMIC_PAGE_BYTES:
            raise ComicArchiveError("comic.page_corrupt", "漫画页面已损坏或超过读取上限")
        mime_type = _detect_image_mime(data[:32])
        if mime_type != page.mime_type:
            raise ComicArchiveError("comic.page_type", "漫画图片类型与内容不匹配")
        width, height = _safe_image_dimensions(data, mime_type)
        if width != page.width or height != page.height:
            raise ComicArchiveError("comic.stale_manifest", "漫画页面列表已更新，请刷新阅读器", status=409)
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                with Image.open(io.BytesIO(data)) as image:
                    image.verify()
        except (Image.DecompressionBombError, Image.DecompressionBombWarning):
            raise ComicArchiveError("comic.page_dimensions", "漫画图片尺寸超过在线阅读上限")
        except (OSError, UnidentifiedImageError, ValueError):
            raise ComicArchiveError("comic.page_corrupt", "漫画页面已损坏或无法显示")
        return ComicPageContent(page=page, revision=manifest.revision, data=data)


comic_archive_service = ComicArchiveService()
