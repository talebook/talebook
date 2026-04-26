#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import hashlib
import logging
import os
import re
import shutil
import tempfile
import threading
import traceback
import urllib.parse
import uuid
from contextlib import contextmanager
from datetime import datetime

import requests
from lxml import etree

from webserver import loader
from webserver.models import ScanFile
from webserver.services.async_service import AsyncService


CONF = loader.get_settings()


class OPDSImportService(AsyncService):
    _instance = None
    _instance_lock = threading.Lock()

    @classmethod
    def get_instance(cls):
        """获取单例实例"""
        with cls._instance_lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def __init__(self):
        super().__init__()
        self.count_total = 0
        self.count_done = 0
        self.count_skip = 0
        self.count_fail = 0
        self.scan_dir = CONF.get("scan_upload_path", "/data/books/imports/")
        self._lock = threading.Lock()
        self._local = threading.local()

    @contextmanager
    def get_session(self):
        """上下文管理器确保会话正确创建和关闭"""
        async_service = AsyncService()
        session = getattr(self._local, "session", None)
        if session is None:
            session = async_service.scoped_session()
            self._local.session = session

        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
            async_service.scoped_session.remove()
            self._local.session = None

    def browse_opds_catalog(self, host, port=None, path=""):
        """浏览 OPDS 目录结构"""
        try:
            if not host.startswith(("http://", "https://")):
                raise ValueError("Host 必须包含协议前缀 (http://或 https://)")

            base_url = host
            if port:
                try:
                    port_num = int(port)
                    if port_num < 1 or port_num > 65535:
                        raise ValueError("端口号必须在 1-65535 之间")
                except ValueError:
                    raise ValueError("端口号必须是有效的数字")

                if base_url.endswith("/"):
                    base_url = base_url[:-1]
                base_url += f":{port}"
            if path:
                if not path.startswith("/"):
                    base_url += "/"
                base_url += path

            logging.info(f"浏览 OPDS 目录：{base_url}")

            catalog_data = self.fetch_opds_catalog(base_url)
            if not catalog_data:
                return {"error": "无法获取 OPDS 目录内容"}

            result = self.parse_opds_navigation(catalog_data, base_url)
            return result

        except Exception as e:
            logging.error(f"浏览 OPDS 目录失败：{e}")
            logging.error(traceback.format_exc())
            return {"error": str(e)}

    def do_import(self, opds_url, user_id=None, delete_after=False, books=None):
        """执行 OPDS 导入"""
        self.reset_counters()
        try:
            if books:
                return self.import_selected_books(opds_url, user_id, delete_after, books)
            else:
                return self.import_from_opds(opds_url, user_id, delete_after)
        except Exception as e:
            logging.error(traceback.format_exc())
            logging.error(f"OPDS 导入失败：{e}")
            return {"err": "error", "msg": str(e)}

    def reset_counters(self):
        """重置计数器"""
        with self._lock:
            self.count_total = 0
            self.count_done = 0
            self.count_skip = 0
            self.count_fail = 0

    def import_from_opds(self, opds_url, user_id=None, delete_after=False):
        """从 OPDS 源导入书籍"""
        logging.info(f"开始从 OPDS 导入：{opds_url}")

        try:
            catalog_data = self.fetch_opds_catalog(opds_url)
            if not catalog_data:
                logging.error("无法获取 OPDS 目录")
                return {"err": "error", "msg": "无法获取 OPDS 目录"}

            books = self.parse_opds_catalog(catalog_data)
            with self._lock:
                self.count_total = len(books)
            logging.info(f"找到 {self.count_total} 本书籍")

            imported_files = []
            for book in books:
                try:
                    result = self.import_book_to_scan(book, user_id)
                    if result:
                        imported_files.append(result)
                        with self._lock:
                            self.count_done += 1
                    else:
                        with self._lock:
                            self.count_skip += 1
                except Exception as e:
                    logging.error(f"导入书籍失败：{book.get('title', '未知')}, 错误：{e}")
                    with self._lock:
                        self.count_fail += 1

            with self._lock:
                total = self.count_total
                done = self.count_done
                skip = self.count_skip
                fail = self.count_fail

            logging.info(f"OPDS 导入完成：总计 {total}, 成功 {done}, 跳过 {skip}, 失败 {fail}")
            return {
                "err": "ok",
                "msg": f"成功添加 {done} 本书籍到待处理列表",
                "imported_files": imported_files,
            }
        except Exception as e:
            logging.error(traceback.format_exc())
            logging.error(f"OPDS 导入过程中出错：{e}")
            return {"err": "error", "msg": str(e)}

    def fetch_opds_catalog(self, url):
        """获取 OPDS 目录内容"""
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/atom+xml,application/xml,text/xml,application/opds+json",
            }

            if url and not url.startswith(("http://", "https://")):
                logging.warning(f"URL 是相对路径：{url}")

            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            return response.content
        except Exception as e:
            logging.error(f"获取 OPDS 目录失败：{e}")
            return None

    def _parse_opds_xml(self, catalog_data):
        """解析 OPDS XML 数据，返回 root 和命名空间映射

        Args:
            catalog_data: XML 格式的字符串数据

        Returns:
            tuple: (root, ns) XML 根元素和命名空间映射
        """
        parser = etree.XMLParser(recover=True)
        root = etree.fromstring(catalog_data, parser)
        ns = {
            "atom": "http://www.w3.org/2005/Atom",
            "dc": "http://purl.org/dc/terms/",
            "opds": "http://opds-spec.org/2010/catalog",
        }
        return root, ns

    def _extract_entry_info(self, entry, ns, base_url=None):
        """从 OPDS entry 元素中提取书籍信息

        Args:
            entry: XML entry 元素
            ns: 命名空间映射
            base_url: 基础 URL，用于处理相对 URL(可选)

        Returns:
            dict: 包含书籍信息的字典
        """
        info = {}

        title_elem = entry.find("atom:title", namespaces=ns)
        info["title"] = title_elem.text if title_elem is not None else "未知标题"

        author_elem = entry.find("atom:author", namespaces=ns)
        if author_elem is not None:
            name_elem = author_elem.find("atom:name", namespaces=ns)
            if name_elem is not None:
                info["author"] = name_elem.text
            else:
                info["author"] = "未知作者"
        else:
            info["author"] = "未知作者"

        acquisition_links = entry.xpath('atom:link[@rel="http://opds-spec.org/acquisition"]', namespaces=ns)
        for link in acquisition_links:
            href = link.get("href")
            type_ = link.get("type")
            if href and type_:
                info["acquisition_link"] = href
                info["format"] = type_.split("/")[-1]
                break

        cover_links = entry.xpath(
            'atom:link[@rel="http://opds-spec.org/thumbnail"] | atom:link[@rel="http://opds-spec.org/cover"]',
            namespaces=ns,
        )
        if cover_links:
            cover_href = cover_links[0].get("href")
            if cover_href:
                if base_url and not cover_href.startswith(("http://", "https://")):
                    cover_href = urllib.parse.urljoin(base_url, cover_href)
                info["cover_link"] = cover_href

        summary = ""
        summary_elem = entry.find("atom:summary", namespaces=ns)
        if summary_elem is not None and summary_elem.text:
            summary = summary_elem.text
        else:
            content_elem = entry.find("atom:content", namespaces=ns)
            if content_elem is not None and content_elem.text:
                summary = content_elem.text
            elif content_elem is not None and content_elem.get("type") == "xhtml":
                div_elem = content_elem.find(".//div", namespaces=ns)
                if div_elem is not None and div_elem.text:
                    summary = div_elem.text
        info["summary"] = summary

        return info

    def _determine_entry_type(self, entry, ns):
        """判断 entry 的类型 (文件夹或书籍)"""
        nav_links = entry.xpath(
            'atom:link[@rel="subsection" or @rel="http://opds-spec.org/crawlable" or @rel="collection"]',
            namespaces=ns,
        )
        if nav_links:
            return "folder"

        type_links = entry.xpath(
            'atom:link[not(@rel) and (contains(@type, "opds") or contains(@type, "atom"))]',
            namespaces=ns,
        )
        if type_links:
            return "folder"

        acquisition_links = entry.xpath('atom:link[@rel="http://opds-spec.org/acquisition"]', namespaces=ns)
        if acquisition_links:
            return "book"

        return "book"

    def _extract_entry_href(self, entry, ns, base_url, item_type):
        """从 entry 中提取 href 链接"""
        links = entry.xpath("atom:link", namespaces=ns)

        for link in links:
            rel = link.get("rel")
            link_href = link.get("href")

            if link_href:
                if not link_href.startswith(("http://", "https://")):
                    link_href = urllib.parse.urljoin(base_url, link_href)

                if item_type == "folder":
                    if rel in ["subsection", "http://opds-spec.org/crawlable", "collection"] or not rel:
                        return link_href
                else:
                    if rel == "http://opds-spec.org/acquisition":
                        return link_href
                    elif not self._has_acquisition_link(entry, ns):
                        return link_href

        return None

    def _has_acquisition_link(self, entry, ns):
        """检查 entry 是否有 acquisition 链接"""
        acquisition_links = entry.xpath('atom:link[@rel="http://opds-spec.org/acquisition"]', namespaces=ns)
        return len(acquisition_links) > 0

    def _generate_item_id(self, href):
        """根据 href 生成确定性的短 ID"""
        try:
            return hashlib.sha256(href.encode("utf-8")).hexdigest()[:12]
        except Exception:
            return str(abs(hash(href)) % 1000000)

    def _extract_navigation_links(self, root, ns, base_url):
        """从根元素中提取导航链接"""
        items = []
        nav_links = root.xpath(
            '//atom:link[@rel="subsection" or @rel="http://opds-spec.org/crawlable" or @rel="collection" or @rel="start"]',
            namespaces=ns,
        )
        for link in nav_links:
            link_href = link.get("href")
            title = link.get("title", "未命名")
            link_type = link.get("type", "")

            if link_href:
                if not link_href.startswith(("http://", "https://")):
                    link_href = urllib.parse.urljoin(base_url, link_href)

                item_type = "folder"
                if link_type and ("opds" in link_type or "atom" in link_type):
                    item_type = "folder"

                short_id = self._generate_item_id(link_href)

                item_info = {
                    "type": item_type,
                    "id": short_id,
                    "title": title,
                    "author": "",
                    "href": link_href,
                    "path": link_href.replace(base_url, "").strip("/"),
                }
                items.append(item_info)

        return items

    def parse_opds_navigation(self, catalog_data, base_url):
        """解析 OPDS 导航目录，返回文件夹和书籍列表"""
        try:
            root, ns = self._parse_opds_xml(catalog_data)

            items = []

            entries = root.xpath("//atom:entry", namespaces=ns)
            for entry in entries:
                item_type = self._determine_entry_type(entry, ns)

                entry_info = self._extract_entry_info(entry, ns, base_url)

                href = self._extract_entry_href(entry, ns, base_url, item_type)

                item_id = self._generate_item_id(href) if href else None

                item_info = {
                    "type": item_type,
                    "id": item_id,
                    "title": entry_info.get("title", "未知标题"),
                    "author": entry_info.get("author", ""),
                    "href": href,
                    "cover_link": entry_info.get("cover_link"),
                    "summary": entry_info.get("summary", ""),
                }

                if item_type == "folder" and href:
                    parsed_url = urllib.parse.urlparse(href)
                    path = parsed_url.path
                    if path.startswith("/"):
                        path = path[1:]
                    item_info["path"] = path

                items.append(item_info)

            if not items:
                items.extend(self._extract_navigation_links(root, ns, base_url))

            return {"success": True, "items": items, "current_path": base_url}

        except Exception as e:
            logging.error(f"解析 OPDS 导航目录失败：{e}")
            logging.error(traceback.format_exc())
            return {
                "success": False,
                "error": str(e),
                "items": [],
                "current_path": base_url,
            }

    def parse_opds_catalog(self, catalog_data):
        """解析 OPDS 目录，提取书籍信息（用于批量导入）"""
        books = []
        try:
            root, ns = self._parse_opds_xml(catalog_data)

            entries = root.xpath("//atom:entry", namespaces=ns)
            for entry in entries:
                entry_info = self._extract_entry_info(entry, ns)

                if entry_info.get("title") and entry_info.get("acquisition_link"):
                    books.append(entry_info)
        except Exception as e:
            logging.error(f"解析 OPDS 目录失败：{e}")

        return books

    def import_book_to_scan(self, book, user_id=None):
        """导入单本书籍到扫描目录"""
        title = book.get("title", "未知书籍")
        author = book.get("author", "未知作者")
        logging.info(f"导入书籍到扫描目录：{title} - {author}")

        href = book.get("acquisition_link") or book.get("href")
        book_hash = hashlib.sha256(href.encode("utf-8")).hexdigest()[:64] if href else None

        try:
            file_path = self.download_book(book)
            if not file_path:
                logging.error(f"无法下载书籍：{title}")
                self._update_scanfile_status(book_hash, None, ScanFile.FAILED, "下载失败")
                return None

            safe_title = re.sub(r"[^a-zA-Z0-9\s\-_]", "_", title).strip()
            safe_title = safe_title[:50]
            format_ = book.get("format", "epub")
            target_filename = f"opds_{safe_title}.{format_}"
            target_path = os.path.join(self.scan_dir, target_filename)

            if os.path.exists(target_path):
                target_filename = f"opds_{safe_title}_{uuid.uuid4().hex[:8]}.{format_}"
                target_path = os.path.join(self.scan_dir, target_filename)

            os.makedirs(self.scan_dir, exist_ok=True)

            shutil.move(file_path, target_path)
            logging.info(f"书籍已移动到扫描目录：{target_path}")

            self._update_scanfile_status(book_hash, target_path, ScanFile.NEW)

            return {
                "title": title,
                "author": author,
                "filename": target_filename,
                "path": target_path,
            }

        except Exception as e:
            logging.error(f"导入书籍到扫描目录失败：{e}")
            self._update_scanfile_status(book_hash, None, ScanFile.FAILED, str(e))
            return None

    def _update_scanfile_status(self, book_hash, target_path, status, error_msg=None):
        """更新 ScanFile 状态

        Args:
            book_hash: 书籍链接的 hash 值
            target_path: 下载后的文件路径（失败时为 None）
            status: 新状态（ScanFile.NEW 或 ScanFile.FAILED）
            error_msg: 错误信息（失败时记录）
        """
        if not book_hash:
            return

        try:
            with self.get_session() as sess:
                sf = sess.query(ScanFile).filter(ScanFile.hash == book_hash).first()
                if sf:
                    if target_path:
                        sf.path = target_path
                    sf.status = status
                    sf.update_time = datetime.now()
                    if error_msg:
                        sf.data = sf.data or {}
                        sf.data["error"] = error_msg
                    sf.save()
                    logging.info(f"已更新 ScanFile 记录 {sf.id}: status={status}")
        except Exception as e:
            logging.error(f"更新 ScanFile 状态时出错：{e}")

    def import_selected_books(self, opds_url, user_id=None, delete_after=False, books=None):
        """导入用户选中的书籍"""
        logging.info(f"开始导入选中的书籍：{len(books)}本")

        with self._lock:
            self.count_total = len(books)
        imported_files = []

        for book_info in books:
            try:
                book_data = {
                    "title": book_info.get("title", "未知书籍"),
                    "author": book_info.get("author", "未知作者"),
                    "acquisition_link": book_info.get("href", ""),
                    "format": self.guess_format_from_url(book_info.get("href", "")),
                }

                if not book_data["acquisition_link"]:
                    logging.error(f"书籍缺少下载链接：{book_data['title']}")
                    with self._lock:
                        self.count_fail += 1
                    continue

                if not book_data["acquisition_link"].startswith("http"):
                    parsed_opds = urllib.parse.urlparse(opds_url)
                    base_url = f"{parsed_opds.scheme}://{parsed_opds.netloc}"

                    if book_data["acquisition_link"].startswith("/"):
                        book_data["acquisition_link"] = base_url + book_data["acquisition_link"]
                    else:
                        book_data["acquisition_link"] = base_url + "/" + book_data["acquisition_link"]

                logging.info(f"下载链接：{book_data['acquisition_link']}")

                result = self.import_book_to_scan(book_data, user_id)
                if result:
                    imported_files.append(result)
                    with self._lock:
                        self.count_done += 1
                    logging.info(f"成功导入：{book_data['title']}")
                else:
                    with self._lock:
                        self.count_skip += 1
                    logging.warning(f"跳过导入：{book_data['title']}")

            except Exception as e:
                logging.error(f"导入书籍失败：{book_info.get('title', '未知')}, 错误：{e}")
                logging.error(traceback.format_exc())
                with self._lock:
                    self.count_fail += 1

        with self._lock:
            total = self.count_total
            done = self.count_done
            skip = self.count_skip
            fail = self.count_fail

        logging.info(f"OPDS 导入完成：总计 {total}, 成功 {done}, 跳过 {skip}, 失败 {fail}")

        return {
            "err": "ok",
            "msg": f"成功添加 {done} 本书籍到待处理列表",
            "total": total,
            "done": done,
            "fail": fail,
            "imported_files": imported_files,
        }

    def guess_format_from_url(self, url):
        """从 URL 中猜测文件格式"""
        if not url:
            return "epub"

        pattern = r"\.(epub|pdf|mobi|azw3|azw|txt|fb2|docx?|zip)$"
        match = re.search(pattern, url, re.IGNORECASE)
        if match:
            return match.group(1).lower()

        if "epub" in url.lower() or "application/epub" in url.lower():
            return "epub"
        elif "pdf" in url.lower() or "application/pdf" in url.lower():
            return "pdf"
        elif "mobi" in url.lower() or "application/x-mobipocket" in url.lower():
            return "mobi"

        return "epub"

    def get_book_details(self, book_url):
        """获取书籍的详细信息 - 保留原有方法用于兼容性"""
        try:
            logging.info(f"获取书籍详情：{book_url}")

            pattern = r"\.(epub|pdf|mobi|azw3|azw|txt|fb2|docx?|zip)$"
            match = re.search(pattern, book_url, re.IGNORECASE)

            if match:
                format_ext = match.group(1).lower()

                book_id_match = re.search(r"/book/(\d+)\.", book_url)
                book_id = book_id_match.group(1) if book_id_match else "unknown"

                book = {
                    "title": f"书籍 ID_{book_id}",
                    "author": "未知作者",
                    "acquisition_link": book_url,
                    "format": format_ext,
                }

                return book

            catalog_data = self.fetch_opds_catalog(book_url)
            if not catalog_data:
                logging.error(f"无法获取书籍详情页面：{book_url}")
                return None

            root, ns = self._parse_opds_xml(catalog_data)

            entry = root.find("atom:entry", namespaces=ns)
            if entry is None:
                entries = root.xpath("//atom:entry", namespaces=ns)
                if entries:
                    entry = entries[0]

            if entry is None:
                logging.error(f"在书籍详情页面中未找到 entry 元素：{book_url}")
                return self.extract_links_directly(root, ns, book_url)

            book = {}

            title_elem = entry.find("atom:title", namespaces=ns)
            if title_elem is not None and title_elem.text:
                book["title"] = title_elem.text.strip()
            else:
                title_elem = entry.find(".//title", namespaces=ns)
                if title_elem is not None and title_elem.text:
                    book["title"] = title_elem.text.strip()
                else:
                    book["title"] = "未知书籍"

            author_elem = entry.find("atom:author", namespaces=ns)
            if author_elem is not None:
                name_elem = author_elem.find("atom:name", namespaces=ns)
                if name_elem is not None and name_elem.text:
                    book["author"] = name_elem.text.strip()
                else:
                    book["author"] = "未知作者"
            else:
                book["author"] = "未知作者"

            acquisition_links = entry.xpath('atom:link[@rel="http://opds-spec.org/acquisition"]', namespaces=ns)
            for link in acquisition_links:
                href = link.get("href")
                type_ = link.get("type")
                if href and type_:
                    book["acquisition_link"] = href
                    book["format"] = type_.split("/")[-1]
                    break

            return book
        except Exception as e:
            logging.error(f"获取书籍详情失败：{e}")
            logging.error(traceback.format_exc())
            return None

    def extract_links_directly(self, root, ns, book_url):
        """直接从页面中提取链接"""
        try:
            book = {}

            acquisition_links = root.xpath('//atom:link[@rel="http://opds-spec.org/acquisition"]', namespaces=ns)
            if acquisition_links:
                for link in acquisition_links:
                    href = link.get("href")
                    type_ = link.get("type")
                    if href and type_:
                        book["acquisition_link"] = href
                        book["format"] = type_.split("/")[-1]
                        break

            if "acquisition_link" not in book:
                download_links = root.xpath(
                    '//atom:link[contains(@href, ".epub") or contains(@href, ".pdf") or contains(@href, ".mobi")]',
                    namespaces=ns,
                )
                if download_links:
                    for link in download_links:
                        href = link.get("href")
                        if href:
                            book["acquisition_link"] = href
                            book["format"] = self.guess_format_from_url(href)
                            break

            if "acquisition_link" not in book:
                return None

            title_elem = root.find(".//atom:title", namespaces=ns)
            if title_elem is not None and title_elem.text:
                book["title"] = title_elem.text.strip()
            else:
                book_id_match = re.search(r"/book/(\d+)\.", book_url)
                if book_id_match:
                    book["title"] = f"书籍 ID_{book_id_match.group(1)}"
                else:
                    book["title"] = "未知书籍"

            book["author"] = "未知作者"

            return book
        except Exception as e:
            logging.error(f"提取链接失败：{e}")
            return None

    def download_book(self, book):
        """下载书籍文件"""
        try:
            url = book.get("acquisition_link")
            if not url:
                logging.error("没有下载链接")
                return None

            if not url.startswith("http"):
                logging.error(f"无效的 URL: {url}")
                return None

            title = book.get("title", "unknown")
            format_ = book.get("format", "epub")
            safe_title = re.sub(r"[^a-zA-Z0-9\s\-_]", "_", title).strip()
            safe_title = safe_title[:50]
            if not safe_title:
                safe_title = "unknown_book"

            fd, file_path = tempfile.mkstemp(prefix=f"opds_{safe_title}_", suffix=f".{format_}")
            os.close(fd)

            logging.info(f"下载书籍文件：{url} 到 {file_path}")
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "*/*",
            }

            response = requests.get(url, headers=headers, timeout=60, stream=True)
            response.raise_for_status()

            content_length = response.headers.get("content-length")
            if content_length:
                file_size = int(content_length)
                logging.info(f"文件大小：{file_size / 1024 / 1024:.2f} MB")

            with open(file_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)

            if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
                logging.info(f"书籍下载成功：{file_path}, 大小：{os.path.getsize(file_path)} bytes")
                return file_path
            else:
                logging.error(f"文件下载失败或为空：{file_path}")
                return None

        except Exception as e:
            logging.error(f"下载书籍失败：{e}")
            logging.error(traceback.format_exc())
            return None
