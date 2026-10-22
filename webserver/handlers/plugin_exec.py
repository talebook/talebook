"""插件能力调用的唯一入口：``POST /api/plugins/<plugin_key>/exec/<action>``。

动作分两类，HTTP 层都不认识具体插件：

- 平台动作：名字带能力前缀（``tool.preview``、``metadata.search`` 等），由下表 ``EXEC_ACTIONS``
  按能力分发；插件声明了对应能力即可被调用，权限由平台按动作统一施加。
- 插件自有动作：不带点的名字，必须在 manifest ``extra_features`` 中声明（受控逃生舱）。

请求体统一为 ``{"params": {...}}``，插件自己的参数都放在 ``params``；``book_id``、``output_mode``、
``suffix``、``credentials`` 等平台字段在顶层。新增插件只需注册 provider，不新增路由。
"""

from collections import namedtuple

from webserver.handlers import plugin_booktools, plugins
from webserver.handlers.base import BaseHandler, auth, js
from webserver.i18n import _


ExecAction = namedtuple("ExecAction", ["call", "admin_only"])

# 动作名 -> 实现；实现签名为 call(handler, plugin_key)，能力校验在实现内部完成。
EXEC_ACTIONS = {
    "tool.describe": ExecAction(plugin_booktools.tool_describe, admin_only=False),
    "tool.preview": ExecAction(plugin_booktools.tool_preview, admin_only=False),
    "tool.run": ExecAction(plugin_booktools.tool_run, admin_only=True),
    "metadata.search": ExecAction(plugins.metadata_search, admin_only=True),
    "source.search": ExecAction(plugins.source_search, admin_only=True),
    "review.lookup": ExecAction(plugins.review_lookup, admin_only=True),
}


class PluginExec(BaseHandler):
    @js
    @auth
    def post(self, plugin_key, action):
        spec = EXEC_ACTIONS.get(action)
        if spec is None:
            if "." in action:
                return {"err": "plugin.action_not_supported", "msg": "Plugin action is not supported: %s" % action}
            return plugins.run_feature(self, plugin_key, action)
        if spec.admin_only and not self.admin_user:
            return {"err": "permission.not_admin", "msg": _("当前用户非管理员")}
        return spec.call(self, plugin_key)


def routes():
    return [
        (r"/api/plugins/([a-z0-9.-]+)/exec/([a-z0-9_.]+)", PluginExec),
    ]
