#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import datetime
import logging
from dataclasses import asdict

from webserver.models import Annotation, AnnotationSource, PluginConnection
from webserver.plugins.runtime.domains import Annotation as PluginAnnotation
from webserver.plugins.runtime.domains import PushReceipt, SourceState
from webserver.services import AsyncService
from webserver.services.plugin_runtime import REGISTRY, PluginRuntime
from webserver.services.plugin_writers import source_name_for


def _parse_source_datetime(value):
    if not value or isinstance(value, datetime.datetime):
        return value
    parsed = datetime.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo:
        parsed = parsed.astimezone(datetime.timezone.utc).replace(tzinfo=None)
    return parsed


class AnnotationSyncService(AsyncService):
    """Fan public annotations out to typed plugin connections and legacy writers."""

    _writers = {}

    @classmethod
    def register_writer(cls, source_name, writer, source_connection_id=""):
        source_name = str(source_name or "").strip()
        source_connection_id = str(source_connection_id or "").strip()
        if not source_name or source_name == "talebook" or not callable(writer):
            raise ValueError("invalid annotation source writer")
        cls._writers[(source_name, source_connection_id)] = writer

    @classmethod
    def unregister_writer(cls, source_name, source_connection_id=""):
        cls._writers.pop((str(source_name).strip(), str(source_connection_id or "").strip()), None)

    @classmethod
    def reset_writers(cls):
        cls._writers.clear()

    def _source(self, annotation_id, source_name, source_connection_id):
        source = (
            self.session.query(AnnotationSource)
            .filter(
                AnnotationSource.annotation_id == annotation_id,
                AnnotationSource.source_name == source_name,
                AnnotationSource.source_connection_id == source_connection_id,
            )
            .first()
        )
        if source is None:
            source = AnnotationSource(
                annotation_id=annotation_id,
                source_name=source_name,
                source_connection_id=source_connection_id,
                source_sync_status="pending",
            )
            self.session.add(source)
        return source

    def _remote_id(self, annotation_id, source_name, source_connection_id):
        """某条记录在同一来源中的外部 id；优先同一连接，其次同一来源的任一连接。"""
        sources = (
            self.session.query(AnnotationSource)
            .filter(
                AnnotationSource.annotation_id == annotation_id,
                AnnotationSource.source_name == source_name,
                AnnotationSource.source_annotation_id.isnot(None),
            )
            .all()
        )
        preferred = [item for item in sources if item.source_connection_id == source_connection_id]
        source = (preferred or sources or [None])[0]
        return source.source_annotation_id if source else None

    def _typed_writers(self, annotation, registry, settings):
        runtime = PluginRuntime(self.session, settings, registry=registry)
        writers = {}
        for connection in runtime.connections_for("annotations.push", user_id=annotation.reader_id):
            source_name = source_name_for(self.session, connection)
            source_connection_id = str(connection.id)

            def writer(annotation_data, source_data, _connection=connection):
                receipt = runtime.sync(
                    _connection,
                    "push_annotation",
                    PluginAnnotation.from_dict(annotation_data),
                    SourceState.from_dict(source_data),
                    required_scopes=("annotations.write",),
                )
                if not isinstance(receipt, PushReceipt):
                    raise TypeError("AnnotationProvider.push_annotation must return PushReceipt")
                return asdict(receipt)

            writers[(source_name, source_connection_id)] = writer
        return writers

    def _annotation_data(self, annotation):
        data = annotation.to_api_dict()
        if self.db is None:
            return data
        try:
            metadata = self.db.get_metadata(int(annotation.book_id), index_is_id=True)
            data["book_title"] = str(getattr(metadata, "title", "") or "")
        except Exception as err:
            logging.warning("annotation book metadata unavailable for %s: %s", annotation.book_id, err)
        return data

    @AsyncService.register_service
    def sync_annotation(
        self,
        annotation_id,
        exclude_source_name=None,
        exclude_source_connection_id="",
        registry=None,
        settings=None,
    ):
        annotation = self.session.get(Annotation, int(annotation_id))
        if annotation is None or annotation.is_private:
            return
        root = self.session.get(Annotation, annotation.root_id) if annotation.root_id else annotation
        # 回复跟随主评论的公开范围：主评论私有或已删除时不外发。
        if root is None or root.is_private:
            return

        if settings is None:
            from webserver.loader import get_settings

            settings = get_settings()
        writers = dict(self._writers)
        writers.update(self._typed_writers(annotation, registry or REGISTRY, settings))
        annotation_data = self._annotation_data(annotation)
        excluded = (exclude_source_name, str(exclude_source_connection_id or ""))
        for (source_name, source_connection_id), writer in list(writers.items()):
            if (source_name, source_connection_id) == excluded:
                continue
            now = datetime.datetime.now()
            source = self._source(annotation.id, source_name, source_connection_id)
            source.source_sync_status = "pending"
            source.source_sync_error = None
            source.update_time = now
            self.session.commit()

            data = annotation_data
            if annotation.root_id:
                # 回复要带上主评论与回复对象在该来源中的 id；主评论还没同步过去时记为失败，之后可重试。
                remote_root_id = self._remote_id(annotation.root_id, source_name, source_connection_id)
                if not remote_root_id:
                    source.source_sync_status = "failed"
                    source.source_sync_error = "主评论尚未同步到该来源"
                    source.update_time = datetime.datetime.now()
                    self.session.commit()
                    continue
                remote_reply_to_id = (
                    self._remote_id(annotation.reply_to_id, source_name, source_connection_id)
                    if annotation.reply_to_id
                    else remote_root_id
                )
                data = {
                    **annotation_data,
                    "remote_root_id": remote_root_id,
                    "remote_reply_to_id": remote_reply_to_id or remote_root_id,
                }

            try:
                result = writer(data, source.to_api_dict()) or {}
                if not isinstance(result, dict):
                    raise TypeError("annotation source writer must return a dict or None")
                for field in (
                    "source_annotation_id",
                    "source_run_id",
                    "source_position",
                    "source_raw_hash",
                ):
                    if field in result:
                        setattr(source, field, result[field] or None)
                if "source_updated_at" in result:
                    source.source_updated_at = _parse_source_datetime(result["source_updated_at"])
                source.source_sync_status = "synced"
                source.source_synced_at = datetime.datetime.now()
                source.source_sync_error = None
            except Exception as err:
                logging.exception("annotation source sync failed: %s", source_name)
                source.source_sync_status = "failed"
                source.source_sync_error = str(err)[:2000]
            source.update_time = datetime.datetime.now()
            self.session.commit()

    def _runtime(self, registry, settings):
        if settings is None:
            from webserver.loader import get_settings

            settings = get_settings()
        return PluginRuntime(self.session, settings, registry=registry or REGISTRY)

    @AsyncService.register_service
    def delete_remote(self, sources, registry=None, settings=None):
        """撤回外部副本：本站删除记录或改为私有后，按提交前记下的副本身份删除外部记录。

        只处理插件连接写入的副本；来源未实现 delete_annotation 或调用失败时只记录日志，不影响本站。
        """
        runtime = self._runtime(registry, settings)
        for state in sources or []:
            try:
                connection = self.session.get(PluginConnection, int(state.get("source_connection_id")))
            except (TypeError, ValueError):
                connection = None
            if connection is None or not state.get("source_annotation_id"):
                continue
            try:
                runtime.sync(
                    connection,
                    "delete_annotation",
                    SourceState.from_dict(state),
                    required_scopes=("annotations.write",),
                )
            except Exception:
                logging.exception("annotation remote delete failed: %s", state.get("source_name"))

    @AsyncService.register_service
    def sync_vote(self, annotation_id, reader_id, value, registry=None, settings=None):
        """把读者的赞踩推送到他自己的外部连接；目标还没同步到该来源时跳过。"""
        annotation = self.session.get(Annotation, int(annotation_id))
        if annotation is None:
            return
        root = self.session.get(Annotation, annotation.root_id) if annotation.root_id else annotation
        if root is None or root.is_private:
            return
        runtime = self._runtime(registry, settings)
        for connection in runtime.connections_for("annotations.push", user_id=reader_id):
            source_name = source_name_for(self.session, connection)
            source = (
                self.session.query(AnnotationSource)
                .filter(
                    AnnotationSource.annotation_id == annotation.id,
                    AnnotationSource.source_name == source_name,
                    AnnotationSource.source_annotation_id.isnot(None),
                )
                .first()
            )
            if source is None:
                logging.info("annotation %s not synced to %s yet, vote skipped", annotation.id, source_name)
                continue
            try:
                runtime.sync(
                    connection,
                    "push_vote",
                    SourceState.from_dict(source.to_api_dict()),
                    int(value),
                    required_scopes=("annotations.write",),
                )
            except Exception:
                logging.exception("annotation vote sync failed: %s", source_name)
