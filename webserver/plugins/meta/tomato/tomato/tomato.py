#!/usr/bin/python
# -*- coding: UTF-8 -*-

import re
import logging
import json
import random
import time
import requests
from bs4 import BeautifulSoup

from .tomatoexception import PageError, VerifyError


# 官方 API 端点
SEARCH_API = "https://api-lf.fanqiesdk.com/api/novel/channel/homepage/search/search/v1/"
BOOK_DETAIL_API = "https://fanqienovel.com/api/reader/directory/detail"

# 扩展的请求头配置，增加更多浏览器变体
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
]

# 用于解析的正则表达式
RE_NEXT_DATA = re.compile(r'(?s)<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>')
RE_INITIAL_STATE = re.compile(r'(?s)window\.__INITIAL_STATE__\s*=\s*(\{.*?\})\s*;')
RE_LD_JSON = re.compile(r'<script[^>]*type="application/ld\+json"[^>]*>\s*([\s\S]*?)\s*</script>')
RE_INFO_LABEL_GREY = re.compile(r'<span[^>]*class="info-label-grey"[^>]*>([^<]+)</span>')
RE_INFO_LABEL_YELLOW = re.compile(r'<span[^>]*class="info-label-yellow"[^>]*>([^<]+)</span>')


def get_random_headers():
    """生成随机请求头"""
    ua = random.choice(USER_AGENTS)
    headers = {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "max-age=0",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Referer": "https://fanqienovel.com/",
        "Origin": "https://fanqienovel.com",
    }
    return headers


def extract_next_data_json(html):
    """从 HTML 中提取 __NEXT_DATA__ JSON"""
    match = RE_NEXT_DATA.search(html)
    if match:
        return match.group(1).strip()
    return None


def extract_initial_state_json(html):
    """从 HTML 中提取 __INITIAL_STATE__ JSON"""
    match = RE_INITIAL_STATE.search(html)
    if match:
        return match.group(1).strip()
    return None


def find_string_by_key(value, keys):
    """在 JSON 中查找指定键的字符串值"""
    if isinstance(value, dict):
        for key in keys:
            if key in value and isinstance(value[key], str):
                return value[key]
        for v in value.values():
            result = find_string_by_key(v, keys)
            if result:
                return result
    elif isinstance(value, list):
        for item in value:
            result = find_string_by_key(item, keys)
            if result:
                return result
    return None


def find_string_array_by_key(value, keys):
    """在 JSON 中查找指定键的字符串数组"""
    if isinstance(value, dict):
        for key in keys:
            if key in value and isinstance(value[key], list):
                arr = value[key]
                if arr and all(isinstance(item, str) for item in arr):
                    return arr
        for v in value.values():
            result = find_string_array_by_key(v, keys)
            if result:
                return result
    elif isinstance(value, list):
        for item in value:
            result = find_string_array_by_key(item, keys)
            if result:
                return result
    return None


def find_int_by_key(value, keys):
    """在 JSON 中查找指定键的整数值"""
    if isinstance(value, dict):
        for key in keys:
            if key in value:
                if isinstance(value[key], int):
                    return value[key]
                if isinstance(value[key], str) and value[key].isdigit():
                    return int(value[key])
        for v in value.values():
            result = find_int_by_key(v, keys)
            if result is not None:
                return result
    elif isinstance(value, list):
        for item in value:
            result = find_int_by_key(item, keys)
            if result is not None:
                return result
    return None


def build_cover_url_from_thumb_uri(uri):
    """从 thumb_uri 构建封面 URL"""
    if not uri:
        return None
    uri = uri.strip()
    if uri.startswith("http://") or uri.startswith("https://"):
        return uri
    return f"https://p3-reading-sign.fqnovelpic.com/{uri}"


def parse_html_img_cover_url(html):
    """从 HTML 中提取封面 URL"""
    for match in RE_LD_JSON.finditer(html):
        json_text = match.group(1)
        try:
            value = json.loads(json_text)
            # 尝试从 image 和 images 字段中获取
            for key in ["image", "images"]:
                if key in value:
                    if isinstance(value[key], list) and len(value[key]) > 0:
                        url = value[key][0]
                        if url and (url.startswith("http://") or url.startswith("https://")):
                            return url
                    elif isinstance(value[key], str):
                        url = value[key]
                        if url and (url.startswith("http://") or url.startswith("https://")):
                            return url
        except Exception:
            continue
    return None


