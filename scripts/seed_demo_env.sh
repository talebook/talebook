#!/usr/bin/env bash
# 把固化的 demo 环境灌入本地 dev 后端容器：admin/demodemo + 2016 个书源。
#
# 用法：
#   bash scripts/seed_demo_env.sh
#
# 流程：起 dev.yml 后端容器（若未起）→ 等 /data 初始化 → 把 docker/seed 下的
# auto.py 与 calibre-webserver.db 灌入容器 → 重启后端生效。
# 前端另跑：cd app && npm run dev
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
CONTAINER=talebook-talebook-1

if [ ! -f docker/seed/calibre-webserver.db ] || [ ! -f docker/seed/auto.py ]; then
    echo "缺少种子文件 docker/seed/{auto.py,calibre-webserver.db}" >&2
    exit 1
fi

echo ">> 启动 dev 后端容器（dev.yml，挂载本地 webserver/）..."
docker compose -f dev.yml up -d

echo ">> 等待 /data 初始化..."
for _ in $(seq 1 40); do
    if docker exec "$CONTAINER" sh -c 'test -d /data/books' 2>/dev/null; then break; fi
    sleep 2
done

echo ">> 灌入固化的 demo 数据..."
docker exec "$CONTAINER" sh -c 'mkdir -p /data/books/settings'
docker cp docker/seed/calibre-webserver.db "$CONTAINER:/data/books/calibre-webserver.db"
docker cp docker/seed/auto.py "$CONTAINER:/data/books/settings/auto.py"

echo ">> 重启后端使配置生效..."
docker exec "$CONTAINER" supervisorctl restart tornado >/dev/null

echo ">> 等待就绪..."
for _ in $(seq 1 30); do
    code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/welcome 2>/dev/null || echo 000)
    if [ "$code" = "200" ]; then
        echo ">> 完成：访问 http://localhost:9000  账号 admin/demodemo"
        exit 0
    fi
    sleep 2
done
echo ">> 警告：等待后端就绪超时，请查看 docker logs $CONTAINER" >&2
exit 1
