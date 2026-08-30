# -*- coding: UTF-8 -*-

import asyncio
import concurrent.futures
import datetime
import html
import json
import logging
import os
import random
import re
import shutil
import time
import urllib

import tornado.escape
from tornado import web

from webserver import demo_mode, loader, utils
from webserver.constants import CALIBRE_ERROR_FLAG
from webserver.handlers.base import BaseHandler, ListHandler, auth, js
from webserver.i18n import _
from webserver.models import (
    AudiobookEdition,
    Item,
    ReadingState,
)
from webserver.plugins.meta import baike, biquge, calibre, douban_v2, neodb, qimao, tomato, xhsd, youshu
from webserver.plugins.meta import common as meta_common
from webserver.plugins.meta.ai.api import KEY as AI_KEY
from webserver.plugins.meta.ai.api import AIBookApi
from webserver.plugins.meta.base import to_calibre_metadata
from webserver.plugins.parser.txt import get_content_encoding
from webserver.plugins.push.base import PUSH_CAPABILITY
from webserver.plugins.runtime.domains import MetadataQuery
from webserver.plugins.runtime.protocol import UpstreamError
from webserver.plugins.runtime.triggers import TRIGGER_AUTO, trigger_of
from webserver.services.async_service import AsyncService
from webserver.services.autofill import AutoFillService
from webserver.services.booksource.metadata import (
    KEY as BOOKSOURCE_KEY,
)
from webserver.services.booksource.metadata import (
    BookSourceMetadataService,
    MetadataSearchResult,
    collect_metadata_sources,
    metadata_to_evidence,
)
from webserver.services.convert import CONVERSION_TARGETS, ConvertService
from webserver.services.external_index import (
    delete_external_index_book_record,
    is_external_index_book,
    remove_formats_preserving_external_files,
    set_metadata_preserving_external_paths,
)
from webserver.services.extract import ExtractService
from webserver.services.mail import MailService
from webserver.services.plugin_runtime import REGISTRY, PluginRuntime, PluginRuntimeError, ensure_runtime_installations


# 调用方按能力找插件，不认识任何具体 plugin_key。
META_LOOKUP_CAPABILITY = "metadata.lookup"
TRANSFORM_CAPABILITY = "integrations.tool"


CONF = loader.get_settings()
# 元数据来源可能发生不可取消的阻塞 I/O；全进程共享固定容量，避免每个
# 请求各建线程池而让超时任务无限累积线程。
_METADATA_EXECUTOR = concurrent.futures.ThreadPoolExecutor(max_workers=16, thread_name_prefix="metadata-lookup")


class Index(BaseHandler):
    def fmt(self, b):
        return utils.BookFormatter(self, b).format()

    @js
    def get(self):
        # 从配置中获取首页设置，如果未设置则使用默认值
        setting_random_count = CONF.get("MAIN_PAGE_RANDOM_COUNT", 12)
        setting_recent_count = CONF.get("MAIN_PAGE_RECENT_COUNT", 12)

        # 允许通过 URL 参数覆盖配置（用于兼容旧接口），但不超过配置值
        cnt_random = min(int(self.get_argument("random", setting_random_count)), setting_random_count)
        cnt_recent = min(int(self.get_argument("recent", setting_recent_count)), 200)

        # nav = "index"
        # title = _(u"全部书籍")
        ids = list(self.cache.search(""))
        random_books = []
        new_books = []

        if ids:
            private_book_ids = self._get_private_book_ids()
            ids = [book_id for book_id in ids if book_id not in private_book_ids]

        if ids:
            # 如果配置为 0，则不显示随机推荐
            if cnt_random > 0:
                random_ids = random.sample(ids, min(cnt_random, len(ids)))
                random_books = [b for b in self.get_books(ids=random_ids, check_permission=False)]
                random_books.sort(key=lambda x: x["id"], reverse=True)

            ids.sort(reverse=True)
            # 确保不会尝试从空列表中取样
            sample_ids = ids[0:100] if len(ids) > 100 else ids
            new_ids = random.sample(sample_ids, min(cnt_recent, len(sample_ids)))
            new_books = [b for b in self.get_books(ids=new_ids, check_permission=False)]
            new_books.sort(key=lambda x: x["id"], reverse=True)

        return {
            "random_books_count": len(random_books),
            "new_books_count": len(new_books),
            "random_books": self.attach_reading_states([self.fmt(b) for b in random_books]),
            "new_books": self.attach_reading_states([self.fmt(b) for b in new_books]),
        }


class BookDetail(BaseHandler):
    @js
    def get(self, id):
        book_id = int(id)
        if not self.can_view_book(book_id):
            return {"err": "book.not_found", "msg": _("书籍不存在")}
        book = self.get_book(book_id)
        book_info = utils.BookFormatter(self, book).format(with_files=True, with_perms=True)
        reading_state = None
        user_id = self.user_id()
        if user_id:
            state = (
                self.session.query(ReadingState)
                .filter(
                    ReadingState.book_id == int(id),
                    ReadingState.reader_id == user_id,
                )
                .first()
            )
            if state:
                reading_state = utils.ReadingStateFormatter.format_reading_state(state)
        if reading_state:
            book_info["state"] = reading_state
        return {
            "err": "ok",
            "kindle_sender": CONF["smtp_username"],
            "book": book_info,
            "conversion_options": ConvertService.get_conversion_options(book),
        }


class BookConverter(BaseHandler):
    @js
    @auth
    def post(self, id):
        book_id = int(id)
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "params.book.invalid", "msg": _("书籍不存在")}

        if not self.is_admin() and not self.is_book_owner(book_id, self.user_id()):
            return {"err": "user.no_permission", "msg": _("无权限")}

        source_format = self.get_argument("source_format", "").strip().lower()
        target_format = self.get_argument("target_format", "").strip().lower()
        # Validate the requested (source, target) is a supported conversion route.
        # `get_conversion_options` only returns one option per target (with a
        # fallback source), so looking up the user-supplied pair there would
        # falsely report `unsupported` whenever the book lacks every source
        # format for that target. Build the option against CONVERSION_TARGETS
        # directly so we can distinguish "route doesn't exist" from "book
        # doesn't carry the source".
        valid_sources_for_target = next(
            (sources for target, sources in CONVERSION_TARGETS if target == target_format),
            None,
        )
        if not valid_sources_for_target or source_format not in valid_sources_for_target:
            return {
                "err": "params.convert.unsupported",
                "msg": _("不支持从 %s 转换为 %s") % (source_format.upper() or "?", target_format.upper() or "?"),
            }
        if book.get(f"fmt_{target_format}"):
            return {
                "err": "params.convert.target_exists",
                "msg": _("本书已有 %s 格式，无需重复转换") % target_format.upper(),
            }
        if not book.get(f"fmt_{source_format}"):
            return {
                "err": "params.convert.source_missing",
                "msg": _("本书没有 %s 格式") % source_format.upper(),
            }

        fpath = book[f"fmt_{source_format}"]

        service = ConvertService()
        if service.is_book_converting(book):
            return {"err": "params.book.converting", "msg": _("本书正在转换中，请稍后再试")}
        service.convert_and_save(self.user_id(), book, fpath, target_format)
        return {"err": "ok", "content": "%s" % _("转换成功，请稍后刷新页面查看")}


class BookToPDF(BaseHandler):
    @js
    @auth
    def post(self, id):
        book_id = int(id)
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "params.book.invalid", "msg": _("书籍不存在")}

        if not self.is_admin() and not self.is_book_owner(book_id, self.user_id()):
            return {"err": "user.no_permission", "msg": _("无权限")}

        fmts = []
        paths = []
        has_pdf = False
        for fmt in ["epub", "azw3", "mobi", "azw", "pdf"]:
            book_path = book.get("fmt_%s" % fmt, None)
            if not book_path:
                continue
            if fmt == "pdf":
                has_pdf = True
                continue
            fmts.append(fmt)
            paths.append(book_path)

        if has_pdf:
            return {"err": "params.book.invalid", "msg": _("本书已有PDF版本, 不需要转换")}
        if len(fmts) == 0:
            return {"err": "params.book.invalid", "msg": _("本书不支持转换，仅支持EPUB及Kindle使用的格式转换为PDF")}

        fpath = paths[0]
        service = ConvertService()
        if service.is_book_converting(book):
            return {"err": "params.book.converting", "msg": _("本书正在转换中，请稍后再试")}
        service.convert_and_save(self.user_id(), book, fpath, "pdf")
        return {"err": "ok", "content": "%s" % _("转换成功，请稍后刷新页面查看")}


