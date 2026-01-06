#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import hashlib
import os
import logging
import time
import datetime
from gettext import gettext as _

from webserver import utils
from webserver.models import Item, ScanFile
from webserver.services import AsyncService
from webserver.services.autofill import AutoFillService

SCAN_EXT = ["azw", "azw3", "epub", "mobi", "pdf", "txt"]


class ScanService(AsyncService):
    def save_or_rollback(self, row):
        try:
            # 直接使用session.add和flush，避免多次commit导致的事务冲突
            self.session.add(row)
            # 更新时间
            row.update_time = datetime.datetime.now()
            self.session.flush()
            bid = "[ book-id=%s ]" % row.book_id
            logging.info("update: status=%-5s, path=%s %s", row.status, row.path, bid if row.book_id > 0 else "")
            # 提交事务
            self.session.commit()
            return True
        except Exception as err:
            logging.exception("save error: %s", err)
            # 回滚事务
            self.session.rollback()
            return False

    def build_query(self, hashlist):
        query = self.session.query(ScanFile).filter(
            ScanFile.status == ScanFile.READY
        )  # .filter(ScanFile.import_id == 0)
        if isinstance(hashlist, (list, tuple)):
            query = query.filter(ScanFile.hash.in_(hashlist))
        elif isinstance(hashlist, str):
            query = query.filter(ScanFile.hash == hashlist)
        return query

    @AsyncService.register_service
    def do_scan(self, path_dir):
        from calibre.ebooks.metadata.meta import get_metadata

        logging.info("<%s> we are: db=%s, session=%s", self, self.db, self.session)
        logging.info("start to scan %s", path_dir)

        # 生成任务（粗略扫描），前端可以调用API查询进展
        tasks = []
        for dirpath, __, filenames in os.walk(path_dir):
            for fname in filenames:
                fpath = os.path.join(dirpath, fname)
                if not os.path.isfile(fpath):
                    continue

                fmt = fpath.split(".")[-1].lower()
                if fmt not in SCAN_EXT:
                    # logging.debug("bad format: [%s] %s", fmt, fpath)
                    continue
                tasks.append((fname, fpath, fmt))

        # 检查是否有符合条件的书籍文件
        if not tasks:
            logging.info("在目录 %s 中没有找到符合条件的书籍文件", path_dir)
            return

        # 生成任务ID
        scan_id = int(time.time())
        logging.info("========== start to check files size & name ============")

        rows = []
        inserted_hash = set()
        for fname, fpath, fmt in tasks:
            # logging.info("Scan: %s", fpath)
            samefiles = self.session.query(ScanFile).filter(ScanFile.path == fpath)
            if samefiles.count() > 0:
                # 如果已经有相同的文件记录，则跳过
                row = samefiles.first()
                if row.status == ScanFile.NEW:
                    rows.append(row)
                else:
                    continue

            stat = os.stat(fpath)
            md5 = hashlib.md5(fname.encode("UTF-8")).hexdigest()
            hash = "fstat:%s/%s" % (stat.st_size, md5)
            if hash in inserted_hash:
                logging.error("maybe have same book, skip: %s", fpath)
                continue

            inserted_hash.add(hash)
            row = ScanFile(fpath, hash, scan_id)
            if not self.save_or_rollback(row):
                continue
            rows.append(row)
        # self.session.bulk_save_objects(rows)

        logging.info("========== start to check files hash & meta ============")
        # 检查文件哈希值，检查DB重复情况
        for row in rows:
            fpath = row.path

            # 读取文件，计算哈希值
            sha256 = hashlib.sha256()
            with open(fpath, "rb") as f:
                # Read and update hash string value in blocks of 4K
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256.update(byte_block)

            hash = "sha256:" + sha256.hexdigest()
            if self.session.query(ScanFile).filter(ScanFile.hash == hash).count() > 0 or hash in inserted_hash:
                # 如果已经有相同的哈希值，则删掉本任务
                row.status = ScanFile.DROP
            else:
                # 或者，更新为真实的哈希值
                row.hash = hash
            inserted_hash.add(hash)
            if not self.save_or_rollback(row):
                continue

            # 尝试解析metadata
            fmt = fpath.split(".")[-1].lower()
            try:
                with open(fpath, "rb") as stream:
                    mi = get_metadata(stream, stream_type=fmt, use_libprs_metadata=True)
                    mi.title = utils.super_strip(mi.title)
                    mi.authors = [utils.super_strip(s) for s in mi.authors]

                row.title = mi.title
                row.author = mi.author_sort
                row.publisher = mi.publisher
                row.tags = ", ".join(mi.tags)
                row.status = ScanFile.READY  # 设置为可处理
            except Exception as err:
                logging.error("Failed to parse metadata for %s: %s", fpath, err)
                logging.exception("Error details:")
                row.title = fname
                row.author = "Unknown"
                row.status = ScanFile.READY  # 设置为可处理，尽管解析失败

            # TODO calibre提供的书籍重复接口只有对比title；应当提前对整个书库的文件做哈希，才能准确去重
            ids = self.db.books_with_same_title(mi)
            if ids:
                # 区分同名同作者和同名不同作者的书籍
                same_author_exists = False
                for b in self.db.get_data_as_dict(ids=list(ids)):
                    book_authors = b.get("authors", [])
                    mi_authors = mi.authors
                    
                    # 检查作者是否相同
                    if set(book_authors) == set(mi_authors):
                        if fmt.upper() in b.get("available_formats", ""):
                            row.book_id = b['id']
                            row.status = ScanFile.EXIST
                            same_author_exists = True
                            break
                
                # 如果是同名不同作者，不标记为已存在，允许导入
            if row.status == ScanFile.EXIST:
                continue
            if not self.save_or_rollback(row):
                continue

    @AsyncService.register_service
    def do_import(self, hashlist, user_id):
        from calibre.ebooks.metadata.meta import get_metadata

        # 生成任务ID
        import_id = int(time.time())

        query = self.build_query(hashlist)
        
        # 检查是否有可导入的书籍
        if query.count() == 0:
            logging.info("没有找到可导入的书籍文件")
            return
            
        query.update({ScanFile.import_id: import_id}, synchronize_session=False)
        self.session.commit()

        imported = []

        # 逐个处理
        for row in query.all():
            fpath = row.path
            fname = os.path.basename(row.path)
            fmt = fpath.split(".")[-1].lower()
            try:
                with open(fpath, "rb") as stream:
                    mi = get_metadata(stream, stream_type=fmt, use_libprs_metadata=True)
                    mi.title = utils.super_strip(mi.title)
                    mi.authors = [utils.super_strip(s) for s in mi.authors]

                # 非结构化的格式，calibre无法识别准确的信息，直接从文件名提取
                if fmt in ["txt", "pdf"]:
                    mi.title = fname.replace("." + fmt, "")
                    mi.authors = [_(u"佚名")]
            except Exception as err:
                logging.error("Failed to parse metadata for %s during import: %s", fpath, err)
                logging.exception("Error details:")
                # 创建一个简单的metadata对象，避免导入失败
                from calibre.ebooks.metadata.book.base import Metadata
                mi = Metadata()
                mi.title = fname.replace("." + fmt, "")
                mi.authors = [_(u"佚名")]

            # 再次检查是否有重复书籍
            ids = self.db.books_with_same_title(mi)
            if ids:
                # 区分同名同作者和同名不同作者的书籍
                same_author_book_id = None
                
                for b in self.db.get_data_as_dict(ids=list(ids)):
                    book_authors = b.get("authors", [])
                    mi_authors = mi.authors
                    
                    # 检查作者是否相同
                    if set(book_authors) == set(mi_authors):
                        same_author_book_id = b['id']
                        if fmt.upper() in b.get("available_formats", ""):
                            row.status = ScanFile.EXIST
                            break
                
                if same_author_book_id and row.status != ScanFile.EXIST:
                    # 同名同作者，添加格式到现有书籍
                    row.book_id = same_author_book_id
                    logging.info(
                        "import [%s] from %s with format %s", repr(mi.title), fpath, fmt)
                    self.db.add_format(row.book_id, fmt.upper(), fpath, True)
                    row.status = ScanFile.IMPORTED
                    self.save_or_rollback(row)
                elif row.status != ScanFile.EXIST:
                    # 同名不同作者，导入为新书
                    logging.info("import [%s] from %s as new book (different author)", repr(mi.title), fpath)
                    row.book_id = self.db.import_book(mi, [fpath])
                    row.status = ScanFile.IMPORTED
                    self.save_or_rollback(row)
                    
                    # 添加关联表
                    item = Item()
                    item.book_id = row.book_id
                    item.collector_id = user_id
                    try:
                        item.save()
                        imported.append(row.book_id)
                    except Exception as err:
                        self.session.rollback()
                        logging.error("save link error: %s", err)
            else:
                logging.info("import [%s] from %s", repr(mi.title), fpath)
                row.book_id = self.db.import_book(mi, [fpath])
                row.status = ScanFile.IMPORTED
                self.save_or_rollback(row)

                # 添加关联表
                item = Item()
                item.book_id = row.book_id
                item.collector_id = user_id
                try:
                    item.save()
                    imported.append(row.book_id)
                except Exception as err:
                    self.session.rollback()
                    logging.error("save link error: %s", err)

        # 全部导入完毕后，开始拉取书籍信息
        AutoFillService().auto_fill_all(imported)
