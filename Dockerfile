# ----------------------------------------
# 第一阶段，拉取 node 基础镜像并安装依赖，执行构建
FROM node:16-alpine AS builder
ARG BUILD_COUNTRY=""
ARG TARGETARCH

WORKDIR /build
RUN if [ "x${BUILD_COUNTRY}" = "xCN" ]; then \
    echo "using repo mirrors for ${BUILD_COUNTRY}"; \
    npm config set registry http://mirrors.tencent.com/npm/; \
    fi

COPY app/package.json app/package-lock.json* ./
RUN npm install

# spa build mode will clear ssr build data, run it first
COPY app/ /build/
RUN mkdir -p /app-ssr/ /app-static/
RUN npm run build
RUN ls -al
RUN cp -r .nuxt node_modules package* /app-ssr/
RUN npm run build-spa
RUN cp -r dist nuxt.config.js package* /app-static/


# ----------------------------------------
# 第二阶段，构建环境
FROM hehetoshang/calibre-docker AS server
ARG BUILD_COUNTRY=""
ARG TARGETARCH
ARG TARGETVARIANT

# 修复 apt 目录权限并设置镜像
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

# Create a talebook user and change the Nginx startup user
RUN useradd -u 911 -U -d /var/www/talebook -s /bin/false talebook && \
    usermod -G users talebook && \
    groupmod -g 911 talebook && \
    sed -i "s/user www-data;/user talebook;/g" /etc/nginx/nginx.conf

# install python packages
COPY requirements.txt /tmp/
RUN pip install -r /tmp/requirements.txt && \
    rm -rf /root/.cache


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
    chmod +x /var/www/talebook/docker/start.sh

EXPOSE 80 443

VOLUME ["/data"]

CMD ["/var/www/talebook/docker/start.sh"]


# ----------------------------------------
# 生产环境（server side render版)
FROM production AS production-ssr

# 修复 apt 目录权限并安装 nodejs
RUN mkdir -p /var/lib/apt/lists/partial && \
    chmod -R 0755 /var/lib/apt/lists/ && \
    apt-get update -y && \
    # 根据架构选择合适的 NodeSource 脚本
    if [ "$TARGETARCH" = "amd64" ]; then \
        curl -fsSL https://deb.nodesource.com/setup_16.x | bash -; \
    elif [ "$TARGETARCH" = "arm64" ]; then \
        curl -fsSL https://deb.nodesource.com/setup_16.x | bash -; \
    elif [ "$TARGETARCH" = "arm" ] && [ "$TARGETVARIANT" = "v7" ]; then \
        curl -fsSL https://deb.nodesource.com/setup_16.x | bash -; \
        # ARM32 使用 Node.js 的官方二进制分发
        #ARCH=armv7l; \
        #curl -fsSL https://nodejs.org/dist/v16.20.2/node-v16.20.2-linux-${ARCH}.tar.xz | tar -xJ -C /usr/local --strip-components=1; \
    fi && \
    #if [ "$TARGETARCH" != "arm" ] || [ "$TARGETVARIANT" != "v7" ]; then \
    apt-get install -y nodejs && \
    #fi && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# copy ssr config
COPY conf/nginx/server-side-render.conf /etc/nginx/conf.d/talebook.conf
COPY conf/supervisor/server-side-render.conf /etc/supervisor/conf.d/talebook.conf
COPY --from=builder /app-ssr/ /var/www/talebook/app/