class BookRefer(BaseHandler):
    SOURCE_RESULT_LIMIT = 5

    def has_proper_book(self, books, mi):
        if not books or not mi.isbn or mi.isbn == baike.BAIKE_ISBN:
            return False

        for b in books:
            if mi.isbn == b.get("isbn13", "xxx"):
                return True
            if mi.title == b.get("title") and mi.publisher == b.get("publisher"):
                return True
        return False

    REFER_TIMEOUT = 30  # 并行查询总超时秒数（需大于 AI HTTP timeout）

    def plugin_search_books(self, mi):
        tasks = self._build_search_tasks(mi)
        if not tasks:
            self._refer_summary = {"event": "summary", "failures": [], "total": 0, "completed": 0}
            return []

        logging.info("并行查询 %d 个信息源，超时 %ds", len(tasks), self.REFER_TIMEOUT)
        books = []
        failures = []
        completed = 0
        outcomes = {}
        future_map = {_METADATA_EXECUTOR.submit(fn): name for name, fn in tasks.items()}
        done, not_done = concurrent.futures.wait(future_map, timeout=self.REFER_TIMEOUT)
        for f in not_done:
            f.cancel()
            name = future_map[f]
            logging.warning("查询 %s 超时，已跳过", name)
            failures.append(self._refer_failure(name, "timeout", "查询超时"))
            outcomes[name] = PluginRuntimeError(
                "plugin.timeout",
                "Plugin metadata lookup timed out",
                retryable=True,
            )
        for f in done:
            name = future_map[f]
            completed += 1
            try:
                result = f.result()
                outcomes[name] = result
                result_books, result_failures = self._unpack_search_result(name, result)
                books.extend(result_books)
                failures.extend(result_failures)
                logging.info("%s 查询完成：%d 条", name, len(result_books))
            except Exception as e:
                logging.error("%s 查询失败：%s", name, e)
                outcomes[name] = e
                failures.append(self._refer_failure(name, "fetch_failed", "查询失败"))

        self._finish_plugin_lookup(outcomes)
        self._refer_summary = {
            "event": "summary",
            "failures": self._dedupe_failures(failures),
            "total": len(tasks),
            "completed": completed,
        }
        logging.info("所有信息源查询完成，共找到 %d 条结果", len(books))
        return books

    async def plugin_search_books_stream(self, mi):
        tasks = self._build_search_tasks(mi)
        if not tasks:
            yield {"event": "summary", "failures": [], "total": 0, "completed": 0}
            return

        logging.info("并行查询(流式) %d 个信息源，超时 %ds", len(tasks), self.REFER_TIMEOUT)
        loop = asyncio.get_event_loop()
        failures = []
        completed = 0
        outcomes = {}
        pending_map = {}
        yield {"event": "progress", "failures": [], "total": len(tasks), "completed": 0}
        try:
            pending_map = {loop.run_in_executor(_METADATA_EXECUTOR, fn): name for name, fn in tasks.items()}
            deadline = time.time() + self.REFER_TIMEOUT

            while pending_map:
                remaining = deadline - time.time()
                if remaining <= 0:
                    for fut, name in pending_map.items():
                        fut.cancel()
                        logging.warning("查询 %s 超时，已跳过", name)
                        failures.append(self._refer_failure(name, "timeout", "查询超时"))
                        outcomes[name] = PluginRuntimeError(
                            "plugin.timeout",
                            "Plugin metadata lookup timed out",
                            retryable=True,
                        )
                    yield {
                        "event": "progress",
                        "failures": self._dedupe_failures(failures),
                        "total": len(tasks),
                        "completed": completed,
                    }
                    break

                done_set, _ = await asyncio.wait(
                    pending_map.keys(),
                    timeout=remaining,
                    return_when=asyncio.FIRST_COMPLETED,
                )

                for fut in done_set:
                    name = pending_map.pop(fut)
                    completed += 1
                    try:
                        result = fut.result()
                        outcomes[name] = result
                        result_books, result_failures = self._unpack_search_result(name, result)
                        failures.extend(result_failures)
                        logging.info("%s 查询完成：%d 条", name, len(result_books))
                        for b in result_books:
                            yield b
                    except Exception as e:
                        logging.error("%s 查询失败：%s", name, e)
                        outcomes[name] = e
                        failures.append(self._refer_failure(name, "fetch_failed", "查询失败"))
                    yield {
                        "event": "progress",
                        "failures": self._dedupe_failures(failures),
                        "total": len(tasks),
                        "completed": completed,
                    }
        finally:
            for fut in pending_map:
                fut.cancel()
            # 事件循环所在线程写 health，worker 不触碰 session。
            self._finish_plugin_lookup(outcomes)
        yield {
            "event": "summary",
            "failures": self._dedupe_failures(failures),
            "total": len(tasks),
            "completed": completed,
        }

    @staticmethod
    def _refer_failure(source, code, message):
        return {"source": source, "code": code, "message": message}

    def _unpack_search_result(self, name, result):
        if isinstance(result, MetadataSearchResult):
            books = list(result.books or [])[: self.SOURCE_RESULT_LIMIT]
            failures = list(result.failures or [])
        else:
            books = list(result or [])[: self.SOURCE_RESULT_LIMIT]
            failures = []
        if not books and not failures:
            failures.append(self._refer_failure(name, "no_result", "未找到匹配图书"))
        return books, failures

    @staticmethod
    def _dedupe_failures(failures):
        seen = set()
        output = []
        for failure in failures:
            safe_failure = {
                field: html.escape(str(failure.get(field) or ""), quote=True) for field in ("source", "code", "message")
            }
            key = (safe_failure["source"], safe_failure["code"])
            if key not in seen:
                seen.add(key)
                output.append(safe_failure)
        return output

    @staticmethod
    def _meta_task_name(plugin_id):
        try:
            return REGISTRY.get(plugin_id).manifest.get("name") or plugin_id
        except PluginRuntimeError:
            return plugin_id

    def _build_search_tasks(self, mi):
        ensure_runtime_installations(self.session, CONF)
        title = re.sub("[(（].*", "", mi.title)
        tasks = {}
        query = MetadataQuery(
            title=title,
            isbn=mi.isbn or "",
            publisher=getattr(mi, "publisher", "") or "",
            authors=tuple(getattr(mi, "authors", None) or ()),
        )

        # 元数据插件的 installation.enabled 是唯一选源状态。旧
        # META_SELECTED_SOURCES 只在首次物化时迁移，不再参与每次查询。
        runtime = PluginRuntime(self.session, CONF)
        connections = runtime.connections_for(META_LOOKUP_CAPABILITY, self.user_id())
        self._plugin_runtime, self._plugin_units = runtime, []
        # tasks 以来源名为键（面向用户展示），而 finish_read 需要按 connection.id
        # 回写 health——同一插件可能同时有实例级与用户级连接，两者不能混用一个键。
        self._plugin_task_keys = {}
        if connections:
            self._plugin_units, prepare_failures = runtime.prepare_read(
                connections,
                timeout=self.REFER_TIMEOUT,
                audit=True,
                requested_by=self.user_id(),
                provider_method="search_books",
            )
            for connection_id, error in prepare_failures.items():
                logging.warning("插件连接 %s 凭据不可用：%s", connection_id, error)
            for unit in self._plugin_units:
                task_name = self._meta_task_name(unit["plugin_key"])
                if task_name in tasks:  # 同一插件的多条连接：附连接号以区分
                    task_name = "%s#%s" % (task_name, unit["key"])
                self._plugin_task_keys[task_name] = unit["key"]

                def _plugin_lookup(_unit=unit):
                    return _unit["call"]("search_books", query) or []

                tasks[task_name] = _plugin_lookup

        return tasks

    def _finish_plugin_lookup(self, results):
        """线程池 join 之后回写 health，worker 全程不触碰 session。"""
        units = getattr(self, "_plugin_units", None)
        if not units:
            return
        by_connection = {
            connection_id: results.get(
                task_name,
                # 流式消费者可能在其他来源先返回后提前断开。此时外层
                # future 即使 cancel() 返回，也无法证明里面已经运行的
                # provider 停止了；按 timeout 保留 grace lease，避免下一次
                # 请求与旧调用重叠。
                PluginRuntimeError("plugin.timeout", "Plugin metadata lookup did not finish", retryable=True),
            )
            for task_name, connection_id in getattr(self, "_plugin_task_keys", {}).items()
        }
        self._plugin_runtime.finish_read(units, by_connection)

    def _plugin_metadata_detail(self, plugin_key, provider_value):
        """按 plugin_key 取详情：连接与凭据都由运行时解析，handler 不接触密文。"""
        runtime = PluginRuntime(self.session, CONF)
        connections = [
            connection
            for connection in runtime.connections_for(META_LOOKUP_CAPABILITY, self.user_id())
            if runtime.plugin_key_of(connection) == plugin_key
        ]
        if not connections:
            return None
        results = runtime.read_many(connections, "get_metadata", provider_value, timeout=self.REFER_TIMEOUT)
        # 结果以 connection.id 为键；取第一条能给出结果的连接。
        outcome = next(
            (results[item.id] for item in connections if results.get(item.id) is not None),
            None,
        )
        if isinstance(outcome, Exception):
            raise outcome
        return to_calibre_metadata(outcome) or outcome

    def plugin_get_book_meta(self, provider_key, provider_value, mi):
        refer_mi = None
        if provider_key == baike.KEY:
            title = re.sub("[(（].*", "", mi.title)
            api = baike.BaiduBaikeApi(copy_image=True)
            try:
                refer_mi = api.get_book(title, mi.authors[0] if mi.authors else None, expected_id=provider_value)
            except Exception as e:
                logging.error("获取百度百科书籍信息失败: %s", e)
                raise RuntimeError(
                    {
                        "err": "httprequest.baidubaike.failed",
                        "msg": _("百度百科查询失败"),
                    }
                )
        elif provider_key == "douban":
            # 豆瓣 V1 依赖已停止发放的官方 apikey，历史条目改由 V2 重新搜索。
            raise RuntimeError({"err": "source.replaced", "msg": _("豆瓣来源已升级为 V2，请重新搜索")})
        elif provider_key == youshu.KEY:
            raise RuntimeError({"err": "source.replaced", "msg": _("该固定来源已替换为在线书源，请重新搜索")})
        elif provider_key == tomato.KEY:
            title = re.sub("[(（].*", "", mi.title)
            api = tomato.TomatoNovelApi(copy_image=True)
            try:
                refer_mi = api.get_book(title)
            except Exception as e:
                logging.error("获取番茄小说书籍信息失败：%s", e)
                raise RuntimeError({"err": "httprequest.tomato.failed", "msg": _("番茄小说查询失败")})
        elif provider_key == qimao.KEY:
            title = re.sub("[(（].*", "", mi.title)
            api = qimao.QimaoNovelApi(copy_image=True)
            try:
                refer_mi = api.get_book_by_id(provider_value) or api.get_book(title)
            except Exception as e:
                logging.error("获取七猫小说书籍信息失败：%s", e)
                raise RuntimeError({"err": "httprequest.qimao.failed", "msg": _("七猫小说查询失败")})
        elif provider_key == douban_v2.KEY:
            plugin = douban_v2.DoubanV2MetaPlugin()
            try:
                refer_mi = plugin.get_metadata_by_provider(provider_value, mi)
            except Exception as e:
                logging.error("DoubanV2 query failed: %s", e)
                raise RuntimeError({"err": "httprequest.douban_v2.failed", "msg": _("豆瓣V2查询失败")})
        elif provider_key == neodb.KEY:
            plugin = neodb.NeodbMetaPlugin()
            try:
                refer_mi = plugin.get_metadata_by_provider(provider_value, mi)
            except Exception as e:
                logging.error("NeoDB query failed: %s", e)
                raise RuntimeError({"err": "httprequest.neodb.failed", "msg": _("NeoDB查询失败")})
        elif self._is_plugin_metadata_provider(provider_key):
            # 插件来源：按 plugin_key 取详情，不为任何具体插件单开分支。
            try:
                refer_mi = self._plugin_metadata_detail(provider_key, provider_value)
            except Exception as e:
                logging.error("插件 %s 元数据查询失败：%s", provider_key, e)
                raise RuntimeError({"err": "httprequest.plugin.failed", "msg": _("插件查询失败")})
            if refer_mi is None:
                raise RuntimeError({"err": "plugin.connection_missing", "msg": _("请先配置该插件的连接")})
        elif provider_key == biquge.KEY:
            raise RuntimeError({"err": "source.replaced", "msg": _("该固定来源已替换为在线书源，请重新搜索")})
        elif provider_key == BOOKSOURCE_KEY:
            try:
                sources = collect_metadata_sources(self.session, CONF.get("BOOKSOURCE_METADATA_TOP_K", 10))
                service = BookSourceMetadataService(
                    sources,
                    CONF.get("cookie_secret", "talebook"),
                    config=CONF,
                )
                refer_mi = service.apply(provider_value, self.session, copy_image=True)
            except Exception as e:
                logging.error("获取在线书源书籍信息失败：%s", e)
                raise RuntimeError({"err": "httprequest.booksource.failed", "msg": _("在线书源查询失败")})
        elif provider_key == calibre.KEY:
            if mi.isbn:
                try:
                    refer_mi = calibre.CalibreMetadataApi.get_book_by_isbn(mi.isbn)
                except Exception as e:
                    logging.error("获取 Calibre 书籍信息失败（ISBN）：%s", e)
                    refer_mi = None
                if refer_mi:
                    cover_url = getattr(refer_mi, "cover_url", None)
                    if cover_url:
                        try:
                            refer_mi.cover_data = calibre.CalibreMetadataApi.get_cover(cover_url)
                        except Exception as e:
                            logging.error("获取 Calibre 封面失败：%s", e)
            if not refer_mi:
                try:
                    refer_mi = calibre.CalibreMetadataApi.get_book_by_title(mi.title, authors=mi.authors)
                except Exception as e:
                    logging.error("获取 Calibre 书籍信息失败（书名）：%s", e)
                    raise RuntimeError({"err": "httprequest.calibre.failed", "msg": _("Calibre 查询失败")})
        elif provider_key == xhsd.KEY:
            api = xhsd.XhsdBookApi(copy_image=True)
            try:
                refer_mi = api.get_book(mi.isbn or mi.title)
            except Exception as e:
                logging.error("获取新华书店书籍信息失败：%s", e)
                raise RuntimeError({"err": "httprequest.xhsd.failed", "msg": _("新华书店查询失败")})
        elif provider_key == AI_KEY:
            title = re.sub("[(（].*", "", mi.title)
            api = AIBookApi(
                api_url=CONF.get("ai_api_url", "https://api.openai.com/v1/chat/completions"),
                api_key=CONF.get("ai_api_key", ""),
                model=CONF.get("ai_model", "gpt-3.5-turbo"),
                use_thinking=CONF.get("ai_use_thinking", False),
                copy_image=True,
            )
            try:
                sources = collect_metadata_sources(self.session, CONF.get("BOOKSOURCE_METADATA_TOP_K", 10))
                online = BookSourceMetadataService(
                    sources,
                    CONF.get("cookie_secret", "talebook"),
                    config=CONF,
                ).search(title, mi.authors[0] if mi.authors else None)
                evidence = [metadata_to_evidence(book) for book in online.books]
                refer_mi = api.get_book(title, mi.authors[0] if mi.authors else None, evidence=evidence)
            except Exception as e:
                logging.error("获取 AI 书籍信息失败：%s", e)
                raise RuntimeError(
                    {
                        "err": "httprequest.ai.failed",
                        "msg": _("AI 查询失败"),
                    }
                )
        else:
            raise RuntimeError(
                {
                    "err": "params.provider_key.not_support",
                    "msg": _("不支持该provider_key"),
                }
            )

        # 确保返回值有效
        if not refer_mi:
            raise RuntimeError({"err": "plugin.fail", "msg": _("插件拉取信息异常，请重试")})

        return refer_mi

    def _is_plugin_metadata_provider(self, provider_key):
        try:
            provider = PluginRuntime(self.session, CONF).registry.get(provider_key)
        except Exception:
            return False
        return META_LOOKUP_CAPABILITY in (provider.manifest.get("capabilities") or [])

    @js
    @auth
    async def get(self, id):
        book_id = int(id)
        if not self.can_view_book(book_id):
            return {"err": "book.not_found", "msg": _("书籍不存在")}
        mi = self.db.get_metadata(book_id, index_is_id=True)

        stream = self.get_argument("stream", None)
        if stream == "1":
            import json

            origin = self.request.headers.get("origin", "*")
            self.set_header("Access-Control-Allow-Origin", origin)
            self.set_header("Access-Control-Allow-Credentials", "true")
            self.set_header("Cache-Control", "max-age=0")
            self.set_header("Content-Type", "application/x-ndjson")
            self.set_header("X-Accel-Buffering", "no")

            self.write(json.dumps({"err": "ok"}, ensure_ascii=False) + "\n")
            await self.flush()
            logging.info("[STREAM] 元信息已发送")

            async for b in self.plugin_search_books_stream(mi):
                if isinstance(b, dict) and b.get("event") in {"progress", "summary"}:
                    self.write(json.dumps(b, ensure_ascii=False) + "\n")
                    await self.flush()
                    continue
                d = self._fmt_refer_book(b)
                if d:
                    self.write(json.dumps(d, ensure_ascii=False) + "\n")
                    await self.flush()
                    logging.info("[STREAM] 已发送: %s (source=%s)", d.get("title", "?"), d.get("source", "?"))

            self.finish()
            return None

        books = self.plugin_search_books(mi)
        logging.info("开始处理 %d 个书籍信息源", len(books))
        rsp = []
        for b in books:
            d = self._fmt_refer_book(b)
            if d:
                rsp.append(d)

        logging.info("成功处理 %d/%d 个书籍信息", len(rsp), len(books))
        return {"err": "ok", "books": rsp, "summary": self._refer_summary}

    def _fmt_refer_book(self, b):
        keys = [
            "cover_url",
            "source",
            "website",
            "title",
            "author",
            "author_sort",
            "publisher",
            "isbn",
            "comments",
            "provider_key",
            "provider_value",
        ]
        if hasattr(b, "title") and hasattr(b, "authors"):
            b = {
                "title": b.title,
                "authors": b.authors,
                "author": b.author if hasattr(b, "author") else b.authors[0] if b.authors else "",
                "author_sort": b.author_sort if hasattr(b, "author_sort") else "",
                "publisher": b.publisher if hasattr(b, "publisher") else "",
                "isbn": b.isbn if hasattr(b, "isbn") else "",
                "comments": b.comments if hasattr(b, "comments") else "",
                "cover_url": b.cover_url if hasattr(b, "cover_url") else "",
                "source": b.source if hasattr(b, "source") else "",
                "website": b.website if hasattr(b, "website") else "",
                "provider_key": b.provider_key if hasattr(b, "provider_key") else "",
                "provider_value": b.provider_value if hasattr(b, "provider_value") else "",
                "pubdate": b.pubdate if hasattr(b, "pubdate") else None,
            }
        elif not isinstance(b, dict):
            return None

        if "title" not in b or not b["title"]:
            return None

        try:
            d = dict((k, b.get(k, "")) for k in keys)
            pubdate = b.get("pubdate")
            d["pubyear"] = pubdate.strftime("%Y") if pubdate else ""

            if d["title"].startswith("百度百科"):
                return None

            if not d["comments"]:
                d["comments"] = _("无详细介绍")
            return d
        except Exception:
            return None

    @js
    @auth
    def post(self, id):
        provider_key = self.get_argument("provider_key", "error")
        provider_value = self.get_argument("provider_value", "")
        only_meta = self.get_argument("only_meta", "")
        only_cover = self.get_argument("only_cover", "")
        book_id = int(id)
        if not provider_key:
            return {
                "err": "params.provider_key.invalid",
                "msg": _("provider_key参数错误"),
            }
        if not provider_value:
            return {
                "err": "params.provider_key.invalid",
                "msg": _("provider_value参数错误"),
            }
        if only_meta == "yes" and only_cover == "yes":
            return {"err": "params.conflict", "msg": _("参数冲突")}

        mi = self.db.get_metadata(book_id, index_is_id=True)
        if not mi:
            return {"err": "params.book.invalid", "msg": _("书籍不存在")}
        if not self.is_admin() and not self.is_book_owner(book_id, self.user_id()):
            return {"err": "user.no_permission", "msg": _("无权限")}

        original_cover_data = mi.cover_data
        try:
            refer_mi = self.plugin_get_book_meta(provider_key, provider_value, mi)
        except RuntimeError as e:
            return e.args[0] if e.args else {"err": "unknown.error", "msg": str(e)}

        cover_fallback = False
        if only_cover == "yes":
            # 仅设置封面，检查封面数据是否有效
            if refer_mi.cover_data and len(refer_mi.cover_data) > 0:
                mi.cover_data = refer_mi.cover_data
            else:
                return {"err": "cover.empty", "msg": _("获取到的封面数据为空")}
        else:
            if only_meta == "yes":
                refer_mi.cover_data = None
            else:
                # 更新前检查封面数据是否有效
                if not refer_mi.cover_data and original_cover_data:
                    # 豆瓣封面获取失败，使用了本地原有封面
                    refer_mi.cover_data = original_cover_data
                    cover_fallback = True
                elif refer_mi.cover_data and len(refer_mi.cover_data) == 0:
                    refer_mi.cover_data = None
            if len(refer_mi.tags) == 0 and len(mi.tags) == 0:
                ts = []
                for tag in CONF["BOOK_NAV"].replace("=", "/").replace("\n", "/").split("/"):
                    if tag in refer_mi.title or tag in refer_mi.comments:
                        ts.append(tag)
                    elif tag in refer_mi.authors:
                        ts.append(tag)
                if len(ts) > 0:
                    mi.tags += ts[:8]
                    logging.info("tags are %s" % ",".join(mi.tags))
                    self.db.set_tags(book_id, mi.tags)
            mi.smart_update(refer_mi, replace_metadata=True)

        set_metadata_preserving_external_paths(self.db, self.session, book_id, mi)
        if cover_fallback:
            return {
                "err": "ok",
                "msg": _("书籍信息更新成功，但豆瓣封面获取失败，已使用本地原有封面"),
            }
        return {"err": "ok"}


