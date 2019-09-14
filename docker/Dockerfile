FROM ubuntu:16.04
MAINTAINER Rex <talebook@foxmail.com>

LABEL Maintainer="Rex <talebook@foxmail.com>"
LABEL Thanks="oldiy <oldiy2018@gmail.com>"

RUN apt-get update  && \
	apt-get install bash calibre python-pip unzip supervisor sqlite3 git -y

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

RUN cd app && npm install . && npm run dist

COPY . /data/release/www/calibre.talebook.org/calibre-webserver/
COPY conf/supervisor/calibre-webserver.conf /etc/supervisor/conf.d/

RUN cd /data/release/www/calibre.talebook.org/calibre-webserver/ && \
	cd app && npm install . && npm run dist && \
	calibredb add --library-path=/data/books/library/ -r docker/book/ && \
	python server.py --syncdb  && \
	rm -f webserver/*.pyc && \
	mkdir -p /prebuilt/ && \
	mv /data/* /prebuilt/ && \
	chmod +x /prebuilt/release/www/calibre.talebook.org/calibre-webserver/docker/start.sh

EXPOSE 8000

VOLUME ["/data"]

CMD ["/prebuilt/release/www/calibre.talebook.org/calibre-webserver/docker/start.sh"]

