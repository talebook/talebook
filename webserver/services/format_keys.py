#!/usr/bin/python
# -*- coding: UTF-8 -*-
"""格式键解析：把 ``fmt_<format>`` 键的来源从 Calibre 的 ``books.path`` 切换到 ``book_formats`` 表。

背景
----
Calibre 的 ``Cache.format_abspath(book_id, fmt)`` 基于 ``books.path`` 推导文件路径，
Talebook 把结果塞进 book dict 的 ``fmt_<format>`` 键，随后被 22 条路由直接读取
（``handlers/book.py``、``handlers/base.py``、``handlers/files.py``、
``webdav/dav_provider.py``、``plugins/push/kindle.py``、``services/comic_archive.py``、
``services/convert.py``）。

booksvr 的存储层把格式路径存进 ``book_formats`` 表（绝对路径，原地登记不复制）。
本模块提供唯一的解析入口，让上述 22 条路由继续读 ``fmt_<format>`` 键，
但取值来自 ``book_formats``，从而不再依赖「文件系统即数据库」。

设计约束
--------
- 对外契约不变：``fmt_<format>`` 键名、大小写、取值语义（绝对路径）与旧版一致。
- 缺失文件不删除记录：``book_formats`` 行仍在，只是路径指向的文件可能不存在。
- 未迁移的库（没有 ``book_formats`` 表）必须回退到 Calibre 原路径，保证平滑过渡。
"""

import logging
import os

from sqlalchemy import bindparam, text


# 与 webserver/services/media_analysis.py 的常量保持一致。
# 这里只列出 book_formats 可能出现的格式；读取时统一小写。
FORMAT_KEY_PREFIX = "fmt_"

logger = logging.getLogger(__name__)

# 进程内缓存「book_formats 表是否存在」，避免每本书都查一次 sqlite_master。
_table_presence_cache = {}


def _book_formats_table_exists(session):
    """判断当前数据库是否已有 book_formats 表（booksvr 迁移后才有）。"""
    bind = session.get_bind()
    key = str(bind.engine.url)
    cached = _table_presence_cache.get(key)
    if cached is not None:
        return cached

    try:
        row = session.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='book_formats'")
        ).fetchone()
        exists = row is not None
    except Exception as exc:  # noqa: BLE001 - 非 SQLite 或权限问题都按「不存在」处理
        logger.debug("book_formats 表探测失败，回退 Calibre 路径: %s", exc)
        exists = False

    _table_presence_cache[key] = exists
    return exists


def load_format_paths(session, book_ids):
    """批量读取 ``book_formats``，返回 ``{book_id: {format_lower: path}}``。

    未迁移的库返回空 dict，调用方据此回退到 Calibre 路径。
    """
    if not book_ids:
        return {}
    if not _book_formats_table_exists(session):
        return {}

    # 用 expanding bindparam 展开 IN 列表；直接传 tuple 会被当成单个参数。
    stmt = text("SELECT book_id, format, path FROM book_formats WHERE book_id IN :ids").bindparams(
        bindparam("ids", expanding=True)
    )
    rows = session.execute(stmt, {"ids": list(book_ids)}).fetchall()

    result = {}
    for book_id, fmt, path in rows:
        if not fmt:
            continue
        result.setdefault(int(book_id), {})[str(fmt).lower()] = path
    return result


def apply_format_keys(session, books):
    """把 ``book_formats`` 的路径写入每本书的 ``fmt_<format>`` 键。

    这是 22 条路由读取格式路径的唯一来源。对未迁移的库不做任何改动，
    保持 Calibre 原有行为。

    :param session: SQLAlchemy session
    :param books: book dict 列表（原地修改）
    :return: 实际被覆盖的书籍数量，便于日志与测试断言
    """
    if not books:
        return 0

    book_ids = [int(b["id"]) for b in books if b.get("id") is not None]
    paths_by_book = load_format_paths(session, book_ids)
    if not paths_by_book:
        return 0

    touched = 0
    for book in books:
        book_id = book.get("id")
        if book_id is None:
            continue
        formats = paths_by_book.get(int(book_id))
        if not formats:
            continue
        for fmt_lower, path in formats.items():
            book[FORMAT_KEY_PREFIX + fmt_lower] = path
        touched += 1
    return touched


def available_formats(book):
    """从 book dict 的 ``fmt_<format>`` 键重建 ``available_formats`` 字符串。

    旧版由 Calibre 的 ``field_metadata`` 提供；新模型下格式存在性来自
    ``book_formats``，因此统一从 ``fmt_<format>`` 键推导，保证两条路径一致。

    返回形如 ``"EPUB,MOBI"`` 的逗号分隔大写格式名，按字母序排列。
    """
    formats = []
    for key, value in book.items():
        if not key.startswith(FORMAT_KEY_PREFIX) or not value:
            continue
        fmt = key[len(FORMAT_KEY_PREFIX):]
        if fmt:
            formats.append(fmt.upper())
    return ",".join(sorted(formats))


def format_path(book, fmt):
    """读取某本书指定格式的路径，缺失时返回 None。

    统一大小写，避免 ``book["fmt_EPUB"]`` 与 ``book["fmt_epub"]`` 的差异。
    """
    if not fmt:
        return None
    return book.get(FORMAT_KEY_PREFIX + str(fmt).lower())


def has_format(book, fmt):
    """判断某本书是否有指定格式（以路径非空为准）。"""
    return bool(format_path(book, fmt))


def file_missing(path):
    """判断格式文件是否已从磁盘消失。

    记录保留在 ``book_formats`` 中，仅路径失效；调用方据此返回既有的
    ``file.missing`` 语义，而不是删除记录。
    """
    return not path or not os.path.exists(path)
