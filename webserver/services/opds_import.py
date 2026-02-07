#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import logging
import os
import tempfile
import traceback
import urllib.parse
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

    def browse_opds_catalog(self, host, port=None, path=''):
        """浏览OPDS目录结构"""
        try:
            # 构建完整的URL
            base_url = host
            if port:
                # 确保URL格式正确
                if base_url.endswith('/'):
                    base_url = base_url[:-1]
                base_url += f":{port}"
            if path:
                if not path.startswith('/'):
                    base_url += '/'
                base_url += path
            
            logging.info(f"浏览OPDS目录: {base_url}")
            
            # 获取OPDS目录内容
            catalog_data = self.fetch_opds_catalog(base_url)
            if not catalog_data:
                return {"error": "无法获取OPDS目录内容"}
            
            # 解析目录内容
            result = self.parse_opds_navigation(catalog_data, base_url)
            return result
            
        except Exception as e:
            logging.error(f"浏览OPDS目录失败: {e}")
            logging.error(traceback.format_exc())
            return {"error": str(e)}

    def do_import(self, opds_url, user_id=None, delete_after=False, books=None):
        """执行OPDS导入"""
        self.reset_counters()
        try:
            if books:
                # 导入指定的书籍
                self.import_selected_books(opds_url, user_id, delete_after, books)
            else:
                # 导入整个OPDS源
                self.import_from_opds(opds_url, user_id, delete_after)
        except Exception as e:
            logging.error(traceback.format_exc())
            logging.error(f"OPDS导入失败: {e}")

    def reset_counters(self):
        """重置计数器"""
        self.count_total = 0
        self.count_done = 0
        self.count_skip = 0
        self.count_fail = 0

    def import_from_opds(self, opds_url, user_id=None, delete_after=False):
        """从OPDS源导入书籍"""
        logging.info(f"开始从OPDS导入: {opds_url}")
        
        try:
            # 获取OPDS目录
            catalog_data = self.fetch_opds_catalog(opds_url)
            if not catalog_data:
                logging.error("无法获取OPDS目录")
                return

            # 解析OPDS目录
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

            logging.info(f"OPDS导入完成: 总计 {self.count_total}, 成功 {self.count_done}, 失败 {self.count_fail}")
        except Exception as e:
            logging.error(traceback.format_exc())
            logging.error(f"OPDS导入过程中出错: {e}")

    def fetch_opds_catalog(self, url):
        """获取OPDS目录内容"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/atom+xml,application/xml,text/xml,application/opds+json'
            }
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            return response.content
        except Exception as e:
            logging.error(f"获取OPDS目录失败: {e}")
            return None

    def parse_opds_navigation(self, catalog_data, base_url):
        """解析OPDS导航目录，返回文件夹和书籍列表"""
        try:
            root = etree.fromstring(catalog_data)
            ns = {
                'atom': 'http://www.w3.org/2005/Atom',
                'dc': 'http://purl.org/dc/terms/',
                'opds': 'http://opds-spec.org/2010/catalog',
                'dcterms': 'http://purl.org/dc/terms/'
            }
            
            items = []
            
            # 查找所有条目
            entries = root.xpath('//atom:entry', namespaces=ns)
            for entry in entries:
                item_type = 'book'  # 默认是书籍
                
                # 检查是否是导航链接（文件夹）
                nav_links = entry.xpath('atom:link[@rel="subsection" or @rel="http://opds-spec.org/crawlable" or @rel="collection"]', namespaces=ns)
                if nav_links:
                    item_type = 'folder'
                
                # 获取标题
                title_elem = entry.find('atom:title', namespaces=ns)
                title = title_elem.text if title_elem is not None else "未知标题"
                
                # 获取作者
                author = ""
                author_elem = entry.find('atom:author', namespaces=ns)
                if author_elem is not None:
                    name_elem = author_elem.find('atom:name', namespaces=ns)
                    if name_elem is not None:
                        author = name_elem.text
                
                # 获取链接
                links = entry.xpath('atom:link', namespaces=ns)
                href = None
                item_id = None
                
                for link in links:
                    rel = link.get('rel')
                    link_href = link.get('href')
                    link_type = link.get('type', '')
                    
                    if link_href:
                        # 构建完整URL
                        if not link_href.startswith(('http://', 'https://')):
                            link_href = urllib.parse.urljoin(base_url, link_href)
                        
                        if item_type == 'folder':
                            # 对于文件夹，使用导航链接
                            if rel in ['subsection', 'http://opds-spec.org/crawlable', 'collection']:
                                href = link_href
                                break
                        else:
                            # 对于书籍，优先获取下载链接
                            if rel == 'http://opds-spec.org/acquisition':
                                href = link_href
                                break
                            elif not href:  # 如果没有下载链接，使用第一个链接
                                href = link_href
                
                # 生成ID
                if href:
                    item_id = hash(href) % 1000000
                
                # 提取封面链接
                cover_link = None
                cover_links = entry.xpath('atom:link[@rel="http://opds-spec.org/thumbnail"] | atom:link[@rel="http://opds-spec.org/cover"]', namespaces=ns)
                if cover_links:
                    cover_href = cover_links[0].get('href')
                    if cover_href and not cover_href.startswith(('http://', 'https://')):
                        cover_href = urllib.parse.urljoin(base_url, cover_href)
                    cover_link = cover_href
                
                # 提取摘要
                summary = ""
                summary_elem = entry.find('atom:summary', namespaces=ns)
                if summary_elem is not None and summary_elem.text:
                    summary = summary_elem.text
                
                # 构建项目信息
                item_info = {
                    'type': item_type,
                    'id': item_id,
                    'title': title,
                    'author': author,
                    'href': href,
                    'cover_link': cover_link,
                    'summary': summary
                }
                
                if item_type == 'folder':
                    # 对于文件夹，提取路径
                    if href:
                        # 从href中提取相对路径
                        parsed_url = urllib.parse.urlparse(href)
                        path = parsed_url.path
                        if path.startswith('/'):
                            path = path[1:]
                        item_info['path'] = path
                
                items.append(item_info)
            
            # 如果没有找到条目，可能是导航页面，检查导航链接
            if not items:
                nav_links = root.xpath('//atom:link[@rel="subsection" or @rel="http://opds-spec.org/crawlable" or @rel="collection" or @rel="start"]', namespaces=ns)
                for link in nav_links:
                    link_href = link.get('href')
                    title = link.get('title', '未命名')
                    link_type = link.get('type', '')
                    
                    if link_href:
                        # 构建完整URL
                        if not link_href.startswith(('http://', 'https://')):
                            link_href = urllib.parse.urljoin(base_url, link_href)
                        
                        # 判断是文件夹还是OPDS源
                        item_type = 'folder'
                        if link_type and ('opds' in link_type or 'atom' in link_type):
                            item_type = 'folder'
                        
                        item_info = {
                            'type': item_type,
                            'id': hash(link_href) % 1000000,
                            'title': title,
                            'author': '',
                            'href': link_href,
                            'path': link_href.replace(base_url, '').strip('/')
                        }
                        items.append(item_info)
            
            return {
                'success': True,
                'items': items,
                'current_path': base_url
            }
            
        except Exception as e:
            logging.error(f"解析OPDS导航目录失败: {e}")
            logging.error(traceback.format_exc())
            return {
                'success': False,
                'error': str(e),
                'items': [],
                'current_path': base_url
            }

    def parse_opds_catalog(self, catalog_data):
        """解析OPDS目录，提取书籍信息（用于批量导入）"""
        books = []
        try:
            root = etree.fromstring(catalog_data)
            ns = {
                'atom': 'http://www.w3.org/2005/Atom',
                'dc': 'http://purl.org/dc/terms/',
                'opds': 'http://opds-spec.org/2010/catalog'
            }

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
            logging.error(f"解析OPDS目录失败: {e}")

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
        logging.info(f"开始导入选中的书籍: {len(books)}本")
        
        self.count_total = len(books)
        
        for book_info in books:
            try:
                # 获取书籍的详细信息和下载链接
                book_data = self.get_book_details(book_info['href'])
                if book_data:
                    self.import_book(book_data, user_id, delete_after)
                    self.count_done += 1
                else:
                    logging.error(f"无法获取书籍详情: {book_info.get('title', '未知')}")
                    self.count_fail += 1
            except Exception as e:
                logging.error(f"导入书籍失败: {book_info.get('title', '未知')}, 错误: {e}")
                self.count_fail += 1

        logging.info(f"OPDS导入完成: 总计 {self.count_total}, 成功 {self.count_done}, 失败 {self.count_fail}")

    def get_book_details(self, book_url):
        """获取书籍的详细信息"""
        try:
            catalog_data = self.fetch_opds_catalog(book_url)
            if not catalog_data:
                return None
            
            root = etree.fromstring(catalog_data)
            ns = {
                'atom': 'http://www.w3.org/2005/Atom',
                'dc': 'http://purl.org/dc/terms/',
                'opds': 'http://opds-spec.org/2010/catalog'
            }
            
            entry = root.find('atom:entry', namespaces=ns)
            if entry is None:
                return None
            
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

            return book
        except Exception as e:
            logging.error(f"获取书籍详情失败: {e}")
            return None

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
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=60)
            response.raise_for_status()

            # 保存文件
            with open(file_path, 'wb') as f:
                f.write(response.content)

            return file_path
        except Exception as e:
            logging.error(f"下载书籍失败: {e}")
            return None