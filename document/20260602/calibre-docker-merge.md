# 合并 calibre-docker 基础镜像并改名

日期：2026-06-02

## 背景

原 `talebook/calibre-docker` 是一个独立仓库，构建出供主项目 `FROM` 的基础镜像
（debian:13-slim + calibre + nginx + supervisor + PyQt5）。基础镜像独立构建、推到
registry、主镜像按 tag 引用，避免每次构建重复编译 calibre（QEMU 下 arm 尤其慢）。

为统一管理，将其源码合并进本仓库，并把镜像名从 `talebook/calibre-docker`
改为 **`talebook/talebook-base`**（语义更准：它是 talebook 专用基础镜像，而非纯 calibre）。

## 分两步落地

为避免在基础镜像尚未发布到 registry 时切坏构建，分两个 PR：

**第一步（本次）：建好基础镜像并发布，不切换任何消费方**

| 文件 | 改动 |
| --- | --- |
| `Dockerfile.base` | 新增，源自原 calibre-docker/Dockerfile，内容原样照搬 |
| `.github/workflows/build-base.yml` | 新增，独立构建/推送基础镜像，仅在改 `Dockerfile.base` / 打 `base-v*` tag / 手动触发时运行 |
| `Makefile` | 新增 `build-base` / `push-base` 目标 |
| `document/Development.zh_CN.md` | 手动搭建参考链接改为本仓库 `Dockerfile.base`（仅文档，无构建影响） |

完成后执行发布（见下文「首次引导」），确认 `talebook/talebook-base:8.5` 在 registry 可拉取。

**第二步（后续 PR）：切换消费方到新镜像名**

| 文件 | 改动 |
| --- | --- |
| `Dockerfile` | `FROM talebook/calibre-docker:8.5` → `ARG BASE_IMAGE=talebook/talebook-base:8.5` + `FROM ${BASE_IMAGE}`（全局 ARG 放文件顶部） |
| `.github/workflows/ci.yml` | 测试容器镜像 `talebook/calibre-docker:latest` → `talebook/talebook-base:latest` |

## 设计要点

- **保持"编译一次、registry 复用"分工**：基础镜像没有内联成主 Dockerfile 的 stage，
  否则每次 build app 都会重编 calibre。
- **触发收敛**：`build-base.yml` 用 `paths: [Dockerfile.base]` 过滤，日常改 app 不会触发基础镜像重建。
- **版本标签**：打 `base-v8.5.0` 这类 tag → 产出 `8` / `8.5` / `8.5.0`；
  master push（改了 Dockerfile.base）→ 产出 `latest` / `master`。
  用 `base-v*` 前缀是为了和主项目已有的 `v*`（app 发版）tag 区分开。
- 主 Dockerfile 默认 pin `talebook/talebook-base:8.5`，可用 `--build-arg BASE_IMAGE=...` 覆盖。

## 切换后首次引导

新镜像名首次需要先把 `:8.5` 标签推上去，主镜像/CI 才能拉到：

```bash
make build-base push-base      # 本地构建并推送 latest + 8.5
# 或在 GitHub 上打 tag：git tag base-v8.5.0 && git push origin base-v8.5.0
```

## 待办（未在本次处理）

- 原 `talebook/calibre-docker` 仓库归档，README 指向本仓库 `Dockerfile.base`。
- Docker Hub 旧镜像 `talebook/calibre-docker` 加"已迁移"说明。
- `Dockerfile.base` 末尾 `pip install flask sqlalchemy requests beautifulsoup4` 疑似历史遗留
  （talebook 用 Tornado，实际依赖走主 Dockerfile 的 requirements.txt），可后续确认是否删除。
- 基础镜像建 `talebook` uid=1000 用户，主 Dockerfile 的"不存在才建 uid=911"分支因此被跳过——
  现状行为，本次未改动。
