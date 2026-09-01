import datetime
import logging
from pathlib import Path
from urllib.parse import urlparse

import requests

from webserver.constants import CHROME_HEADERS
from .provider import WereadProvider


KEY = "weread"


def _first(*values):
    for value in values:
        if value not in (None, ""):
            return value
    return ""


def _rating(value):
    try:
        value = float(value)
    except (TypeError, ValueError):
        return None
    if value <= 0:
        return None
    if value > 100:
        value /= 100
    elif value > 10:
        value /= 10
    return min(10, value)


def _pubdate(value):
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        try:
            return datetime.datetime.fromtimestamp(value, tz=datetime.timezone.utc)
        except (ValueError, OSError, OverflowError):
            return None
    text = str(value).strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%Y-%m", "%Y"):
        try:
            parsed = datetime.datetime.strptime(text, fmt)
            return parsed.replace(tzinfo=datetime.timezone.utc)
        except ValueError:
            continue
    return None


def _search_items(payload):
    if not isinstance(payload, dict):
        return []
    items = []
    for group in payload.get("results") or []:
        if not isinstance(group, dict):
            continue
        for value in group.get("books") or []:
            if not isinstance(value, dict):
                continue
            info = value.get("bookInfo") if isinstance(value.get("bookInfo"), dict) else value
            items.append({**value, **info})
    for value in payload.get("books") or []:
        if not isinstance(value, dict):
            continue
        info = value.get("bookInfo") if isinstance(value.get("bookInfo"), dict) else value
        items.append({**value, **info})
    return items


class WereadMetadataApi:
    """Adapt a user's read-only WeRead connection to Talebook metadata results."""

    def __init__(self, api_key, provider=None):
        self.api_key = str(api_key or "")
        self.provider = provider or WereadProvider()

    def search(self, title):
        if not title:
            return []
        payload = self.provider.query(self.api_key, "search", {"keyword": title, "scope": 10})
        books = []
        for item in _search_items(payload):
            try:
                metadata = self.build_metadata(item, copy_image=False)
            except Exception as exc:
                logging.warning("微信读书元数据构建失败: %s", exc)
                continue
            if metadata.provider_value:
                books.append(metadata)
        return books

    def get_metadata_by_provider(self, provider_value):
        payload = self.provider.query(self.api_key, "book_info", {"bookId": str(provider_value)})
        if not isinstance(payload, dict):
            return None
        return self.build_metadata(payload, copy_image=True)

    def build_metadata(self, item, copy_image=False):
        from calibre.ebooks.metadata.book.base import Metadata
        from calibre.utils.date import utcnow

        item = item if isinstance(item, dict) else {}
        title = str(_first(item.get("title"), item.get("bookName")))
        author = str(_first(item.get("author"), item.get("authorName"), "佚名"))
        book_id = str(_first(item.get("bookId"), item.get("bookid"), item.get("id")))
        metadata = Metadata(title)
        metadata.authors = [author]
        metadata.author = author
        metadata.author_sort = author
        metadata.publisher = str(item.get("publisher") or "")
        metadata.comments = str(_first(item.get("intro"), item.get("description")))
        metadata.isbn = str(_first(item.get("isbn"), item.get("ISBN"))) or None
        metadata.timestamp = utcnow()
        metadata.source = "微信读书"
        metadata.provider_key = KEY
        metadata.provider_value = book_id
        metadata.website = str(item.get("deepLink") or "")

        rating = _rating(item.get("newRating"))
        if rating is not None:
            metadata.rating = rating
        pubdate = _pubdate(item.get("publishTime"))
        if pubdate is not None:
            metadata.pubdate = pubdate
        category = str(item.get("category") or "").strip()
        if category:
            metadata.tags = [value.strip() for value in category.replace("/", ",").split(",") if value.strip()][:8]

        cover_url = str(item.get("cover") or "")
        metadata.cover_url = cover_url
        if copy_image and cover_url:
            metadata.cover_data = self.get_cover(cover_url)
        return metadata

    @staticmethod
    def get_cover(cover_url):
        parsed = urlparse(str(cover_url or ""))
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            return None
        try:
            response = requests.get(cover_url, headers=CHROME_HEADERS, timeout=15)
            response.raise_for_status()
        except requests.RequestException as exc:
            logging.warning("微信读书封面下载失败: %s", exc)
            return None
        content_type = response.headers.get("Content-Type", "").lower()
        if content_type and "image" not in content_type:
            return None
        suffix = Path(parsed.path).suffix.lstrip(".").lower() or "jpg"
        if suffix not in {"jpg", "jpeg", "png", "webp", "gif"}:
            suffix = "jpg"
        return (suffix, response.content)
