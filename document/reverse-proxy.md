# 带子路径的反向代理

Talebook 默认部署在 `/` 。需要在已有站点下使用 `/readest-test/` 等路径时，使用 `TALEBOOK_BASE_PATH` 构建专用镜像：

```sh
docker build --build-arg TALEBOOK_BASE_PATH=/readest-test \
  --target production -t talebook:readest-test .
docker run -d --name talebook-readest-test --restart unless-stopped \
  -p 127.0.0.1:39209:80 -v talebook-readest-test-data:/data talebook:readest-test
```

路径支持英文、数字、`-` 和 `_` 组成的单级或多级目录，例如 `/team/books` 。空值或 `/` 表示默认根路径；尾斜线会归一化。不接受完整 URL、查询参数、片段、编码路径或 `.` / `..` 。

前端路由和资源路径写入静态产物，**改路径必须重建镜像**；不要单独通过 `docker run -e TALEBOOK_BASE_PATH=...` 改变已构建镜像的路径。Docker 构建参数会同时配置前后端。源码开发时前后端进程也需使用相同的 `TALEBOOK_BASE_PATH` 。

## Caddy

在现有域名的兜底 `handle` 之前添加：

```caddyfile
miu.rexliao.cn {
    @readest_root path /readest-test
    redir @readest_root /readest-test/ 308
    handle_path /readest-test/* {
        reverse_proxy 127.0.0.1:39209
    }
    handle {
        reverse_proxy 127.0.0.1:13000
    }
}
```

`handle_path` 移除请求前缀。Caddy 自动传递原始 Host 和 `X-Forwarded-Proto`；容器内 Nginx 据此向后端传递外部 HTTPS 协议。修改现有站点时保留其 WebSocket 等已有规则。

## Nginx

以下配置放入已有 HTTPS `server` 中：

```nginx
location = /readest-test {
    return 308 /readest-test/$is_args$args;
}
location ^~ /readest-test/ {
    # 尾斜线不可省略：移除 /readest-test/ 前缀。
    proxy_pass http://127.0.0.1:39209/;
    proxy_set_header Host $http_host;
    proxy_set_header X-Forwarded-Host $http_host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_redirect off;
    # 按部署需要设置上传上限；流式接口不缓冲。
    client_max_body_size 100m;
    proxy_buffering off;
}
```

应用生成的跳转、API/下载/封面、阅读资源和登录 cookie 已包含公开前缀。不需要 `sub_filter`、`proxy_cookie_path` 或转发根目录 `/api/`。应用不采用请求中的 `X-Forwarded-Prefix`，路径由部署配置决定。

## 验证与兼容范围

- 首页、登录、书籍详情、直接刷新和新标签页链接均应停留在配置路径下。
- 检查浏览器网络请求：Talebook 的 API、`_nuxt`、封面与阅读资源不应落到宿主站点根路径。
- 登录与退出使用相同的 cookie Path。切换已有站点的部署路径后需要重新登录。
- OPDS 地址为 `/readest-test/opds/`，WebDAV 地址为 `/readest-test/books/`；社交登录服务商需要登记带前缀的回调 URL。
- 管理员自定义 HTML（公告、页脚、侧栏）、外部主题自带的硬编码 URL、显式 `static_host` / `opds_url_prefix` 属于自定义配置，需要同步改为正确的公开地址。外部完整 URL 不会被自动改写。
- 子路径共享同一个浏览器 origin，并非独立安全边界；需要隔离存储或不受信任应用时使用不同域名。
- Readest 集成尚在 PR #977，其 Next.js 导出也必须使用 `NEXT_PUBLIC_EMBEDDED_BASE_PATH=/readest-test/readest`，并同步适配宿主启动页与资源契约；不能直接复用固定 `/readest` 的旧导出。此主干功能不自动下载或重写第三方构建产物。

自动化：`pytest tests/test_base_path.py tests/test_reverse_proxy_integration.py`；前端：`cd app && npx vitest run test/utils/base-path.spec.ts`。真实浏览器验收脚本见 `app/test/scripts/reverse-proxy-live.mjs`，仅连接指定的测试实例。
