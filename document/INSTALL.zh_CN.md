
部署方法
===========
## 环境
常见Linux环境均可部署；主要是依赖Python2.7（calibre依赖该版本）、Sqlite。这里选择 Ubuntu 16.04.5 LTS 进行部署

## 部署目录
* /data/books/: 作为书库目录
* /var/www/: 作为代码目录

## 安装依赖包
```
sudo apt-get install python2.7 calibre python-pip nginx-extras unzip supervisor sqlite3 git
sudo pip install social-auth-app-tornado social-auth-storage-sqlalchemy "tornado<6.0" Baidubaike jinja
```

## 部署代码
注意：如果要修改访问域名，可以不调整代码目录，只调整nginx中的配置即可。
各个目录的配置项，都可以在配置文件```webserver/settings.py```找到，可以根据自己的需求进行调整。
```
mkdir -p /data/log/
mkdir -p /var/www/
mkdir -p /data/books/{library,extract,upload,convert,progress}
cd /var/www/
git clone https://github.com/talebook/calibre-webserver.git

```

创建基础书库和DB
===========

## 创建书库
请事先准备30本书籍。
使用以下命令创建书库：
```
calibredb add --library-path=/data/books/library/  -r  书籍目录
```

或者可以从github下载talebook.org的书库（非常非常大，会很慢）
```
git clone https://github.com/talebook/talebook-library.git /data/books/library
```

## 创建DB
执行以下命令，创建程序DB。
```
python /var/www/calibre-webserver/server.py --syncdb
```


配置Kindle推送功能
============
## 使用QQ邮箱推送
进入[QQ邮箱网址](http://service.mail.qq.com/cgi-bin/help?subtype=1&&no=1001256&&id=28), 申请SMTP账号，用于给Kindle推送。

填写到```webserver/settings.py```配置文件中下述字段里：
```
'smtp_server'                      : "smtp.talebook.org",
'smtp_username'                    : "sender@talebook.org",
'smtp_password'                    : "password",
```

配置用户登录功能
=============
根据自己的诉求，可以配置为个人自用，或者允许网友使用社交网站账号登录。

## 配置自动登录（个人自用）
如果只是用于个人书籍、不会提供互联网服务的话，可以配置自动登录，免去社交网站的用户登录。
在```webserver/settings.py```中找到 __auto_login__ 选项，将其设置为1。
```
'auto_login': 1
```

## 申请社交网站应用账号（多用户使用）
在配置文件```webserver/settings.py```中，可以看到有相关的配置信息：

### 允许微博登录
进入[微博开发者网址](http://open.weibo.com/developers), 申请微博登录服务账号，填写到配置中。
```
'SOCIAL_AUTH_WEIBO_KEY'            : '',
'SOCIAL_AUTH_WEIBO_SECRET'         : '',
```

### 允许QQ登录
进入[QQ互联登录网址](https://connect.qq.com/), 申请QQ登录服务账号，填写到配置中。
```
'SOCIAL_AUTH_QQ_KEY'               : '',
'SOCIAL_AUTH_QQ_SECRET'            : '',
```


启动服务
=============
## 配置supervisord
如果前面过程中，修改过代码目录路径，那么将 ``conf/supervisor/calibre-webserver.conf`` 中的路径调整一下，放到 ``/etc/supervisor/conf.d/`` 中。

启动命令如下：
```
sudo supervisorctl reload all
sudo supervisorctl restart all
```

## 配置NGINX
将 ``conf/nginx/talebook.org`` 中的域名修改为自己的网站域名，并放置到nginx的配置目录中。

启动命令如下：
```
sudo nginx -s start
```

访问
===============
* 打开 http://web_server_ip:8000/ 测试python启动是否正常；
* 打开 https://web_server_ip/ 测试nginx启动是否正常

其他配置
==============

## Logo
favicon和导航菜单中的二维码logo，已经内置在了代码目录```/var/www/calibre-webserver/app/dist/img/```中。
 - favicon.ico: 网站图标文件
 - qq.png: 二维码图片

如果需要定制修改这两个文件，请直接将使用新的文件覆盖即可。

若使用docker启动，则需要在docker启动时挂载这两个目录。例如：
```
docker run -d --name calibre -p 80:80 -v /data/calibre:/data -v /data/logo:/var/www/calibre-webserver/app/dist/img/ talebook/calibre-webserver
```

## 上传文件的大小
默认情况下，系统中配置的文件上传大小为20MB，配置过大可能会消耗更多的系统资源，同时网络传输大文件时容易不稳定导致上传失败。

若需要调整该配置的大小（例如调整为30MB），可以通过调整docker启动的env变量进行设置，变量名称为 ```NGINX_CLIENT_MAX_BODY_SIZE```，例如：
```
docker run -d --name calibre -p 80:80 -v /data/calibre:/data -e NGINX_CLIENT_MAX_BODY_SIZE=30M talebook/calibre-webserver
```



问题排查
===============
* supervisord启动失败

如果有调整过supervisord里面的配置（例如端口、目录），一定要执行```sudo supervisorctl reload all```重新读取配置，不然是不会生效的，可能会导致启动失败。

如果提示```calibre:tornado-8000: ERROR(spawn error)```，那么说明环境没配置正确。
请打开日志文件```/data/log/calibre-webserver.log```查看原因，重点查看最后一次出现Traceback报错，关注其中```Traceback (most recent call last)```提示的错误原因。

* 网站能打开，但是提示```500: internal server error```

这种情况，一般是服务运行时出现异常，常见原因有目录权限没有配置正常、数据库没创建好、或者触发了某个代码BUG。

请打开日志文件```/data/log/calibre-webserver.log```查看原因，重点查看最后一次出现Traceback报错，关注其中```Traceback (most recent call last)```提示的错误原因，并提issue联系开发者排查。


