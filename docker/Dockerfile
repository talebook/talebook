FROM ubuntu:18.04
MAINTAINER Rex <talebook@foxmail.com>

LABEL Maintainer="Rex <talebook@foxmail.com>"
LABEL Thanks="oldiy <oldiy2018@gmail.com>"

RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get install tzdata
RUN apt-get install python-pip unzip supervisor sqlite3 git nginx python-setuptools curl -y --no-install-recommends
RUN apt-get install calibre -y
RUN pip install wheel
RUN pip install jinja2==2.10 social-auth-app-tornado==1.0.0 social-auth-storage-sqlalchemy==1.1.0 tornado==5.1.1 Baidubaike==2.0.1

RUN mkdir -p /data/log/  && \
	mkdir -p /data/books/  && \
	mkdir -p /data/books/library  && \
	mkdir -p /data/books/extract  && \
	mkdir -p /data/books/upload  && \
	mkdir -p /data/books/convert  && \
	mkdir -p /data/books/progress  && \
	mkdir -p /data/release/www/calibre.talebook.org/calibre-webserver/ && \
	chmod a+w -R /data/log /data/books /data/release

COPY . /data/release/www/calibre.talebook.org/calibre-webserver/
COPY conf/supervisor/calibre-webserver.conf /etc/supervisor/conf.d/

#RUN curl -sL https://deb.nodesource.com/setup_12.x | bash -
RUN cd /data/release/www/calibre.talebook.org/calibre-webserver/ && \
    ( cat docker/setup_nodejs_12.x.sh | bash - ) && \
    apt-get install -y nodejs && \
    cd app && npm install . && npm run build

RUN cd /data/release/www/calibre.talebook.org/calibre-webserver/ && \
	calibredb add --library-path=/data/books/library/ -r docker/book/ && \
	python server.py --syncdb  && \
	rm -f webserver/*.pyc && \
	mkdir -p /prebuilt/ && \
	mv /data/* /prebuilt/ && \
	chmod +x /prebuilt/release/www/calibre.talebook.org/calibre-webserver/docker/start.sh

EXPOSE 8000

VOLUME ["/data"]

CMD ["/prebuilt/release/www/calibre.talebook.org/calibre-webserver/docker/start.sh"]