class BookEdit(BaseHandler):
    @js
    @auth
    def post(self, bid):
        book = self.get_book(bid)
        bid = book["id"]
        if not self.current_user.can_edit() or not (self.is_admin() or self.is_book_owner(bid, self.user_id())):
            return {"err": "permission", "msg": _("无权操作")}

        # 处理封面图上传
        if self.request.files:
            return self.upload_cover(bid)

        # 处理常规编辑
        data = tornado.escape.json_decode(self.request.body)
        mi = self.db.get_metadata(bid, index_is_id=True)
        KEYS = [
            "authors",
            "title",
            "comments",
            "tags",
            "publisher",
            "isbn",
            "series",
            "rating",
            "language",
        ]
        for key, val in data.items():
            if key in KEYS:
                # 处理DELETE魔术字符串
                is_delete = False
                # 检查字符串类型
                if val == "__DELETE__":
                    is_delete = True
                # 检查列表类型
                elif isinstance(val, list) and len(val) == 1 and val[0] == "__DELETE__":
                    is_delete = True

                if is_delete:
                    # 设置为空值，不同字段类型使用不同的空值
                    if key in ["authors", "tags"]:
                        # 列表类型使用空列表
                        # mi.set(key, [" "])
                        pass
                    else:
                        # 其他类型使用空字符串
                        mi.set(key, " ")
                else:
                    mi.set(key, val)

        if data.get("pubdate", None):
            # 处理DELETE魔术字符串
            if data["pubdate"] == "__DELETE__":
                mi.set("pubdate", None)
            else:
                content = meta_common.str2date(data["pubdate"])
                if content is None:
                    return {
                        "err": "params.pudate.invalid",
                        "msg": _("出版日期参数错误，格式应为 2019-05-10或2019-05或2019年或2019"),
                    }
                mi.set("pubdate", content)

        if "tags" in data and not data["tags"]:
            self.db.set_tags(bid, [])

        set_metadata_preserving_external_paths(self.db, self.session, bid, mi)
        return {"err": "ok", "msg": _("更新成功")}

    def upload_cover(self, bid):
        """处理封面图上传"""
        book = self.get_book(bid)
        bid = book["id"]

        # 获取上传的文件
        if "cover" not in self.request.files:
            return {"err": "params.cover.required", "msg": _("请选择要上传的封面图")}

        file_info = self.request.files["cover"][0]
        file_data = file_info["body"]
        file_name = decode_filename(file_info["filename"])

        # 检查文件类型
        allowed_types = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/jpg",
            "image/pjpeg",
            "image/x-png",
        ]
        file_type = file_info["content_type"]
        if file_type not in allowed_types:
            # 尝试从文件名后缀判断
            file_ext = file_name.split(".")[-1].lower() if "." in file_name else ""
            if file_ext not in [
                "jpg",
                "jpeg",
                "png",
                "gif",
                "pjp",
                "jpe",
                "pjpeg",
                "jfif",
            ]:
                return {
                    "err": "params.cover.type",
                    "msg": _("只允许上传JPG、JPEG、PNG、GIF、PJP、PJPEG、JFIF、JPE格式的图片"),
                }

        # 检查文件大小（限制为5MB）
        if len(file_data) > 5 * 1024 * 1024:
            return {"err": "params.cover.size", "msg": _("封面图大小不能超过5MB")}

        # 用魔数检测实际格式，不依赖用户可控的 content_type 或文件名
        IMAGE_MAGIC = {
            "jpeg": b"\xff\xd8\xff",
            "png": b"\x89PNG\r\n\x1a\n",
            "gif": b"GIF8",
        }
        file_ext = None
        for ext, magic in IMAGE_MAGIC.items():
            if file_data.startswith(magic):
                file_ext = ext
                break
        if file_ext is None:
            return {
                "err": "params.cover.type",
                "msg": _("只允许上传 JPEG、PNG、GIF 格式的图片"),
            }

        try:
            # 获取书籍元数据
            mi = self.db.get_metadata(bid, index_is_id=True)

            # 设置封面数据
            mi.cover_data = (file_ext, file_data)

            # 强制更新书籍的timestamp，确保封面图URL变化
            from datetime import datetime

            mi.timestamp = datetime.utcnow()
            mi.last_modified = datetime.utcnow()

            # 保存元数据
            set_metadata_preserving_external_paths(self.db, self.session, bid, mi)

            # 清除缓存，确保下次获取书籍信息时从数据库读取最新数据
            self.cache.invalidate()

            return {"err": "ok", "msg": _("封面图上传成功")}
        except Exception as e:
            import traceback

            logging.error(f"上传封面图失败: {e}")
            logging.error(f"错误堆栈: {traceback.format_exc()}")
            # 尝试直接返回成功，因为实际封面可能已经保存
            return {"err": "ok", "msg": _("封面图上传成功")}


class BookDelete(BaseHandler):
    @js
    @auth
    def post(self, bid):
        book = self.get_book(bid)
        bid = book["id"]
        can_manage = self.current_user.can_edit() and self.current_user.can_delete()
        if not can_manage or not (self.is_admin() or self.is_book_owner(bid, self.user_id())):
            return {"err": "permission", "msg": _("无权操作")}

        external_indexed = is_external_index_book(self.session, bid)
        if external_indexed:
            delete_external_index_book_record(self.db, bid)
        else:
            self.db.delete_book(bid)
        # 同步清理该书籍对应的 ScanFile 记录，避免重新导入时因哈希重复被误判为 drop
        from webserver.models import ScanFile

        self.session.query(ScanFile).filter(ScanFile.book_id == bid).delete()
        if external_indexed:
            self.session.query(Item).filter(Item.book_id == bid).delete()
        self.session.commit()
        self.add_msg("success", _("删除书籍《%s》") % book["title"])
        return {"err": "ok", "msg": _("删除成功")}


