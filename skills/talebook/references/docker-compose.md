# 使用 Docker Compose 启动 Talebook

仅在用户要求部署新实例时读取本参考。CLI 不提供部署命令；停止、升级、备份等后续操作由 Agent 根据用户请求和 Compose 配置推导。

先确定部署目录、宿主机端口和持久化数据目录。目标位置已有文件时先读取，不覆盖未知配置。

在部署目录创建 `compose.yaml` ：

```yaml
services:
  talebook:
    image: talebook/talebook:latest
    restart: unless-stopped
    ports:
      - "${TALEBOOK_HTTP_PORT:-8080}:80"
      - "${TALEBOOK_HTTPS_PORT:-8443}:443"
    volumes:
      - "${TALEBOOK_DATA_DIR:-./data}:/data"
    environment:
      PUID: "${PUID:-1000}"
      PGID: "${PGID:-1000}"
      TZ: "${TZ:-Asia/Shanghai}"
```

确保数据目录存在且目标 UID/GID 可写，然后启动：

```bash
docker compose config
docker compose up -d
docker compose ps
```

用配置的 HTTP 端口检查入口；响应 `not_installed` 也表示服务已经可访问：

```bash
curl --fail-with-body http://127.0.0.1:8080/api/user/info
```

完成后提供访问地址、Compose 文件和持久化数据目录。首次启动时打开站点，在浏览器完成初始化，再运行 `talebook-cli.py me status` 验证身份。
