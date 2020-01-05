FROM ubuntu:18.04
MAINTAINER Rex <talebook@foxmail.com>

LABEL Maintainer="Rex <talebook@foxmail.com>"
LABEL Thanks="oldiy <oldiy2018@gmail.com>"

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install tzdata && \
    apt-get install python-pip unzip supervisor sqlite3 git nginx python-setuptools curl -y --no-install-recommends && \
    apt-get install calibre -y

RUN pip install wheel
RUN pip install \
        Baidubaike==2.0.1 \
        jinja2==2.10 \
        social-auth-app-tornado==1.0.0 \
        social-auth-storage-sqlalchemy==1.1.0 \
        tornado==5.1.1


RUN mkdir -p /data/log/nginx/ && \
	mkdir -p /data/books/library  && \
	mkdir -p /data/books/extract  && \
	mkdir -p /data/books/upload  && \
	mkdir -p /data/books/convert  && \
	mkdir -p /data/books/progress  && \
	mkdir -p /data/books/settings && \
	mkdir -p /data/release/calibre-webserver/ && \
	chmod a+w -R /data/log /data/books /data/release

COPY . /data/release/calibre-webserver/
COPY conf/nginx/calibre-webserver.conf /etc/nginx/conf.d/
COPY conf/supervisor/calibre-webserver.conf /etc/supervisor/conf.d/

RUN rm -f /etc/nginx/sites-enabled/default

RUN ( curl -sL https://deb.nodesource.com/setup_12.x | bash - ) && \
    apt-get install -y nodejs
RUN cd /data/release/calibre-webserver/app && \
        npm install . && \
        npm run build && \
        rm -rf node_modules

RUN cd /data/release/calibre-webserver/ && \
    cp app/dist/index.html webserver/templates/index.html && \
    touch /data/books/settings/auto.py && \
    chmod a+w /data/books/settings/auto.py && \
    chmod a+w app/dist/index.html && \
	calibredb add --library-path=/data/books/library/ -r docker/book/ && \
	python server.py --syncdb  && \
	rm -f webserver/*.pyc && \
	mkdir -p /prebuilt/ && \
	mv /data/* /prebuilt/ && \
	chmod +x /prebuilt/release/calibre-webserver/docker/start.sh

EXPOSE 80

VOLUME ["/data"]

CMD ["/prebuilt/release/calibre-webserver/docker/start.sh"]

