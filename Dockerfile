# syntax=docker/dockerfile:1.6
# ----------------------------------------
# 第一阶段，拉取 node 基础镜像并安装依赖，执行构建
FROM node:20-alpine AS builder
ARG BUILD_COUNTRY=""
ARG TARGETARCH

WORKDIR /build
RUN if [ "x${BUILD_COUNTRY}" = "xCN" ]; then \
    echo "using repo mirrors for ${BUILD_COUNTRY}"; \
    npm config set registry http://mirrors.tencent.com/npm/; \
    fi

COPY app/package.json app/package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm npm ci

# spa build mode will clear ssr build data, run it first
COPY app/ /build/
RUN mkdir -p /app-ssr/ /app-static/
RUN npm run build
RUN ls -al
RUN cp -r .output package* /app-ssr/
RUN npm run build-spa
RUN rm -rf dist && cp -r .output/public dist
RUN if [ ! -f dist/index.html ]; then cp dist/200.html dist/index.html; fi
RUN cp -r dist package* /app-static/


# ----------------------------------------
# 第二阶段，构建环境
# 基础镜像源码见本仓库 Dockerfile.base，独立构建并推送，避免重复编译 calibre
FROM talebook/talebook-base:8.6 AS server
ARG BUILD_COUNTRY=""
ARG TARGETARCH
ARG TARGETVARIANT

USER root
RUN mkdir -p /var/lib/apt/lists/partial && \
    chmod -R 0755 /var/lib/apt/lists/ && \
    if [ "x${BUILD_COUNTRY}" = "xCN" ]; then \
        echo "using repo mirrors for ${BUILD_COUNTRY}"; \
        sed 's@deb.debian.org/debian@mirrors.aliyun.com/debian@' -i /etc/apt/sources.list; \
        pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/; \
    fi

# 针对 ARM32 架构的特殊处理
RUN if [ "$TARGETARCH" = "arm" ] && [ "$TARGETVARIANT" = "v7" ]; then \
    echo "Building for ARM32 (ARMv7) architecture"; \
    # 确保使用兼容的包架构
    dpkg --add-architecture armhf || true; \
    fi

# install envsubst gosu procps
RUN apt-get update -y && \
    apt-get install -y gettext gosu procps vim && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create a talebook user and change the Nginx startup user if it doesn't exist
RUN if ! id -u talebook > /dev/null 2>&1; then \
    useradd -u 911 -U -d /var/www/talebook -s /bin/false talebook && \
    usermod -G users talebook && \
    groupmod -g 911 talebook; \
fi && \
    sed -i "s/user www-data;/user talebook;/g" /etc/nginx/nginx.conf

# install python packages
COPY requirements.txt /tmp/
RUN --mount=type=cache,target=/root/.cache/pip pip install -r /tmp/requirements.txt


# ----------------------------------------
# 测试阶段
FROM server AS test
RUN pip install flake8 pytest
COPY webserver/ /var/www/talebook/webserver/
COPY tests/ /var/www/talebook/tests/
CMD ["pytest", "/var/www/talebook/tests"]


# ----------------------------------------
# 生产环境
FROM server AS production
ARG GIT_VERSION=""
ARG TARGETARCH
ARG TARGETVARIANT

LABEL Author="Rex <talebook@foxmail.com>"
LABEL Thanks="oldiy <oldiy2018@gmail.com>"

# set default language
ENV TZ=Asia/Shanghai
ENV LANG=C.UTF-8
ENV PUID=1000
ENV PGID=1000

WORKDIR /var/www/talebook

# 架构信息（用于调试）
RUN echo "Target architecture: $TARGETARCH$TARGETVARIANT" > /arch-info.txt

