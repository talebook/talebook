#!/bin/sh
# 启动 booksvr 后端容器（正确挂载方式：宿主机目录挂到 /data）。
#
# 目录约定（与 Dockerfile 预建的目录树一致）：
#   /data/books/library    Calibre 书库
#   /data/books/imports    导入目录（可含多个子目录）
#   /data/books/settings   配置（auto.py）
set -e

LIB=/data/books/library
USERDB=/data/books/calibre-webserver.db
SETTINGS=/data/books/settings/auto.py
IMPORTS=/data/books/imports

mkdir -p "$LIB" "$IMPORTS" /data/books/settings
[ -f "$SETTINGS" ] || printf 'settings = {}\n' > "$SETTINGS"

calibredb --library-path="$LIB" list >/dev/null 2>&1 || true

cd /var/www/talebook
python3 server.py --syncdb 2>&1 | tail -1
python3 /tmp/e2e_mkusers.py

echo "--- 导入目录 ---"
ls -la "$IMPORTS"
for d in "$IMPORTS"/*/; do
  [ -d "$d" ] && echo "  $d:" && ls -la "$d" | tail -n +2
done

# 多个导入根目录，逗号分隔。
ROOTS="$IMPORTS/todo,$IMPORTS/new"

exec booksvr serve \
  --db "$LIB/metadata.db" \
  --user-db "$USERDB" \
  --addr 0.0.0.0:8080 \
  --serve-routes all \
  --library-root "$LIB" \
  --settings-file "$SETTINGS" \
  --scan-upload-path "$IMPORTS/todo" \
  --import-allowed-roots "$ROOTS" \
  --cookie-secret stage-d-secret