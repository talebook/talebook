#!/bin/sh

PUID=${PUID:-0}
PGID=${PGID:-0}
SSR=${SSR:-OFF}

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

cd /prebuilt/books/;
for f in *; do
  if [ -d "$f" -a ! -d "/data/books/$f" ]; then
    cp -rf "/prebuilt/books/$f" /data/books/
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
  /var/lib/nginx \
  /root/.config/calibre \
  /root/.npm \
  /var/www/talebook/app/.env \
  /var/www/talebook/app/dist \
  /var/www/talebook/webserver \
  /var/www/talebook/tools \
  /var/www/talebook/server.py \
  /usr/lib/calibre \
  /usr/share/calibre

# 判断是否启用SSR模式
if [ "x$SSR" = "xON" ]; then
    ln -sf /etc/nginx/server-side-render.conf /etc/nginx/conf.d/talebook.conf
    ln -sf /etc/supervisor/server-side-render.conf /etc/supervisor/conf.d/talebook.conf
else
    ln -sf /etc/nginx/talebook.conf /etc/nginx/conf.d/talebook.conf
    ln -sf /etc/supervisor/talebook.conf /etc/supervisor/conf.d/talebook.conf
fi

# 启动
gosu talebook:talebook /var/www/talebook/server.py --syncdb
gosu talebook:talebook /var/www/talebook/server.py --update-config
service nginx restart
exec /usr/bin/supervisord --nodaemon -c /etc/supervisor/supervisord.conf

