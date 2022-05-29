使用指南
===========
本文主要介绍talebook程序的使用说明，以及常见问题。如需手动安装或者提交PR，请参阅[开发者指南](./Development.zh_CN.md)。


NAS用户，可以参阅网友们写的指南：
[新手向NAS教程 篇十七：春节假期来搭建书库吧！免费开源有手就行！群晖Calibre部署教程！ ](https://post.smzdm.com/p/a3d7ox0k/)

常见配置指南
===========
本文主要介绍talebook程序的使用说明，以及常见问题。如需手动安装或者提交PR，请参阅[开发者指南](./Development.zh_CN.md)。

### 配置Kindle推送功能
以使用QQ邮箱推送为例，进入[QQ邮箱网址](http://service.mail.qq.com/cgi-bin/help?subtype=1&&no=1001256&&id=28), 申请SMTP账号，然后在管理员界面中配置即可。

请注意，用户名是必须包含邮箱后缀的（例如 `@qq.com`），例如 `demo@gmail.com`

### 配置用户登录功能
本程序支持用户注册及社交网站登录功能，按照管理员配置界面的说明，可以配置出符合自己需求的用户能力。

这里重点说明下常见的社交网站的API账号申请地址：
 - [微博开发者网址](http://open.weibo.com/developers)
 - [QQ互联登录网址](https://connect.qq.com/)
 - [Github]() 待补充

### Logo
*** 适用于v3.5.9及后续版本 ***

favicon和导航菜单中的二维码logo，放置在数据目录 ```/data/books/logo/```中，可直接使用新图片覆盖掉。


*** 适用于v3.5.8及更早版本 ***

favicon和导航菜单中的二维码logo，已经内置在了代码目录```/var/www/talebook/app/dist/img/```中。
 - favicon.ico: 网站图标文件
 - link.png: 二维码图片

如果需要定制修改这两个文件，请直接将使用新的文件覆盖即可。

若使用docker启动，则需要在docker启动时挂载这两个目录。例如：
```
docker run -d --name talebook -p 80:80 -v /data/calibre:/data -v /data/logo:/var/www/talebook/app/dist/img/ talebook/talebook
```

### 上传文件的大小
如果发现上传大文件时出现了失败，那么可能会有两种原因：

1. 如果是程序抛出异常（例如issue#61），那么是由于本项目中的tornado框架默认限制为100M。请进入管理员配置中修改调大对应的配置。

1. 如果明确提示`413`错误码，那么一般是由于nginx限制了上传大小。本项目中自带的nginx已配置了`client_max_body_size 0`，即不限制上传大小；
因此建议使用者排查下是否在本项目之外配置有其他的nginx代理转发，调整其中的配置。

### 如果配置豆瓣插件
需启用[cxfksword/douban-api-rs](https://github.com/cxfksword/douban-api-rs)服务，然后将对应的URL地址（例如 `http://10.0.0.1:8080` ）填写到高级配置项中。

对于使用docker-composer启动的（例如使用 `docker/docker-compose.yml` 配置），那么URL地址为： `http://douban-api-rs:80/` ，因为依据docker-composer的说明，服务名称可解析出对应的IP地址。

常见问题排查
===============
### supervisord启动失败

如果有调整过supervisord里面的配置（例如端口、目录），一定要执行```sudo supervisorctl reload all```重新读取配置，不然是不会生效的，可能会导致启动失败。

如果提示```talebook:tornado-8000: ERROR(spawn error)```，那么说明环境没配置正确。
请打开日志文件```/data/log/talebook.log```查看原因，重点查看最后一次出现Traceback报错，关注其中```Traceback (most recent call last)```提示的错误原因。

### 网站能打开，但是提示```500: internal server error```

这种情况，一般是服务运行时出现异常，常见原因有目录权限没有配置正常、数据库没创建好、或者触发了某个代码BUG。

请打开日志文件```/data/log/talebook.log```查看原因，重点查看最后一次出现Traceback报错，关注其中```Traceback (most recent call last)```提示的错误原因，并提issue联系开发者排查。

### 「静读天下」APP里访问书库会失败，怎么办？

这是因为静读天下APP不支持Cookie，导致登录会失败。在最新版系统中(v2.0.0-87-gf6d8f06)已经调整程序逻辑，可以无需登录就正常浏览，仅在下载时检测权限。为了避免弹出登录提示，请配置：
 - 关闭「私人图书馆」模式。
 - 打开「允许任意下载」（访客无需注册或登录）