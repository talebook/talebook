# -*- coding: utf-8 -*-
"""内置文本工具（正文查找替换 / 繁简转换 / TXT 编码修复）的书籍编排层。

纯处理核心位于 :mod:`webserver.plugins.tool`；本模块负责与 Calibre
书库交互：定位格式文件、写回原书格式、以新书身份入库（完整继承原书
元数据与封面）。

@author: 黏菌, 2026
"""

import logging
import os
import time
from typing import Callable, List, Optional

from webserver import utils


# 支持「写回原书」的格式集合（大写）。工具只处理这两种纯文本容器。
TOOL_FORMATS = ("TXT", "EPUB")


def resolve_book(db, book_id: int) -> dict:
    """读取书籍数据；不存在时抛出 RuntimeError。"""
    books = db.get_data_as_dict(ids=[book_id])
    if not books:
        raise RuntimeError("书籍不存在：ID=%d" % book_id)
    return books[0]


def available_formats(book: dict) -> List[str]:
    """书籍可用格式列表（统一大写）。"""
    return [f.upper() for f in (book.get("available_formats") or [])]


def pick_format(book: dict, candidates=("EPUB", "TXT")) -> Optional[str]:
    """按优先级挑选可处理的格式；无可用格式返回 None。"""
    fmts = available_formats(book)
    for fmt in candidates:
        if fmt in fmts:
            return fmt
    return None


def get_format_path(db, book_id: int, fmt: str) -> str:
    """返回指定格式文件的绝对路径；缺失 / 不可读时抛出 RuntimeError。"""
    path = db.format_abspath(book_id, fmt, index_is_id=True)
    if not path or not os.path.exists(path):
        raise RuntimeError("找不到 %s 文件，可能已被移除" % fmt)
    if not os.path.isfile(path):
        # 目录 / 特殊设备等非普通文件：给出明确提示而非 IsADirectoryError 堆栈
        raise RuntimeError("%s 文件路径异常（不是普通文件），可能已被破坏" % fmt)
    try:
        # 提前验证可读性（权限 / 独占锁定 / 已删除句柄等），转成友好错误
        with open(path, "rb") as f:
            f.read(1)
    except (PermissionError, OSError) as err:
        raise RuntimeError("无法读取 %s 文件：%s" % (fmt, err)) from err
    return path


def overwrite_format(
    db,
    book_id: int,
    fmt: str,
    out_path: str,
    backup_dir: Optional[str] = None,
    backup_state: Optional[dict] = None,
) -> Optional[str]:
    """用处理后文件替换原书的指定格式；可选备份原文件，返回备份路径。

    备份保存在 ``backup_dir``（调用方提供持久目录），避免随临时目录清理误删。
    """
    backup_path = None
    if backup_dir:
        src = db.format_abspath(book_id, fmt, index_is_id=True)
        if src and os.path.exists(src):
            import shutil

            os.makedirs(backup_dir, exist_ok=True)
            backup_path = os.path.join(
                backup_dir,
                "backup_%d_%s_%d.%s" % (book_id, fmt.lower(), int(time.time()), fmt.lower()),
            )
            shutil.copy2(src, backup_path)
            if backup_state is not None:
                backup_state["backup_path"] = backup_path
            logging.info("[booktools] Backed up %s of book %d to %s", fmt, book_id, backup_path)
    with open(out_path, "rb") as f:
        db.add_format(book_id, fmt, f, index_is_id=True)
    logging.info("[booktools] Replaced %s for book_id=%d", fmt, book_id)
    return backup_path


def import_as_new_book(
    db,
    session,
    src_book_id: int,
    out_path: str,
    title_suffix: str = "",
    language: Optional[str] = None,
    convert_text: Optional[Callable[[str], str]] = None,
    title_override: Optional[str] = None,
    authors_override: Optional[List[str]] = None,
    collector_id: Optional[int] = None,
) -> int:
    """以新书身份入库：复用原书完整元数据 + 封面，标题追加后缀。

    :param db:            Calibre 数据库对象。
    :param session:       Talebook SQLAlchemy session（创建 Item 收藏记录）。
    :param src_book_id:   原书 ID（元数据来源）。
    :param out_path:      处理后新文件的绝对路径。
    :param title_suffix:  追加到标题末尾的后缀（如「（正文替换版）」）。
    :param language:      可选，覆盖语言字段（如 ``"zh"`` / ``"zht"``）。
    :param convert_text:  可选，标题 / 作者文本转换函数（繁简转换使用）。
    :param collector_id:  可选，操作用户 ID（创建 Item 收藏记录）。
    :return: 新书 Calibre book_id。
    """
    from webserver.models import Item

    # get_metadata 每次返回全新对象，可直接原地修改（勿 deepcopy，
    # 其内部挂有指向 Cache 的代理，深拷贝不安全）
    mi = db.get_metadata(src_book_id, index_is_id=True, get_cover=True)
    cover_bytes = getattr(mi, "cover", None)

    title = (title_override if title_override is not None else mi.title or "Unknown").strip()
    if convert_text:
        title = convert_text(title)
    if title_suffix:
        title = "%s%s" % (title, title_suffix)
    mi.title = utils.super_strip(title)
    mi.title_sort = utils.get_title_sort(mi.title)

    authors = list(authors_override) if authors_override is not None else list(mi.authors) if mi.authors else []
    if authors_override is not None:
        mi.authors = authors
        mi.author_sort = None
    if convert_text and authors:
        mi.authors = [convert_text(a) for a in authors]
        mi.author_sort = None  # 名字已转换，排序键由 calibre 按新名字重算
    if language:
        mi.languages = [language]
    elif not mi.languages:
        mi.languages = ["zho"]
    mi.uuid = None  # 新书应使用独立 UUID，避免与原书冲突
    # calibre 的 add_books 仅通过 cover_data 写入封面，必须显式填充；
    # 格式传 "jpeg"（fmt 为 None 时部分 calibre 版本不认）
    if cover_bytes:
        mi.cover_data = ("jpeg", cover_bytes)

    logging.info("[booktools] Importing as new book: book_id=%d -> %s", src_book_id, mi.title)
    new_book_id = db.import_book(mi, [out_path])
    if not new_book_id:
        raise RuntimeError("导入文件失败，Calibre未返回书籍ID")

    if collector_id:
        try:
            item = Item()
            item.book_id = new_book_id
            item.collector_id = collector_id
            item.save()
        except Exception as err:
            # Item 记录失败不影响入库结果
            logging.warning("[booktools] Failed to create Item for book_id=%s: %s", new_book_id, err)

    return new_book_id
