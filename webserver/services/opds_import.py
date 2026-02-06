#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import logging
import os
import tempfile
import traceback
from datetime import datetime
from gettext import gettext as _

import requests
from lxml import etree

from webserver import loader
from webserver.models import ScanFile
from webserver.services.async_service import AsyncService

CONF = loader.get_settings()


class OPDSImportService(AsyncService):
    def __init__(self):
        super().__init__(name="opds_import")
        self.count_total = 0
        self.count_done = 0
        self.count_skip = 0
        self.count_fail = 0

    def do_import(self, opds_url, user_id=None, delete_after=False, books=None):
        """执行 OPDS 导入"""
        self.reset_counters()
        try:
            if books:
                # 导入指定的书籍
                self.import_selected_books(opds_url, user_id, delete_after, books)
            else:
                # 导入整个 OPDS 源
                self.import_from_opds(opds_url, user_id, delete_after)
        except Exception as e:
            logging.error(traceback.format_exc())
            logging.error(f"OPDS 导入失败: {e}")

    def reset_counters(self):
        """重置计数器"""
        self.count_total = 0
        self.count_done = 0
        self.count_skip = 0
        self.count_fail = 0

    def import_from_opds(self, opds_url, user_id=None, delete_after=False):
        """从 OPDS 源导入书籍"""
        logging.info(f"开始从 OPDS 导入: {opds_url}")
        
        try:
            # 获取 OPDS 目录
            catalog_data = self.fetch_opds_catalog(opds_url)
            if not catalog_data:
                logging.error("无法获取 OPDS 目录")
                return

            # 解析 OPDS 目录
            books = self.parse_opds_catalog(catalog_data)
            self.count_total = len(books)
            logging.info(f"找到 {self.count_total} 本书籍")

            # 导入每本书
            for book in books:
                try:
                    self.import_book(book, user_id, delete_after)
                    self.count_done += 1
                except Exception as e:
                    logging.error(f"导入书籍失败: {book.get('title', '未知')}, 错误: {e}")
                    self.count_fail += 1

            logging.info(f"OPDS 导入完成: 总计 {self.count_total}, 成功 {self.count_done}, 失败 {self.count_fail}")
        except Exception as e:
            logging.error(traceback.format_exc())
            logging.error(f"OPDS 导入过程中出错: {e}")

    def fetch_opds_catalog(self, url):
        """获取 OPDS 目录内容"""
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            return response.content
        except Exception as e:
            logging.error(f"获取 OPDS 目录失败: {e}")
            return None

    def parse_opds_catalog(self, catalog_data):
        """解析 OPDS 目录，提取书籍信息"""
        books = []
        try:
            root = etree.fromstring(catalog_data)
            # 定义命名空间
            ns = {
                'atom': 'http://www.w3.org/2005/Atom',
                'dc': 'http://purl.org/dc/terms/',
                'opds': 'http://opds-spec.org/2010/catalog'
            }

            # 查找所有书籍条目
            entries = root.xpath('//atom:entry', namespaces=ns)
            for entry in entries:
                book = {}
                
                # 提取标题
                title_elem = entry.find('atom:title', namespaces=ns)
                if title_elem is not None:
                    book['title'] = title_elem.text

                # 提取作者
                author_elem = entry.find('atom:author', namespaces=ns)
                if author_elem is not None:
                    name_elem = author_elem.find('atom:name', namespaces=ns)
                    if name_elem is not None:
                        book['author'] = name_elem.text

                # 提取获取链接
                acquisition_links = entry.xpath('atom:link[@rel="http://opds-spec.org/acquisition"]', namespaces=ns)
                for link in acquisition_links:
                    href = link.get('href')
                    type_ = link.get('type')
                    if href and type_:
                        book['acquisition_link'] = href
                        book['format'] = type_.split('/')[-1]
                        break

                # 提取封面链接
                cover_links = entry.xpath('atom:link[@rel="http://opds-spec.org/cover"]', namespaces=ns)
                if cover_links:
                    book['cover_link'] = cover_links[0].get('href')

                if book.get('title') and book.get('acquisition_link'):
                    books.append(book)
        except Exception as e:
            logging.error(f"解析 OPDS 目录失败: {e}")

        return books

    def import_book(self, book, user_id=None, delete_after=False):
        """导入单本书籍"""
        logging.info(f"导入书籍: {book.get('title')} - {book.get('author')}")
        
        # 下载书籍文件
        file_path = self.download_book(book)
        if not file_path:
            logging.error(f"无法下载书籍: {book.get('title')}")
            return

        # 这里可以调用现有的导入逻辑
        # 例如，将文件移动到扫描目录，然后触发扫描
        # 或者直接调用导入服务
        
        # 暂时只是记录日志
        logging.info(f"书籍下载完成: {file_path}")

    def import_selected_books(self, opds_url, user_id=None, delete_after=False, books=None):
        """导入用户选中的书籍"""
        logging.info(f"开始导入选中的书籍: {len(books)} 本")
        
        self.count_total = len(books)
        
        for book in books:
            try:
                # 这里需要根据 book.href 获取书籍的详细信息和下载链接
                # 暂时使用模拟数据
                book_with_link = book.copy()
                book_with_link['acquisition_link'] = book.get('href') + '.epub'
                book_with_link['format'] = 'epub'
                
                self.import_book(book_with_link, user_id, delete_after)
                self.count_done += 1
            except Exception as e:
                logging.error(f"导入书籍失败: {book.get('title', '未知')}, 错误: {e}")
                self.count_fail += 1

        logging.info(f"OPDS 导入完成: 总计 {self.count_total}, 成功 {self.count_done}, 失败 {self.count_fail}")

    def download_book(self, book):
        """下载书籍文件"""
        try:
            url = book.get('acquisition_link')
            if not url:
                return None

            # 生成临时文件路径
            title = book.get('title', 'unknown')
            format_ = book.get('format', 'epub')
            safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).strip()
            temp_dir = tempfile.gettempdir()
            file_name = f"{safe_title}.{format_}"
            file_path = os.path.join(temp_dir, file_name)

            # 下载文件
            logging.info(f"下载书籍文件: {url} 到 {file_path}")
            response = requests.get(url, timeout=60)
            response.raise_for_status()

            # 保存文件
            with open(file_path, 'wb') as f:
                f.write(response.content)

            return file_path
        except Exception as e:
            logging.error(f"下载书籍失败: {e}")
            return None
