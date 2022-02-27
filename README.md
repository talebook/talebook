Tale Book: My Calibre WebServer
====================
[![GitHub License](https://img.shields.io/github/license/talebook/talebook?style=flat-square)](https://github.com/talebook/talebook/blob/master/LICENSE)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/w/talebook/talebook?logo=github&style=flat-square&label=commits)]()
[![Tests](https://github.com/talebook/talebook/actions/workflows/ci.yml/badge.svg)](https://github.com/talebook/talebook/actions/workflows/ci.yml)
[![Docker Build](https://github.com/talebook/talebook/actions/workflows/build.yml/badge.svg)](https://github.com/talebook/talebook/actions/workflows/build.yml)
[![Docker Pulls](https://img.shields.io/docker/pulls/talebook/calibre-webserver.svg)](https://hub.docker.com/r/talebook/talebook)

A better online books library management website built on Calibre + Vue

See a running instance of demo:

https://demo.talebook.org

简单好用的图书管理系统
===================
这是一个基于Calibre的简单的图书管理系统，支持**在线阅读**。主要特点是：
* 美观的界面：由于Calibre自带的网页太丑太难用，于是基于Vue，独立编写了新的界面，支持PC访问和手机浏览；
* 支持多用户：为了网友们更方便使用，开发了多用户功能，支持~~豆瓣~~（已废弃）、QQ、微博、Github等社交网站的登录；
* 支持在线阅读：借助[Readium.js](https://github.com/readium/readium-js-viewer) 库，支持了网页在线阅读电子书；
* 支持邮件推送：可方便推送到Kindle；
* 支持OPDS：可使用[KyBooks](http://kybook-reader.com/)等APP方便地读书；
* 支持一键安装，网页版初始化配置，轻松启动网站；
* 优化大书库时文件存放路径，可以按字母分类、或者文件名保持中文；
* 支持快捷更新书籍信息：支持从百度百科、豆瓣搜索并导入书籍基础信息；
* 支持私人模式：需要输入访问码，才能进入网站，便于小圈子分享网站；

**友情提醒：中国境内网站，个人是不允许进行在线出版的，维护公开的书籍网站是违法违规的行为！**

本项目曾用名：calibre-webserver

点此链接可查阅演示网站：

https://demo.talebook.org


Docker ![Docker Pulls](https://img.shields.io/docker/pulls/talebook/calibre-webserver.svg)
===================
部署比较简单，建议采用docker，镜像地址：[dockerhub](https://hub.docker.com/r/talebook/talebook)

执行命令
`docker run -d --name talebook -p <本机端口>:80 -v <本机data目录>:/data talebook/talebook`

例如
`docker run -d --name talebook -p 8080:80 -v /localdata:/data talebook/talebook`

---
常见问题请参阅[使用指南](document/README.zh_CN.md)
手动安装请参考[开发者指南](document/Development.zh_CN.md)


**感谢 oldiy 制作第一版的Docker镜像，并编写了这么多教程！**

+ [ [群晖安装教程](https://odcn.top/2019/02/26/2734/) ]

+ 加入Telegram讨论组 [[Join](https://t.me/joinchat/H3IoGkcnW6BGo51EJ9Kw5g)]

- 更新支持github登录

- 演示地址 [[ Demo ](https://demo.talebook.org)]

- 部分网友站点：[夜读客](https://www.yeduk.com/), [文渊阁](https://wenyuange.org), [网友站点](http://book.bwh.bai-long.cn/)

项目演示截图如下：
![](https://github.com/talebook/talebook/raw/develop/document/screenshot.png)