class BookDownload(BaseHandler, web.StaticFileHandler):
    def send_error_of_not_invited(self):
        self.set_header("WWW-Authenticate", "Basic")
        self.set_status(401)
        raise web.Finish()

    def initialize(self):
        self.root = "/"
        self.default_filename = None
        self.is_opds = self.get_argument("from", "") == "opds"
        BaseHandler.initialize(self)

    def prepare(self):
        BaseHandler.prepare(self)
        # 演示模式下，未登录访客与演示账号的下载权限统一遵循“访客权限”配置，
        # 忽略演示账号自身的权限位（该账号默认拥有完整权限，用于伪装管理员体验）。
        guest_like = not self.current_user or demo_mode.is_demo_restricted(CONF, self.current_user)
        if guest_like:
            if not CONF["ALLOW_GUEST_DOWNLOAD"]:
                if self.is_opds:
                    return self.send_error_of_not_invited()
                else:
                    return self.redirect("/login")
            return

        if self.current_user.can_save():
            if not self.current_user.is_active():
                raise web.HTTPError(403, reason=_("无权操作，请先登录注册邮箱激活账号。"))
        else:
            raise web.HTTPError(403, reason=_("无权操作"))

    def parse_url_path(self, url_path: str) -> str:
        filename = url_path.split("/")[-1]
        bid, fmt = filename.split(".")
        fmt = fmt.lower()
        logging.error("download %s bid=%s, fmt=%s" % (filename, bid, fmt))
        book = self.get_book_or_404(bid)
        book_id = book["id"]
        self.user_history("download_history", book)
        self.count_increase(book_id, count_download=1)
        if "fmt_%s" % fmt not in book:
            raise web.HTTPError(404, reason=_("%s格式无法下载" % fmt))

        path = book["fmt_%s" % fmt]
        if not os.path.exists(path):
            raise web.HTTPError(404, reason=_("格式文件不存在: %s") % path)
        book["fmt"] = fmt
        book["title"] = urllib.parse.quote_plus(book["title"])
        fname = "%(id)d-%(title)s.%(fmt)s" % book
        att = "attachment; filename=\"%s\"; filename*=UTF-8''%s" % (fname, fname)
        if self.is_opds:
            att = 'attachment; filename="%(id)d.%(fmt)s"' % book

        # PDF 文件使用 application/pdf，允许浏览器内联预览（供 pdfjs 等在线阅读器使用）
        # 其他格式使用 application/octet-stream 强制下载
        if fmt == "pdf":
            self.set_header("Content-Type", "application/pdf")
            # 在线阅读时不附加 Content-Disposition attachment，避免触发下载
            if not self.is_opds:
                self.set_header("Content-Disposition", f'inline; filename="{fname}"'.encode("UTF-8"))
            else:
                self.set_header("Content-Disposition", att.encode("UTF-8"))
        else:
            self.set_header("Content-Disposition", att.encode("UTF-8"))
            self.set_header("Content-Type", "application/octet-stream")
        return path

    @classmethod
    def get_absolute_path(cls, root: str, path: str) -> str:
        return path


class BookNav(ListHandler):
    @js
    def get(self):
        tagmap = self.all_tags_with_count()
        navs = []
        done = set()
        for line in CONF["BOOK_NAV"].split("\n"):
            line = utils.super_strip(line)
            p = line.split("=")
            if len(p) != 2:
                continue
            h1, tags = p
            tags = [v.strip() for v in tags.split("/")]
            done.update(tags)
            tag_items = [{"name": v, "count": tagmap.get(v, 0)} for v in tags if tagmap.get(v, 0) > 0]
            if tag_items:
                navs.append({"legend": h1, "tags": tag_items})

        tag_items = [{"name": tag, "count": cnt} for tag, cnt in tagmap.items() if tag not in done]
        navs.append({"legend": _("其他"), "tags": tag_items})

        return {"err": "ok", "navs": navs}


class RecentBook(ListHandler):
    @js
    def get(self):
        title = _("新书推荐")
        ids = self.books_by_id()
        return self.render_book_list([], ids=ids, title=title, sort_by_id=True)


class LibraryBook(ListHandler):
    @js
    async def get(self):
        title = _("书库")

        publisher = self.get_argument("publisher", None)
        author = self.get_argument("author", None)
        tag = self.get_argument("tag", None)
        book_format = self.get_argument("format", None)
        stream = self.get_argument("stream", None)

        ids = self.books_by_id()

        if publisher and publisher != "全部":
            publisher_books = self.db.search_getting_ids(f"publisher:'{publisher}'", "")
            ids = list(set(ids) & set(publisher_books))

        if author and author != "全部":
            author_books = self.db.search_getting_ids(f"author:'{author}'", "")
            ids = list(set(ids) & set(author_books))

        if tag and tag != "全部":
            tag_books = self.db.search_getting_ids(f"tag:'{tag}'", "")
            ids = list(set(ids) & set(tag_books))

        if book_format and book_format != "全部":
            books = self.get_books(ids=ids)
            ids = [book["id"] for book in books if f"fmt_{book_format.lower()}" in book]

        if stream == "1":
            return await self.stream_book_list([], ids=ids, title=title, sort_by_id=True)

        return self.render_book_list([], ids=ids, title=title, sort_by_id=True)


class SearchBook(ListHandler):
    @js
    def get(self):
        name = self.get_argument("name", "")
        if not name.strip():
            return {"err": "params.invalid", "msg": _("请输入搜索关键字")}

        title = _("搜索：%(name)s") % {"name": name}
        ids = self.cache.search(name)
        ids = self.sort_ids_by_title_relevance(ids, name)
        return self.render_book_list([], ids=ids, title=title)

    def sort_ids_by_title_relevance(self, ids, keyword):
        """calibre 的 cache.search() 返回的是未排序的匹配集合，书名命中和简介、标签等其他字段
        命中的结果混杂在一起。这里把书名命中的结果排到前面，同一优先级内按 id 从大到小排列。
        """
        keyword = (keyword or "").strip().lower()

        def sort_key(book_id):
            book_title = (self.cache.field_for("title", book_id) or "").lower()
            title_matched = bool(keyword) and keyword in book_title
            return (0 if title_matched else 1, -book_id)

        return sorted(ids, key=sort_key)


class HotBook(ListHandler):
    @js
    def get(self):
        title = _("热度榜单")
        user_id = self.user_id()

        # 管理员可查看全部私藏图书，普通用户只可查看自己的私藏图书。
        if self.is_admin():
            db_items = self.session.query(Item).filter(Item.count_visit > 1).order_by(Item.count_download.desc())
        elif user_id:
            db_items = (
                self.session.query(Item)
                .filter(Item.count_visit > 1, (Item.scope != "private") | (Item.collector_id == user_id))
                .order_by(Item.count_download.desc())
            )
        else:
            db_items = (
                self.session.query(Item)
                .filter(Item.count_visit > 1, Item.scope != "private")
                .order_by(Item.count_download.desc())
            )

        count = db_items.count()
        start = self.get_argument_start()
        delta = 60
        page_max = int(count / delta)
        page_now = int(start / delta)
        pages = []
        for p in range(page_now - 3, page_now + 3):
            if 0 <= p and p <= page_max:
                pages.append(p)
        items = db_items.limit(delta).offset(start).all()
        ids = [item.book_id for item in items]
        books = self.get_books(ids=ids)
        self.do_sort(books, "count_download", False)
        return self.render_book_list(books, title=title)


def decode_filename(filename):
    """处理中文文件名编码问题
    Tornado 默认以 latin-1 解析 multipart/form-data 中的 filename，
    当文件名包含中文等非 ASCII 字符时，需要尝试解码为 UTF-8
    """
    if not filename:
        return filename

    try:
        # 尝试将 latin-1 编码的字节重新解释为 UTF-8
        # 这适用于 Tornado 将 UTF-8 字节错误解析为 latin-1 的情况
        return filename.encode("latin1").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError, AttributeError):
        # 如果已经是 UTF-8 或解码失败，保持原样
        return filename


UPLOAD_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{1,64}$")
# 白名单：仅拒绝路径穿越元字符（\ / 空字节），放行中文、空格、点等合法文件名字符；
# fullmatch 作为 CodeQL 认可的净化器，配合下方 basename + commonpath 校验限制路径。
UPLOAD_FILENAME_RE = re.compile(r"[^\\\/\x00]{1,255}")


class BookUploadBase(BaseHandler):
    """封装普通上传与分片上传共用的权限校验、路径解析与入库逻辑"""

    EBOOK_MAGIC = {
        "epub": b"PK\x03\x04",
        "pdf": b"%PDF",
    }

    def check_upload_permission(self):
        # 检查访客上传权限
        if not self.current_user:
            if not CONF.get("ALLOW_GUEST_UPLOAD", False):
                return {"err": "user.need_login", "msg": _("请先登录")}
        elif not self.current_user.can_upload():
            return {"err": "permission", "msg": _("无权操作")}
        return None

    def resolve_upload_path(self, name):
        # reject unsafe filename patterns early
        if (
            not name
            or name in (".", "..")
            or "\x00" in name
            or os.path.sep in name
            or (os.path.altsep and os.path.altsep in name)
        ):
            return None
        upload_dir = os.path.realpath(CONF["upload_path"])
        # 使用 os.path.basename 提取纯文件名，再以白名单正则 fullmatch 校验：
        # fullmatch 是 CodeQL 认可的净化器，可将源自 get_argument 的污点标记为受控，
        # 避免下游 open/os.remove 被标脏
        safe_name = os.path.basename(name)
        if not safe_name or safe_name in (".", "..") or not UPLOAD_FILENAME_RE.fullmatch(safe_name):
            return None
        fpath = os.path.realpath(os.path.join(upload_dir, safe_name))
        try:
            if os.path.commonpath([upload_dir, fpath]) != upload_dir:
                return None
        except ValueError:
            return None
        return fpath

    def get_chunk_dir(self, upload_id):
        if not upload_id or not UPLOAD_ID_RE.match(upload_id):
            return None
        chunks_root = os.path.realpath(os.path.join(CONF["upload_path"], "chunks"))
        owner = str(self.user_id() or "guest")
        chunk_dir = os.path.realpath(os.path.join(chunks_root, owner, upload_id))
        # 再次校验拼接后的路径仍在chunks根目录之内，防御路径穿越
        if not chunk_dir.startswith(chunks_root + os.sep):
            return None
        return chunk_dir

    def get_chunk_part_path(self, chunk_dir, chunk_index):
        # chunk_index 已在调用方校验为 [0, total_chunks) 范围内的整数，
        # 这里再做一次路径包含性校验，确保拼接结果始终落在chunk_dir之内
        chunk_path = os.path.realpath(os.path.join(chunk_dir, "%d.part" % chunk_index))
        if not chunk_path.startswith(chunk_dir + os.sep):
            return None
        return chunk_path

    def cleanup_stale_chunk_dirs(self):
        """清理当前用户超过TTL仍未完成的分片目录，避免异常中断上传后残留垃圾文件"""
        chunks_root = os.path.realpath(os.path.join(CONF["upload_path"], "chunks"))
        owner = str(self.user_id() or "guest")
        owner_dir = os.path.realpath(os.path.join(chunks_root, owner))
        if not owner_dir.startswith(chunks_root + os.sep) or not os.path.isdir(owner_dir):
            return
        ttl = CONF.get("UPLOAD_CHUNK_TTL_SECONDS", 24 * 3600)
        now = time.time()
        for entry in os.listdir(owner_dir):
            d = os.path.realpath(os.path.join(owner_dir, entry))
            # 再次进行路径包含性校验，确保清理目标仍在owner_dir之内，防御路径穿越
            if not d.startswith(owner_dir + os.sep):
                continue
            try:
                if os.path.isdir(d) and now - os.path.getmtime(d) > ttl:
                    shutil.rmtree(d, ignore_errors=True)
            except OSError:
                continue

    def import_uploaded_book(self, fpath, fmt):
        from calibre.ebooks.metadata.meta import get_metadata

        # read ebook meta
        with open(fpath, "rb") as stream:
            mi = get_metadata(stream, stream_type=fmt, use_libprs_metadata=True)
            mi.title = utils.super_strip(mi.title)
            # 保留所有作者信息，与批量导入逻辑保持一致
            mi.authors = [utils.super_strip(s) for s in mi.authors]

        # 非结构化的格式，calibre无法识别准确的信息，直接从文件名提取
        if fmt in ["txt", "pdf"]:
            # 使用文件名提取标题，与批量导入逻辑保持一致
            fname = os.path.basename(fpath)
            mi.title = fname.replace("." + fmt, "")
            mi.authors = [_("佚名")]
            # 确保author_sort也被设置，与批量导入逻辑保持一致
            mi.author_sort = mi.authors[0] if mi.authors else ""

        logging.info("upload mi.title = " + repr(mi.title))
        books = self.db.books_with_same_title(mi)
        same_author_book_id = None
        different_author_books = []

        if books:
            # 区分同名同作者和同名不同作者的书籍
            for b in self.db.get_data_as_dict(ids=books):
                book_authors = b.get("authors", [])
                mi_authors = mi.authors

                # 检查作者是否相同
                if set(book_authors) == set(mi_authors):
                    same_author_book_id = b.get("id")
                    # 检查是否已存在相同格式
                    if fmt.upper() in b.get("available_formats", ""):
                        return {
                            "err": "samebook",
                            "msg": _("同名同作者书籍《%s》已存在这一图书格式 %s") % (mi.title, fmt),
                            "book_id": same_author_book_id,
                        }
                else:
                    different_author_books.append(b)

        # 如果存在同名同作者书籍，添加格式到该书籍
        if same_author_book_id:
            logging.info("import [%s] from %s with format %s", repr(mi.title), fpath, fmt)
            self.db.add_format(same_author_book_id, fmt.upper(), fpath, True)
            book_id = same_author_book_id
        else:
            fpaths = [fpath]
            book_id = self.db.import_book(mi, fpaths)
            self.user_history("upload_history", {"id": book_id, "title": mi.title})
            item = Item()
            item.book_id = book_id
            item.collector_id = self.user_id()
            try:
                item.create_time = self.cache.field_for("timestamp", book_id)
            except Exception:
                item.create_time = datetime.datetime.now()
            item.save()
        self.add_msg("success", _("导入书籍成功！"))
        AutoFillService().auto_fill(book_id)
        self.run_auto_transforms(book_id, fmt)
        return {"err": "ok", "book_id": book_id}

    def run_auto_transforms(self, book_id, fmt):
        """新书入库后，按连接配置自动处理正文。

        默认手动：只有把 trigger 显式配成 auto 的插件才会执行，且只有声明了
        supports_auto_trigger 的插件才允许配置该选项。自动改写用户刚上传的
        文件不可逆，因此宁可不做也不默认做。
        """
        try:
            from webserver.services.book_transform import auto_fix_encoding

            runtime = PluginRuntime(self.session, CONF)
            for connection in runtime.connections_for(TRANSFORM_CAPABILITY):
                plugin_key = runtime.plugin_key_of(connection)
                provider = runtime.registry.get(plugin_key)
                if trigger_of(connection.config) != TRIGGER_AUTO:
                    continue
                if not getattr(provider, "supports_auto_trigger", False):
                    continue
                if str(fmt or "").upper() not in getattr(provider, "supported_formats", frozenset()):
                    continue
                auto_fix_encoding(AsyncService(), book_id, self.user_id(), connection.id)
        except Exception as err:  # 自动处理失败不得影响上传本身
            logging.warning("新书自动处理调度失败 book=%s: %s", book_id, err)


