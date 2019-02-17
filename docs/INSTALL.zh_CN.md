
部署方法
===========
## 环境
常见Linux环境均可部署；主要是依赖Python2.7（calibre依赖该版本）、Sqlite。这里选择 Ubuntu 16.04.5 LTS 进行部署

## 依赖包
```
sudo apt-get install python2.7 calibre python-pip nginx-extras unzip supervisor sqlite3 git
sudo pip install social-auth-app-tornado social-auth-storage-sqlalchemy tornado Baidubaike jinja
```

## 部署目录
* /data/books/: 作为书库目录
* /data/release/www/calibre.talebook.org/: 作为代码目录

部署代码和书库
==========
```
mkdir -p /data/log/
mkdir -p /data/release/www/calibre.talebook.org/
mkdir -p /data/books/{library,extract,upload,convert,progress}
cd /data/release/www/calibre.talebook.org/
git clone https://github.com/talebook/my-calibre-webserver.git

```
注意：如果要修改访问域名，可以不调整代码目录，只调整nginx中的配置即可。

创建基础书库
===========
请事先准备30本书籍。
使用以下命令创建书库：
```
calibredb add --library-path=/data/books/library/  -r  书籍目录
```

或者可以从github下载talebook.org的书库（非常非常大，会很慢）
```
git clone https://github.com/talebook/talebook-library.git /data/books/library
```


填写配置
============
## 申请社交网站应用账号
在配置文件中，可以看到有相关的配置信息：
```
/data/release/www/calibre.talebook.org/my-calibre-webserver/webserver/settings.py
```

## QQ邮箱推送
进入[网址](http://service.mail.qq.com/cgi-bin/help?subtype=1&&no=1001256&&id=28), 申请SMTP账号，用于给Kindle推送。
```
'smtp_server'                      : "smtp.talebook.org",
'smtp_username'                    : "sender@talebook.org",
'smtp_password'                    : "password",
```

创建DB
=============
```
python /data/release/www/calibre.talebook.org/my-calibre-webserver/server.py --syncdb
```

配置用户登录功能
=============
根据自己的诉求，可以配置为个人自用，或者允许网友使用社交网站账号登录。

## 配置自动登录（个人自用）
如果只是用于个人书籍、不会提供互联网服务的话，可以配置自动登录，免去社交网站的用户登录。
在```setttings.py```中找到 __auto_login__ 选项，将其设置为1。
```
'auto_login': 1
```

## 微博登录（多用户使用）
```
进入[网址](http://open.weibo.com/developers), 申请微博登录服务账号，填写到配置中。
'SOCIAL_AUTH_WEIBO_KEY'            : '',
'SOCIAL_AUTH_WEIBO_SECRET'         : '',
```

## QQ登录（多用户使用）
进入[网址](https://connect.qq.com/), 申请QQ登录服务账号，填写到配置中。
```
'SOCIAL_AUTH_QQ_KEY'               : '',
'SOCIAL_AUTH_QQ_SECRET'            : '',
```


启动服务
=============
## 配置supervisord
如果前面过程中，修改过代码目录路径，那么将 ``conf/supervisor/calibre-webserver.conf`` 中的路径调整一下，放到 ``/etc/supervisor/conf.d/`` 中。


## 配置NGINX
将 ``conf/nginx/talebook.org`` 中的域名修改为自己的网站域名，并放置到nginx的配置目录中。


## 启动
```
sudo supervisorctl reload all
sudo supervisorctl restart all
sud onginx -s start
```

访问
===============
* 打开 http://web_server_ip:8000/ 测试python启动是否正常；
* 打开 https://web_server_ip/ 测试nginx启动是否正常

