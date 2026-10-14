"""由 settings_defaults.json 生成 Go 的内置默认值文件。"""
import json
import os

here = os.path.dirname(__file__)
with open(os.path.join(here, 'settings_defaults.json'), encoding='utf-8') as f:
    data = json.load(f)

# 这几个键在 Python 里由 __file__ 推导，导出时带上了本机（Windows）路径。
# 它们必须指向容器内的部署路径，否则 Go 侧会拿到 D:\code\... 这种无效路径。
CONTAINER_PATHS = {
    'html_path': '/var/www/talebook/app/dist',
    'static_path': '/var/www/talebook/app/dist',
    'i18n_path': '/var/www/talebook/webserver/i18n',
    'resource_path': '/var/www/talebook/webserver/resources',
    'nuxt_env_path': '/var/www/talebook/app/.env',
}
for k, v in CONTAINER_PATHS.items():
    if k in data:
        data[k] = v


def go_lit(v):
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, int):
        return str(v)
    if isinstance(v, str):
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, list):
        if not v:
            return '[]any{}'
        return '[]any{' + ', '.join(go_lit(x) for x in v) + '}'
    if isinstance(v, dict):
        if not v:
            return 'map[string]any{}'
        items = ', '.join('%s: %s' % (json.dumps(k, ensure_ascii=False), go_lit(x))
                          for k, x in sorted(v.items()))
        return 'map[string]any{' + items + '}'
    raise TypeError(type(v))


lines = []
lines.append('package httpapi')
lines.append('')
lines.append('// 本文件由 booksvr/scripts/e2e_export_settings_defaults.py 生成，请勿手工编辑。')
lines.append('//')
lines.append('// 内容等价于 webserver/settings.py 的 settings 字典（Python 求值后的字面量），')
lines.append('// 用于复刻 SettingsLoader.loadfile() 的三层合并：')
lines.append('//   出厂默认（本表） → auto.py 用户覆盖 → manual.py 手工覆盖。')
lines.append('')
lines.append('// builtinSettingsDefaults 是 Talebook 的出厂默认配置。')
lines.append('var builtinSettingsDefaults = map[string]any{')
for k in sorted(data):
    lines.append('\t%s: %s,' % (json.dumps(k, ensure_ascii=False), go_lit(data[k])))
lines.append('}')
lines.append('')

out = os.path.join(here, '..', 'internal', 'httpapi', 'settings_defaults.go')
with open(out, 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(lines))
print('wrote', os.path.normpath(out), len(data), 'keys')