class BookUpload(BookUploadBase):
    def get_upload_file(self):
        # for unittest mock
        files = self.request.files.get("ebook")
        if not files:
            return None, None
        p = files[0]
        filename = decode_filename(p["filename"])
        filename = urllib.parse.unquote(filename)
        return (filename, p["body"])

    @js
    def post(self):
        err = self.check_upload_permission()
        if err:
            return err
        name, data = self.get_upload_file()
        if not name or data is None:
            return {"err": "params.ebook", "msg": _("请选择要上传的文件")}
        logging.error("upload book name = " + repr(name))
        # strip path components to prevent directory traversal
        name = os.path.basename(name)
        fmt = os.path.splitext(name)[1]
        fmt = fmt[1:] if fmt else None
        if not fmt:
            return {"err": "params.filename", "msg": _("文件名不合法")}
        fmt = fmt.lower()

        # validate format against whitelist before touching disk
        from webserver.handlers.scan import SCAN_EXT

        if fmt not in SCAN_EXT:
            return {"err": "params.format", "msg": _("不支持的文件格式: %s") % fmt}

        # validate magic bytes for structured formats
        if fmt in self.EBOOK_MAGIC and not data.startswith(self.EBOOK_MAGIC[fmt]):
            return {"err": "params.format", "msg": _("文件内容与格式不匹配")}

        # save file
        fpath = self.resolve_upload_path(name)
        if not fpath:
            return {"err": "params.filename", "msg": _("文件名不合法")}
        upload_dir = os.path.realpath(CONF["upload_path"])
        fpath = os.path.realpath(fpath)
        if not fpath.startswith(upload_dir + os.sep):
            return {"err": "params.filename", "msg": _("文件名不合法")}
        with open(fpath, "wb") as f:
            f.write(data)
        logging.debug("save upload file into [%s]", fpath)

        return self.import_uploaded_book(fpath, fmt)


class BookUploadChunk(BookUploadBase):
    """接收单个上传分片，落盘为临时分片文件"""

    @js
    def post(self):
        if not CONF.get("UPLOAD_CHUNK_ENABLED", True):
            return {"err": "params.chunk_disabled", "msg": _("分片上传功能已禁用")}

        err = self.check_upload_permission()
        if err:
            return err

        self.cleanup_stale_chunk_dirs()

        upload_id = self.get_argument("upload_id", "")
        try:
            chunk_index = int(self.get_argument("chunk_index", ""))
            total_chunks = int(self.get_argument("total_chunks", ""))
        except ValueError:
            return {"err": "params.chunk", "msg": _("分片参数不合法")}

        max_chunks = int(CONF.get("MAX_CHUNK_COUNT", 4096))
        if total_chunks <= 0 or total_chunks > max_chunks or not (0 <= chunk_index < total_chunks):
            return {"err": "params.chunk", "msg": _("分片参数不合法")}

        chunk_dir = self.get_chunk_dir(upload_id)
        if not chunk_dir:
            return {"err": "params.upload_id", "msg": _("上传ID不合法")}

        files = self.request.files.get("chunk")
        if not files:
            return {"err": "params.chunk", "msg": _("缺少分片数据")}
        data = files[0]["body"]

        # 单分片大小上限直接使用管理员在面板配置的值，不再叠加隐藏硬上限，
        # 以免把合法分片错误拒绝（管理员已自行权衡反代单请求体积限制）
        max_chunk_size = utils.parse_size_safe(CONF.get("UPLOAD_CHUNK_SIZE", "4MB"), "4MB")
        if len(data) > max_chunk_size:
            return {"err": "params.chunk", "msg": _("分片过大")}

        os.makedirs(chunk_dir, exist_ok=True)

        max_total_size = utils.parse_size_safe(CONF.get("MAX_UPLOAD_SIZE", "100MB"), "100MB")
        existing_size = sum(os.path.getsize(os.path.join(chunk_dir, f)) for f in os.listdir(chunk_dir) if f.endswith(".part"))
        # 客户端重试已写入的分片索引时（如响应丢失后重发），下方会以 "wb" 覆盖同一
        # <index>.part 文件，因此需先减去该旧分片已占大小，避免接近上限时重试被重复
        # 计入、误判超限并清空整个分片目录
        current_part = os.path.join(chunk_dir, "%d.part" % chunk_index)
        if os.path.isfile(current_part):
            existing_size -= os.path.getsize(current_part)
        if existing_size + len(data) > max_total_size:
            shutil.rmtree(chunk_dir, ignore_errors=True)
            return {"err": "params.chunk", "msg": _("文件总大小超出限制")}

        chunk_path = self.get_chunk_part_path(chunk_dir, chunk_index)
        if not chunk_path:
            return {"err": "params.chunk", "msg": _("分片参数不合法")}
        with open(chunk_path, "wb") as f:
            f.write(data)

        return {"err": "ok"}


class BookUploadComplete(BookUploadBase):
    """合并所有分片为完整文件，并复用普通上传的入库逻辑"""

    @js
    def post(self):
        if not CONF.get("UPLOAD_CHUNK_ENABLED", True):
            return {"err": "params.chunk_disabled", "msg": _("分片上传功能已禁用")}

        err = self.check_upload_permission()
        if err:
            return err

        upload_id = self.get_argument("upload_id", "")
        name = self.get_argument("filename", "")
        try:
            total_chunks = int(self.get_argument("total_chunks", ""))
        except ValueError:
            return {"err": "params.chunk", "msg": _("分片参数不合法")}
        max_chunks = int(CONF.get("MAX_CHUNK_COUNT", 4096))
        if total_chunks <= 0 or total_chunks > max_chunks:
            return {"err": "params.chunk", "msg": _("分片参数不合法")}

        name = urllib.parse.unquote(decode_filename(name))
        name = os.path.basename(name)
        if (
            not name
            or name in (".", "..")
            or "\x00" in name
            or os.path.sep in name
            or (os.path.altsep and os.path.altsep in name)
        ):
            return {"err": "params.filename", "msg": _("文件名不合法")}
        fmt = os.path.splitext(name)[1]
        fmt = fmt[1:] if fmt else None
        if not fmt:
            return {"err": "params.filename", "msg": _("文件名不合法")}
        fmt = fmt.lower()

        from webserver.handlers.scan import SCAN_EXT

        if fmt not in SCAN_EXT:
            return {"err": "params.format", "msg": _("不支持的文件格式: %s") % fmt}

        chunk_dir = self.get_chunk_dir(upload_id)
        if not chunk_dir or not os.path.isdir(chunk_dir):
            return {"err": "params.upload_id", "msg": _("找不到上传分片，请重新上传")}

        chunk_paths = [self.get_chunk_part_path(chunk_dir, i) for i in range(total_chunks)]
        for p in chunk_paths:
            if not p or not os.path.isfile(p):
                return {"err": "params.chunk", "msg": _("分片缺失，请重新上传")}

        # 并发上传时单个/chunk请求校验的existing_size可能都在彼此完成前通过，
        # 这里合并前基于磁盘上实际分片大小重新求和，防止绕过总大小限制
        max_total_size = utils.parse_size_safe(CONF.get("MAX_UPLOAD_SIZE", "100MB"), "100MB")
        total_size = sum(os.path.getsize(p) for p in chunk_paths)
        if total_size > max_total_size:
            shutil.rmtree(chunk_dir, ignore_errors=True)
            return {"err": "params.chunk", "msg": _("文件总大小超出限制")}

        fpath = self.resolve_upload_path(name)
        if not fpath:
            shutil.rmtree(chunk_dir, ignore_errors=True)
            return {"err": "params.filename", "msg": _("文件名不合法")}

        # ponytail: CodeQL 无法跨方法边界追踪净化器，此处内联 realpath+startswith 守卫
        upload_dir = os.path.realpath(CONF["upload_path"])
        fpath = os.path.realpath(fpath)
        if not fpath.startswith(upload_dir + os.sep):
            shutil.rmtree(chunk_dir, ignore_errors=True)
            return {"err": "params.filename", "msg": _("文件名不合法")}

        try:
            with open(fpath, "wb") as out:
                for i, p in enumerate(chunk_paths):
                    with open(p, "rb") as part:
                        chunk_data = part.read()
                        if i == 0 and fmt in self.EBOOK_MAGIC and not chunk_data.startswith(self.EBOOK_MAGIC[fmt]):
                            raise ValueError("format mismatch")
                        out.write(chunk_data)
        except ValueError:
            # fpath 已通过 realpath + startswith 守卫校验，属受控路径
            upload_dir = os.path.realpath(CONF["upload_path"])
            cleanup_path = os.path.realpath(fpath)
            if cleanup_path.startswith(upload_dir + os.sep):
                try:
                    os.remove(cleanup_path)
                except OSError:
                    pass
            shutil.rmtree(chunk_dir, ignore_errors=True)
            return {"err": "params.format", "msg": _("文件内容与格式不匹配")}

        # 合并成功后才清理分片目录；若合并过程中出现非预期异常（如磁盘写满），
        # 分片会保留在磁盘上以便用户重新调用/complete重试，而不是被静默丢弃
        shutil.rmtree(chunk_dir, ignore_errors=True)

        logging.debug("save chunked upload file into [%s]", fpath)
        return self.import_uploaded_book(fpath, fmt)


