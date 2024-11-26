#!/bin/sh

PUID=${PUID:-0}
PGID=${PGID:-0}

groupmod -o -g "${PGID}" talebook
usermod -o -u "${PUID}" talebook

# 使用预设的书库和配置
if [ ! -d "/data/books" ]; then
  cp -rf /prebuilt/books /data/
fi

if [ ! -s "/data/books/calibre-webserver.db" ]; then
  cp /prebuilt/books/calibre-webserver.db /data/books/
fi

if [ ! -d "/data/log" ]; then
  cp -rf /prebuilt/log /data/
fi

# 检查目录，拷贝并创建目录
cd /prebuilt/books/;
for f in *; do
  if [ -d "$f" -a ! -d "/data/books/$f" ]; then
    cp -rvf "/prebuilt/books/$f" /data/books/
  fi
done

# 检查文件，并拷贝过去
find . \( -path ./library -o -name '*.pyc' \) -prune -o -type f -print | while read f; do
    target="/data/books/$f"
    if [ ! -e "$target" ]; then
        cp "$f" "$target"
    fi
done


mkdir -p /root/.npm

# 设置PUID/GUID权限
permission_file=/data/.permission
touch $permission_file
permission=`cat $permission_file`
if [ "x$permission" != "x$PUID:$PGID" ]; then
    echo "updating '/data/' permission to $PUID:$PGID"
    chown -R talebook:talebook /data
    echo "$PUID:$PGID" > $permission_file
fi

# 设置系统文件的权限（数量较少）
chown -R talebook:talebook \
  /data/log/ \
  /var/lib/nginx \
  /root/.config/calibre \
  /root/.npm \
  /var/www/talebook/app/.env \
  /var/www/talebook/app/dist \
  /var/www/talebook/webserver \
  /var/www/talebook/server.py \
  /usr/lib/calibre \
  /usr/share/calibre

# 检测权限
TEST_WRITE_FILE=/data/books/library/test_writeable.txt
date > $TEST_WRITE_FILE
if [ $? -ne 0 ]; then
    echo "目录权限异常，无法写入";
    exit 1
else
    rm $TEST_WRITE_FILE
fi

# 启动
export PYTHONDONTWRITEBYTECODE=1
echo
echo "====== Check config ===="
nginx -t || exit 1

echo
echo "====== Sync DB Scheme ===="
gosu talebook:talebook /var/www/talebook/server.py --syncdb

echo
echo "====== Update Server Config ===="
gosu talebook:talebook /var/www/talebook/server.py --update-config

echo
echo "====== Start Server ===="
exec /usr/bin/supervisord --nodaemon -u root -c /etc/supervisor/supervisord.conf

