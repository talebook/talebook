#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import datetime
import logging

from webserver.models import Annotation, AnnotationSource
from webserver.services import AsyncService


def _parse_source_datetime(value):
    if not value or isinstance(value, datetime.datetime):
        return value
    parsed = datetime.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo:
        parsed = parsed.astimezone(datetime.timezone.utc).replace(tzinfo=None)
    return parsed


class AnnotationSyncService(AsyncService):
    """Fan public annotations out to source writers registered by plugins."""

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

    @AsyncService.register_service
    def sync_annotation(self, annotation_id, exclude_source_name=None, exclude_source_connection_id=""):
        annotation = self.session.get(Annotation, int(annotation_id))
        if annotation is None or annotation.is_private:
            return

        excluded = (exclude_source_name, str(exclude_source_connection_id or ""))
        for (source_name, source_connection_id), writer in list(self._writers.items()):
            if (source_name, source_connection_id) == excluded:
                continue
            now = datetime.datetime.now()
            source = self._source(annotation.id, source_name, source_connection_id)
            source.source_sync_status = "pending"
            source.source_sync_error = None
            source.update_time = now
            self.session.commit()

            try:
                result = writer(annotation.to_api_dict(), source.to_api_dict()) or {}
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
