#!/bin/sh

if [ ! -d "/data/books" ]; then
  cp -rf /prebuilt/books /data/
fi

if [ ! -d "/data/log" ]; then
  cp -rf /prebuilt/log /data/
fi

service nginx restart
exec /usr/bin/supervisord --nodaemon

