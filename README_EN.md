
[![GitHub License](https://img.shields.io/github/license/talebook/talebook?style=flat-square)](https://github.com/talebook/talebook/blob/master/LICENSE)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/w/talebook/talebook?logo=github&amp;style=flat-square&amp;label=commits)]()
[![Tests](https://github.com/talebook/talebook/actions/workflows/ci.yml/badge.svg)](https://github.com/talebook/talebook/actions/workflows/ci.yml)
[![Docker Build](https://github.com/talebook/talebook/actions/workflows/build.yml/badge.svg)](https://github.com/talebook/talebook/actions/workflows/build.yml)
[![Docker Pulls](https://img.shields.io/docker/pulls/talebook/talebook.svg)](https://hub.docker.com/r/talebook/talebook)


# Tale Book: My Calibre WebServer

[中文](README.md) | English

A better online books library management website built on Calibre + Vue

## A Simple and User-Friendly Personal Book Management System

This is a simple personal book management system based on Calibre, supporting **online reading**. Main features:
* Beautiful interface: A modern interface rebuilt with Nuxt 4 + Vue 3 + Vuetify, supporting both PC and mobile browsing, with multi-language (Chinese/English) support and light/dark theme switching;
* Multi-user support: Multi-user functionality with login via social platforms like ~~Douban~~ (deprecated), QQ, Weibo, Github, etc.; full user management and guest permission control, bcrypt password storage, image captcha and GeeTest verification;
* Online reading support: Built-in [candle-reader](https://github.com/talebook/candle-reader) for reading e-books in the browser, with automatic conversion for non-EPUB formats;
* Online library with book sources: Import [Legado](https://github.com/gedoor/legado)-style book sources to search and read web novels online, and save them to the library as txt/epub with one click; book source management UI with batch import, enable/disable and validity checks;
* Batch scan and import of books, with automatic metadata filling, recycle bin and batch deletion;
* Email push support: Manage multiple Kindle and other receiving devices, one-click push with automatic batch format conversion;
* OPDS support: Use apps like [KyBooks](http://kybook-reader.com/) for convenient reading; also browse and import books from other OPDS libraries;
* One-click installation, web-based initial configuration, easy website setup, with online update checking;
* Optimized file storage path for large libraries, can be categorized by alphabet or keep Chinese filenames;
* Quick update of book information: Search and import metadata in parallel from multiple sources (Douban, Baidu Encyclopedia, Xinhua Bookstore, Tomato Novel), with optional AI-powered book information recognition;
* Private mode support: Requires access code to enter the website, convenient for small group sharing; individual books can also be marked as private, visible only to yourself;

This project was previously named: calibre-webserver

## Highlights of the Past Year

* **Online library & book sources**: New Legado-style book source parsing engine — search and read web novels online and save them to the library as txt/epub; book source management UI (batch enable/disable/delete, validity checks, paginated search).
* **Frontend rewrite**: Upgraded from Nuxt 2 to Nuxt 4 + Vue 3 + Vuetify 3, full i18n (Chinese/English), light/dark theme switching, redesigned login/signup and book editing pages.
* **AI & multi-source metadata**: New AI-powered book information API; metadata sources extended to Douban, Baidu Encyclopedia, Xinhua Bookstore, Tomato Novel and Calibre, queried in parallel.
* **Online reading**: Default EPUB reader switched to [candle-reader](https://github.com/talebook/candle-reader); non-EPUB books are converted automatically before online reading.
* **Push & conversion**: New user device management with multi-device push; background batch conversion of Kindle-proprietary formats to EPUB.
* **OPDS import**: Add external OPDS sources, browse and batch import books, with failure retry and progress tracking.
* **Security hardening**: Automatic password migration from SHA256 to bcrypt; image captcha and GeeTest verification for login/signup/password reset; multiple security fixes (ReDoS, code injection, etc.).
* **Admin enhancements**: User management UI, guest upload permission control, recycle bin, batch book deletion, update checking, and a user feedback entry.
* **Infrastructure**: Upgraded to Tornado 6.5, switched to uv for Python dependency management, added database migration tooling; Docker base image consolidated into `talebook/talebook-base` for faster builds.


## Docker ![Docker Pulls](https://img.shields.io/docker/pulls/talebook/talebook.svg)

Deployment is relatively simple, it is recommended to use docker, image address: [dockerhub](https://hub.docker.com/r/talebook/talebook)

It is recommended to use `docker-compose`, download the configuration file [docker-compose.yml](docker-compose.yml) from the repository, and then execute the command to start.
If you want to modify the mounted directories or ports, please modify the docker-compose.yml file.

```
wget https://raw.githubusercontent.com/talebook/talebook/master/docker-compose.yml
docker-compose -f docker-compose.yml  up -d
```


If using native docker, then execute the command:

`docker run -d --name talebook -p &lt;local-port&gt;:80 -v &lt;local-data-directory&gt;:/data talebook/talebook`


For example

`docker run -d --name talebook -p 8080:80 -v /tmp/demo:/data talebook/talebook`



## FAQ

For frequently asked questions, please refer to the [User Guide](document/README.en_US.md). If you can't solve it, please submit an ISSUE.

For manual installation, please refer to the [Developer Guide](document/Development.en_US.md)

**If you think this project is great, welcome to support the author!**

**Disclaimer! This project does not maintain any public book library sites. Sites like joyeuse, wenyuange, etc. are built by users. Please do not consult me about related issues, I can't help!**


## Contributors
[![](https://contrib.rocks/image?repo=talebook/talebook)](https://github.com/talebook/talebook/graphs/contributors)


## Demo

[Demo site (password admin/demodemo)](http://demo.talebook.org)


Project demo screenshot below:
![](document/screenshot.png)
