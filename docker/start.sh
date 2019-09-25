#!/bin/sh
if [ ! -d "/data/release" ]; then
  cp -rf /prebuilt/release /data/
fi

if [ ! -d "/data/log" ]; then
  cp -rf /prebuilt/log /data/
fi

if [ ! -d "/data/books" ]; then
  cp -rf /prebuilt/books /data/
fi

service nginx restart
/usr/bin/supervisord --nodaemon
