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


mkdir -p /root/.npm /run/talebook /data/books/ssl

# 设置系统文件的权限（数量较少，且 nginx/诊断页在自检完成前就需要可用，必须先于 supervisord 启动前就绪）
mkdir -p /data/log/nginx /var/www/talebook/status
# .env 通过同目录临时文件原子替换；只调整目录节点，不递归修改 app 源码与依赖。
chown talebook:talebook /var/www/talebook/app
chown -R talebook:talebook \
  /run/talebook \
  /data/books/ssl \
  /data/log/ \
  /var/lib/nginx \
  /var/log/nginx \
  /root/.config/calibre \
  /root/.npm \
  /var/www/talebook/app/.env \
  /var/www/talebook/app/dist \
  /var/www/talebook/webserver \
  /var/www/talebook/server.py \
  /var/www/talebook/status \
  /usr/lib/calibre \
  /usr/share/calibre

if [ -f /data/books/ssl/ssl.crt ]; then
  chmod 0644 /data/books/ssl/ssl.crt
fi
if [ -f /data/books/ssl/ssl.key ]; then
  chmod 0600 /data/books/ssl/ssl.key
fi

# /data/books 的权限校验、nginx 配置检查、数据库初始化/迁移/配置写入这些"可能失败"的
# 步骤，交给 supervisor 的 bootstrap program（webserver/self_check.py）在 nginx 启动
# 之后逐项自检并写入 status.json；任一步失败都不会导致容器整体重启，nginx 与诊断页
# 始终可访问，用户不需要进入容器查看日志即可知道卡在哪一步、该怎么处理。
export PYTHONDONTWRITEBYTECODE=1

echo
echo "====== Start Server ===="
exec /usr/bin/supervisord --nodaemon -u root -c /etc/supervisor/supervisord.conf
