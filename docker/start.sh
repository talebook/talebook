#!/bin/sh

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

echo "Setting permissions... \nThis may take some time"
echo "设置权限中... \n这可能需要一些时间"

PUID=${PUID:-1000}
PGID=${PGID:-1000}

groupmod -o -g "${PGID}" talebook
usermod -o -u "${PUID}" talebook

mkdir -p /root/.npm
chown -R talebook:talebook \
    /var/lib/nginx \
    /data \
    /root/.config/calibre \
    /root/.npm \
    /var/www/talebook

gosu talebook:talebook /var/www/talebook/server.py --syncdb
gosu talebook:talebook /var/www/talebook/server.py --update-config
service nginx restart
/usr/bin/supervisord --nodaemon -c /etc/supervisor/supervisord.conf