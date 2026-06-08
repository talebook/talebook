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
from webserver.services.booksource.book_source import BookSource
from webserver.services.booksource.engine import BookSourceEngine
from webserver.services.convert import ConvertService


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

    mi = Metadata(detail.name or _("未命名"))
    author = (detail.author or "").strip() or _("佚名")
    mi.authors = [author]
    mi.author_sort = author
    mi.comments = detail.intro or ""
    if detail.kind:
        mi.tags = [t for t in re.split(r"[\s,，、/|]+", detail.kind) if t]
    mi.pubdate = utcnow()
    mi.timestamp = mi.pubdate
    return mi


def _attach_cover(mi, engine, cover_url):
    if not cover_url:
        return
    try:
        img = engine.session.get(cover_url, timeout=CONF.get("BOOKSOURCE_HTTP_TIMEOUT", 20)).content
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
    def save_online_book(self, user_id, source_raw, book_url, fmt="txt", clean=True, task_id=None):
        # 任务由调用方（handler）在请求线程里同步创建并传入 task_id，避免前端轮询早于任务注册的竞态
        try:
            self._do_save(user_id, source_raw, book_url, fmt, clean, task_id)
            if task_id:
                BackgroundService().complete_task(task_id)
        except Exception as e:
            logging.error("save online book failed: %s", e)
            logging.error(traceback.format_exc())
            self.add_msg(user_id, "danger", _("网络小说保存失败：%s") % str(e))
            if task_id:
                BackgroundService().complete_task(task_id, error_message=str(e))

    def _do_save(self, user_id, source_raw, book_url, fmt, clean, task_id):
        engine = BookSourceEngine(BookSource(source_raw), config=_engine_config())
        detail = engine.book_info(book_url)
        chapters = engine.toc(detail.toc_url)
        if not chapters:
            raise RuntimeError(_("未能解析到任何章节，保存终止"))

        max_chapters = CONF.get("BOOKSOURCE_MAX_SAVE_CHAPTERS", 5000)
        if len(chapters) > max_chapters:
            chapters = chapters[:max_chapters]
        total = len(chapters)

        upload_dir = os.path.realpath(CONF["upload_path"])
        os.makedirs(upload_dir, exist_ok=True)
        fname = "%s-%s.txt" % (_safe_filename(detail.name), int(time.time()))
        txt_path = os.path.join(upload_dir, fname)

        with open(txt_path, "w", encoding="utf-8") as f:
            f.write("%s\n\n作者：%s\n\n" % (detail.name, detail.author or _("佚名")))
            if detail.intro:
                f.write("%s\n\n" % detail.intro)
            for idx, ch in enumerate(chapters):
                try:
                    body = engine.content(ch.url, clean=clean)
                except Exception as e:
                    logging.info("save online: chapter failed %s: %s", ch.url, e)
                    body = ""
                f.write("\n\n%s\n\n%s\n" % (ch.name, body))
                if task_id and (idx % 20 == 0 or idx == total - 1):
                    BackgroundService().update_progress(
                        task_id, int((idx + 1) * 100 / total), {"total": total, "done": idx + 1}
                    )

        book_id = self._import_txt(detail, txt_path)
        if not book_id:
            raise RuntimeError(_("导入本地书库失败"))

        self._save_meta(book_id, user_id, engine, detail, chapters)
        if task_id:
            BackgroundService().update_progress(task_id, 100, {"total": total, "done": total, "book_id": book_id})

        if fmt == "epub":
            ConvertService().convert_and_save(user_id, {"id": book_id, "title": detail.name}, txt_path, "epub")
            self.add_msg(user_id, "success", _("《%s》已保存，正在后台转换为 EPUB") % detail.name)
        else:
            self.add_msg(user_id, "success", _("《%s》已保存到本地书库") % detail.name)

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

    def _save_meta(self, book_id, user_id, engine, detail, chapters):
        # cover
        mi = self.db.get_metadata(book_id, index_is_id=True)
        _attach_cover(mi, engine, detail.cover_url)
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
            item.website = detail.book_url or ""
            item.save()

        status = engine.detect_serialization(detail, chapters)
        meta = self.session.query(OnlineBookMeta).filter(OnlineBookMeta.book_id == book_id).first()
        if not meta:
            meta = OnlineBookMeta(book_id=book_id, source_url=engine.base_url, origin_book_url=detail.book_url)
        meta.last_chapter = (chapters[-1].name if chapters else "")[:300]
        if not meta.status_manual:
            meta.serialize_status = status
        meta.save()
