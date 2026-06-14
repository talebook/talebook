# Docker 镜像瘦身：base 镜像修正 + slim 变体

日期：2026-06-12

## 背景

talebook 镜像（arm64 实测 2.63GB）体积过大。起因是评估「能否把 ebook-convert
编译成静态工具」，结论是不可行，但镜像本身有大量可削减空间。

## 评估结论（均为容器内实测，Debian 13 / calibre 8.x / arm64）

### 为什么 ebook-convert 无法静态化

- ebook-convert 是 Python 程序，依赖 calibre 全量 Python 包 + 原生扩展；
- 所有转换路径都需要 Qt6 Core/Gui（封面/图片走 QImage）；
- PDF 输出需要 QtWebEngine（无头 Chromium，`calibre/ebooks/pdf/html_writer.py`
  使用 `QWebEnginePage.printToPdf`），Chromium 无静态链接形态，Qt 官方明确不支持；
- PyQt 绑定暴露 Qt 全部 API，链接器无法做死代码消除，静态链接不会更小；
- calibre 官方二进制就是「自带 Python+Qt 的 bundle」，体积同样 GB 级；
- 抽取转换代码做独立工具：上游作者明确不支持解耦（mobileread 帖 t=332646），
  前人 fork gryf/ebook-converter 已停更且无 azw3 输出；且 webserver 有 17 处
  直接 `import calibre`（calibre.db / ebooks.metadata / utils.smtp 等），完整
  calibre 必须留在 webserver 同一 Python 环境中，抽取收益为零。

### 镜像肥在哪（2.63GB 的解剖）

| 浪费项 | 体积 | 原因 |
|---|---|---|
| 整套 Qt5 + PyQt5（含 Qt5WebEngineCore 123MB） | ~250MB | Dockerfile.base 显式安装的 `python3-pyqt5*` 是 Debian 12 遗留；Debian 13 的 calibre 只用 PyQt6，等于装了两套 Chromium |
| scipy/matplotlib/LLVM/Mesa/gcc/vim 等 | ~500MB+ | apt Recommends 拖入 |
| Qt6WebEngineCore + Chromium 资源 | ~250MB | 仅 PDF 输出需要 |
| sympy | 72MB | calibre→python3-fonttools→python3-sympy 硬依赖链（Debian 打包怪癖） |

### 实测数据阶梯（base 层 rootfs）

| 方案 | 体积 | 转换验证 |
|---|---|---|
| `--no-install-recommends`（保 PDF） | 1343MB | epub/azw3/mobi/txt/PDF 全过 |
| + 强删 WebEngine 栈 | 996MB | 六链全过，PDF 输出失效 |
| + 强删 scipy/sympy/Mesa+LLVM/ffmpeg | 657MB | 六链全过 |

关键边界（踩过的坑）：

- `libgl1/libegl1/libglx0`（glvnd 调度层，各几 MB）是 `libQt6Gui.so` 的
  ELF NEEDED，**不可删**；删除后所有涉及封面的转换报
  `cannot import QBuffer from qt.core`。可删的是其背后的 Mesa 驱动 + LLVM + z3。
- PDF 输出（Chromium）拒绝以 root 运行，必须以非 root 用户执行 ebook-convert。
- `--no-install-recommends` 下 scipy 仍会被装入；sympy 经 fonttools 硬依赖装入，
  二者均需 `dpkg -r --force-depends` 强删。

## 落地方案（本次 PR）

1. **主镜像（保 PDF，零功能损失）**：Dockerfile.base 全程
   `--no-install-recommends`，移除 PyQt5 遗留，显式保留 build-essential
   （pip 编译 sdist 用，原先由 Recommends 隐式提供），补装 fonts-wqy-microhei
   （convert.py 转 PDF 硬编码文泉驿字体，此前镜像中缺失）。base 版本 8.5 → 8.6。
2. **slim 变体（`talebook/talebook:slim`）**：主 Dockerfile 新增
   `production-slim` target，在 production 基础上强删 WebEngine/Quick/Qml、
   scipy/sympy、Mesa 驱动+LLVM、qtmultimedia+ffmpeg、编译工具链，并设置
   `ENV TALEBOOK_PDF_CONVERT=0`。不支持转换输出 PDF（PDF 导入/阅读不受影响）。
3. **功能开关**：`TALEBOOK_PDF_CONVERT=0` 时 BookToPDF 接口返回
   `params.convert.unsupported`；`/api/user/info` 的 `sys.pdf_convert` 暴露该
   能力，前端据此禁用「转为PDF格式」菜单项。
4. **护栏**：`tools/convert_smoke.sh` 六条转换链冒烟测试，build.yml 中对
   slim 镜像（amd64）必跑，防止强删清单在 calibre/Debian 升级后误伤转换功能。

## 最终实测体积（arm64，拉取/存储体积，非容器内 rootfs）

| 镜像 | 改造前 | 改造后 | 变化 |
|---|---|---|---|
| base（talebook-base） | ~2.5GB | 1.79GB | -28% |
| 完整版（production-spa，保 PDF） | 2.63GB | 1.98GB | -25%，零功能损失 |
| slim（production-slim，无 PDF 输出） | 2.63GB | 1.01GB | -62% |

### 关键陷阱：分层 whiteout 不减小镜像体积

最初 slim 阶段写成 `FROM production` + `RUN dpkg -r`，实测镜像体积仍是 1.98GB，
仅容器内 `du / ` 降到 1043MB。原因：dpkg 删除发生在新层，被删字节仍保留在
production 的下层中，docker 镜像体积 = 各层 tar 之和，whiteout 标记不会移除下层字节。

解决：slim 拆成两段——`slim-strip` 删包，再 `FROM scratch` + `COPY --from=slim-strip / /`
把瘦身后的 rootfs 压成单层，被删字节才真正从镜像消失（1.98GB → 1.01GB）。
代价是 scratch 不带元数据，需重新声明 production 的 ENV / WORKDIR / EXPOSE /
VOLUME / CMD。已验证 flatten 后 talebook 用户 / gosu / nginx / supervisor /
start.sh / import webserver / 文件 setuid 位均完好。

## 注意事项

- slim 镜像 dpkg 依赖状态不一致，**镜像内不可再 apt-get install**；
  需要加包请基于 production target 自行构建。
- base 8.6 需要引导发布：合并后执行 `make build-base push-base`
  （或推 `base-v8.6.x` tag 触发 build-base workflow），主镜像构建才能拉到
  `talebook/talebook-base:8.6`。
- 后续 Debian/calibre 升级时，强删清单的包名可能漂移，以冒烟测试为准。
