#!/bin/sh
set -eu

# Supervisor starts Nginx as the application user. A root master drops its
# workers to the image's default nobody user; a non-root master keeps its UID.
application_user=${1:-talebook}
cache_directory=${2:-/var/lib/nginx}
application_uid=$(id -u "$application_user")
nginx_worker=$application_user
if [ "$application_uid" = "0" ]; then
  nginx_worker=nobody
fi

# Existing 0700 hash directories survive restarts. Fix every descendant without
# broadening its mode or changing its group, including request-body temp paths.
chown -R "$nginx_worker" "$cache_directory"
