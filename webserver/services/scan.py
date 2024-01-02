#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import hashlib
import os
import logging
import time
import traceback

from webserver import utils
from webserver.models import Item, ScanFile
from webserver.services import AsyncService

SCAN_EXT = ["azw", "azw3", "epub", "mobi", "pdf", "txt"]


class ScanService(AsyncService):
    def save_or_rollback(self, row):
        try:
            row.save()
            self.session.commit()
            bid = "[ book-id=%s ]" % row.book_id
            logging.error("update: status=%-5s, path=%s %s", row.status, row.path, bid if row.book_id > 0 else "")
            return True
        except Exception as err:
            logging.error(traceback.format_exc())
            self.session.rollback()
            logging.error("save error: %s", err)
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
            with open(fpath, "rb") as stream:
                mi = get_metadata(stream, stream_type=fmt, use_libprs_metadata=True)
                mi.title = utils.super_strip(mi.title)
                mi.authors = [utils.super_strip(s) for s in mi.authors]

            row.title = mi.title
            row.author = mi.author_sort
            row.publisher = mi.publisher
            row.tags = ", ".join(mi.tags)
            row.status = ScanFile.READY  # 设置为可处理

            # TODO calibre提供的书籍重复接口只有对比title；应当提前对整个书库的文件做哈希，才能准确去重
            books = self.db.books_with_same_title(mi)
            if books:
                row.book_id = books.pop()
                row.status = ScanFile.EXIST
            if not self.save_or_rollback(row):
                continue

    @AsyncService.register_service
    def do_import(self, hashlist, user_id):
        from calibre.ebooks.metadata.meta import get_metadata

        # 生成任务ID
        import_id = int(time.time())

        query = self.build_query(hashlist)
        query.update({ScanFile.import_id: import_id}, synchronize_session=False)
        self.session.commit()

        # 逐个处理
        for row in query.all():
            fpath = row.path
            fmt = fpath.split(".")[-1].lower()
            with open(fpath, "rb") as stream:
                mi = get_metadata(stream, stream_type=fmt, use_libprs_metadata=True)
                mi.title = utils.super_strip(mi.title)
                mi.authors = [utils.super_strip(s) for s in mi.authors]

            # 再次检查是否有重复书籍
            books = self.db.books_with_same_title(mi)
            if books:
                row.status = ScanFile.EXIST
                row.book_id = books.pop()
                self.save_or_rollback(row)
                continue

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
            except Exception as err:
                self.session.rollback()
                logging.error("save link error: %s", err)
