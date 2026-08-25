"""插件契约：运行时与插件之间的类型化边界。

此前契约完全靠鸭子类型维持——``register()`` 只校验 manifest，从不检查 provider
是否有 ``execute``，因此契约违反会被降级成运行期 ``AttributeError``，再被
``PluginRuntime.execute`` 的兜底分支报成通用的 ``plugin.execution_failed``。

本模块把事实契约显式化：

- :class:`PluginContext` 收拢运行时传给插件的全部字段，键名写错在构造期即失败；
- :class:`PluginProvider` 声明 provider 必须具备的成员，供注册期检查。

用 ``Protocol`` 而非 ABC，是因为现有 provider 均不继承任何基类，
``Protocol`` 可以零改动地把检查加上。
"""

from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable


@dataclass(frozen=True)
class PluginContext:
    """运行时传给插件 ``execute()`` 的只读上下文。

    provider 仍然收到普通 dict（见 :meth:`as_dict`），本类的价值在于把键名
    与默认值集中到一处：此前 context 是散在 ``_call_provider`` 里手写的字面量，
    拼错键名要到插件运行时才暴露。
    """

    action: str
    attempt: int
    deadline: str
    config: dict[str, Any] = field(default_factory=dict)
    cursor: dict[str, Any] = field(default_factory=dict)
    secrets: dict[str, Any] = field(default_factory=dict)
    scopes: list[str] = field(default_factory=list)
    target_external_ids: list[str] = field(default_factory=list)
    input_data: dict[str, Any] = field(default_factory=dict)
    platform: dict[str, Any] = field(default_factory=dict)

    def as_dict(self):
        """转为 provider 实际收到的 dict，保持既有插件无需改动。"""
        return {
            "action": self.action,
            "attempt": self.attempt,
            "config": dict(self.config),
            "cursor": dict(self.cursor),
            "secrets": dict(self.secrets),
            "scopes": list(self.scopes),
            "target_external_ids": list(self.target_external_ids),
            "input_data": dict(self.input_data),
            "deadline": self.deadline,
            "platform": dict(self.platform),
        }


@runtime_checkable
class PluginProvider(Protocol):
    """所有插件必须具备的成员。

    ``execute`` 在独立线程中被调用，必须线程安全，且不得访问数据库会话——
    平台不注入 session，落库由平台在调用线程内完成。
    """

    manifest: dict[str, Any]

    def execute(self, context: dict[str, Any]): ...


def contract_violations(provider):
    """返回 provider 违反契约之处；为空表示满足契约。

    注册期调用。当前仅告警不拒绝（见方案风险 R4），待全部内置 provider
    确认合规后再改为抛错。
    """
    problems = []
    if not isinstance(getattr(provider, "manifest", None), dict):
        problems.append("manifest 必须是 dict")
    if not callable(getattr(provider, "execute", None)):
        problems.append("缺少可调用的 execute()")
    return problems
