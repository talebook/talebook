"""正文处理插件的触发配置词汇。"""

TRIGGER_MANUAL = "manual"
TRIGGER_AUTO = "auto"
TRIGGER_SCHEMA = {"type": "string", "enum": [TRIGGER_MANUAL, TRIGGER_AUTO], "default": TRIGGER_MANUAL}


def trigger_of(config):
    """读取连接配置里的触发方式，未配置时为手动。"""
    return str((config or {}).get("trigger") or TRIGGER_MANUAL)
