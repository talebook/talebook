#!/bin/sh
# 阶段 D 补测 2：逐功能点击式验证（覆盖此前报错的两个功能 + 管理端全量 GET）。
#
# 针对用户实际点击时发现的两个报错：
#   1. 保存主题配置失败：httpapi: FileThemeStore 需要 Path
#   2. scan: 统计列表失败: SQL logic error: no such table: scanfiles
set -e

BASE=http://127.0.0.1:8080
JAR=/tmp/admin.jar

echo "=== 0. 登录 ==="
curl -sS -c $JAR -X POST "$BASE/api/user/sign_in" \
  -d "username=e2e_admin&password=AdminPass123"
echo ""

echo ""
echo "=== 1. 主题功能（此前报 FileThemeStore 需要 Path） ==="
# 真实路径是 /api/themes*（见 webserver/handlers/theme.py），不是 /api/admin/themes*。
echo "--- GET /api/themes ---"
curl -sS -b $JAR "$BASE/api/themes" | head -c 400
echo ""
echo "--- GET /api/themes/active ---"
curl -sS -b $JAR "$BASE/api/themes/active" | head -c 300
echo ""
echo "--- POST /api/themes/activate (default) ---"
curl -sS -b $JAR -X POST "$BASE/api/themes/activate" \
  -H 'Content-Type: application/json' -d '{"name":"default"}' | head -c 300
echo ""
echo "--- 读回确认 /api/themes/active ---"
curl -sS -b $JAR "$BASE/api/themes/active" | head -c 300
echo ""

echo ""
echo "=== 2. 扫描/导入功能（此前报 no such table: scanfiles） ==="
echo "--- GET /api/admin/import/directory/list ---"
curl -sS -b $JAR "$BASE/api/admin/import/directory/list" | head -c 300
echo ""
echo "--- GET /api/admin/scan/list ---"
curl -sS -b $JAR "$BASE/api/admin/scan/list" | head -c 300
echo ""
echo "--- GET /api/admin/scan/list?filter=todo ---"
curl -sS -b $JAR "$BASE/api/admin/scan/list?filter=todo" | head -c 300
echo ""

echo ""
echo "=== 3. 管理端全量 GET 扫描（逐条记录 err） ==="
python3 /tmp/e2e_admin_sweep.py "$BASE" "$JAR"

echo ""
echo "=== 4. 兜底代理命中 ==="
grep -c "兜底代理失败" /tmp/booksvr.log || echo 0

echo ""
echo "=== 5. 日志尾部 ==="
tail -15 /tmp/booksvr.log