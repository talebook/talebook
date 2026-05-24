
[![GitHub License](https://img.shields.io/github/license/talebook/talebook?style=flat-square)](https://github.com/talebook/talebook/blob/master/LICENSE)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/w/talebook/talebook?logo=github&amp;style=flat-square&amp;label=commits)]()
[![Tests](https://github.com/talebook/talebook/actions/workflows/ci.yml/badge.svg)](https://github.com/talebook/talebook/actions/workflows/ci.yml)
[![Docker Build](https://github.com/talebook/talebook/actions/workflows/build.yml/badge.svg)](https://github.com/talebook/talebook/actions/workflows/build.yml)
[![Docker Pulls](https://img.shields.io/docker/pulls/talebook/talebook.svg)](https://hub.docker.com/r/talebook/talebook)


# Tale Book: My Calibre WebServer

A better online books library management website built on Calibre + Vue

## A Simple and User-Friendly Personal Book Management System

This is a simple personal book management system based on Calibre, supporting **online reading**. Main features:
* Beautiful interface: Since Calibre's built-in webpage is too ugly and hard to use, a new interface was independently written based on Vue, supporting both PC and mobile browsing;
* Multi-user support: To make it more convenient for users, multi-user functionality was developed, supporting login via social platforms like ~~Douban~~ (deprecated), QQ, Weibo, Github, etc.;
* Online reading support: With the help of [epub.js](https://github.com/intity/epubreader-js) library, supports reading e-books online in the browser (chapter review feature under development);
* Batch scan and import of books;
* Email push support: Easily push to Kindle;
* OPDS support: Use apps like [KyBooks](http://kybook-reader.com/) for convenient reading;
* One-click installation, web-based initial configuration, easy website setup;
* Optimized file storage path for large libraries, can be categorized by alphabet or keep Chinese filenames;
* Quick update of book information: Support searching and importing basic book information from Baidu Encyclopedia and Douban;
* Private mode support: Requires access code to enter the website, convenient for small group sharing;

This project was previously named: calibre-webserver


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

For frequently asked questions, please refer to the [User Guide](document/README.en_US.md]. If you can't solve it, please submit an ISSUE.

For manual installation, please refer to the [Developer Guide](document/Development.zh_CN.md]

**If you think this project is great, welcome to support the author!**

**Disclaimer! This project does not maintain any public book library sites. Sites like joyeuse, wenyuange, etc. are built by users. Please do not consult me about related issues, I can't help!**


## Contributors
[![](https://contrib.rocks/image?repo=talebook/talebook)](https://github.com/talebook/talebook/graphs/contributors)


## Demo

[Demo site (password admin/demodemo)](http://demo.talebook.org)


Project demo screenshot below:
![](document/screenshot.png)
