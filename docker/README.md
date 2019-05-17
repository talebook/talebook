# My-calibre-webserver-docker

[![Docker Pulls](https://img.shields.io/docker/pulls/oldiy/my-calibre-webserver-docker.svg)][dockerhub] 

[dockerhub]: https://hub.docker.com/r/oldiy/my-calibre-webserver-docker

---

执行命令

`docker run -d --name calibre-webserver -p 8000:8000 -v <本机data目录>:/data  talebook/calibre-webserver`

---

**感谢 oldiy 制作第一版的Docker镜像，并编写了这么多教程！**

+ [ [群晖安装教程](https://odcn.top/2019/02/26/2734/) ]

+ [ [Blog](https://odcn.top) ]

+ 加入我的Telegram讨论组 [[Join](https://t.me/joinchat/H3IoGkcnW6BGo51EJ9Kw5g)]

- Docker默认为单机版tag：latest，如果需要多用户版可以使用tag：multi-user，其他问题请参考[安装文档](https://github.com/oldiy/my-calibre-webserver/blob/master/docs/INSTALL.zh_CN.md)进行修改，如果需要Kindel推送，需要设置smtp后重启容器才可以使用！

- 更新支持github登录

- 演示地址 [[ 奇艺书屋 ](https://www.talebook.org)]

- 这是一个基于Calibre的简单的图书管理系统，支持**在线阅读**。主要特点是：
- 由于Calibre自带的网页太丑太难用，于是独立编写了一个。
- 为了网友们更方便使用，开发了多用户功能，支持~~豆瓣~~（已废弃）、QQ和微博登录。
- 借助[Readium.js](https://github.com/readium/readium-js-viewer) 库，支持了网页在线阅读电子书。
- 支持从百度百科、豆瓣搜索并导入书籍基础信息。

部署比较简答，可以参考[安装文档](https://github.com/oldiy/my-calibre-webserver/blob/master/docs/INSTALL.zh_CN.md)

已添加Docker一键部署，可以查看[my-calibre-webserver-docker](https://hub.docker.com/r/oldiy/my-calibre-webserver-docker)

---

![](https://odcn.top/wp-content/uploads/2018/11/%E9%BB%91%E5%88%BA%E7%8C%AC%E6%A8%AA150.png)

