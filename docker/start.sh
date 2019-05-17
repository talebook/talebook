#!/bin/sh
if [ ! -d "/data/release" ]; then
  cp -rf /prebuilt/* /data/
fi

/usr/bin/supervisord --nodaemon
