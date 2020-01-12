My Calibre WebServer
====================
A simple books library management website. Use Calibre as backend.

See a running instance of demo:

https://demo.talebook.org

简单的图书管理系统
===================
这是一个基于Calibre的简单的图书管理系统，支持**在线阅读**。主要特点是：
* 由于Calibre自带的网页太丑太难用，于是独立编写了一个。
* 为了网友们更方便使用，开发了多用户功能，支持~~豆瓣~~（已废弃）、QQ和微博登录。
* 借助[Readium.js](https://github.com/readium/readium-js-viewer) 库，支持了网页在线阅读电子书。
* 支持从百度百科、豆瓣搜索并导入书籍基础信息。

部署比较简单，建议采用docker；手动安装请参考[安装文档](document/INSTALL.zh_CN.md)


Docker
===================

[![Docker Pulls](https://img.shields.io/docker/pulls/talebook/calibre-webserver.svg)]

[dockerhub]: https://hub.docker.com/r/talebook/calibre-webserver

---

执行命令

`docker run -d --name calibre -p 80:80 -v <本机books目录>:/data/books  talebook/calibre-webserver`

---

**感谢 oldiy 制作第一版的Docker镜像，并编写了这么多教程！**

+ [ [群晖安装教程](https://odcn.top/2019/02/26/2734/) ]

+ [ [Blog](https://odcn.top) ]

+ 加入Telegram讨论组 [[Join](https://t.me/joinchat/H3IoGkcnW6BGo51EJ9Kw5g)]

- 更新支持github登录

- 演示地址 [[ Demo ](https://demo.talebook.org)]

- 部分网友站点：[夜读客](https://www.yeduk.com/), [文渊阁](https://wenyuange.org), [网友站点](http://book.bwh.bai-long.cn/)

![](https://github.com/talebook/calibre-webserver/raw/develop/document/screenshot.png)

