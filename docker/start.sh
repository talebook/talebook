#!/bin/sh

PUID=${PUID:-0}
PGID=${PGID:-0}

groupmod -o -g "${PGID}" talebook
usermod -o -u "${PUID}" talebook

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
chown -R talebook:talebook \
    /var/lib/nginx \
    /data \
    /root/.config/calibre \
    /root/.npm
chown -R talebook:talebook \
  /var/www/talebook/app/.env \
  /var/www/talebook/webserver \
  /var/www/talebook/tools \
  /var/www/talebook/server.py

gosu talebook:talebook /var/www/talebook/server.py --syncdb
gosu talebook:talebook /var/www/talebook/server.py --update-config
service nginx restart
/usr/bin/supervisord --nodaemon -c /etc/supervisor/supervisord.conf
