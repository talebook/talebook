#!/usr/bin/python
# -*- coding: UTF-8 -*-

import re
import logging
import json
import random
import time
import requests
from bs4 import BeautifulSoup
from collections import OrderedDict

from webserver.constants import CHROME_HEADERS
from .tomatoexception import PageError, DisambiguationError, VerifyError


# 官方 API 端点
SEARCH_API = "https://api-lf.fanqiesdk.com/api/novel/channel/homepage/search/search/v1/"
BOOK_DETAIL_API = "https://fanqienovel.com/api/reader/directory/detail"

# 扩展的请求头配置，增加更多浏览器变体
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
]

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


class Page(object):
    def __init__(self, book_id, cookie=None):
        """
        初始化番茄小说页面
        :param book_id: 番茄小说的书籍 ID（数字字符串）
        :param cookie: 可选的 Cookie 字符串
        """
        self.book_id = book_id
        self.cookie = cookie
        
        # 使用官方 API 获取书籍信息
        self.book_info = self._fetch_book_info()
        
        if not self.book_info:
            raise PageError(book_id)
        
        # 构建网页解析器用于备用
        self._init_web_parser()
    
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
                SEARCH_API, 
                params=params, 
                headers=headers, 
                timeout=15,
                verify=False
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

    def get_info(self):
        """获取书籍基本信息"""
        info = {}
        
        # 优先使用 API 数据
        if self.book_info:
            info["title"] = self.book_info.get("title", "未知书名")
            info["author"] = self.book_info.get("author", "佚名")
            info["summary"] = self.book_info.get("abstract", "")
            info["book_id"] = str(self.book_info.get("book_id", self.book_id))
            info["url"] = f"https://fanqienovel.com/page/{info['book_id']}"
            
            # 标签和状态
            tags = self.book_info.get("tags", [])
            info["tags"] = tags if tags else []
            info["status"] = tags[0] if tags else "连载中"
            info["chapter_count"] = self.book_info.get("word_count", 0)
            
            return info
        
        # 备用：网页解析
        info = {}
        
        # 提取书名（从 h1 标签）
        h1 = self.soup.find("h1")
        if h1:
            info["title"] = h1.get_text(strip=True)
        else:
            info["title"] = "未知书名"
        
        # 提取作者（从 author-name 类）
        author_div = self.soup.find("div", class_="author-name")
        if author_div:
            author_span = author_div.find("span", class_="author-name-text")
            if author_span:
                info["author"] = author_span.get_text(strip=True)
            else:
                info["author"] = "佚名"
        else:
            info["author"] = "佚名"
        
        # 提取简介（从 page-abstract-content 类）
        desc_div = self.soup.find("div", class_="page-abstract-content")
        if desc_div:
            desc_p = desc_div.find("p")
            if desc_p:
                info["summary"] = desc_p.get_text(strip=True)
            else:
                info["summary"] = ""
        else:
            info["summary"] = ""
        
        # 提取标签（从 info-label 类）
        tags = []
        for label_div in self.soup.find_all("div", class_="info-label"):
            for span in label_div.find_all("span"):
                tags.append(span.get_text(strip=True))
        info["tags"] = tags
        
        # 提取状态（从标签中获取，如"连载中"或"已完结"）
        if tags:
            info["status"] = tags[0] if tags else "连载中"
        else:
            info["status"] = "连载中"
        
        # 提取章节数（从目录头）
        chap_header = self.soup.find("div", class_="page-directory-header")
        if chap_header:
            h3 = chap_header.find("h3")
            if h3:
                match = re.search(r"(\d+)", h3.get_text(strip=True))
                if match:
                    info["chapter_count"] = int(match.group(1))
                else:
                    info["chapter_count"] = 0
            else:
                info["chapter_count"] = 0
        else:
            info["chapter_count"] = 0
        
        # URL 和 ID
        info["url"] = self.http.url if hasattr(self, 'http') else f"https://fanqienovel.com/page/{self.book_id}"
        info["book_id"] = self.book_id
        
        return info

    def get_image(self):
        """获取封面图片 URL"""
        # 从 script[type="application/ld+json"] 中提取图片 URL
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
        
        return ""

    def get_summary(self):
        """获取简介"""
        return self.get_info().get("summary", "")

    def get_tags(self):
        """获取标签"""
        return self.get_info().get("tags", [])

    def get_id(self):
        """获取书籍 ID"""
        return self.get_info().get("book_id", "0000")


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
                SEARCH_API, 
                params=params, 
                headers=headers, 
                timeout=15,
                verify=False
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
        
        for book in self.data[:self.max_results]:
            result = {}
            result["title"] = book.get("title", "未知书名")
            result["book_id"] = str(book.get("book_id", ""))
            result["author"] = book.get("author", "佚名")
            result["description"] = book.get("abstract", "")
            result["url"] = f"https://fanqienovel.com/page/{result['book_id']}"
            results.append(result)
        
        return results