def parse_tags_from_info_label(html):
    """从 info-label-grey 中提取标签"""
    tags = []
    for match in RE_INFO_LABEL_GREY.finditer(html):
        tag = match.group(1).strip()
        if tag:
            tags.append(tag)
    return tags if tags else None


def parse_finished_from_info_label(html):
    """从 info-label-yellow 中提取完结状态"""
    match = RE_INFO_LABEL_YELLOW.search(html)
    if match:
        label = match.group(1).strip()
        if "未完结" in label or "连载" in label:
            return False
        if "完结" in label:
            return True
    return None


def regex_json_string_field(html, field):
    """从 HTML 中通过正则提取 JSON 字符串字段"""
    pattern = rf'"{re.escape(field)}"\s*:\s*"(.*?)"'
    match = re.search(pattern, html)
    if match:
        raw = match.group(1)
        # 尝试按 JSON 字符串规则反转义
        quoted = f'"{raw}"'
        try:
            return json.loads(quoted)
        except Exception:
            return raw
    return None


def regex_json_int_field(html, field):
    """从 HTML 中通过正则提取 JSON 整数字段"""
    pattern = rf'"{re.escape(field)}"\s*:\s*(\d+)'
    match = re.search(pattern, html)
    if match:
        try:
            return int(match.group(1))
        except Exception:
            pass
    return None