class BookRead(BaseHandler):
    def render_epub(self, book, is_ready, audiobook_edition=None):
        return self.html_page(
            "book/" + CONF["EPUB_VIEWER"],
            {
                "book": book,
                "epub_dir": "/get/extract/%s" % book["id"],
                "is_ready": is_ready,
                "CANDLE_READER_SERVER": CONF["CANDLE_READER_SERVER"],
                "audiobook_edition_id": audiobook_edition.id if audiobook_edition else None,
            },
        )

    def get(self, id):
        # 演示模式下，未登录访客与演示账号的在线阅读权限统一遵循“访客权限”配置，
        # 忽略演示账号自身的权限位（该账号默认拥有完整权限，用于伪装管理员体验）。
        guest_like = not self.current_user or demo_mode.is_demo_restricted(CONF, self.current_user)
        if guest_like:
            if not CONF["ALLOW_GUEST_READ"]:
                return self.redirect("/login")
        elif self.current_user.can_read():
            if not self.current_user.is_active():
                raise web.HTTPError(403, reason=_("无权在线阅读，请先登录注册邮箱激活账号。"))
        else:
            raise web.HTTPError(403, reason=_("无权在线阅读"))

        book = self.get_book_or_404(id)
        book_id = book["id"]
        audiobook_edition = (
            self.session.query(AudiobookEdition)
            .filter(AudiobookEdition.book_id == book_id, AudiobookEdition.status == "published")
            .order_by(AudiobookEdition.published_at.desc(), AudiobookEdition.id.desc())
            .first()
        )
        self.user_history("read_history", book)
        self.count_increase(book_id, count_download=1)

        if book.get("fmt_epub"):
            return self.render_epub(book, is_ready=True, audiobook_edition=audiobook_edition)

        if "fmt_pdf" in book:
            # PDF类书籍需要检查下载权限。
            if guest_like:
                if not CONF["ALLOW_GUEST_DOWNLOAD"]:
                    return self.redirect("/login")
            elif not self.current_user.can_save():
                raise web.HTTPError(403, reason=_("无权在线阅读PDF类书籍"))

            pdf_url = urllib.parse.quote_plus(self.api_url + "/api/book/%(id)d.PDF" % book)
            pdf_reader_url = CONF["PDF_VIEWER"] % {"pdf_url": pdf_url}
            return self.redirect(pdf_reader_url)

        if "fmt_txt" in book:
            # TXT有专门的阅读器
            txt_reader_url = f"/book/{book_id}/readtxt"
            return self.redirect(txt_reader_url)

        # 其他格式，转换为EPUB进行在线阅读
        for fmt in ["mobi", "azw", "azw3"]:
            fpath = book.get("fmt_%s" % fmt, None)
            if not fpath:
                continue

            ConvertService().convert_and_save(self.user_id(), book, fpath, "epub")
            return self.render_epub(book, is_ready=False, audiobook_edition=audiobook_edition)
        raise web.HTTPError(404, reason=_("抱歉，在线阅读器暂不支持该格式的书籍"))


class TxtRead(BaseHandler):
    @js
    @auth
    def get(self):
        bid = self.get_argument("id", "")
        book = self.get_book(bid)
        start = int(self.get_argument("start", "0"))
        end = int(self.get_argument("end", "-1"))
        logging.info(book)
        fpath = book.get("fmt_txt", None)
        if not fpath:
            return {"err": "format error", "msg": "非txt书籍"}
        with open(fpath, mode="rb") as file:
            # 移动文件指针到起始位置
            file.seek(start)
            if end == -1:
                content = file.read()
            else:
                # 读取从起始位置到结束位置的内容
                content = file.read(end - start)
        if not content:
            return {"err": "format error", "msg": "空文件"}
        encode = get_content_encoding(content)
        content = content.decode(encoding=encode, errors="ignore").replace("\r", "").replace("\n", "<br>")
        return {"err": "ok", "content": content}


class BookTxtInit(BaseHandler):
    @js
    def get(self):
        bid = self.get_argument("id", "")
        test_ready = self.get_argument("test", "")
        book = self.get_book(bid)
        fpath = book.get("fmt_txt", None)
        if not fpath:
            return {"err": "format error", "msg": "非txt书籍"}
        # 解压后的目录
        fdir = os.path.join(CONF["extract_path"], str(book["id"]))
        # txt 解析出的目录文件
        content_path = fdir + "/content.json"
        is_ready = os.path.isfile(content_path)
        if is_ready:
            with open(content_path, "r", encoding="utf8") as f:
                meta = json.loads(f.read())
            return {
                "err": "ok",
                "msg": "已解析",
                "data": {
                    "content": meta["toc"],
                    "encoding": meta["encoding"],
                    "name": book["title"],
                },
            }
        if test_ready != "0":
            return {"err": "ok", "msg": "未解析完成"}

        # 若未解析则计算预计等待时间，至少2分钟
        wait = min(120, os.path.getsize(fpath) / (1024 * 1024) * 15)
        ExtractService().parse_txt_content(bid, fpath)
        que_len = ExtractService().get_queue("parse_txt_content").qsize()
        return {
            "err": "ok",
            "msg": "已加入队列",
            "data": {
                "wait": wait,
                "name": book["title"],
                "path": content_path,
                "que": que_len,
            },
        }


class BookSendToDevice(BaseHandler):
    @js
    def post(self, bid):
        """发送书籍到指定设备"""
        book_id = int(bid)
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "book.not_found", "msg": _("书籍已不存在")}

        # 检查用户权限
        if not CONF["ALLOW_GUEST_PUSH"]:
            if not self.current_user:
                return {"err": "user.need_login", "msg": _("请先登录")}
            else:
                if not self.current_user.can_push():
                    return {"err": "permission", "msg": _("无权操作")}
                elif not self.current_user.is_active():
                    return {"err": "permission", "msg": _("无权操作，请先激活账号。")}

        # 解析请求参数
        try:
            data = tornado.escape.json_decode(self.request.body)
            device_type = data.get("device_type", "").lower()
            device_url = data.get("device_url", "")
            mailbox = data.get("mailbox", "")
        except Exception:
            return {"err": "params.invalid", "msg": _("请求参数格式错误")}

        if not device_type:
            return {"err": "params.missing", "msg": _("设备类型和设备地址不能为空")}
        try:
            PluginRuntime(self.session, CONF).provider_for(
                PUSH_CAPABILITY,
                {"device_type": device_type},
            )
        except PluginRuntimeError:
            return {"err": "device.unsupported", "msg": _("不支持的设备类型: %s") % device_type}

        # Kindle设备使用邮箱地址，其他设备使用device_url
        if device_type == "kindle":
            if not mailbox:
                return {"err": "params.missing", "msg": _("Kindle设备需要提供邮箱地址")}
        else:
            # 地址可省略：回落到该用户上次保存在插件连接里的设备地址。
            device_url = device_url or self._saved_device_url(device_type)
            if not device_url:
                return {"err": "params.missing", "msg": _("设备类型和设备地址不能为空")}

        # Kindle设备通过邮件发送
        if device_type == "kindle":
            return self._send_to_kindle(book, book_id, mailbox)
        else:
            return self._send_to_other_device(book, book_id, device_type, device_url)

    def _send_to_kindle(self, book, book_id, mail_to):
        """通过邮件发送书籍到Kindle设备"""
        self.user_history("push_history", book)
        self.count_increase(book_id, count_download=1)
        runtime = PluginRuntime(self.session, CONF)
        platform = {"book": book, "user_id": self.user_id(), "site_url": self.site_url}
        try:
            if not self.user_id():
                result = runtime.guest_sync(
                    PUSH_CAPABILITY,
                    {"device_type": "kindle"},
                    "push",
                    {},
                    mail_to,
                    timeout=CONF.get("PUSH_TIMEOUT", 60),
                    context_overrides={"platform": platform},
                )
            else:
                connection = runtime.user_connection_for(
                    PUSH_CAPABILITY,
                    self.user_id(),
                    selector={"device_type": "kindle"},
                )
                result = runtime.sync(
                    connection,
                    "push",
                    {},
                    mail_to,
                    timeout=CONF.get("PUSH_TIMEOUT", 60),
                    context_overrides={"platform": platform},
                    required_scopes=("books.read", "network.write"),
                    requested_by=self.user_id(),
                    audit_data={"book_id": book_id, "device_type": "kindle"},
                )
        except PluginRuntimeError as exc:
            return {"err": "upload.error", "msg": str(exc)}

        if not result.get("success"):
            return {"err": "format.not_supported", "msg": _("书籍没有Kindle支持的格式!")}

        self.add_msg(
            "success",
            _("服务器正在推送《%(title)s》到%(email)s") % {"title": book["title"], "email": mail_to},
        )
        if result.get("converting"):
            return {"err": "ok", "msg": _("服务器正在转换格式，稍后将自动推送。您可关闭此窗口，继续浏览其他书籍。")}
        return {"err": "ok", "msg": _("服务器后台正在推送。您可关闭此窗口，继续浏览其他书籍。")}

    def _saved_device_url(self, device_type):
        """取当前用户在该设备插件连接里保存过的地址。"""
        if not self.user_id():
            # 游客没有个人连接，且不能读取任何实例级/其他用户保存的局域网地址。
            return ""
        runtime = PluginRuntime(self.session, CONF)
        try:
            return str(
                runtime.user_connection_config(
                    PUSH_CAPABILITY,
                    self.user_id(),
                    "device_url",
                    selector={"device_type": device_type},
                )
                or ""
            )
        except PluginRuntimeError:
            return ""

    def _send_to_other_device(self, book, book_id, device_type, device_url):
        """通过WiFi上传发送书籍到其他设备"""

        # 查找合适的文件格式（优先级：epub > azw3 > pdf > txt）
        file_path = None
        file_format = None
        format_priority = ["epub", "azw3", "pdf", "txt"]
        for fmt in format_priority:
            fmt_key = "fmt_%s" % fmt
            if fmt_key in book:
                file_path = book[fmt_key]
                file_format = fmt
                break

        if not file_path:
            return {"err": "file.not_found", "msg": _("书籍没有支持的文件格式（epub/azw3/pdf/txt）")}

        # 检查文件是否存在
        if not os.path.exists(file_path):
            return {"err": "file.missing", "msg": _("书籍文件不存在: %s") % file_path}

        # 走 typed 插件运行时：按 manifest 的 device_type 声明解析
        # provider，认证用户经个人 connection + runtime.sync 执行。
        try:
            book_name = book.get("title", "")
            if len(book_name) > 120:
                book_name = ""
            if not book_name:
                book_name = None
            else:
                book_name += os.path.splitext(file_path)[-1]

            logging.info(
                "[SEND_TO_DEVICE] sending book %s (%s) to device %s: %s", book_id, file_format, device_type, device_url
            )
            if not self.user_id():
                # ALLOW_GUEST_PUSH 是既有兼容能力。PluginRun.requested_by 非空，
                # 不能伪造用户或把局域网地址保存为共享配置；游客只执行本次推送。
                PluginRuntime(self.session, CONF).guest_sync(
                    PUSH_CAPABILITY,
                    {"device_type": device_type},
                    "push",
                    {"path": file_path, "name": book_name},
                    device_url,
                    timeout=CONF.get("PUSH_TIMEOUT", 60),
                )
            else:
                runtime = PluginRuntime(self.session, CONF)
                connection = runtime.user_connection_for(
                    PUSH_CAPABILITY,
                    self.user_id(),
                    selector={"device_type": device_type},
                    config_updates={"device_url": device_url},
                )
                runtime.sync(
                    connection,
                    "push",
                    {"path": file_path, "name": book_name},
                    device_url,
                    timeout=CONF.get("PUSH_TIMEOUT", 60),
                    required_scopes=("books.read", "network.write"),
                    requested_by=self.user_id(),
                    audit_data={"book_id": book_id, "format": file_format, "device_type": device_type},
                )
            logging.info("[SEND_TO_DEVICE] success: %s -> %s", book_id, device_type)
            return {"err": "ok", "msg": _("书籍发送成功")}
        except UpstreamError as exc:
            message = str(exc)
            logging.warning("[SEND_TO_DEVICE] failed: %s -> %s: %s", book_id, device_type, message)
            if exc.error_type == "connection":
                return {"err": "connection.failed", "msg": _("无法连接到设备。请确认IP地址正确，且设备已开启WiFi上传功能")}
            if exc.error_type == "timeout":
                return {"err": "upload.timeout", "msg": _("上传超时。请检查网络连接和设备状态")}
            return {"err": "upload.error", "msg": _("上传过程出错: %s。请查看日志获取详细信息") % message}
        except PluginRuntimeError as exc:
            logging.warning("[SEND_TO_DEVICE] runtime failed: %s -> %s: %s", book_id, device_type, exc.code)
            if exc.code == "plugin.timeout":
                return {"err": "upload.timeout", "msg": _("上传超时。请检查网络连接和设备状态")}
            if exc.code in {"plugin.provider_unavailable", "plugin.provider_ambiguous"}:
                return {"err": "device.unsupported", "msg": _("不支持的设备类型: %s") % device_type}
            return {"err": "upload.error", "msg": _("发送过程出错，请查看日志获取详细信息")}
        except Exception as e:
            logging.error("[SEND_TO_DEVICE] send failed: %s", e)
            return {"err": "upload.error", "msg": _("发送过程出错，请查看日志获取详细信息")}


