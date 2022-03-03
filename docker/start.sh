#!/bin/sh

if [ ! -d "/data/books" ]; then
  cp -rf /prebuilt/books /data/
fi

if [ ! -d "/data/books/settings" ]; then
  cp -rf /prebuilt/books/settings /data/books/
fi

if [ ! -d "/data/books/library" ]; then
  cp -rf /prebuilt/books/library /data/books/
fi

if [ ! -s "/data/books/calibre-webserver.db" ]; then
  cp /prebuilt/books/calibre-webserver.db /data/books/
fi

if [ ! -d "/data/log" ]; then
  cp -rf /prebuilt/log /data/
fi

if [ ! -d "/data/books/ssl" ]; then
  cp -rf /prebuilt/books/ssl /data/books/
fi

/var/www/talebook/server.py --update-config
service nginx restart
/usr/bin/supervisord --nodaemon -c /etc/supervisor/supervisord.conf
