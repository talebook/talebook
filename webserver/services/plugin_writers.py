"""实体写入器：把「某类实体如何落进 Talebook 的表」从通用运行时里分离出来。

运行时只按 ``entity_type`` 查注册表，具体怎么写由写入器负责；来源身份统一
由连接所属的完整 ``plugin_key`` 推导。
"""

import hashlib

from webserver.models import PluginInstallation


SOURCE_ID_MAX_LENGTH = 64


def bounded_source_id(value, suffix="", max_length=SOURCE_ID_MAX_LENGTH):
    """Keep source namespaces stable and valid for their database columns."""
    raw = "%s%s" % (str(value or "plugin"), suffix)
    if len(raw) <= max_length:
        return raw
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]
    head_length = max(0, max_length - len(digest) - 1)
    return "%s:%s" % (raw[:head_length], digest)


def source_name_for(session, connection):
    """由连接所属插件推导来源标识。"""
    installation_id = getattr(connection, "installation_id", None)
    installation = session.get(PluginInstallation, installation_id) if installation_id is not None else None
    plugin_key = (installation.plugin_key if installation else "") or ""
    return bounded_source_id(plugin_key or "plugin")


class EntityWriter:
    """一类实体的落库策略。三个钩子都可选实现。"""

    entity_type = ""

    def prepare(self, session, connection, data, calibre_db, allowed_book_ids=None):
        """写入前的归一化与匹配。返回 ``(data, matched)``。"""
        return data, True

    def materialize(self, session, run, connection, record, data, payload_hash, calibre_db):
        """把来源记录物化为 Talebook 自己的业务行。"""

    def rollback(self, session, record):
        """撤销 :meth:`materialize` 的写入。"""


class AnnotationWriter(EntityWriter):
    entity_type = "annotation"

    def prepare(self, session, connection, data, calibre_db, allowed_book_ids=None):
        from webserver.services.annotation_writer import prepare_annotation_item

        return prepare_annotation_item(session, connection, data, calibre_db, allowed_book_ids)

    def materialize(self, session, run, connection, record, data, payload_hash, calibre_db):
        from webserver.services.annotation_writer import materialize_annotation

        return materialize_annotation(session, run, connection, record, data, payload_hash, calibre_db)

    def rollback(self, session, record):
        from webserver.services.annotation_writer import rollback_materialized_annotation

        return rollback_materialized_annotation(session, record)


ENTITY_WRITERS = {writer.entity_type: writer for writer in (AnnotationWriter(),)}


def writer_for(entity_type):
    """返回该实体类型的写入器；没有注册则返回 None，由平台按通用路径处理。"""
    return ENTITY_WRITERS.get(entity_type)
