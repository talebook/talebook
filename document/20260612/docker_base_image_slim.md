# 基础镜像瘦身（第一步，零功能损失）

日期：2026-06-12

## 背景

talebook 镜像（arm64 实测 2.63GB）体积过大。起因是评估「能否把 `ebook-convert`
编译成静态工具来缩小镜像」。结论：不可行——`ebook-convert` 是 Python 程序，转换
依赖 Qt6 Gui（封面/图片走 QImage），PDF 输出依赖 QtWebEngine（无头 Chromium），
均无静态链接形态；calibre 官方二进制同样 GB 级；且 webserver 有 17 处直接
`import calibre`，无法解耦。

但镜像本身有大量与装法相关的浪费空间，本次先做不影响任何功能的第一步。
（后续的 slim 变体——以放弃 PDF 输出换取进一步瘦身——单独提交。）

## 本次改动（仅 `Dockerfile.base`，主 `Dockerfile` 仅升 base 版本号）

1. **全程 `--no-install-recommends`**：apt 的 Recommends 会拖进
   scipy / matplotlib / GPU 驱动 / gcc / vim 等数百 MB 与运行无关的包。
2. **移除遗留的 `python3-pyqt5*` 系列**：Debian 13 的 calibre 已改用 Qt6 / PyQt6，
   原先显式安装的 `python3-pyqt5`、`python3-pyqt5.qtwebengine` 等是 Debian 12
   时代的遗留——等于在 Qt6 之外又重复安装了一整套 Qt5 / Chromium（含
   `libQt5WebEngineCore` 约 123MB）。验证逻辑同步从 PyQt5 改为 PyQt6。
3. **显式保留 `build-essential` / `python3-dev`**：原先由 `python3-pip` 的
   Recommends 隐式带入；主 Dockerfile 中 pip 安装 `requirements.txt` 时部分包
   （如 `quickjs`）无预编译 wheel 需源码编译，故显式保留，避免 no-recommends 后构建失败。
4. **补装 `fonts-wqy-microhei`**：`services/convert.py` 转 PDF 时硬编码了文泉驿
   微米黑字体，但此前镜像并未安装该字体（中文 PDF 排版会退化为 fallback 字体），此处补上。
5. base 版本 `8.5` → `8.6`，主 `Dockerfile` 的 `FROM talebook/talebook-base` 同步升级。

## 实测效果（arm64，拉取/存储体积）

| 镜像 | 改造前 | 改造后 | 变化 |
|---|---|---|---|
| base（talebook-base） | ~2.5GB | 1.79GB | -28% |
| 完整版（production-spa） | 2.63GB | 1.98GB | -25%，**零功能损失** |

base 8.6 已本地验证：六条转换链（txt/epub/mobi/azw3 互转）+ PDF 输出均正常。

## 发布注意

base 8.6 需引导发布：合并后执行 `make build-base push-base`（或推 `base-v8.6.x`
tag 触发 build-base workflow），主镜像构建才能拉到 `talebook/talebook-base:8.6`。
