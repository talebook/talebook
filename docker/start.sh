#!/bin/sh

if [ ! -d "/data/books" ]; then
  cp -rf /prebuilt/books/ /data/books/
fi

service nginx restart
/usr/bin/supervisord --nodaemon
