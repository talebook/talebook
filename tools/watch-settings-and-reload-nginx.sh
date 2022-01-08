#!/bin/bash

NGINX_CONF=/etc/nginx/conf.d/calibre-webserver.conf
WATCH_DIR=/data/demo/books/settings/
WATCH_CONF="$WATCH_DIR/auto.py"

SCRIPT="
import sys;
sys.path.append('$WATCH_DIR');
import auto;
val='$NGINX_CLIENT_MAX_BODY_SIZE';
print(auto.settings.get('NGINX_CLIENT_MAX_BODY_SIZE', val));
"

update_nginx_conf() {
    export NGINX_CLIENT_MAX_BODY_SIZE=$1
    envsubst '${NGINX_CLIENT_MAX_BODY_SIZE}' < "${NGINX_CONF}.template" > "${NGINX_CONF}"
    service nginx reload
}


# init
val=$(python -c "$SCRIPT")
update_nginx_conf $val

# watch and update env
while inotifywait -qe modify "$WATCH_CONF"; do
    n=$(python -c "$SCRIPT")
    if [ "$val" = "$n" ]; then
        continue
    fi
    val=$n
    update_nginx_conf $val
done
