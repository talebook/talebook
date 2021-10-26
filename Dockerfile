# 第一阶段，拉取 node 基础镜像并安装依赖，执行构建
FROM node:12-alpine as builder
MAINTAINER Rex <talebook@foxmail.com>

LABEL Maintainer="Rex <talebook@foxmail.com>"
LABEL Thanks="oldiy <oldiy2018@gmail.com>"

WORKDIR /app
COPY ["app/package.json", "app/package-lock.json*", "/app/"]
RUN npm config set registry http://mirrors.tencent.com/npm/
RUN npm install

COPY app/ /app/
RUN npm run build


# 第二阶段，构建环境
FROM talebook/calibre:2

# install python packages
RUN pip install wheel
RUN pip install -i https://mirrors.tencent.com/pypi/simple/ \
        Baidubaike==2.0.1 \
        jinja2==2.10 \
        social-auth-core==3.3.3 \
        social-auth-app-tornado==1.0.0 \
        social-auth-storage-sqlalchemy==1.1.0 \
        tornado==5.1.1 \
        bs4

# install envsubst
RUN sed 's@deb.debian.org/debian@mirrors.tencentyun.com/debian@' -i /etc/apt/sources.list
RUN apt-get update && apt-get install -y gettext

# prepare dirs
RUN mkdir -p /data/log/nginx/ && \
    mkdir -p /data/books/library  && \
    mkdir -p /data/books/extract  && \
    mkdir -p /data/books/upload  && \
    mkdir -p /data/books/convert  && \
    mkdir -p /data/books/progress  && \
    mkdir -p /data/books/settings && \
    mkdir -p /var/www/calibre-webserver/ && \
    chmod a+w -R /data/log /data/books /var/www

COPY . /var/www/calibre-webserver/
COPY conf/nginx/calibre-webserver.conf.template /etc/nginx/conf.d/
COPY conf/supervisor/calibre-webserver.conf /etc/supervisor/conf.d/
COPY --from=builder /app/dist/ /var/www/calibre-webserver/app/dist/

ARG GIT_VERSION=""
RUN rm -f /etc/nginx/sites-enabled/default /var/www/html -rf && \
    cd /var/www/calibre-webserver/ && \
    echo "VERSION = \"$GIT_VERSION\"" > webserver/version.py && \
    cp app/dist/index.html webserver/templates/index.html && \
    touch /data/books/settings/auto.py && \
    chmod a+w /data/books/settings/auto.py && \
    chmod a+w app/dist/index.html && \
    calibredb add --library-path=/data/books/library/ -r docker/book/ && \
    python server.py --syncdb  && \
    rm -f webserver/*.pyc && \
    mkdir -p /prebuilt/ && \
    mv /data/* /prebuilt/ && \
    chmod +x /var/www/calibre-webserver/docker/start.sh

ENV NGINX_CLIENT_MAX_BODY_SIZE="20m"

EXPOSE 80

VOLUME ["/data"]

CMD ["/var/www/calibre-webserver/docker/start.sh"]

