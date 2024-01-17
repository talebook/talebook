
# ----------------------------------------
# 第一阶段，拉取 node 基础镜像并安装依赖，执行构建
FROM node:16-alpine as builder
ARG BUILD_COUNTRY=""

LABEL Author="Rex <talebook@foxmail.com>"
LABEL Thanks="oldiy <oldiy2018@gmail.com>"

WORKDIR /app
RUN if [ "x${BUILD_COUNTRY}" = "xCN" ]; then \
    echo "using repo mirrors for ${BUILD_COUNTRY}"; \
    npm config set registry http://mirrors.tencent.com/npm/; \
    fi

COPY ["app/package.json", "app/package-lock.json*", "/app/"]
RUN npm install

# spa build mode will clear ssr build data, run it first
COPY app/ /app/
RUN npm run build-spa
RUN mv dist spa
RUN npm run build


# ----------------------------------------
# 第二阶段，构建环境
FROM talebook/calibre-docker as server
ARG BUILD_COUNTRY=""

# Set mirrors in china
RUN if [ "x${BUILD_COUNTRY}" = "xCN" ]; then \
    echo "using repo mirrors for ${BUILD_COUNTRY}"; \
    sed 's@deb.debian.org/debian@mirrors.aliyun.com/debian@' -i /etc/apt/sources.list; \
    pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/; \
    fi

# set default language
ENV LANG=C.UTF-8
ENV PUID=1000
ENV PGID=1000
ENV TZ=Asia/Shanghai
ENV SSR=OFF

# install envsubst gosu procps
RUN apt-get update -y && \
    apt-get install -y gettext gosu procps && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create a talebook user and change the Nginx startup user
RUN useradd -u 911 -U -d /var/www/talebook -s /bin/false talebook && \
    usermod -G users talebook && \
    groupmod -g 911 talebook && \
    sed -i "s/user www-data;/user talebook;/g" /etc/nginx/nginx.conf

# intall nodejs for nuxtjs server side render
RUN apt-get update -y && \
    curl -fsSL https://deb.nodesource.com/setup_16.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# install python packages
COPY ["requirements.txt", "/tmp/"]
RUN pip install -r /tmp/requirements.txt && \
    rm -rf /root/.cache

# ----------------------------------------
# 测试阶段
FROM server as test
RUN pip install flake8 pytest
COPY webserver/ /var/www/talebook/webserver/
COPY tests/ /var/www/talebook/tests/
CMD ["pytest", "/var/www/talebook/tests"]


# ----------------------------------------
# 生产环境
FROM server as production
ARG GIT_VERSION=""

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

COPY . /var/www/talebook/
COPY conf/nginx/ssl.* /data/books/ssl/
COPY conf/nginx/*.conf /etc/nginx/
COPY conf/supervisor/*.conf /etc/supervisor/
COPY --from=builder /app/spa/ /var/www/talebook/app/dist/
COPY --from=builder /app/.nuxt/ /var/www/talebook/app/.nuxt/
COPY --from=builder /app/node_modules/ /var/www/talebook/app/node_modules/
COPY --from=builder /app/src/static/ /var/www/talebook/app/dist/
COPY --from=builder /app/src/static/logo/ /data/books/logo/

RUN rm -f /etc/nginx/sites-enabled/default /var/www/html -rf && \
    cd /var/www/talebook/ && \
    echo "VERSION = \"$GIT_VERSION\"" > webserver/version.py && \
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