class Page(object):
    def __init__(self, book_id, cookie=None):
        """
        初始化番茄小说页面
        :param book_id: 番茄小说的书籍 ID（数字字符串）
        :param cookie: 可选的 Cookie 字符串
        """
        self.book_id = book_id
        self.cookie = cookie
        self.book_info = None
        self.parsed_data = None

        # 直接访问网页获取信息（更可靠）
        self._init_web_parser()

        # 如果没有成功获取页面，抛出错误
        if not self.soup or not self.html:
            raise PageError(book_id)

        # 检查是否需要验证
        if "验证" in self.html or "vf" in self.html:
            raise VerifyError(book_id)

        # 尝试从 HTML 中解析数据
        self._parse_html_data()

    def _fetch_book_info(self):
        """从官方 API 获取书籍信息"""
        try:
            # 使用 search_api 获取书籍信息
            headers = {
                "User-Agent": get_random_headers()["User-Agent"],
            }

            # 添加 Cookie 如果有
            if self.cookie:
                headers["Cookie"] = f"install_id={self.cookie}"

            params = {
                "offset": "0",
                "aid": "1967",
                "q": self.book_id,  # 使用 book_id 搜索
            }

            response = requests.get(
                SEARCH_API, params=params, headers=headers, timeout=15
            )

            if response.status_code == 200:
                data = response.json()
                ret_data = data.get("data", {}).get("ret_data", [])
                if ret_data:
                    # 找到匹配的书籍
                    for book in ret_data:
                        if str(book.get("book_id")) == str(self.book_id):
                            return book
            return None
        except Exception as e:
            logging.error(f"获取书籍信息失败：{e}")
            return None

    def _init_web_parser(self):
        """初始化网页解析器作为备用"""
        url = f"https://fanqienovel.com/page/{self.book_id}"

        # 随机延迟
        time.sleep(random.uniform(0.5, 1.5))

        headers = get_random_headers()
        if self.cookie:
            headers["Cookie"] = self.cookie

        try:
            response = requests.get(url, timeout=15, headers=headers)
            self.html = response.text

            try:
                self.soup = BeautifulSoup(self.html, "lxml")
            except Exception:
                self.soup = BeautifulSoup(self.html, "html.parser")
        except Exception:
            self.html = ""
            self.soup = None

    def _parse_html_data(self):
        """从 HTML 中解析书籍数据"""
        # 1) 优先解析 __NEXT_DATA__
        json_text = extract_next_data_json(self.html)
        if json_text:
            try:
                self.parsed_data = json.loads(json_text)
                return
            except Exception:
                pass

        # 2) 其次解析 __INITIAL_STATE__
        json_text = extract_initial_state_json(self.html)
        if json_text:
            try:
                self.parsed_data = json.loads(json_text)
                return
            except Exception:
                pass

        # 3) 尝试从搜索 API 获取
        self.book_info = self._fetch_book_info()

    def get_info(self):
        """获取书籍基本信息"""
        info = {
            "title": "未知书名",
            "author": "佚名",
            "summary": "",
            "book_id": self.book_id,
            "url": f"https://fanqienovel.com/page/{self.book_id}",
            "tags": [],
            "status": "连载中",
            "chapter_count": 0,
        }

        # 1. 优先使用从 HTML 解析的数据
        if self.parsed_data:
            # 提取书名
            title = find_string_by_key(self.parsed_data, ["bookName", "book_name", "title", "name"])
            if title:
                info["title"] = title

            # 提取作者
            author = find_string_by_key(self.parsed_data, ["author", "authorName", "author_name"])
            if author:
                info["author"] = author

            # 提取简介
            summary = find_string_by_key(self.parsed_data, ["abstract", "description", "intro", "introduce"])
            if summary:
                info["summary"] = summary

            # 提取标签
            tags = find_string_array_by_key(self.parsed_data, ["tags", "tagNames", "tag_names"])
            if not tags:
                tags = parse_tags_from_info_label(self.html)
            if tags:
                info["tags"] = tags
                if tags:
                    info["status"] = tags[0]

            # 提取章节数
            chapter_count = find_int_by_key(self.parsed_data, ["chapterCount", "chapter_count", "chapterTotal"])
            if chapter_count is not None:
                info["chapter_count"] = chapter_count

            # 提取完结状态
            finished = parse_finished_from_info_label(self.html)
            if finished is None:
                # 尝试从数据中查找
                status_val = find_int_by_key(
                self.parsed_data,
                ["status", "serial_status", "finish_status", "finishStatus", "is_finish", "is_finished"]
            )
                if status_val is not None:
                    # 映射状态值
                    finished = status_val in (1, 2)

            if finished:
                info["status"] = "已完结"
            elif not finished and info["status"] == "连载中":
                info["status"] = "连载中"

        # 2. 其次使用 API 数据
        if self.book_info:
            if info["title"] == "未知书名":
                info["title"] = self.book_info.get("title", "未知书名")
            if info["author"] == "佚名":
                info["author"] = self.book_info.get("author", "佚名")
            if not info["summary"]:
                info["summary"] = self.book_info.get("abstract", "")
            if not info["tags"]:
                tags = self.book_info.get("tags", [])
                if tags:
                    info["tags"] = tags
                    info["status"] = tags[0] if tags else "连载中"

        # 3. 备用：网页解析
        if info["title"] == "未知书名" or info["author"] == "佚名" or not info["summary"]:
            self._parse_html_backup(info)

        return info

    def _parse_html_backup(self, info):
        """从 HTML 中解析备份数据"""
        # 提取书名（从 h1 标签）
        if info["title"] == "未知书名":
            h1 = self.soup.find("h1")
            if h1:
                info["title"] = h1.get_text(strip=True)

        # 提取作者（从 author-name 类）
        if info["author"] == "佚名":
            author_div = self.soup.find("div", class_="author-name")
            if author_div:
                author_span = author_div.find("span", class_="author-name-text")
                if author_span:
                    info["author"] = author_span.get_text(strip=True)

        # 提取简介（从 page-abstract-content 类）
        if not info["summary"]:
            desc_div = self.soup.find("div", class_="page-abstract-content")
            if desc_div:
                desc_p = desc_div.find("p")
                if desc_p:
                    info["summary"] = desc_p.get_text(strip=True)

        # 提取标签（从 info-label 类）
        if not info["tags"]:
            tags = []
            for label_div in self.soup.find_all("div", class_="info-label"):
                for span in label_div.find_all("span"):
                    tags.append(span.get_text(strip=True))
            info["tags"] = tags
            if tags:
                info["status"] = tags[0] if tags else "连载中"

        # 提取章节数（从目录头）
        if info["chapter_count"] == 0:
            chap_header = self.soup.find("div", class_="page-directory-header")
            if chap_header:
                h3 = chap_header.find("h3")
                if h3:
                    match = re.search(r"(\d+)", h3.get_text(strip=True))
                    if match:
                        info["chapter_count"] = int(match.group(1))

        # 正则兜底
        if info["title"] == "未知书名":
            title = regex_json_string_field(self.html, "bookName") or regex_json_string_field(self.html, "book_name")
            if title:
                info["title"] = title

        if info["author"] == "佚名":
            author = regex_json_string_field(self.html, "author") or regex_json_string_field(self.html, "authorName")
            if author:
                info["author"] = author

        if not info["summary"]:
            summary = regex_json_string_field(self.html, "abstract") or regex_json_string_field(self.html, "description")
            if summary:
                info["summary"] = summary

        if info["chapter_count"] == 0:
            chapter_count = regex_json_int_field(self.html, "chapterCount") or regex_json_int_field(self.html, "chapter_count")
            if chapter_count is not None:
                info["chapter_count"] = chapter_count

    def get_image(self):
        """获取封面图片 URL"""
        # 1. 优先从 HTML 解析的数据中获取封面
        if self.parsed_data:
            # 尝试多种封面字段
            cover_url = find_string_by_key(
                self.parsed_data,
                [
                    "thumb_url",
                    "expand_thumb_url",
                    "cover_url",
                    "cover",
                    "horiz_thumb_url",
                    "audio_thumb_url_hd",
                    "detail_page_thumb_url",
                    "detail_cover_url",
                    "detail_thumb_url",
                ]
            )
            if not cover_url:
                # 尝试从 thumb_uri 构建
                thumb_uri = find_string_by_key(self.parsed_data, ["thumb_uri"])
                if thumb_uri:
                    cover_url = build_cover_url_from_thumb_uri(thumb_uri)
            if cover_url:
                return cover_url

        # 2. 其次从 API 数据中获取封面
        if self.book_info:
            cover_url = (
                self.book_info.get("cover")
                or self.book_info.get("cover_url")
                or self.book_info.get("image_url")
            )
            if cover_url:
                return cover_url

        # 3. 从 HTML 中提取封面 URL
        cover_url = parse_html_img_cover_url(self.html)
        if cover_url:
            return cover_url

        # 4. 从 script[type="application/ld+json"] 中提取图片 URL
        if self.soup:
            script = next(
                (
                    s
                    for s in self.soup.find_all("script", type="application/ld+json")
                    if s.string and "images" in s.string
                ),
                None,
            )
            if script:
                try:
                    data = json.loads(script.string)
                    if isinstance(data.get("images"), list) and len(data["images"]) > 0:
                        return data["images"][0]
                except Exception:
                    pass

        # 5. 正则兜底
        cover_url = (
            regex_json_string_field(self.html, "thumb_url") or
            regex_json_string_field(self.html, "expand_thumb_url") or
            regex_json_string_field(self.html, "cover_url") or
            regex_json_string_field(self.html, "cover")
        )
        if not cover_url:
            thumb_uri = regex_json_string_field(self.html, "thumb_uri")
            if thumb_uri:
                cover_url = build_cover_url_from_thumb_uri(thumb_uri)
        if cover_url:
            return cover_url

        return ""

    def get_summary(self):
        """获取简介"""
        return self.get_info().get("summary", "")

    def get_tags(self):
        """获取标签"""
        return self.get_info().get("tags", [])

    def get_id(self):
        """获取书籍 ID"""
        return self.get_info().get("book_id", self.book_id)


