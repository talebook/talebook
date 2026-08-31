#!/usr/bin/python3
# -*- coding: UTF-8 -*-
import json
import logging
import re

import requests

from webserver.plugins.meta.common import str2date


from webserver.plugins.meta.base import MetaSourceMixin, _setting, meta_manifest

KEY = "ai"


class AIBookApi:
    def __init__(self, api_url, api_key, model, use_thinking, copy_image=True, manual_select=False):
        self.api_url = api_url
        self.api_key = api_key
        self.model = model
        self.use_thinking = use_thinking
        self.copy_image = copy_image
        self.manual_select = manual_select

    def get_book(self, title, author=None, evidence=None):
        logging.debug(f"AIBookApi.get_book called with title: {repr(title)}, author: {repr(author)}")

        if evidence == []:
            logging.info("Skip AI metadata lookup because no online evidence is available for: %s", title)
            return None

        # 构建提示词
        prompt = self._build_prompt(title, author, evidence=evidence)

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

    def _build_prompt(self, title, author=None, evidence=None):
        # 剥除书名号等标点，避免干扰模型识别
        title = re.sub(r"[《》「」『』【】〔〕<>]", "", title).strip()
        author_clean = author.strip() if author else ""
        author_hint = f" by {author_clean}" if author_clean.lower() not in self._UNKNOWN_AUTHORS else ""

        evidence_text = ""
        if evidence is not None:
            safe_evidence = []
            allowed_fields = {"source", "title", "author", "authors", "intro", "summary", "tags", "website", "cover_url"}
            for item in evidence[:8]:
                if not isinstance(item, dict):
                    continue
                safe_item = {key: item[key] for key in allowed_fields if item.get(key) not in (None, "", [])}
                safe_evidence.append(safe_item)
            evidence_text = json.dumps(safe_evidence, ensure_ascii=False)[:12000]

        prompt = """You are a book metadata assistant. Return book information as JSON using only the supplied evidence.

Instructions:
- Output ONLY a valid JSON object, no other text.
- Never add facts that are absent from the evidence.
- If the evidence is empty, conflicting, or does not identify the requested book, set status to "unknown".

JSON schema (example):
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

Book to look up: {title}{author_hint}
Evidence JSON: {evidence}
""".format(title=title, author_hint=author_hint, evidence=evidence_text or "not supplied")
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
            message = data.get("choices", [{}])[0].get("message", {})
            content = message.get("content", "")
            reasoning = message.get("reasoning_content", "")
            if reasoning:
                logging.debug("AI reasoning:\n%s", reasoning)
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
        # AI 元数据只补全文本字段；模型输出不能成为服务端出站请求目标。
        return None


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    # 测试用例
    api = AIBookApi(
        api_url="https://api.openai.com/v1/chat/completions", api_key="test-api-key", model="gpt-3.5-turbo", use_thinking=False
    )
    print(api.get_book("百年孤独"))


class AIProvider(MetaSourceMixin, AIBookApi):
    """AI 元数据源：凭据与模型参数按 D-27 双读，connection 优先、回落 CONF。"""

    legacy_sources = ("ai",)

    manifest = meta_manifest(
        "talebook.meta.ai",
        "AI 元数据",
        "调用兼容 OpenAI 接口的模型补全书名、作者、出版与简介。",
        "mdi-robot",
        "https://platform.openai.com/",
        config_schema={
            "type": "object",
            "properties": {
                "api_url": {"type": "string"},
                "model": {"type": "string"},
                "use_thinking": {"type": "boolean"},
            },
        },
        auth_schema={
            "type": "object",
            "required": ["api_key"],
            "properties": {"api_key": {"type": "string", "writeOnly": True}},
        },
        configuration_mode="form",
        deprecated=True,
    )

    def __init__(self):
        super().__init__("", "", "", False, copy_image=False)

    def _configured(self, context):
        config = dict((context or {}).get("config") or {})
        secrets = dict((context or {}).get("secrets") or {})
        api = AIBookApi(
            _setting(config, "api_url", "ai_api_url"),
            _setting({**config, **secrets}, "api_key", "ai_api_key"),
            _setting(config, "model", "ai_model"),
            bool(_setting(config, "use_thinking", "ai_use_thinking") or False),
            copy_image=False,
        )
        return api

    def _search(self, query, context):
        api = self._configured(context)
        if not api.api_key:
            return []
        mi = api.get_book(query.title, query.authors[0] if query.authors else None)
        return [mi] if mi else []

    def _fetch(self, external_id, context):
        api = self._configured(context)
        return api.get_book(external_id) if api.api_key else None

    def get_cover(self, cover_url, context=None):
        return self._configured(context).get_cover(cover_url)


PROVIDER = AIProvider()
