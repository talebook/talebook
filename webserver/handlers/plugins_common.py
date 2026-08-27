"""插件相关 handler 的共用助手。

拆分 handlers/plugins.py 时抽出，避免通用插件与内置文本工具编排
共用同一个命名空间。
"""

import tornado.escape

from webserver.services.plugin_runtime import PluginRuntimeError


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
