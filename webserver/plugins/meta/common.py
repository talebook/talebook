"""元数据插件共用的解析工具。"""

import datetime

from webserver.i18n import _


def str2date(s):
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y-%m", _("%Y年"), _("%Y年%m月"), _("%Y年%m月%d日"), "%Y"):
        try:
            return datetime.datetime.strptime(s, fmt).replace(tzinfo=datetime.timezone.utc)
        except Exception:
            continue
    return None
