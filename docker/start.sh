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

/var/www/talebook/server.py --syncdb
/var/www/talebook/server.py --update-config
service nginx restart
/usr/bin/supervisord --nodaemon -c /etc/supervisor/supervisord.conf
