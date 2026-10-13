#!/bin/sh
# 真实导入验证（精简输出）：扫描 → 导入 → 验证落库。
set -e
BASE=http://127.0.0.1:8080
JAR=/tmp/ij

curl -sS -c $JAR -X POST "$BASE/api/user/sign_in" \
  -d "username=e2e_admin&password=AdminPass123" >/dev/null
echo "登录: ok"

echo ""
echo "=== 1. 目录列表（多根目录） ==="
curl -sS -b $JAR "$BASE/api/admin/import/directory/list"
echo ""

echo ""
echo "=== 2. 启动扫描 ==="
curl -sS -b $JAR -X POST "$BASE/api/admin/scan/run" \
  -H 'Content-Type: application/json' -d '{}'
echo ""

echo ""
echo "=== 3. 等待扫描（最多 30s） ==="
i=0
while [ $i -lt 30 ]; do
  curl -sS -b $JAR "$BASE/api/admin/scan/list" > /tmp/scan.json
  todo=$(python3 -c "import json;print(json.load(open('/tmp/scan.json'))['summary']['todo'])")
  if [ "$todo" = "0" ]; then echo "扫描完成（${i}s）"; break; fi
  i=$((i+1)); sleep 1
done

echo ""
echo "=== 4. 扫描结果 ==="
python3 -c "
import json
d = json.load(open('/tmp/scan.json'))
for it in d['items']:
    print('  status=%s title=%s author=%s fmt=%s' % (
        it['status'], it['title'], it['author'],
        it['data'].get('detected_format')))
print('  summary:', d['summary'])
"

echo ""
echo "=== 5. 执行导入 ==="
HASHES=$(python3 -c "
import json
d = json.load(open('/tmp/scan.json'))
print(json.dumps([i['hash'] for i in d['items'] if i['status'] in ('new','ready','failed')]))
")
echo "hashlist = $HASHES"
curl -sS -b $JAR -X POST "$BASE/api/admin/import/run" \
  -H 'Content-Type: application/json' \
  -d "{\"hashlist\":$HASHES,\"import_mode\":\"copy\"}"
echo ""

echo ""
echo "=== 6. 等待导入（最多 60s） ==="
i=0
while [ $i -lt 60 ]; do
  curl -sS -b $JAR "$BASE/api/admin/import/status" > /tmp/imp.json
  running=$(python3 -c "import json;print(json.load(open('/tmp/imp.json'))['status'].get('importing',0))")
  if [ "$running" = "0" ]; then echo "导入结束（${i}s）"; break; fi
  i=$((i+1)); sleep 1
done
python3 -c "
import json
d = json.load(open('/tmp/imp.json'))
print('  status:', d['status'])
print('  summary:', d['summary'])
"

echo ""
echo "=== 7. 扫描列表最终状态 ==="
curl -sS -b $JAR "$BASE/api/admin/scan/list" > /tmp/scan2.json
python3 -c "
import json
d = json.load(open('/tmp/scan2.json'))
for it in d['items']:
    print('  status=%s book_id=%s title=%s' % (it['status'], it['book_id'], it['title']))
print('  summary:', d['summary'])
"

echo ""
echo "=== 8. 书库新书 ==="
curl -sS -b $JAR "$BASE/api/admin/book/list" > /tmp/books.json
python3 -c "
import json
d = json.load(open('/tmp/books.json'))
print('  total:', d.get('total'))
for it in d.get('items', []):
    print('  id=%s title=%s authors=%s fmt=%s' % (
        it.get('id'), it.get('title'), it.get('authors'), it.get('fmt')))
"

echo ""
echo "=== 9. 直接查库 ==="
python3 /tmp/e2e_bookcheck.py