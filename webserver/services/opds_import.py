#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import logging
import os
import tempfile
import traceback
import urllib.parse
import hashlib
import shutil
import re
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
        super().__init__()
        self.count_total = 0
        self.count_done = 0
        self.count_skip = 0
        self.count_fail = 0
        self.scan_dir = CONF.get("scan_upload_path", "/data/books/imports/")

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
                return self.import_selected_books(opds_url, user_id, delete_after, books)
            else:
                # 导入整个OPDS源
                return self.import_from_opds(opds_url, user_id, delete_after)
        except Exception as e:
            logging.error(traceback.format_exc())
            logging.error(f"OPDS导入失败: {e}")
            return {"err": "error", "msg": str(e)}

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
                return {"err": "error", "msg": "无法获取OPDS目录"}

            # 解析OPDS目录
            books = self.parse_opds_catalog(catalog_data)
            self.count_total = len(books)
            logging.info(f"找到 {self.count_total} 本书籍")

            # 导入每本书
            imported_files = []
            for book in books:
                try:
                    result = self.import_book_to_scan(book, user_id)
                    if result:
                        imported_files.append(result)
                        self.count_done += 1
                    else:
                        self.count_skip += 1
                except Exception as e:
                    logging.error(f"导入书籍失败: {book.get('title', '未知')}, 错误: {e}")
                    self.count_fail += 1

            logging.info(f"OPDS导入完成: 总计 {self.count_total}, 成功 {self.count_done}, 跳过 {self.count_skip}, 失败 {self.count_fail}")
            return {
                "err": "ok", 
                "msg": f"成功添加 {self.count_done} 本书籍到待处理列表",
                "imported_files": imported_files
            }
        except Exception as e:
            logging.error(traceback.format_exc())
            logging.error(f"OPDS导入过程中出错: {e}")
            return {"err": "error", "msg": str(e)}

    def fetch_opds_catalog(self, url):
        """获取OPDS目录内容"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/atom+xml,application/xml,text/xml,application/opds+json'
            }
            
            # 如果是相对路径，转换为绝对路径
            if url and not url.startswith(('http://', 'https://')):
                # 尝试使用base_url，这里需要外部传入base_url
                logging.warning(f"URL是相对路径: {url}")
            
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            return response.content
        except Exception as e:
            logging.error(f"获取OPDS目录失败: {e}")
            return None

    def parse_opds_navigation(self, catalog_data, base_url):
        """解析OPDS导航目录，返回文件夹和书籍列表"""
        try:
            # 使用更宽松的XML解析器，忽略一些语法错误
            parser = etree.XMLParser(recover=True)
            root = etree.fromstring(catalog_data, parser)
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
                else:
                    # 检查没有rel属性但type属性包含opds或atom的链接（用于识别Talebook的导航条目）
                    type_links = entry.xpath('atom:link[not(@rel) and (contains(@type, "opds") or contains(@type, "atom"))]', namespaces=ns)
                    if type_links:
                        item_type = 'folder'
                
                # 检查是否是书籍（有acquisition链接）
                acquisition_links = entry.xpath('atom:link[@rel="http://opds-spec.org/acquisition"]', namespaces=ns)
                if acquisition_links:
                    item_type = 'book'
                
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
                            if rel in ['subsection', 'http://opds-spec.org/crawlable', 'collection'] or not rel:
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
                # 先尝试从summary标签中提取
                summary_elem = entry.find('atom:summary', namespaces=ns)
                if summary_elem is not None and summary_elem.text:
                    summary = summary_elem.text
                else:
                    # 如果没有summary标签，尝试从content标签中提取
                    content_elem = entry.find('atom:content', namespaces=ns)
                    if content_elem is not None and content_elem.text:
                        summary = content_elem.text
                    elif content_elem is not None and content_elem.get('type') == 'xhtml':
                        # 处理xhtml格式的content
                        div_elem = content_elem.find('.//div', namespaces=ns)
                        if div_elem is not None and div_elem.text:
                            summary = div_elem.text
                
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
            # 使用更宽松的XML解析器，忽略一些语法错误
            parser = etree.XMLParser(recover=True)
            root = etree.fromstring(catalog_data, parser)
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

    def import_book_to_scan(self, book, user_id=None):
        """导入单本书籍到扫描目录"""
        try:
            title = book.get('title', '未知书籍')
            author = book.get('author', '未知作者')
            logging.info(f"导入书籍到扫描目录: {title} - {author}")
            
            # 下载书籍文件
            file_path = self.download_book(book)
            if not file_path:
                logging.error(f"无法下载书籍: {title}")
                return None
            
            # 生成目标文件名
            safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).strip()
            format_ = book.get('format', 'epub')
            target_filename = f"opds_{safe_title}.{format_}"
            target_path = os.path.join(self.scan_dir, target_filename)
            
            # 确保文件名唯一
            counter = 1
            while os.path.exists(target_path):
                target_filename = f"opds_{safe_title}_{counter}.{format_}"
                target_path = os.path.join(self.scan_dir, target_filename)
                counter += 1
            
            # 移动文件到扫描目录
            shutil.move(file_path, target_path)
            logging.info(f"书籍已移动到扫描目录: {target_path}")
            
            # 创建扫描记录（如果需要）
            # 这里假设系统会自动扫描扫描目录中的新文件
            
            return {
                'title': title,
                'author': author,
                'filename': target_filename,
                'path': target_path
            }
            
        except Exception as e:
            logging.error(f"导入书籍到扫描目录失败: {e}")
            return None

    def import_selected_books(self, opds_url, user_id=None, delete_after=False, books=None):
        """导入用户选中的书籍"""
        logging.info(f"开始导入选中的书籍: {len(books)}本")
        
        self.count_total = len(books)
        imported_files = []
        
        for book_info in books:
            try:
                # 直接使用前端传递的书籍信息
                # 注意：前端需要传递 title, author, href
                book_data = {
                    'title': book_info.get('title', '未知书籍'),
                    'author': book_info.get('author', '未知作者'),
                    'acquisition_link': book_info.get('href', ''),
                    'format': self.guess_format_from_url(book_info.get('href', ''))
                }
                
                if not book_data['acquisition_link']:
                    logging.error(f"书籍缺少下载链接: {book_data['title']}")
                    self.count_fail += 1
                    continue
                
                # 确保href是完整的URL
                if not book_data['acquisition_link'].startswith('http'):
                    # 需要构建完整的URL
                    # 这里需要opds_url的基础部分
                    # 例如：如果opds_url是 http://example.com/opds
                    # 而href是 /api/book/56.epub?from=opds
                    # 那么完整的URL应该是 http://example.com/api/book/56.epub?from=opds
                    
                    # 从opds_url中提取基础URL
                    parsed_opds = urllib.parse.urlparse(opds_url)
                    base_url = f"{parsed_opds.scheme}://{parsed_opds.netloc}"
                    
                    # 如果href是相对路径，构建完整URL
                    if book_data['acquisition_link'].startswith('/'):
                        book_data['acquisition_link'] = base_url + book_data['acquisition_link']
                    else:
                        # 尝试其他方式构建URL
                        book_data['acquisition_link'] = base_url + '/' + book_data['acquisition_link']
                
                logging.info(f"下载链接: {book_data['acquisition_link']}")
                
                # 导入书籍
                result = self.import_book_to_scan(book_data, user_id)
                if result:
                    imported_files.append(result)
                    self.count_done += 1
                    logging.info(f"成功导入: {book_data['title']}")
                else:
                    self.count_skip += 1
                    logging.warning(f"跳过导入: {book_data['title']}")
                    
            except Exception as e:
                logging.error(f"导入书籍失败: {book_info.get('title', '未知')}, 错误: {e}")
                logging.error(traceback.format_exc())
                self.count_fail += 1

        logging.info(f"OPDS导入完成: 总计 {self.count_total}, 成功 {self.count_done}, 跳过 {self.count_skip}, 失败 {self.count_fail}")
        
        return {
            "err": "ok", 
            "msg": f"成功添加 {self.count_done} 本书籍到待处理列表",
            "total": self.count_total,
            "done": self.count_done,
            "fail": self.count_fail,
            "imported_files": imported_files
        }

    def guess_format_from_url(self, url):
        """从URL中猜测文件格式"""
        if not url:
            return 'epub'
        
        pattern = r'\.(epub|pdf|mobi|azw3|azw|txt|fb2|docx?|zip)$'
        match = re.search(pattern, url, re.IGNORECASE)
        if match:
            return match.group(1).lower()
        
        # 尝试从content-type推断
        if 'epub' in url.lower() or 'application/epub' in url.lower():
            return 'epub'
        elif 'pdf' in url.lower() or 'application/pdf' in url.lower():
            return 'pdf'
        elif 'mobi' in url.lower() or 'application/x-mobipocket' in url.lower():
            return 'mobi'
        
        return 'epub'  # 默认格式

    def get_book_details(self, book_url):
        """获取书籍的详细信息 - 保留原有方法用于兼容性"""
        try:
            logging.info(f"获取书籍详情: {book_url}")
            
            # 检查是否是文件下载链接
            pattern = r'\.(epub|pdf|mobi|azw3|azw|txt|fb2|docx?|zip)$'
            match = re.search(pattern, book_url, re.IGNORECASE)
            
            if match:
                # 这是一个直接的文件下载链接
                format_ext = match.group(1).lower()
                
                # 从URL中提取书籍ID
                book_id_match = re.search(r'/book/(\d+)\.', book_url)
                book_id = book_id_match.group(1) if book_id_match else "unknown"
                
                # 构建基本书籍信息
                book = {
                    'title': f"书籍ID_{book_id}",
                    'author': '未知作者',
                    'acquisition_link': book_url,
                    'format': format_ext
                }
                
                return book
            
            # 如果不是直接下载链接，尝试作为OPDS条目页面访问
            catalog_data = self.fetch_opds_catalog(book_url)
            if not catalog_data:
                logging.error(f"无法获取书籍详情页面: {book_url}")
                return None
            
            # 使用更宽松的XML解析器，忽略一些语法错误
            parser = etree.XMLParser(recover=True)
            root = etree.fromstring(catalog_data, parser)
            ns = {
                'atom': 'http://www.w3.org/2005/Atom',
                'dc': 'http://purl.org/dc/terms/',
                'opds': 'http://opds-spec.org/2010/catalog'
            }
            
            # 查找entry元素
            entry = root.find('atom:entry', namespaces=ns)
            if entry is None:
                # 尝试其他方法查找
                entries = root.xpath('//atom:entry', namespaces=ns)
                if entries:
                    entry = entries[0]
            
            if entry is None:
                logging.error(f"在书籍详情页面中未找到entry元素: {book_url}")
                # 尝试直接解析链接
                return self.extract_links_directly(root, ns, book_url)
            
            book = {}
            
            # 提取标题
            title_elem = entry.find('atom:title', namespaces=ns)
            if title_elem is not None and title_elem.text:
                book['title'] = title_elem.text.strip()
            else:
                # 尝试其他方法获取标题
                title_elem = entry.find('.//title', namespaces=ns)
                if title_elem is not None and title_elem.text:
                    book['title'] = title_elem.text.strip()
                else:
                    book['title'] = "未知书籍"

            # 提取作者
            author_elem = entry.find('atom:author', namespaces=ns)
            if author_elem is not None:
                name_elem = author_elem.find('atom:name', namespaces=ns)
                if name_elem is not None and name_elem.text:
                    book['author'] = name_elem.text.strip()
                else:
                    book['author'] = '未知作者'
            else:
                book['author'] = '未知作者'

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
            logging.error(traceback.format_exc())
            return None

    def extract_links_directly(self, root, ns, book_url):
        """直接从页面中提取链接"""
        try:
            book = {}
            
            # 查找所有acquisition链接
            acquisition_links = root.xpath('//atom:link[@rel="http://opds-spec.org/acquisition"]', namespaces=ns)
            if acquisition_links:
                for link in acquisition_links:
                    href = link.get('href')
                    type_ = link.get('type')
                    if href and type_:
                        book['acquisition_link'] = href
                        book['format'] = type_.split('/')[-1]
                        break
            
            # 如果没有acquisition链接，尝试查找任何下载链接
            if 'acquisition_link' not in book:
                download_links = root.xpath('//atom:link[contains(@href, ".epub") or contains(@href, ".pdf") or contains(@href, ".mobi")]', namespaces=ns)
                if download_links:
                    for link in download_links:
                        href = link.get('href')
                        if href:
                            book['acquisition_link'] = href
                            book['format'] = self.guess_format_from_url(href)
                            break
            
            # 如果没有找到任何链接，返回None
            if 'acquisition_link' not in book:
                return None
            
            # 尝试获取标题
            title_elem = root.find('.//atom:title', namespaces=ns)
            if title_elem is not None and title_elem.text:
                book['title'] = title_elem.text.strip()
            else:
                # 从URL中提取信息作为标题
                book_id_match = re.search(r'/book/(\d+)\.', book_url)
                if book_id_match:
                    book['title'] = f"书籍ID_{book_id_match.group(1)}"
                else:
                    book['title'] = "未知书籍"
            
            book['author'] = '未知作者'
            
            return book
        except Exception as e:
            logging.error(f"提取链接失败: {e}")
            return None

    def download_book(self, book):
        """下载书籍文件"""
        try:
            url = book.get('acquisition_link')
            if not url:
                logging.error("没有下载链接")
                return None

            # 检查URL是否有效
            if not url.startswith('http'):
                logging.error(f"无效的URL: {url}")
                return None

            # 生成临时文件路径
            title = book.get('title', 'unknown')
            format_ = book.get('format', 'epub')
            safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).strip()
            if not safe_title:
                safe_title = "unknown_book"
                
            temp_dir = tempfile.gettempdir()
            file_name = f"opds_{safe_title}.{format_}"
            file_path = os.path.join(temp_dir, file_name)

            # 确保文件名唯一
            counter = 1
            while os.path.exists(file_path):
                file_name = f"opds_{safe_title}_{counter}.{format_}"
                file_path = os.path.join(temp_dir, file_name)
                counter += 1

            # 下载文件
            logging.info(f"下载书籍文件: {url} 到 {file_path}")
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*'
            }
            
            response = requests.get(url, headers=headers, timeout=60, stream=True)
            response.raise_for_status()
            
            # 检查文件大小
            content_length = response.headers.get('content-length')
            if content_length:
                file_size = int(content_length)
                logging.info(f"文件大小: {file_size / 1024 / 1024:.2f} MB")
            
            # 保存文件
            with open(file_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)

            # 检查文件是否成功下载
            if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
                logging.info(f"书籍下载成功: {file_path}, 大小: {os.path.getsize(file_path)} bytes")
                return file_path
            else:
                logging.error(f"文件下载失败或为空: {file_path}")
                return None
                
        except Exception as e:
            logging.error(f"下载书籍失败: {e}")
            logging.error(traceback.format_exc())
            return None