class BookSendToMail(BaseHandler):
    @js
    def post(self, bid):
        """发送书籍到指定邮箱"""
        book_id = int(bid)
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "book.not_found", "msg": _("书籍已不存在")}

        if not CONF["ALLOW_GUEST_PUSH"]:
            if not self.current_user:
                return {"err": "user.need_login", "msg": _("请先登录")}
            else:
                if not self.current_user.can_push():
                    return {"err": "permission", "msg": _("无权限进行推送，请联系管理员检查权限")}
                elif not self.current_user.is_active():
                    return {"err": "permission", "msg": _("无权限进行操作，请先激活账号。")}

        # 解析请求参数
        try:
            data = tornado.escape.json_decode(self.request.body)
            mail_to = data.get("email", "").strip()
        except Exception:
            return {"err": "params.invalid", "msg": _("没有指定邮箱地址")}

        if not mail_to:
            return {"err": "params.missing", "msg": _("邮箱地址不能为空")}

        # 验证邮箱地址格式
        email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(email_pattern, mail_to):
            return {"err": "email.invalid", "msg": _("邮箱地址格式不正确")}

        # 按优先级查找可用格式: EPUB > AZW3 > PDF > MOBI > TXT
        format_priority = ["epub", "azw3", "pdf", "mobi", "txt"]
        file_path = None
        file_format = None

        for fmt in format_priority:
            fmt_key = "fmt_%s" % fmt
            if fmt_key in book:
                file_path = book[fmt_key]
                file_format = fmt
                break

        if not file_path:
            return {"err": "format.not_found", "msg": _("书籍没有支持的文件格式（EPUB/AZW3/PDF/MOBI/TXT）")}

        # 检查文件是否存在
        if not os.path.exists(file_path):
            return {"err": "file.missing", "msg": _("书籍文件不存在")}

        # 检查文件大小（50MB = 52428800 bytes）
        file_size = os.path.getsize(file_path)
        max_size = 50 * 1024 * 1024  # 50MB
        if file_size > max_size:
            size_mb = file_size / (1024 * 1024)
            return {"err": "file.too_large", "msg": _("附件过大（%.1fMB），邮件附件大小不能超过50MB") % size_mb}

        # 记录推送历史和增加统计
        self.user_history("push_history", book)
        self.count_increase(book_id, count_download=1)
        logging.info("[SEND_TO_MAIL] sending book %s (%s, %s bytes) to %s", book_id, file_format, file_size, mail_to)
        MailService().send_book(self.user_id(), self.site_url, book, mail_to, file_format, file_path)

        self.add_msg(
            "success",
            _("已开始推送《%(title)s》到%(email)s") % {"title": book["title"], "email": mail_to},
        )

        return {"err": "ok", "msg": _("后台正在推送，稍后可以刷新页面，在通知消息中查看结果。")}


class BookSetScope(BaseHandler):
    @js
    @auth
    def post(self, bid):
        book = self.get_book(int(bid))
        if not book:
            return {"err": "params.book.invalid", "msg": _("书籍已不存在")}

        bid = book["id"]
        if not self.current_user.can_edit() or not (self.is_admin() or self.is_book_owner(bid, self.user_id())):
            return {"err": "permission", "msg": _("无权操作")}

        succeed = False
        try:
            item = self.session.query(Item).filter(Item.book_id == bid).first()
            if item:
                item.scope = "public" if item.scope == "private" else "private"
            else:
                item = Item()
                item.book_id = bid
                item.collector_id = self.user_id()
                item.scope = "private"
                try:
                    item.create_time = self.cache.field_for("timestamp", bid)
                except Exception:
                    item.create_time = datetime.datetime.now()
                self.session.add(item)
            self.session.commit()
            succeed = True
        except Exception as e:
            self.session.rollback()
            logging.error("set book %d scope failed: %s" % (bid, e))

        if succeed:
            return {"err": "ok", "msg": _("更新成功")}
        else:
            return {"err": "db.update.failed", "msg": _("更新失败，请稍后再试")}


class BookDeleteFormat(BaseHandler):
    @js
    @auth
    def post(self, bid):
        book = self.get_book(bid, raise_exception=False)
        if not book:
            return {"err": "params.book.invalid", "msg": _("书籍已不存在")}
        bid = book["id"]

        if not self.current_user.can_edit() or not (self.is_admin() or self.is_book_owner(bid, self.user_id())):
            return {"err": "permission", "msg": _("无权操作")}

        try:
            data = tornado.escape.json_decode(self.request.body)
            fmt = data.get("format", "").strip().lower()
        except Exception:
            return {"err": "params.invalid", "msg": _("请求参数格式错误")}

        if not fmt:
            return {"err": "params.missing", "msg": _("格式参数不能为空")}

        fmt_key = "fmt_%s" % fmt
        if fmt_key not in book:
            return {"err": "format.not_found", "msg": _("书籍不包含 %s 格式") % fmt.upper()}

        available_formats = book.get("available_formats", [])
        if len(available_formats) <= 1:
            return {"err": "last.format", "msg": _("书籍只有一个格式，无法刪除")}

        try:
            remove_formats_preserving_external_files(self.db, self.session, bid, [fmt.upper()])
            self.add_msg("success", _("删除书籍《%s》的%s格式") % (book["title"], fmt))
            return {"err": "ok", "msg": _("删除%s格式成功") % fmt}
        except Exception as e:
            logging.error("删除书籍《%s》的%s格式失败: %s", book["title"], fmt, e)
            return {"err": "fail", "msg": _("删除%s格式失败，请查看日志") % fmt}


class BookSeparate(BaseHandler):
    @js
    @auth
    def post(self, bid):
        from calibre.ebooks.metadata.meta import get_metadata

        book_id = int(bid)
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "params.book.invalid", "msg": _("书籍已不存在")}

        if not self.current_user.can_edit() or not (self.is_admin() or self.is_book_owner(book_id, self.user_id())):
            return {"err": "permission", "msg": _("无权操作")}

        try:
            data = tornado.escape.json_decode(self.request.body)
            fmt = data.get("format", "").strip().lower()
        except Exception:
            return {"err": "params.invalid", "msg": _("请求参数格式错误")}

        if not fmt:
            return {"err": "params.missing", "msg": _("格式参数不能为空")}

        fmt_key = "fmt_%s" % fmt
        if fmt_key not in book:
            return {"err": "format.not_found", "msg": _("书籍不包含 %s 格式") % fmt.upper()}

        original_path = book[fmt_key]
        if not os.path.exists(original_path):
            return {"err": "file.missing", "msg": _("格式文件不存在: %s") % original_path}

        available_formats = book.get("available_formats", [])
        if len(available_formats) <= 1:
            return {"err": "last.format", "msg": _("书籍只有一个格式，无法分离")}

        try:
            filename = os.path.basename(original_path)
            upload_path = os.path.join(CONF["upload_path"], filename)

            if os.path.exists(upload_path):
                timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
                name, ext = os.path.splitext(filename)
                upload_path = os.path.join(CONF["upload_path"], f"{name}_{timestamp}{ext}")

            shutil.copy2(original_path, upload_path)
            logging.info("[SEPARATE] Copied format file from %s to %s", original_path, upload_path)

            failed = False
            with open(upload_path, "rb") as stream:
                mi = get_metadata(stream, stream_type=fmt, use_libprs_metadata=True)
                if mi.title and mi.title == CALIBRE_ERROR_FLAG:
                    logging.error("Failed to get metadata for %s, reason:%s", upload_path, mi.comments)
                    failed = True
                mi.title = utils.super_strip(mi.title)
                if mi.author_sort == "Unknown" and mi.authors and len(mi.authors) > 0:
                    mi.authors = [utils.super_strip(a) for a in mi.authors]
                else:
                    mi.authors = [utils.super_strip(mi.author_sort)]

            if failed:
                return {"err": "book.invalid", "msg": _("此书籍文件无法识别，或者受DRM保护无法处理")}

            if fmt in ["txt", "pdf"]:
                mi.title = filename.replace("." + fmt, "")
                mi.authors = [_("佚名")]

            fpaths = [upload_path]
            new_book_id = self.db.import_book(mi, fpaths)

            if new_book_id is None:
                if os.path.exists(upload_path):
                    os.remove(upload_path)
                return {"err": "book.create.failed", "msg": _("创建新书籍失败")}

            item = Item()
            item.book_id = new_book_id
            item.collector_id = self.user_id()
            self.session.add(item)
            self.session.commit()

            remove_formats_preserving_external_files(self.db, self.session, book_id, [fmt.upper()])

            logging.info("[SEPARATE] Successfully separated format %s from book %d to new book %d", fmt, book_id, new_book_id)
            self.add_msg("success", _("成功将 %s 格式分离为新书籍") % fmt.upper())
            return {
                "err": "ok",
                "msg": _("格式分离成功"),
                "original_book_id": book_id,
                "new_book_id": new_book_id,
            }

        except Exception as e:
            logging.error("[SEPARATE] Failed to separate format %s from book %d: %s", fmt, book_id, e)
            if "upload_path" in locals() and os.path.exists(upload_path):
                try:
                    os.remove(upload_path)
                except Exception:
                    pass
            return {"err": "internal", "msg": _("分离格式时发生错误: %s") % str(e)}


class BookSaveMeta(BaseHandler):
    @js
    @auth
    def post(self, bid):
        book_id = int(bid)
        if not self.is_admin() and not self.is_book_owner(book_id, self.user_id()):
            return {"err": "user.no_permission", "msg": _("无权限，非管理员或书籍所有者无法操作")}

        fmt = self.get_argument("fmt", None)
        return self.save_book_meta(book_id, fmt=fmt)


class BookScoped(BaseHandler):
    @js
    @auth
    async def get(self):
        import json

        user_id = self.user_id()
        title = _("私有书籍")
        stream = self.get_argument("stream", None)

        db_items = (
            self.session.query(Item)
            .filter(Item.collector_id == user_id, Item.scope == "private")
            .order_by(Item.book_id.desc())
        )

        try:
            start = self.get_argument_start()
            delta = 60
            items = db_items.limit(delta).offset(start).all()
            ids = [item.book_id for item in items]
            total_items = 0

            if len(ids) > 0:
                total_items = self.session.query(Item).filter(Item.collector_id == user_id, Item.scope == "private").count()

            books = self.get_books(ids=ids)
            books.sort(key=lambda x: x["id"], reverse=True)
            books_result = self.attach_reading_states([utils.BookFormatter(self, book).format() for book in books])

            if stream == "1":
                origin = self.request.headers.get("origin", "*")
                self.set_header("Access-Control-Allow-Origin", origin)
                self.set_header("Access-Control-Allow-Credentials", "true")
                self.set_header("Cache-Control", "max-age=0")
                self.set_header("Content-Type", "application/x-ndjson")
                self.set_header("X-Accel-Buffering", "no")

                meta = {"err": "ok", "title": title, "total": total_items}
                self.write(json.dumps(meta, ensure_ascii=False) + "\n")
                await self.flush()
                logging.info("[STREAM] scopedbooks 元信息已发送 (total=%d)", total_items)

                for book_data in books_result:
                    title_val = book_data.get("title", "?")
                    self.write(json.dumps(book_data, ensure_ascii=False) + "\n")
                    await self.flush()
                    logging.info("[STREAM] scopedbooks 已发送: %s", title_val)

                self.finish()
                return None

            return {"err": "ok", "title": title, "total": total_items, "books": books_result}
        except Exception as e:
            import traceback

            traceback.print_exc()
            logging.error("Failed to get soled books: %s", e)
            return {"err": "internal", "msg": _("获取私有书籍失败")}


