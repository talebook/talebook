#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""把网络小说抓取并保存到本地书库（导出 txt / epub）。"""

import logging
import os
import re
import time
import traceback

from webserver import loader
from webserver.i18n import _
from webserver.models import Item, OnlineBookMeta
from webserver.services import AsyncService
from webserver.services.background_service import BackgroundService
from webserver.services.booksource.engine import FINISHED_KEYWORDS, SERIAL_KEYWORDS
from webserver.services.convert import ConvertService
from webserver.services.source_catalog import SourceCatalogService


CONF = loader.get_settings()


def _engine_config():
    return {
        "BOOKSOURCE_HTTP_TIMEOUT": CONF.get("BOOKSOURCE_HTTP_TIMEOUT", 20),
        "BOOKSOURCE_MAX_TOC_PAGES": CONF.get("BOOKSOURCE_MAX_TOC_PAGES", 30),
        "BOOKSOURCE_MAX_CONTENT_PAGES": CONF.get("BOOKSOURCE_MAX_CONTENT_PAGES", 20),
        "BOOKSOURCE_AD_PATTERNS": CONF.get("BOOKSOURCE_AD_PATTERNS", []),
        "BOOKSOURCE_CLEAN_ENABLED": CONF.get("BOOKSOURCE_CLEAN_ENABLED", True),
    }


def _safe_filename(name):
    name = re.sub(r"[\\/:*?\"<>|\r\n\t]", "_", name or "online")
    return name.strip()[:80] or "online"


def _build_metadata(detail):
    from calibre.ebooks.metadata.book.base import Metadata
    from calibre.utils.date import utcnow

    mi = Metadata(detail.title or _("未命名"))
    author = (detail.authors[0] if detail.authors else "").strip() or _("佚名")
    mi.authors = [author]
    mi.author_sort = author
    mi.comments = detail.description or ""
    if detail.categories:
        mi.tags = list(detail.categories)
    mi.pubdate = utcnow()
    mi.timestamp = mi.pubdate
    return mi


def _attach_cover(mi, cover_url):
    if not cover_url:
        return
    try:
        from webserver.plugins.runtime.safe_http import SafeHttpClient

        img = (
            SafeHttpClient()
            .request(
                "GET",
                cover_url,
                timeout=CONF.get("BOOKSOURCE_HTTP_TIMEOUT", 20),
            )
            .content
        )
        if not img:
            return
        try:
            from io import BytesIO

            from PIL import Image

            image = Image.open(BytesIO(img))
            if image.mode in ("RGBA", "P"):
                image = image.convert("RGB")
            out = BytesIO()
            image.save(out, format="JPEG")
            img = out.getvalue()
        except Exception:
            pass
        mi.cover_data = ("jpg", img)
    except Exception as e:
        logging.info("save online: fetch cover failed: %s", e)


