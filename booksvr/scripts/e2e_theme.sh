#!/bin/sh
# 验证主题激活真的写入 settings 文件（此前报 FileThemeStore 需要 Path）。
set -e
BASE=http://127.0.0.1:8080
JAR=/tmp/tj

curl -sS -c $JAR -X POST "$BASE/api/user/sign_in" \
  -d "username=e2e_admin&password=AdminPass123" >/dev/null

echo "--- 1. 激活真实主题 brass ---"
curl -sS -b $JAR -X POST "$BASE/api/themes/activate" \
  -H 'Content-Type: application/json' -d '{"name":"brass"}'
echo ""

echo "--- 2. 读回 /api/themes/active ---"
curl -sS -b $JAR "$BASE/api/themes/active" | head -c 250
echo ""

echo "--- 3. settings 文件内容（应有 ACTIVE_THEME） ---"
cat /data/books/settings/auto.py

echo ""
echo "--- 4. 恢复默认（空 name） ---"
curl -sS -b $JAR -X POST "$BASE/api/themes/activate" \
  -H 'Content-Type: application/json' -d '{"name":""}'
echo ""

echo "--- 5. 读回确认已清空 ---"
curl -sS -b $JAR "$BASE/api/themes/active" | head -c 150
echo ""

echo "--- 6. settings 文件（ACTIVE_THEME 应为空） ---"
cat /data/books/settings/auto.py