#!/bin/sh
# 阶段 D 补测：登录态真实端到端验证。
#
# 覆盖此前遗漏的三块：
#   1. 写接口（@auth）—— 带 cookie 的真实写操作 + 落库确认
#   2. 管理端接口（@is_admin）
#   3. 匿名 vs 登录的返回差异（证明鉴权真的生效）
set -e

LIB=/data/calibre-library
USERDB=/data/books/calibre-webserver.db
BASE=http://127.0.0.1:8080

echo "=== 1. 环境 ==="
calibredb --version 2>&1 | head -1
booksvr --version

echo ""
echo "=== 2. 准备真实 Calibre 书库 ==="
mkdir -p "$LIB"
calibredb --library-path="$LIB" list >/dev/null 2>&1 || true

echo "=== 3. 导入真实 EPUB ==="
python3 /tmp/e2e_mkepub.py
calibredb --library-path="$LIB" add /tmp/src/demo.epub 2>&1 | tail -1

echo ""
echo "=== 4. Python syncdb 初始化自有库 ==="
mkdir -p /data/books
cd /var/www/talebook
python3 server.py --syncdb 2>&1 | tail -2

echo ""
echo "=== 5. 建真实读者账号（admin + 普通用户） ==="
python3 /tmp/e2e_mkusers.py

echo ""
echo "=== 6. 启动 booksvr serve（双库） ==="
booksvr serve \
  --db "$LIB/metadata.db" \
  --user-db "$USERDB" \
  --addr 127.0.0.1:8080 \
  --serve-routes all \
  --library-root "$LIB" \
  --cookie-secret stage-d-secret \
  > /tmp/booksvr.log 2>&1 &
BOOKSVR_PID=$!

for i in $(seq 1 40); do
  if curl -fsS "$BASE/api/welcome" >/dev/null 2>&1; then
    echo "booksvr ready after ${i} tries"; break
  fi
  sleep 0.5
done

echo ""
echo "=== 7. 登录（真实 POST /api/user/sign_in） ==="
rm -f /tmp/admin.jar /tmp/user.jar
echo "--- admin 登录 ---"
curl -sS -c /tmp/admin.jar -X POST "$BASE/api/user/sign_in" \
  -d "username=e2e_admin&password=AdminPass123"
echo ""
echo "--- 普通用户登录 ---"
curl -sS -c /tmp/user.jar -X POST "$BASE/api/user/sign_in" \
  -d "username=e2e_user&password=UserPass123"
echo ""
echo "--- 错误密码（应失败） ---"
curl -sS -X POST "$BASE/api/user/sign_in" \
  -d "username=e2e_admin&password=wrongpass"
echo ""
echo "--- cookie 是否写入 ---"
grep -c "user_id" /tmp/admin.jar || echo "no user_id cookie"

echo ""
echo "=== 8. 匿名访问写接口（应被拒绝） ==="
echo "--- 匿名 POST /api/book/1/favorite ---"
curl -sS -X POST "$BASE/api/book/1/favorite" \
  -H 'Content-Type: application/json' -d '{"favorite":true}' | head -c 200
echo ""

echo ""
echo "=== 9. 写接口（@auth）真实调用 ==="
# 注意：写接口读 JSON body（对齐 Python 的 json_decode），不是 form。
wj() {
  echo "--- POST $1 (JSON $2) ---"
  curl -sS -b /tmp/admin.jar -X POST "$BASE$1" \
    -H 'Content-Type: application/json' -d "$2" | head -c 300
  echo ""
}
wj "/api/book/1/favorite" '{"favorite":true}'
wj "/api/book/1/shelf" '{"wants":true}'
wj "/api/book/1/readstate" '{"read_state":1}'
# client_id 必填（Python 与 Go 都要求 client_id 或 source_annotation_id 非空）。
wj "/api/book/1/annotations" '{"annotation_type":"note","client_id":"e2e-client-1","content":"登录态批注","chapter":"c1"}'
wj "/api/user/update" '{"nickname":"登录态昵称"}'

echo ""
echo "=== 9b. 验证写入真的落库 ==="
echo "--- GET /api/book/1（读回状态） ---"
curl -sS -b /tmp/admin.jar "$BASE/api/book/1" | head -c 400
echo ""
echo "--- GET /api/book/1/annotations?scope=mine ---"
curl -sS -b /tmp/admin.jar "$BASE/api/book/1/annotations?scope=mine" | head -c 400
echo ""
echo "--- 直接查库 ---"
python3 /tmp/e2e_checkdb.py

echo ""
echo "=== 10. 管理端接口（@is_admin） ==="
a() {
  echo "--- GET $1 ---"
  curl -sS -b /tmp/admin.jar "$BASE$1" | head -c 300
  echo ""
}
a "/api/admin/plugins"
a "/api/admin/book/list"
a "/api/admin/booksource/list"
a "/api/admin/import/directory/list"
a "/api/admin/settings"

echo ""
echo "=== 11. 普通用户访问管理端（应被拒绝） ==="
echo "--- 普通用户 GET /api/admin/plugins ---"
curl -sS -b /tmp/user.jar "$BASE/api/admin/plugins" | head -c 200
echo ""

echo ""
echo "=== 12. 统计兜底代理命中（= 未实现路由） ==="
grep -c "兜底代理失败" /tmp/booksvr.log || echo 0

echo ""
echo "=== 13. booksvr 日志尾部 ==="
tail -12 /tmp/booksvr.log

kill $BOOKSVR_PID 2>/dev/null || true
echo ""
echo "=== 登录态验证结束 ==="