class SaveOnlineBookService(AsyncService):
    @staticmethod
    def make_tag(source_id, book_url):
        """前后端一致的任务定位键：按书源 + 书籍 URL 唯一。"""
        return "online_save:%s:%s" % (source_id, book_url)

    @AsyncService.register_service
    def save_online_book(self, user_id, source_key, book_url, fmt="txt", clean=True, task_id=None):
        # 任务由调用方（handler）在请求线程里同步创建并传入 task_id，避免前端轮询早于任务注册的竞态
        try:
            self._do_save(user_id, source_key, book_url, fmt, clean, task_id)
            if task_id:
                BackgroundService().complete_task(task_id)
        except Exception as e:
            logging.error("save online book failed: %s", e)
            logging.error(traceback.format_exc())
            self.add_msg(user_id, "danger", _("网络小说保存失败：%s") % str(e))
            if task_id:
                BackgroundService().complete_task(task_id, error_message=str(e))

    def _do_save(self, user_id, source_key, book_url, fmt, clean, task_id):
        catalog = SourceCatalogService(self.session, CONF, user_id)
        source = catalog.get(source_key)
        detail = catalog.read(source, "get_book", book_url)
        if source.download_mode == "none":
            raise RuntimeError(_("该书源不支持保存到本地"))

        if source.download_mode == "single_book":
            book_file = catalog.read(source, "download", detail)
            book_id = self._import_file(detail, book_file)
            if not book_id:
                raise RuntimeError(_("导入本地书库失败"))
            self._save_meta(book_id, user_id, detail, [])
            if task_id:
                BackgroundService().update_progress(task_id, 100, {"total": 1, "done": 1, "book_id": book_id})
            self.add_msg(user_id, "success", _("《%s》已保存到本地书库") % detail.title)
            return

        chapters = catalog.read(source, "get_toc", detail)
        if not chapters:
            raise RuntimeError(_("未能解析到任何章节，保存终止"))

        max_chapters = CONF.get("BOOKSOURCE_MAX_SAVE_CHAPTERS", 5000)
        if len(chapters) > max_chapters:
            chapters = chapters[:max_chapters]
        total = len(chapters)

        upload_dir = os.path.realpath(CONF["upload_path"])
        os.makedirs(upload_dir, exist_ok=True)
        fname = "%s-%s.txt" % (_safe_filename(detail.title), int(time.time()))
        txt_path = os.path.join(upload_dir, fname)
        assemble_from_chapters(
            detail,
            chapters,
            lambda chapter: catalog.read(source, "get_chapter", chapter, extra_config={"clean": clean}),
            txt_path,
            task_id=task_id,
        )

        book_id = self._import_txt(detail, txt_path)
        if not book_id:
            raise RuntimeError(_("导入本地书库失败"))

        self._save_meta(book_id, user_id, detail, chapters)
        if task_id:
            BackgroundService().update_progress(task_id, 100, {"total": total, "done": total, "book_id": book_id})

        if fmt == "epub":
            ConvertService().convert_and_save(user_id, {"id": book_id, "title": detail.title}, txt_path, "epub")
            self.add_msg(user_id, "success", _("《%s》已保存，正在后台转换为 EPUB") % detail.title)
        else:
            self.add_msg(user_id, "success", _("《%s》已保存到本地书库") % detail.title)

    def _import_file(self, detail, book_file):
        upload_dir = os.path.realpath(CONF["upload_path"])
        os.makedirs(upload_dir, exist_ok=True)
        format_name = str(book_file.format or "").upper()
        if not format_name:
            raise RuntimeError(_("书源未返回文件格式"))
        filename = _safe_filename(book_file.filename or detail.title)
        if not filename.lower().endswith(".%s" % format_name.lower()):
            filename = "%s.%s" % (filename, format_name.lower())
        path = os.path.join(upload_dir, "%s-%s" % (int(time.time()), filename))
        with open(path, "wb") as stream:
            stream.write(book_file.content)

        metadata = _build_metadata(detail)
        same_author_book_id = None
        try:
            books = self.db.books_with_same_title(metadata)
            for book in self.db.get_data_as_dict(ids=books) if books else []:
                if set(book.get("authors", [])) == set(metadata.authors):
                    same_author_book_id = book.get("id")
                    if format_name in (book.get("available_formats", "") or ""):
                        return same_author_book_id
        except Exception as exc:
            logging.info("save online: dedupe check failed: %s", exc)
        if same_author_book_id:
            self.db.add_format(same_author_book_id, format_name, path, True)
            return same_author_book_id
        return self.db.import_book(metadata, [path])

    def _import_txt(self, detail, txt_path):
        mi = _build_metadata(detail)
        same_author_book_id = None
        try:
            books = self.db.books_with_same_title(mi)
            if books:
                for b in self.db.get_data_as_dict(ids=books):
                    if set(b.get("authors", [])) == set(mi.authors):
                        same_author_book_id = b.get("id")
                        if "TXT" in (b.get("available_formats", "") or ""):
                            return same_author_book_id
        except Exception as e:
            logging.info("save online: dedupe check failed: %s", e)

        if same_author_book_id:
            self.db.add_format(same_author_book_id, "TXT", txt_path, True)
            return same_author_book_id
        return self.db.import_book(mi, [txt_path])

    def _save_meta(self, book_id, user_id, detail, chapters):
        # cover
        mi = self.db.get_metadata(book_id, index_is_id=True)
        _attach_cover(mi, detail.cover_url)
        if getattr(mi, "cover_data", None) and mi.cover_data[1]:
            try:
                self.db.set_cover(book_id, mi.cover_data[1])
            except Exception as e:
                logging.info("save online: set cover failed: %s", e)

        existing_item = self.session.query(Item).filter(Item.book_id == book_id).first()
        if not existing_item:
            item = Item()
            item.book_id = book_id
            item.collector_id = user_id or 1
            item.book_type = "online"
            item.website = detail.source_url or detail.external_id
            item.save()

        status = _serialize_status(detail, chapters)
        meta = self.session.query(OnlineBookMeta).filter(OnlineBookMeta.book_id == book_id).first()
        if not meta:
            meta = OnlineBookMeta(book_id=book_id, source_url=detail.source_url, origin_book_url=detail.external_id)
        meta.last_chapter = (chapters[-1].title if chapters else "")[:300]
        if not meta.status_manual:
            meta.serialize_status = status
        meta.save()


def assemble_from_chapters(detail, chapters, get_chapter, txt_path, task_id=None):
    """通用分章组装：插件只返回章节正文，平台负责进度、部分失败与文件。"""
    total = len(chapters)
    with open(txt_path, "w", encoding="utf-8") as stream:
        author = detail.authors[0] if detail.authors else _("佚名")
        stream.write("%s\n\n作者：%s\n\n" % (detail.title, author))
        if detail.description:
            stream.write("%s\n\n" % detail.description)
        for index, chapter in enumerate(chapters):
            try:
                content = get_chapter(chapter)
                body = content.content
            except Exception as exc:
                logging.info("save online: chapter failed %s: %s", chapter.external_id, exc)
                body = ""
            stream.write("\n\n%s\n\n%s\n" % (chapter.title, body))
            if task_id and (index % 20 == 0 or index == total - 1):
                BackgroundService().update_progress(
                    task_id,
                    int((index + 1) * 100 / total),
                    {"total": total, "done": index + 1},
                )
    return txt_path


def _serialize_status(detail, chapters):
    declared = detail.extra.get("serialize_status", "unknown")
    text = " ".join([detail.last_chapter, *(chapter.title for chapter in chapters[-3:])])
    if any(keyword in text for keyword in FINISHED_KEYWORDS):
        return OnlineBookMeta.FINISHED
    if any(keyword in text for keyword in SERIAL_KEYWORDS):
        return OnlineBookMeta.SERIAL
    return declared
