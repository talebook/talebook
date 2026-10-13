#!/bin/sh
# 阶段 D 端到端验证（修正参数名 + 覆盖更多真实路由）。
set -e

echo "=== 1. 环境 ==="
calibredb --version 2>&1 | head -1
booksvr --version

echo ""
echo "=== 2. 准备真实 Calibre 书库 ==="
LIB=/data/calibre-library
mkdir -p "$LIB"
calibredb --library-path="$LIB" list >/dev/null 2>&1 || true

echo "=== 3. 导入真实 EPUB ==="
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
calibredb --library-path="$LIB" add /tmp/src/demo.epub 2>&1 | tail -1

echo ""
echo "=== 4. Python syncdb 初始化自有库 ==="
mkdir -p /data/books
cd /var/www/talebook
python3 server.py --syncdb 2>&1 | tail -2

echo ""
echo "=== 5. 启动 booksvr serve（双库） ==="
booksvr serve \
  --db "$LIB/metadata.db" \
  --user-db /data/books/calibre-webserver.db \
  --addr 127.0.0.1:8080 \
  --serve-routes all \
  --library-root "$LIB" \
  --cookie-secret stage-d-secret \
  > /tmp/booksvr.log 2>&1 &
BOOKSVR_PID=$!

for i in $(seq 1 40); do
  if curl -fsS http://127.0.0.1:8080/api/welcome >/dev/null 2>&1; then
    echo "booksvr ready after ${i} tries"; break
  fi
  sleep 0.5
done

echo ""
echo "=== 6. 真实 HTTP 请求验证（booksvr 本地路由） ==="
check() {
  echo "--- $1 ---"
  curl -sS "http://127.0.0.1:8080$1" | head -c 350
  echo ""
}
check "/api/welcome"
check "/api/recent?page=1&size=5"
check "/api/search?name=%E9%98%B6%E6%AE%B5"
check "/api/book/1"
check "/api/author"
check "/api/publisher"
check "/api/tag"
check "/api/recent?page=1&size=5&sort=title"

echo ""
echo "=== 7. 统计兜底代理命中（= 未实现路由） ==="
grep -c "兜底代理失败" /tmp/booksvr.log || echo 0

echo ""
echo "=== 8. booksvr 日志 ==="
tail -8 /tmp/booksvr.log

kill $BOOKSVR_PID 2>/dev/null || true
echo ""
echo "=== 阶段 D 验证结束 ==="