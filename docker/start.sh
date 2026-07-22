#!/bin/sh

DOCKER_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if ! . "$DOCKER_DIR/setup-user.sh"; then
  exit 1
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


mkdir -p /root/.npm

# 设置系统文件的权限（数量较少，且 nginx/诊断页在自检完成前就需要可用，必须先于 supervisord 启动前就绪）
mkdir -p /data/log/nginx /var/www/talebook/status
chown -R "$TALEBOOK_RUN_IDENTITY" \
  /data/log/ \
  /var/lib/nginx \
  /root/.config/calibre \
  /root/.npm \
  /var/www/talebook/app/.env \
  /var/www/talebook/app/dist \
  /var/www/talebook/webserver \
  /var/www/talebook/server.py \
  /var/www/talebook/status \
  /usr/lib/calibre \
  /usr/share/calibre

# /data/books 的权限校验、nginx 配置检查、数据库初始化/迁移/配置写入这些"可能失败"的
# 步骤，交给 supervisor 的 bootstrap program（webserver/self_check.py）在 nginx 启动
# 之后逐项自检并写入 status.json；任一步失败都不会导致容器整体重启，nginx 与诊断页
# 始终可访问，用户不需要进入容器查看日志即可知道卡在哪一步、该怎么处理。
export PYTHONDONTWRITEBYTECODE=1

echo
echo "====== Start Server ===="
exec /usr/bin/supervisord --nodaemon -u root -c /etc/supervisor/supervisord.conf
