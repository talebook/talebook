#!/bin/sh

# Resolve the requested numeric IDs without creating duplicate root entries in
# /etc/passwd or /etc/group.  UID/GID 0 already belong to root and must be
# reused; non-zero IDs continue to be mapped onto the talebook account.
setup_talebook_user() {
  PUID=${PUID:-0}
  PGID=${PGID:-0}

  case "$PUID" in
    *[!0-9]*)
      echo "PUID must be a non-negative integer: $PUID" >&2
      return 1
      ;;
  esac

  case "$PGID" in
    *[!0-9]*)
      echo "PGID must be a non-negative integer: $PGID" >&2
      return 1
      ;;
  esac

  if [ "$PGID" -eq 0 ]; then
    TALEBOOK_RUN_GROUP=root
  else
    groupmod -o -g "$PGID" talebook || return 1
    TALEBOOK_RUN_GROUP=talebook
  fi

  if [ "$PUID" -eq 0 ]; then
    TALEBOOK_RUN_USER=root
  else
    usermod -o -u "$PUID" talebook || return 1
    usermod -g "$TALEBOOK_RUN_GROUP" talebook || return 1
    TALEBOOK_RUN_USER=talebook
  fi

  TALEBOOK_RUN_IDENTITY="$TALEBOOK_RUN_USER:$TALEBOOK_RUN_GROUP"
  export PUID PGID TALEBOOK_RUN_USER TALEBOOK_RUN_GROUP TALEBOOK_RUN_IDENTITY

  # Keep nginx workers on the same resolved identity as Tornado and Node.
  NGINX_CONFIG=${TALEBOOK_NGINX_CONFIG:-/etc/nginx/nginx.conf}
  sed -i "s/^user [^;]*;/user $TALEBOOK_RUN_USER $TALEBOOK_RUN_GROUP;/" "$NGINX_CONFIG"
}

setup_talebook_user
