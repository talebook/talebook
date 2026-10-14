"""把 webserver/settings.py 的出厂默认值导出为 Go 字面量。

用 Python 自己求值，避免手工翻译 os.path.join / 7*86400 / u"" 等表达式出错。
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from webserver.settings import settings  # noqa: E402

out = {}
for k, v in settings.items():
    out[k] = v

with open(os.path.join(os.path.dirname(__file__), 'settings_defaults.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2, sort_keys=True)

print('exported', len(out), 'keys')
for k in sorted(out):
    print(k, '=', repr(out[k])[:80])