#!/bin/sh
if [ ! -d "/data/release" ]; then
  cp -rf /prebuilt/release /data/
fi

if [ ! -d "/data/books" ]; then
  cp -rf /prebuilt/books /data/
fi

/usr/bin/supervisord --nodaemon
