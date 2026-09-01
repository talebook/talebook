#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import logging
import re
import time

from webserver import loader, utils
from webserver.i18n import _
from webserver.plugins.meta.base import to_calibre_metadata
from webserver.plugins.runtime.domains import MetadataQuery
from webserver.services import AsyncService
from webserver.services.external_index import set_metadata_preserving_external_paths
from webserver.services.plugin_runtime import PluginRuntime, ensure_runtime_installations


CONF = loader.get_settings()
META_LOOKUP_CAPABILITY = "metadata.lookup"


class AutoFillService(AsyncService):
    """自动从网上拉取书籍信息，填充到 DB 中"""

    def __init__(self):
        self.count_total = 0
        self.count_skip = 0
        self.count_done = 0
        self.count_fail = 0
        self.is_running = False
        self.current_book_id = None
        self.start_time = None
        self.task_id = None
        AsyncService.__init__(self)

    def status(self):
        """获取运行状态及处理的进度信息"""
        return {
            "is_running": self.is_running,
            "current_book_id": self.current_book_id,
            "start_time": self.start_time,
            "count_total": self.count_total,
            "count_skip": self.count_skip,
            "count_done": self.count_done,
            "count_fail": self.count_fail,
            "task_id": self.task_id,
        }

    @AsyncService.register_service
    def auto_fill_all(self, idlist: list, qpm=60):
        # 检查是否启用了自动填充书籍信息
        if not CONF.get("auto_fill_meta", False):
            logging.info("自动填充书籍信息已关闭，跳过处理")
            return

        # 根据 qpm，计算更新的间隔，避免刷爆豆瓣等服务
        sleep_seconds = 60.0 / qpm

        self.count_total = len(idlist)
        self.count_skip = 0
        self.count_done = 0
        self.count_fail = 0

        for book_id in idlist:
            mi = self.db.get_metadata(book_id, index_is_id=True)
            if not self.should_update(mi):
                logging.info(_("忽略更新书籍 id=%d : 无需更新"), book_id)
                self.count_skip += 1
                continue

            time.sleep(sleep_seconds)
            try:
                if self.do_fill_metadata(book_id, mi):
                    self.count_done += 1
                else:
                    self.count_fail += 1
            except Exception as err:
                self.count_fail += 1
                logging.error(_("执行异常：%s"), err)

    @AsyncService.register_function
    def auto_fill(self, book_id):
        if not CONF.get("auto_fill_meta", False):
            return
        mi = self.db.get_metadata(book_id, index_is_id=True)
        return self.do_fill_metadata(book_id, mi)

    def do_fill_metadata(self, book_id, mi):
        refer_mi = None

        try:
            refer_mi = self.plugin_search_best_book_info(mi)
        except Exception as e:
            logging.error(_("自动填充元数据时出错 id=%d: %s"), book_id, e)
            return False

        if not refer_mi:
            logging.info(_("忽略更新书籍 id=%d : 无法获取信息"), book_id)
            return False

        # 若开启了保留封面选项，且书籍已有封面，则保留原封面，不被抓取到的封面覆盖
        keep_cover = CONF.get("auto_fill_keep_cover", False) and mi.has_cover
        refer_has_cover = bool(refer_mi.cover_data and refer_mi.cover_data[1])

        if not refer_has_cover and not keep_cover:
            # 未获取到封面时不应放弃其余元数据的更新，仅跳过封面字段
            logging.warning(_("更新书籍 id=%d 的信息时无法获取封面，其余元数据将照常更新"), book_id)

        if keep_cover or not refer_has_cover:
            # smart_update(replace_metadata=True) 会无条件覆盖 cover_data，因此这里必须显式回填原封面，
            # 否则封面会被清空为空值
            refer_mi.cover_data = mi.cover_data

        # 保留书名不修改（万一出 BUG，还能抢救一下）
        title = utils.remove_zlibrary_suffix(mi.title)
        refer_mi.title = title
        refer_mi.title_sort = utils.get_title_sort(refer_mi.title)

        mi.smart_update(refer_mi, replace_metadata=True)
        session = self.session if self.session_maker else None
        set_metadata_preserving_external_paths(self.db, session, book_id, mi, ignore_errors=True)
        logging.info(_("自动更新书籍 id=[%d] 的信息，title=%s"), book_id, mi.title)
        return True

    def should_update(self, mi):
        if not mi.comments or not mi.has_cover or not mi.authors or mi.authors[0] in ("佚名", "未知", "Unknown"):
            return True
        return False

    def guess_tags(self, refer_mi, max_count=8):
        ts = []
        for tag in CONF["BOOK_NAV"].replace("=", "/").replace("\n", "/").split("/"):
            if tag in refer_mi.title or tag in refer_mi.comments:
                ts.append(tag)
            elif tag in refer_mi.authors:
                ts.append(tag)
            if len(ts) > max_count:
                break
        return ts

    # 自动补全按固定优先级串行尝试，命中即返回；这与搜索页并发聚合全部来源不同。
    # 顺序与参与的来源均沿用插件化之前的行为：xhsd／tomato／qimao 不参与自动补全。
    AUTOFILL_PRIORITY = (
        "talebook.meta.douban-v2",
        "talebook.meta.calibre",
        "talebook.meta.baike",
        "talebook.meta.neodb",
        "talebook.meta.ai",
    )

    def plugin_search_best_book_info(self, mi):
        ensure_runtime_installations(self.session, CONF)
        title = re.sub("[(（].*", "", mi.title)
        query = MetadataQuery(
            title=title,
            isbn=mi.isbn or "",
            publisher=getattr(mi, "publisher", "") or "",
            authors=tuple(getattr(mi, "authors", None) or ()),
        )
        runtime = PluginRuntime(self.session, CONF)
        connections = runtime.connections_for(META_LOOKUP_CAPABILITY)
        units, failures = runtime.prepare_read(connections, timeout=30)
        for connection_id, error in failures.items():
            logging.warning("自动补全插件连接 %s 不可用：%s", connection_id, error)
        units_by_plugin = {unit["plugin_key"]: unit for unit in units}

        for plugin_id in self.AUTOFILL_PRIORITY:
            unit = units_by_plugin.get(plugin_id)
            if unit is None:
                continue
            try:
                records = unit["call"]("search_books", query) or []
            except Exception as err:
                logging.error(_("元数据插件 %s 查询 %s 失败：%s"), plugin_id, title, err)
                continue
            book = self._best_candidate(records, mi, unit["call"])
            if book is not None:
                return book
        return None

    def _best_candidate(self, records, mi, call):
        """标题完全匹配优先，否则取首个候选；封面按需补齐。

        这段挑选逻辑此前重复实现在 douban_v2 与 neodb 的 search_best() 里，
        属于与来源无关的通用规则，因此上移到平台，避免每个来源各写一遍。
        """
        candidates = [c for c in (to_calibre_metadata(record) for record in records) if c is not None]
        if not candidates:
            return None
        best = next((c for c in candidates if getattr(c, "title", None) == mi.title), candidates[0])
        if not getattr(best, "cover_data", None) and getattr(best, "cover_url", ""):
            try:
                best.cover_data = call("get_cover", best.cover_url)
            except Exception:
                best.cover_data = None
        return best
