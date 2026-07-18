# syntax=docker/dockerfile:1.6
# ----------------------------------------
# 第一阶段，拉取 node 基础镜像并安装依赖，执行构建
FROM node:20-alpine AS builder
ARG BUILD_COUNTRY=""
ARG TARGETARCH

WORKDIR /build
RUN if [ "x${BUILD_COUNTRY}" = "xCN" ]; then \
    echo "using repo mirrors for ${BUILD_COUNTRY}"; \
    npm config set registry https://registry.npmmirror.com; \
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
# 第二阶段，应用运行基线
# 基础镜像由 https://github.com/talebook/talebook-base 独立维护和发布
FROM talebook/talebook-base:slim-v8.5.0 AS application-base
ARG BUILD_COUNTRY=""
ARG TARGETARCH
ARG TARGETVARIANT

USER root
RUN mkdir -p /var/lib/apt/lists/partial && \
    chmod -R 0755 /var/lib/apt/lists/ && \
    if [ "x${BUILD_COUNTRY}" = "xCN" ]; then \
        echo "using repo mirrors for ${BUILD_COUNTRY}"; \
        \
        if [ -f /etc/apt/sources.list ]; then \
            sed -i 's@deb.debian.org/debian@mirrors.aliyun.com/debian@g' /etc/apt/sources.list; \
            sed -i 's@security.debian.org@mirrors.aliyun.com/debian-security@g' /etc/apt/sources.list; \
        fi; \
        \
        if [ -d /etc/apt/sources.list.d ]; then \
            find /etc/apt/sources.list.d -name "*.list" -exec sed -i 's@deb.debian.org/debian@mirrors.aliyun.com/debian@g' {} \; ; \
            find /etc/apt/sources.list.d -name "*.list" -exec sed -i 's@security.debian.org@mirrors.aliyun.com/debian-security@g' {} \; ; \
        fi; \
        \
        echo "deb http://mirrors.aliyun.com/debian trixie main contrib non-free" > /etc/apt/sources.list; \
        echo "deb http://mirrors.aliyun.com/debian trixie-updates main contrib non-free" >> /etc/apt/sources.list; \
        echo "deb http://mirrors.aliyun.com/debian-security trixie-security main contrib non-free" >> /etc/apt/sources.list; \
        \
        pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/; \
    fi

# 针对 ARM32 架构的特殊处理
RUN if [ "$TARGETARCH" = "arm" ] && [ "$TARGETVARIANT" = "v7" ]; then \
    echo "Building for ARM32 (ARMv7) architecture"; \
    # 确保使用兼容的包架构
    dpkg --add-architecture armhf || true; \
    fi

# Create a talebook user and change the Nginx startup user if it doesn't exist
RUN if ! id -u talebook > /dev/null 2>&1; then \
    useradd -u 911 -U -d /var/www/talebook -s /bin/false talebook && \
    usermod -G users talebook && \
    groupmod -g 911 talebook; \
fi && \
    sed -i "s/user www-data;/user talebook;/g" /etc/nginx/nginx.conf


# ----------------------------------------
# Python wheel 构建阶段
# ARMv7 上 psutil、cffi 等依赖没有可用的预编译 wheel；工具链只保留在本阶段。
FROM application-base AS python-wheel-build
ARG TARGETARCH
ARG TARGETVARIANT

USER root
RUN if [ "$TARGETARCH" = "arm" ] && [ "$TARGETVARIANT" = "v7" ]; then \
        apt-get update && \
        apt-get install -y --no-install-recommends \
            build-essential \
            libffi-dev \
            python3-dev \
            python3-wheel; \
    fi && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/
RUN --mount=type=cache,target=/root/.cache/pip \
    python3 -m pip wheel --wheel-dir /opt/wheels psutil "cffi>=2.0.0"


# ----------------------------------------
# 第三阶段，应用服务运行环境
# 只挂载 wheel 构建产物，编译器和 Python headers 不进入本阶段及其后代镜像。
FROM application-base AS server

COPY requirements.txt /tmp/
RUN --mount=from=python-wheel-build,source=/opt/wheels,target=/tmp/talebook-wheels,ro \
    --mount=type=cache,target=/root/.cache/pip \
    python3 -m pip install \
        --no-index \
        --find-links=/tmp/talebook-wheels \
        psutil cffi && \
    python3 -m pip install -r /tmp/requirements.txt


# ----------------------------------------
# 测试阶段
FROM server AS test
COPY requirements-test.txt /tmp/
RUN --mount=type=cache,target=/root/.cache/pip pip install -r /tmp/requirements-test.txt
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
    mkdir -p /var/www/talebook/status && \
    chmod a+w -R /data/log /data/books /var/www

COPY server.py /var/www/talebook/
COPY docker/ /var/www/talebook/docker/
COPY webserver/ /var/www/talebook/webserver/
COPY conf/nginx/ssl.* /data/books/ssl/
COPY conf/nginx/talebook.conf /etc/nginx/conf.d/
COPY conf/supervisor/talebook.conf /etc/supervisor/conf.d/
COPY docker/status_page.html /var/www/talebook/status/status_page.html
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
    if [ "x${BUILD_COUNTRY}" = "xCN" ]; then \
        echo "deb http://mirrors.aliyun.com/debian trixie main contrib non-free" > /etc/apt/sources.list; \
        echo "deb http://mirrors.aliyun.com/debian trixie-updates main contrib non-free" >> /etc/apt/sources.list; \
        echo "deb http://mirrors.aliyun.com/debian-security trixie-security main contrib non-free" >> /etc/apt/sources.list; \
    fi; \
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
# 开发环境（前端使用 npm run dev，可将本地 app/ 目录挂载进来实时开发）
# 构建：docker build --target dev -t talebook/talebook:dev .
# 使用：docker-compose -f dev.yml up
FROM server AS dev
ARG BUILD_COUNTRY=""
ARG GIT_VERSION=""
ARG TARGETARCH
ARG TARGETVARIANT

USER root

# Install Node.js 20
RUN apt-get update -y && \
    if [ "$TARGETARCH" = "amd64" ] || [ "$TARGETARCH" = "arm64" ]; then \
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
        apt-get install -y nodejs; \
    fi && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ENV TZ=Asia/Shanghai
ENV LANG=C.UTF-8
ENV PUID=1000
ENV PGID=1000

WORKDIR /var/www/talebook

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
COPY conf/nginx/dev.conf /etc/nginx/conf.d/talebook.conf
COPY conf/supervisor/dev.conf /etc/supervisor/conf.d/talebook.conf

# 预先安装 npm 依赖（当 app/ 目录未被外部挂载时作为回退）
COPY app/package.json app/package-lock.json* /var/www/talebook/app/
RUN cd /var/www/talebook/app && npm ci

# 复制完整 app/ 源码（node_modules 已由上一步安装，.dockerignore 排除本地 node_modules）
COPY app/ /var/www/talebook/app/

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
    mkdir -p /prebuilt/ && \
    mv /data/* /prebuilt/ && \
    chmod +x /var/www/talebook/docker/start-dev.sh && \
    chmod +x /var/www/talebook/server.py && \
    chmod +x /var/www/talebook/webserver/migrate_db.py

EXPOSE 80 443

VOLUME ["/data"]

CMD ["/var/www/talebook/docker/start-dev.sh"]
