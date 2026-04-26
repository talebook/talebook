#!/usr/bin/env python3
# from webserver.version import VERSION
import logging
import requests
import re
from webserver.version import VERSION


class BookBarnTags:
    # Used to get the tags of books
    HOST_BASE = "http://43.138.200.142:8088/"
    TAGS_API = f"{HOST_BASE}bookbarn/tags"

    def __init__(self, token=None):
        self.token = token

    def normalize_title(self, title: str) -> str:
        """Trim title before brackets and normalize punctuation."""

        if not title:
            return ""

        clean = title.replace("\r", "").replace("】", "").strip()
        cut_index = len(clean)
        for marker in ("(", "（", "【"):
            idx = clean.find(marker)
            if idx != -1 and idx < cut_index:
                cut_index = idx

        clean = clean[:cut_index]
        clean = clean.replace(":", ",").replace("，", ",").replace('"', "")
        return clean.strip()

    def normalize_author(self, author: str) -> str:
        """Remove suffix like '著' and normalize punctuation for authors."""

        if not author:
            return ""

        clean = author.replace("\r", "").replace("，", ",").replace('"', "").replace('"', "").replace('"', "")
        clean = clean.replace("•", "·")
        for pattern in (r"\[.*?\]", r"【.*?】", r"\(.*?\)", r"（.*?）"):
            clean = re.sub(pattern, "", clean)

        cut_positions = [pos for marker in ("著", "编") if (pos := clean.find(marker)) != -1]
        if cut_positions:
            clean = clean[: min(cut_positions)]

        parts = [part.strip() for part in clean.strip().split(",") if part.strip()]
        clean_author = parts[0] if parts else ""
        if clean_author and clean_author in ("佚名", "未知", "无名氏", "Unknown"):
            clean_author = ""
        return clean_author

    def get_tags(self, isbn, title=None, author=None):
        if not isbn and not title and not author:
            return None
        title = self.normalize_title(title)
        author = self.normalize_author(author)
        params = {
            "version": VERSION,
            "token": self.token,
            "isbn": isbn if isbn else "",
            "title": title,
            "author": author
        }
        return self.send_request(self.TAGS_API, params)

    def send_request(self, url, params=None):
        try:
            r = requests.get(url, params=params, timeout=10)
            r.raise_for_status()
            data = r.json()
        except Exception as e:
            logging.error(f"Error fetching data from {url}: {e}")
            return None

        data = r.json().get("data")
        if data is not None:
            return data
        return None


if __name__ == "__main__":
    api = BookBarnTags(token="testtoken")
    tags = api.get_tags(isbn="9787544270878", title="三体", author="刘慈欣")
    print(tags)