# prepare dirs
RUN mkdir -p /data/log/nginx/ && \
    mkdir -p /data/books/library  && \
    mkdir -p /data/books/extract  && \
    mkdir -p /data/books/upload  && \
    mkdir -p /data/books/imports  && \
    mkdir -p /data/books/convert  && \
    mkdir -p /data/books/progress  && \
    mkdir -p /data/books/settings && \
    mkdir -p /data/books/logo && \
    mkdir -p /data/books/ssl && \
    mkdir -p /var/www/talebook/ && \
    chmod a+w -R /data/log /data/books /var/www

COPY server.py /var/www/talebook/
COPY docker/ /var/www/talebook/docker/
COPY webserver/ /var/www/talebook/webserver/
COPY conf/nginx/ssl.* /data/books/ssl/
COPY conf/nginx/talebook.conf /etc/nginx/conf.d/
COPY conf/supervisor/talebook.conf /etc/supervisor/conf.d/
COPY --from=builder /app-static/ /var/www/talebook/app/
COPY --from=builder /app-static/dist/logo/ /data/books/logo/

RUN rm -f /etc/nginx/sites-enabled/default /var/www/html -rf && \
    cd /var/www/talebook/ && \
    echo "VERSION = \"$GIT_VERSION\"" > webserver/version.py && \
    echo "ARCH = \"$TARGETARCH$TARGETVARIANT\"" >> webserver/version.py && \
    echo 'settings = {}' > /data/books/settings/auto.py && \
    chmod a+w /data/books/settings/auto.py && \
    calibredb add --library-path=/data/books/library/ -r docker/book/ && \
    python3 server.py --syncdb  && \
    python3 server.py --update-config  && \
    rm -f webserver/*.pyc && \
    rm -rf app/src && \
    rm -rf app/dist/logo && \
    ln -s /data/books/logo app/dist/logo && \
    mkdir -p /prebuilt/ && \
    mv /data/* /prebuilt/ && \
    chmod +x /var/www/talebook/docker/start.sh && \
    chmod +x /var/www/talebook/server.py && \
    chmod +x /var/www/talebook/webserver/migrate_db.py

EXPOSE 80 443

VOLUME ["/data"]

CMD ["/var/www/talebook/docker/start.sh"]


# ----------------------------------------
# 生产环境（server side render版)
FROM production AS production-ssr

USER root
RUN mkdir -p /var/lib/apt/lists/partial && \
    chmod -R 0755 /var/lib/apt/lists/ && \
    apt-get update -y && \
    if [ "$TARGETARCH" = "amd64" ]; then \
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -; \
    elif [ "$TARGETARCH" = "arm64" ]; then \
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -; \
    #elif [ "$TARGETARCH" = "arm" ] && [ "$TARGETVARIANT" = "v7" ]; then \
        #curl -fsSL https://deb.nodesource.com/setup_20.x | bash -; \
    fi && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# copy ssr config
COPY conf/nginx/server-side-render.conf /etc/nginx/conf.d/talebook.conf
COPY conf/supervisor/server-side-render.conf /etc/supervisor/conf.d/talebook.conf
COPY --from=builder /app-ssr/ /var/www/talebook/app/

# fix: symlink logo dir so user can override /data/books/logo/link.png
RUN rm -rf /var/www/talebook/app/.output/public/logo && \
    ln -s /data/books/logo /var/www/talebook/app/.output/public/logo


# ----------------------------------------
# 生产环境（spa版，作为默认 docker build 结果）
FROM production AS production-spa
# no more actions


# ----------------------------------------
# 生产环境（slim 版：不支持转换输出 PDF，体积减少约 700MB）
#
# PDF 输出是 calibre 中唯一需要 QtWebEngine（无头 Chromium）渲染的转换路径，
# epub/txt/mobi/azw3 互转只需 Qt6 Core/Gui。据此强删以下三组包（均已实测验证
# 六条转换链 txt->epub/azw3、epub->azw3/mobi、azw3->epub、mobi->epub 正常）：
#   1. QtWebEngine/Chromium 及其专属的 Quick/Qml 栈（~300MB）
#   2. scipy（no-install-recommends 下仍被装入）、sympy（calibre->fonttools 硬依赖链）
#   3. Mesa 软渲染驱动 + LLVM + z3（libqt6gui6->libgl1 链拖入，QImage 用不到 GL）、
#      qtmultimedia + ffmpeg 编解码库（calibre GUI 的 TTS 朗读用，转换用不到）
#
# 注意：
#   - libgl1/libegl1/libglx0（glvnd 调度层）是 libQt6Gui.so 的 ELF 硬依赖，不可删，
#     删除后所有涉及封面图片的转换都会失败（cannot import QBuffer from qt.core）。
#   - dpkg -r --force-depends 会留下不一致的依赖状态，本层之后镜像内不可再
#     执行 apt-get install；如需加包请基于 production 阶段构建。
#   - TALEBOOK_PDF_CONVERT=0 供 webserver 屏蔽"转换为PDF"功能入口。
#   - 关键：dpkg -r 删除发生在新层，被删字节仍保留在 production 的下层中，
#     docker 镜像/拉取体积不会减小（仅容器内 rootfs 变小）。因此本阶段先在
#     slim-strip 中删包，再用 `FROM scratch + COPY / /` 把瘦身后的 rootfs 压成
#     单层，使被删字节真正从镜像中消失（约 2.6GB -> 约 1.0GB）。
FROM production AS slim-strip

RUN dpkg -l | awk '/^ii/ {print $2}' \
        | grep -E 'webengine|webchannel|qt6.*(quick|qml|declarative)|qml6|pyqt6-dev|sympy|scipy|multimedia|texttospeech|speech' \
        | xargs -r dpkg -r --force-depends && \
    dpkg -l | awk '/^ii/ {print $2}' \
        | grep -E 'llvm|mesa|vulkan|libz3|codec2|libavcodec|libavformat|libavutil|libswresample|x265|x264|libvpx|libaom|dav1d|rav1e|svt' \
        | grep -vE '^libgl1$|^libegl1$|^libglx0$|glvnd' \
        | xargs -r dpkg -r --force-depends && \
    # 编译工具链只在 server 阶段 pip 安装时需要，运行期可整体移除（约 225MB）。
    # 第二段 grep 排除运行时必需且名字相近的包：gcc-14-base（C 运行时基础）、
    # libgcc-s1（libgcc 运行时，几乎所有二进制都链接它）。注意 cc1 实体在
    # gcc-14-<arch> 中，gcc/gcc-14 仅为包装器，故用前缀匹配连同 -<arch> 变体一并删除。
    dpkg -l | awk '/^ii/ {print $2}' \
        | grep -E '^(binutils|libbinutils|build-essential|cpp|g\+\+|gcc|make|dpkg-dev|libc6-dev|linux-libc-dev|libgcc-[0-9]+-dev|libstdc\+\+-[0-9]+-dev|python3-dev|python3\.[0-9]+-dev|libpython3-dev|libpython3\.[0-9]+-dev|python3-numpy-dev)([-.:].*)?$' \
        | grep -vE '^(gcc-[0-9]+-base|libgcc-s1)([-.:].*)?$' \
        | xargs -r dpkg -r --force-depends && \
    rm -rf /usr/share/doc /usr/share/man /usr/share/qt6/resources /usr/share/qt6/translations

# 把瘦身后的 rootfs 压成单层。scratch 不带任何元数据，故需重新声明 production
# 阶段的全部运行时元数据（ENV / WORKDIR / EXPOSE / VOLUME / CMD）。
FROM scratch AS production-slim
COPY --from=slim-strip / /

ENV TZ=Asia/Shanghai
ENV LANG=C.UTF-8
ENV PUID=1000
ENV PGID=1000
ENV TALEBOOK_PDF_CONVERT=0

WORKDIR /var/www/talebook

EXPOSE 80 443
VOLUME ["/data"]

CMD ["/var/www/talebook/docker/start.sh"]

