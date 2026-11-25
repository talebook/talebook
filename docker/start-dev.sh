#!/bin/sh

PUID=${PUID:-0}
PGID=${PGID:-0}

groupmod -o -g "${PGID}" talebook
usermod -o -u "${PUID}" talebook

if [ "${PUID}" = "0" ]; then
  echo "WARNING: PUID=0 runs Talebook application processes as root; this is supported for compatibility but is not required for SSL upload."
fi

# 使用预设的书库和配置
if [ ! -d "/data/books" ]; then
  cp -rf /prebuilt/books /data/
fi

if [ ! -s "/data/books/calibre-webserver.db" ]; then
  cp /prebuilt/books/calibre-webserver.db /data/books/
fi

if [ ! -d "/data/log" ]; then
  cp -rf /prebuilt/log /data/
fi

# 检查目录，拷贝并创建目录
cd /prebuilt/books/;
for f in *; do
  if [ -d "$f" -a ! -d "/data/books/$f" ]; then
    cp -rvf "/prebuilt/books/$f" /data/books/
  fi
done

# 检查文件，并拷贝过去
find . \( -path ./library -o -name '*.pyc' \) -prune -o -type f -print | while read f; do
    target="/data/books/$f"
    if [ ! -e "$target" ]; then
        cp "$f" "$target"
    fi
done


mkdir -p /root/.npm /run/talebook /data/books/ssl /data/books/ai

# 设置PUID/GUID权限
permission_file=/data/.permission
touch $permission_file
permission=`cat $permission_file`
if [ "x$permission" != "x$PUID:$PGID" ]; then
    echo "updating '/data/' permission to $PUID:$PGID"
    chown -R talebook:talebook /data
    echo "$PUID:$PGID" > $permission_file
else
    # settings 目录体积很小；标记命中时仍定向修复，避免宿主目录重建或预置文件复制后属主失真。
    chown -R talebook:talebook /data/books/settings /data/books/ai || exit 1
fi

# 设置系统文件的权限
# .env 通过同目录临时文件原子替换；只调整目录节点，不递归修改 app 源码与依赖。
chown talebook:talebook /var/www/talebook/app
chown -R talebook:talebook \
  /run/talebook \
  /data/books/ai \
  /data/books/ssl \
  /data/log/ \
  /var/lib/nginx \
  /var/log/nginx \
  /root/.config/calibre \
  /root/.npm \
  /var/www/talebook/webserver \
  /var/www/talebook/server.py \
  /usr/lib/calibre \
  /usr/share/calibre

if [ -f /data/books/ssl/ssl.crt ]; then
  chmod 0644 /data/books/ssl/ssl.crt
fi
if [ -f /data/books/ssl/ssl.key ]; then
  chmod 0600 /data/books/ssl/ssl.key
fi

# 若挂载了外部 app/ 目录导致 node_modules 缺失，自动安装依赖
APP_DIR=/var/www/talebook/app
if [ -f "${APP_DIR}/package.json" ] && [ ! -d "${APP_DIR}/node_modules" ]; then
  echo "====== Installing npm dependencies ======"
  cd "${APP_DIR}" && gosu talebook:talebook npm install
fi

# 以业务进程身份覆盖两个可能来自不同挂载的目录，并验证配置原子写入所需的重命名能力。
check_atomic_write() {
    directory=$1
    gosu talebook:talebook sh -c '
        set -eu
        tmp=$(mktemp "$1/.talebook-write-test.XXXXXX")
        moved="${tmp}.replace"
        trap '\''rm -f "$tmp" "$moved"'\'' 0
        mv "$tmp" "$moved"
    ' talebook-write-check "$directory"
}

for directory in /data/books/library /data/books/settings /data/books/ai; do
    if ! check_atomic_write "$directory"; then
        echo "目录权限异常，无法以 PUID/PGID 原子写入 $directory"
        exit 1
    fi
done

# 启动
export PYTHONDONTWRITEBYTECODE=1
echo
echo "====== Check config ===="
gosu talebook:talebook nginx -t || exit 1

echo
echo "====== Sync DB Scheme ===="
gosu talebook:talebook /var/www/talebook/server.py --syncdb

echo
echo "====== Migrate Database Schema ===="
echo "Checking for missing columns and adding them..."
gosu talebook:talebook python3 /var/www/talebook/webserver/migrate_db.py

echo
echo "====== Update Server Config ===="
gosu talebook:talebook /var/www/talebook/server.py --update-config

echo
echo "====== Start Server ===="
exec /usr/bin/supervisord --nodaemon -u root -c /etc/supervisor/supervisord.conf