class Search(object):
    def __init__(self, keyword, max_results=10, cookie=None):
        """
        搜索番茄小说（使用官方 API）
        :param keyword: 搜索关键词（书名或作者）
        :param max_results: 最大结果数
        :param cookie: 可选的 Cookie 字符串（install_id）
        """
        self.keyword = keyword
        self.max_results = max_results
        self.cookie = cookie

        # 使用官方 API
        headers = {
            "User-Agent": get_random_headers()["User-Agent"],
        }

        if cookie:
            headers["Cookie"] = f"install_id={cookie}"

        params = {
            "offset": "0",
            "aid": "1967",
            "q": keyword,
        }

        try:
            response = requests.get(
                SEARCH_API, params=params, headers=headers, timeout=15
            )

            if response.status_code == 200:
                data = response.json()
                self.data = data.get("data", {}).get("ret_data", [])
            else:
                logging.error(f"搜索 API 返回状态码：{response.status_code}")
                self.data = []
        except Exception as err:
            logging.error(f"番茄小说搜索异常：{err}")
            self.data = []

    def get_results(self):
        """获取搜索结果"""
        results = []

        for book in self.data[: self.max_results]:
            result = {}
            result["title"] = book.get("title", "未知书名")
            result["book_id"] = str(book.get("book_id", ""))
            result["author"] = book.get("author", "佚名")
            result["description"] = book.get("abstract", "")
            result["url"] = f"https://fanqienovel.com/page/{result['book_id']}"
            results.append(result)

        return results
