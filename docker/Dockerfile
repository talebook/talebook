FROM ubuntu:16.04
MAINTAINER Rex <talebook@foxmail.com>

LABEL Maintainer="Rex <talebook@foxmail.com>"
LABEL Thanks="oldiy <oldiy2018@gmail.com>"

RUN apt-get update  && \
	apt-get install bash calibre python-pip unzip supervisor sqlite3 git -y

RUN pip install jinja2==2.10 social-auth-app-tornado==1.0.0 social-auth-storage-sqlalchemy==1.1.0 tornado==5.1.1 Baidubaike==2.0.1  && \
	mkdir -p /data/log/  && \
	mkdir -p /data/books/  && \
	mkdir -p /data/release/www/calibre.talebook.org/  && \
	mkdir -p /data/books/library  && \
	mkdir -p /data/books/extract  && \
	mkdir -p /data/books/upload  && \
	mkdir -p /data/books/convert  && \
	mkdir -p /data/books/progress  && \
	chmod a+w -R /data/log /data/books /data/release  && \
	cd /data/release/www/calibre.talebook.org/  && \
	git clone https://github.com/talebook/calibre-webserver.git calibre-webserver && \
	calibredb add --library-path=/data/books/library/  -r  /data/release/www/calibre.talebook.org/calibre-webserver/docker/book/  && \
	python /data/release/www/calibre.talebook.org/calibre-webserver/server.py --syncdb  && \
	cp /data/release/www/calibre.talebook.org/calibre-webserver/conf/supervisor/calibre-webserver.conf /etc/supervisor/conf.d/  && \
	cp /data/release/www/calibre.talebook.org/calibre-webserver/docker/local_settings.py /data/release/www/calibre.talebook.org/calibre-webserver/webserver/ && \
	rm -f /data/release/www/calibre.talebook.org/calibre-webserver/webserver/*.pyc && \
	mkdir -p /prebuilt/ && \
	mv /data/* /prebuilt/ && \
	chmod +x /prebuilt/release/www/calibre.talebook.org/calibre-webserver/docker/start.sh

EXPOSE 8000

VOLUME ["/data/books"]

CMD ["/prebuilt/release/www/calibre.talebook.org/calibre-webserver/docker/start.sh"]

