#!/usr/bin/python3
# -*- coding: UTF-8 -*-
import json
import logging
import re

import requests

from webserver.plugins.meta.douban import str2date


KEY = "ai"


class AIBookApi:
    def __init__(self, api_url, api_key, model, use_thinking, copy_image=True, manual_select=False):
        self.api_url = api_url
        self.api_key = api_key
        self.model = model
        self.use_thinking = use_thinking
        self.copy_image = copy_image
        self.manual_select = manual_select

    def get_book(self, title, author=None):
        logging.debug(f"AIBookApi.get_book called with title: {repr(title)}, author: {repr(author)}")

        # 构建提示词
        prompt = self._build_prompt(title, author)

        # 调用AI API
        response = self._call_ai_api(prompt)
        if not response:
            return None

        # 解析AI响应
        book_data = self._parse_ai_response(response)
        if not book_data:
            return None

        if book_data.get("status") == "unknown":
            logging.info(f"AI returned unknown book for: {title}")
            return None

        # 转换为元数据
        return self._metadata(book_data)

    # 无效作者占位符，传给 AI 前过滤掉
    _UNKNOWN_AUTHORS = {"unknown", "佚名", "unknown author", ""}

    def _build_prompt(self, title, author=None):
        # 剥除书名号等标点，避免干扰模型识别
        title = re.sub(r"[《》「」『』【】〔〕<>]", "", title).strip()
        author_clean = author.strip() if author else ""
        author_hint = f" by {author_clean}" if author_clean.lower() not in self._UNKNOWN_AUTHORS else ""

        prompt = """You are a book metadata assistant. Look up the book and return its information as JSON.

Book to look up: "{title}"{author_hint}

Instructions:
- Return a JSON object wrapped in <json_response> tags.
- If you know the book, fill in all fields with accurate data.
- If the book is completely unknown to you, set status to "unknown".
- Output ONLY the <json_response> block, no other text.

Schema:
<json_response>
{{
  "status": "ok",
  "title": "...",
  "authors": ["..."],
  "publisher": "...",
  "pubdate": "YYYY-MM-DD",
  "isbn": "ISBN-13",
  "summary": "...",
  "tags": ["..."]
}}
</json_response>
""".format(title=title, author_hint=author_hint)
        return prompt

    def _call_ai_api(self, prompt):
        logging.debug("AI prompt:\n%s", prompt)
        try:
            headers = {"Content-Type": "application/json", "Authorization": f"Bearer {self.api_key}"}

            payload = {
                "model": self.model,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that provides book information in JSON format.",
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.3,
            }

            response = requests.post(self.api_url, headers=headers, json=payload, timeout=25)

            if response.status_code != 200:
                logging.error(f"AI API error: status_code={response.status_code}, content={response.text}")
                return None

            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            logging.debug("AI response:\n%s", content)
            return content

        except Exception as err:
            logging.error(f"AI API exception: {err}")
            return None

    def _parse_ai_response(self, response):
        json_str = None
        # 优先匹配 <json_response> 标签
        m = re.search(r"<json_response>(.*?)</json_response>", response, re.DOTALL)
        if m:
            json_str = m.group(1).strip()
        else:
            # 兼容 ```json ... ``` markdown 代码块
            m = re.search(r"```json\s*(.*?)\s*```", response, re.DOTALL)
            if m:
                json_str = m.group(1).strip()
            else:
                # 尝试直接解析整个响应
                json_str = response.strip()

        try:
            data = json.loads(json_str)
            data["cover_url"] = ""
            return data
        except json.JSONDecodeError as err:
            logging.error("AI response JSON decode error: %s\nraw response: %s", err, response)
            return None

    def _metadata(self, book):
        from calibre.ebooks.metadata.book.base import Metadata
        from calibre.utils.date import utcnow

        title = book.get("title", "")
        if not title:
            logging.info("No title found in AI response")
            return None

        mi = Metadata(title)
        mi.authors = book.get("authors", ["佚名"])
        mi.author_sort = mi.authors[0] if mi.authors else ""
        mi.publisher = book.get("publisher", "")
        mi.isbn = book.get("isbn", "")
        mi.tags = book.get("tags", [])
        mi.cover_url = book.get("cover_url", "")

        # 处理出版日期
        pd = str2date(book.get("pubdate"))
        if pd is None:
            pd = utcnow()
        mi.pubdate = pd
        mi.timestamp = mi.pubdate

        # 处理评分
        rating = book.get("rating", 0)
        if rating:
            mi.rating = int(float(rating))

        # 处理简介
        mi.comments = book.get("summary", "")

        # 设置来源信息
        mi.source = "AI"
        mi.provider_key = KEY
        mi.provider_value = title

        # 获取封面
        try:
            mi.cover_data = self.get_cover(mi.cover_url) if self.copy_image else None
        except Exception as e:
            logging.error(f"Failed to get cover data: {e}")
            mi.cover_data = None

        return mi

    def get_cover(self, cover_url):
        if not cover_url:
            return None
        try:
            img = requests.get(cover_url, timeout=10).content
            img_fmt = cover_url.split(".")[-1].lower()
            if img_fmt not in ["jpg", "jpeg", "png"]:
                img_fmt = "jpg"
            return (img_fmt, img)
        except Exception as e:
            logging.error(f"Failed to get cover: {e}")
            return None


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    # 测试用例
    api = AIBookApi(
        api_url="https://api.openai.com/v1/chat/completions", api_key="test-api-key", model="gpt-3.5-turbo", use_thinking=False
    )
    print(api.get_book("百年孤独"))
