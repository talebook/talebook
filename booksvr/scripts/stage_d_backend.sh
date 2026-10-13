#!/bin/sh
# 阶段 D4：启动真实后端（booksvr + 真实 Calibre 书库），供前端 Nuxt 联调。
set -e

LIB=/data/calibre-library
mkdir -p "$LIB" /data/books

# 1. 真实 Calibre 书库
calibredb --library-path="$LIB" list >/dev/null 2>&1 || true

# 2. 导入一本真实书（幂等：已有书则跳过）
COUNT=$(calibredb --library-path="$LIB" list 2>/dev/null | tail -n +2 | wc -l)
if [ "$COUNT" -eq 0 ]; then
  python3 - <<'PY'
import zipfile, os
os.makedirs('/tmp/src', exist_ok=True)
p = '/tmp/src/demo.epub'
with zipfile.ZipFile(p, 'w') as z:
    z.writestr('mimetype', 'application/epub+zip')
    z.writestr('META-INF/container.xml',
        '<?xml version="1.0"?><container version="1.0" '
        'xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
        '<rootfiles><rootfile full-path="OEBPS/content.opf" '
        'media-type="application/oebps-package+xml"/></rootfiles></container>')
    z.writestr('OEBPS/content.opf',
        '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/" version="3.0" unique-identifier="id">'
        '<metadata><dc:title>阶段D验证书</dc:title><dc:creator>验证作者</dc:creator>'
        '<dc:language>zh-CN</dc:language><dc:identifier id="id">9787536692930</dc:identifier>'
        '<dc:publisher>验证出版社</dc:publisher></metadata>'
        '<manifest><item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/></manifest>'
        '<spine><itemref idref="c1"/></spine></package>')
    z.writestr('OEBPS/c1.xhtml',
        '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body>'
        '<p>这是阶段 D 的验证正文内容。</p></body></html>')
PY
  calibredb --library-path="$LIB" add /tmp/src/demo.epub >/dev/null 2>&1 || true
fi

# 3. 初始化 Talebook 自有库
cd /var/www/talebook
python3 server.py --syncdb >/dev/null 2>&1 || true

# 4. 启动 booksvr（前台，容器主进程）
echo "starting booksvr on 0.0.0.0:8080 ..."
exec booksvr serve \
  --db "$LIB/metadata.db" \
  --user-db /data/books/calibre-webserver.db \
  --addr 0.0.0.0:8080 \
  --serve-routes all \
  --library-root "$LIB" \
  --cookie-secret stage-d-secret