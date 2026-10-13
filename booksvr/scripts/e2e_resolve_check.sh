#!/bin/sh
# 用库内记录解析出真实文件路径，并验证文件存在、大小与 MOBI 魔数。
set -e
python3 - <<'PY' > /tmp/resolved.txt
import sqlite3
c = sqlite3.connect('/data/books/library/metadata.db')
path = c.execute('SELECT path FROM books WHERE id=1').fetchone()[0]
name = c.execute('SELECT name FROM data WHERE book=1').fetchone()[0]
print('/data/books/library/' + path + '/' + name)
PY
P=$(cat /tmp/resolved.txt)
echo "解析路径: $P"
if [ -f "$P" ]; then
    echo "文件存在: 是"
    echo "大小: $(stat -c%s "$P")"
    echo "MOBI 魔数: $(head -c 16 "$P" | od -An -tx1 | tr -d ' \n')"
else
    echo "文件存在: 否"
fi