"""插件相关 handler 的共用助手。

拆分 handlers/plugins.py 时抽出，避免通用插件、微信读书、内置文本工具
三块代码共用同一个命名空间。
"""

import contextlib
import datetime

import tornado.escape

from webserver import loader
from webserver.models import PluginConnection, PluginInstallation, PluginRun
from webserver.services.plugin_runtime import (
    DEFAULT_COUNTS,
    PluginRuntimeError,
    ensure_builtin_capability_installations,
    install_builtin,
    save_connection,
)


def body(handler):
    """解析并校验 JSON 请求体。"""
    try:
        value = tornado.escape.json_decode(handler.request.body or b"{}")
    except ValueError as exc:
        raise PluginRuntimeError("plugin.request_invalid", "Request body must be valid JSON") from exc
    if not isinstance(value, dict):
        raise PluginRuntimeError("plugin.request_invalid", "Request body must be an object")
    return value


def error(exc):
    """把插件异常转成统一的 JSON 错误体。"""
    return {"err": getattr(exc, "code", "plugin.error"), "msg": str(exc)}


@contextlib.contextmanager
def audit_run(handler, plugin_key, params, owner_type="instance", error_code="plugin.failed"):
    """把一次会产生外部副作用的操作记进 PluginRun。

    改写书籍正文（write）与推送到设备（sync）都不经过 PluginRuntime.execute，
    但同样需要留痕：谁在什么时候对哪本书做了什么、失败原因是什么。

    ``owner_type="user"`` 时使用当前用户自己的连接——设备属于个人，不同用户
    推给不同设备，审计必须落在各自的连接上。
    """
    # 审计锚点必须存在：连接缺失时按需创建，而不是静默跳过记录。
    ensure_builtin_capability_installations(handler.session, handler.user_id(), loader.get_settings())
    query = (
        handler.session.query(PluginConnection)
        .join(PluginInstallation, PluginInstallation.id == PluginConnection.installation_id)
        .filter(PluginInstallation.plugin_key == plugin_key, PluginConnection.owner_type == owner_type)
    )
    if owner_type == "user":
        query = query.filter(PluginConnection.owner_id == handler.user_id())
    connection = query.first()

    if connection is None and owner_type == "user":
        # 用户级插件（如设备推送）不参与实例级 bootstrap：首次使用时按需安装并建连接。
        installation = handler.session.query(PluginInstallation).filter(PluginInstallation.plugin_key == plugin_key).first()
        if installation is None:
            installation = install_builtin(handler.session, plugin_key, handler.user_id())
        connection = save_connection(
            handler.session,
            loader.get_settings(),
            installation.id,
            "user",
            handler.user_id(),
            {},
            name=plugin_key.rsplit(".", 1)[-1],
            role="default",
        )

    run = None
    if connection is not None:
        now = datetime.datetime.now()
        run = PluginRun(
            connection_id=connection.id,
            action="run",
            trigger=params.pop("trigger", "manual"),
            status="running",
            requested_by=handler.user_id(),
            counts=dict(DEFAULT_COUNTS),
            input_data=dict(params),
            create_time=now,
            started_at=now,
        )
        handler.session.add(run)
        handler.session.commit()

    outcome = {"counts": {}, "data": {}}
    try:
        yield outcome
    except Exception as exc:
        if run is not None:
            run.status = "failed"
            run.error_code = getattr(exc, "code", error_code)
            run.error_message = str(exc)[:1000]
            run.finished_at = datetime.datetime.now()
            handler.session.commit()
        raise
    else:
        if run is not None:
            run.status = "succeeded"
            run.counts = {**DEFAULT_COUNTS, **outcome["counts"]}
            run.cursor_after = dict(outcome["data"])
            run.finished_at = datetime.datetime.now()
            handler.session.commit()
