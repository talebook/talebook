#!/bin/sh

if [ ! -d "/data/books" ]; then
  cp -rf /prebuilt/books /data/
fi

service nginx restart
exec /usr/bin/supervisord --nodaemon
