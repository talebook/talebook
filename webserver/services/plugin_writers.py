"""实体写入器：把「某类实体如何落进 Talebook 的表」从通用运行时里分离出来。

此前 ``PluginRuntime._apply_result`` 与 ``_rollback`` 在函数体内 import 了
微信读书专属模块，并以 ``if entity_type == "annotation"`` 分派。后果是任何
annotations 插件写库都会被打上微信读书身份（``source_name="weread"``、
``source_type="weread_book"``、client id 前缀 ``"weread:"``），协议的泛化能力
形同虚设。

现在运行时只按 ``entity_type`` 查注册表，具体怎么写由写入器负责；来源身份
由连接所属的 ``plugin_key`` 推导，而不是模块常量。
"""

from webserver.models import PluginInstallation


def source_name_for(session, connection):
    """由连接所属插件推导来源标识。

    取 ``plugin_key`` 的末段：``talebook.weread`` → ``weread``、
    ``talebook.annotations.brs`` → ``brs``。这一映射与存量数据一致
    （历史行的 ``source_name`` 正是 ``weread``），因此无需迁移。
    """
    installation = session.get(PluginInstallation, connection.installation_id)
    plugin_key = (installation.plugin_key if installation else "") or ""
    return plugin_key.rsplit(".", 1)[-1] or "plugin"


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