class BookFavorite(BaseHandler):
    @js
    @auth
    def post(self, id):
        book_id = int(id)
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "params.book.invalid", "msg": _("书籍已不存在")}
        user_id = self.user_id()
        data = tornado.escape.json_decode(self.request.body)
        favorite_status = data.get("favorite", False)
        reading_state = (
            self.session.query(ReadingState).filter(ReadingState.book_id == book_id, ReadingState.reader_id == user_id).first()
        )
        if not reading_state:
            reading_state = ReadingState(book_id, user_id)
            self.session.add(reading_state)
        reading_state.set_favorite(favorite_status)
        self.session.commit()
        action = "收藏" if favorite_status else "取消收藏"
        return {"err": "ok", "msg": _("%s成功") % action}

    @js
    @auth
    def get(self, id=None):
        user_id = self.user_id()
        reading_states = (
            self.session.query(ReadingState)
            .filter(ReadingState.reader_id == user_id, ReadingState.favorite == 1)
            .order_by(ReadingState.favorite_date.desc())
            .all()
        )
        book_ids = [state.book_id for state in reading_states]
        books_dict = {book["id"]: book for book in self.get_books(ids=book_ids)}
        state_dict = {state.book_id: state for state in reading_states}
        favorite_books = []
        for book_id in book_ids:
            book = books_dict.get(book_id)
            if not book:
                continue
            book_data = utils.BookFormatter(self, book).format()
            book_data["state"] = utils.ReadingStateFormatter.format_reading_state(state_dict[book_id])
            favorite_books.append(book_data)
        return {"err": "ok", "title": _("我的收藏"), "total": len(favorite_books), "books": favorite_books}


class BookShelf(BaseHandler):
    @js
    @auth
    def post(self, id):
        book_id = int(id)
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "params.book.invalid", "msg": _("书籍已不存在")}
        user_id = self.user_id()
        data = tornado.escape.json_decode(self.request.body)
        shelf_status = data.get("shelf", False)
        reading_state = (
            self.session.query(ReadingState).filter(ReadingState.book_id == book_id, ReadingState.reader_id == user_id).first()
        )
        if not reading_state:
            reading_state = ReadingState(book_id, user_id)
            self.session.add(reading_state)
        reading_state.set_wants(shelf_status)
        self.session.commit()
        msg = _("加入书架成功") if shelf_status else _("移除书架成功")
        return {"err": "ok", "msg": msg}

    @js
    @auth
    def get(self, id=None):
        user_id = self.user_id()
        reading_states = (
            self.session.query(ReadingState)
            .filter(ReadingState.reader_id == user_id, ReadingState.wants == 1)
            .order_by(ReadingState.wants_date.desc())
            .all()
        )
        book_ids = [state.book_id for state in reading_states]
        books_dict = {book["id"]: book for book in self.get_books(ids=book_ids)}
        state_dict = {state.book_id: state for state in reading_states}
        shelf_books = []
        for book_id in book_ids:
            book = books_dict.get(book_id)
            if not book:
                continue
            book_data = utils.BookFormatter(self, book).format()
            book_data["state"] = utils.ReadingStateFormatter.format_reading_state(state_dict[book_id])
            shelf_books.append(book_data)
        return {"err": "ok", "title": _("我的书架"), "total": len(shelf_books), "books": shelf_books}


class BookReading(BaseHandler):
    @js
    @auth
    def get(self):
        user_id = self.user_id()
        reading_states = (
            self.session.query(ReadingState)
            .filter(ReadingState.reader_id == user_id, ReadingState.read_state == 1)
            .order_by(ReadingState.read_date.desc())
            .all()
        )
        book_ids = [state.book_id for state in reading_states]
        books_dict = {book["id"]: book for book in self.get_books(ids=book_ids)}
        state_dict = {state.book_id: state for state in reading_states}
        reading_books = []
        for book_id in book_ids:
            book = books_dict.get(book_id)
            if not book:
                continue
            book_data = utils.BookFormatter(self, book).format()
            book_data["state"] = utils.ReadingStateFormatter.format_reading_state(state_dict[book_id])
            reading_books.append(book_data)
        return {"err": "ok", "title": _("在读书籍"), "total": len(reading_books), "books": reading_books}


class BookReadDone(BaseHandler):
    @js
    @auth
    def get(self):
        user_id = self.user_id()
        reading_states = (
            self.session.query(ReadingState)
            .filter(ReadingState.reader_id == user_id, ReadingState.read_state == 2)
            .order_by(ReadingState.read_date.desc())
            .all()
        )
        book_ids = [state.book_id for state in reading_states]
        books_dict = {book["id"]: book for book in self.get_books(ids=book_ids)}
        state_dict = {state.book_id: state for state in reading_states}
        read_done_books = []
        for book_id in book_ids:
            book = books_dict.get(book_id)
            if not book:
                continue
            book_data = utils.BookFormatter(self, book).format()
            book_data["state"] = utils.ReadingStateFormatter.format_reading_state(state_dict[book_id])
            read_done_books.append(book_data)
        return {"err": "ok", "title": _("已读完书籍"), "total": len(read_done_books), "books": read_done_books}


class BookReadingState(BaseHandler):
    @js
    @auth
    def post(self, id):
        book_id = int(id)
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "params.book.invalid", "msg": _("书籍已不存在")}
        user_id = self.user_id()
        data = tornado.escape.json_decode(self.request.body)
        read_state = data.get("read_state", 0)
        if read_state not in [0, 1, 2]:
            return {"err": "params.invalid", "msg": _("阅读状态参数错误")}
        reading_state = (
            self.session.query(ReadingState).filter(ReadingState.book_id == book_id, ReadingState.reader_id == user_id).first()
        )
        if not reading_state:
            reading_state = ReadingState(book_id, user_id)
            self.session.add(reading_state)
        reading_state.set_read_state(read_state)
        if data.get("online_read") is not None:
            reading_state.set_online_read(data["online_read"])
        if data.get("download") is not None:
            reading_state.set_download(data["download"])
        self.session.commit()
        state_names = {0: "未读", 1: "在读", 2: "已读完"}
        return {"err": "ok", "msg": _("阅读状态已设置为：%s") % state_names[read_state]}

    @js
    @auth
    def get(self, id):
        book_id = int(id)
        user_id = self.user_id()
        reading_state = (
            self.session.query(ReadingState).filter(ReadingState.book_id == book_id, ReadingState.reader_id == user_id).first()
        )
        return utils.ReadingStateFormatter.format_reading_state_with_api_format(reading_state)


class BookReadingProgress(BaseHandler):
    """跨端同步指定书籍的阅读进度（如章节、CFI、百分比等，由客户端自定义结构）。"""

    MAX_PROGRESS_BYTES = 8 * 1024

    @js
    @auth
    def post(self, id):
        book_id = int(id)
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "params.book.invalid", "msg": _("书籍已不存在")}
        user_id = self.user_id()
        data = tornado.escape.json_decode(self.request.body)
        progress = data.get("progress")
        if not isinstance(progress, dict):
            return {"err": "params.invalid", "msg": _("阅读进度参数错误")}
        if len(json.dumps(progress)) > self.MAX_PROGRESS_BYTES:
            return {"err": "params.invalid", "msg": _("阅读进度数据过大")}
        reading_state = (
            self.session.query(ReadingState).filter(ReadingState.book_id == book_id, ReadingState.reader_id == user_id).first()
        )
        if not reading_state:
            reading_state = ReadingState(book_id, user_id)
            self.session.add(reading_state)
        reading_state.set_progress(progress)
        self.session.commit()
        return {"err": "ok", "msg": _("阅读进度已保存"), "progress": reading_state.get_progress()}

    @js
    @auth
    def get(self, id):
        book_id = int(id)
        user_id = self.user_id()
        reading_state = (
            self.session.query(ReadingState).filter(ReadingState.book_id == book_id, ReadingState.reader_id == user_id).first()
        )
        if not reading_state:
            return {"err": "ok", "progress": {}, "update_time": None}
        update_time = reading_state.progress_update_time.isoformat() if reading_state.progress_update_time else None
        return {"err": "ok", "progress": reading_state.get_progress(), "update_time": update_time}


class BookReadingStats(BaseHandler):
    @js
    @auth
    def get(self):
        from sqlalchemy import extract

        user_id = self.user_id()
        now = datetime.datetime.now()
        current_year = now.year
        current_month = now.month

        total_reading = (
            self.session.query(ReadingState).filter(ReadingState.reader_id == user_id, ReadingState.read_state == 1).count()
        )

        total_read_done = (
            self.session.query(ReadingState).filter(ReadingState.reader_id == user_id, ReadingState.read_state == 2).count()
        )

        month_reading = (
            self.session.query(ReadingState)
            .filter(
                ReadingState.reader_id == user_id,
                ReadingState.read_state == 1,
                extract("year", ReadingState.read_date) == current_year,
                extract("month", ReadingState.read_date) == current_month,
            )
            .count()
        )

        month_read_done = (
            self.session.query(ReadingState)
            .filter(
                ReadingState.reader_id == user_id,
                ReadingState.read_state == 2,
                extract("year", ReadingState.read_date) == current_year,
                extract("month", ReadingState.read_date) == current_month,
            )
            .count()
        )

        month_read_done_states = (
            self.session.query(ReadingState)
            .filter(
                ReadingState.reader_id == user_id,
                ReadingState.read_state == 2,
                extract("year", ReadingState.read_date) == current_year,
                extract("month", ReadingState.read_date) == current_month,
            )
            .order_by(ReadingState.read_date.desc())
            .limit(12)
            .all()
        )

        month_read_done_books = []
        for state in month_read_done_states:
            book = self.get_book(state.book_id, raise_exception=False)
            if not book:
                continue
            book_data = utils.BookFormatter(self, book).format()
            book_data["state"] = utils.ReadingStateFormatter.format_reading_state(state)
            month_read_done_books.append(book_data)

        current_reading_states = (
            self.session.query(ReadingState)
            .filter(ReadingState.reader_id == user_id, ReadingState.read_state == 1)
            .order_by(ReadingState.read_date.desc())
            .limit(12)
            .all()
        )

        current_reading_books = []
        for state in current_reading_states:
            book = self.get_book(state.book_id, raise_exception=False)
            if not book:
                continue
            book_data = utils.BookFormatter(self, book).format()
            book_data["state"] = utils.ReadingStateFormatter.format_reading_state(state)
            current_reading_books.append(book_data)

        return {
            "err": "ok",
            "stats": {
                "total_reading": total_reading,
                "total_read_done": total_read_done,
                "month_reading": month_reading,
                "month_read_done": month_read_done,
                "current_year": current_year,
                "current_month": current_month,
            },
            "month_read_done_books": month_read_done_books,
            "current_reading_books": current_reading_books,
        }


def routes():
    return [
        (r"/api/index", Index),
        (r"/api/search", SearchBook),
        (r"/api/recent", RecentBook),
        (r"/api/library", LibraryBook),
        (r"/api/hot", HotBook),
        (r"/api/scopedbooks", BookScoped),
        (r"/api/book/nav", BookNav),
        (r"/api/book/upload", BookUpload),
        (r"/api/book/upload/chunk", BookUploadChunk),
        (r"/api/book/upload/complete", BookUploadComplete),
        (r"/api/book/([0-9]+)", BookDetail),
        (r"/api/book/([0-9]+)/delete", BookDelete),
        (r"/api/book/([0-9]+)/edit", BookEdit),
        (r"/api/book/([0-9]+)/setscope", BookSetScope),
        (r"/api/book/([0-9]+\..+)", BookDownload),
        (r"/api/book/([0-9]+)/send_to_device", BookSendToDevice),
        (r"/api/book/([0-9]+)/mailto", BookSendToMail),
        (r"/api/book/([0-9]+)/refer", BookRefer),
        (r"/api/book/([0-9]+)/convert", BookConverter),
        (r"/api/book/([0-9]+)/topdf", BookToPDF),
        (r"/api/book/([0-9]+)/delete_format", BookDeleteFormat),
        (r"/api/book/([0-9]+)/separate", BookSeparate),
        (r"/api/book/([0-9]+)/savemeta", BookSaveMeta),
        (r"/read/([0-9]+)", BookRead),
        (r"/api/read/txt", TxtRead),
        (r"/api/book/txt/init", BookTxtInit),
        (r"/api/book/([0-9]+)/favorite", BookFavorite),
        (r"/api/book/([0-9]+)/shelf", BookShelf),
        (r"/api/book/([0-9]+)/readstate", BookReadingState),
        (r"/api/book/([0-9]+)/progress", BookReadingProgress),
        (r"/api/favorites", BookFavorite),
        (r"/api/shelf", BookShelf),
        (r"/api/reading", BookReading),
        (r"/api/read-done", BookReadDone),
        (r"/api/reading/stats", BookReadingStats),
    ]
