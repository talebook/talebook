
部署方法
===========
## 环境
常见Linux环境均可部署；主要是依赖Python、Sqlite。这里选择 Ubuntu 16.04.5 LTS 进行部署

## 依赖包
```
sudo apt-get install calibre python-pip nginx-extra
sudo pip install social-auth-app-tornado social-auth-storage-sqlalchemy tornado Baidubaike
```

## 部署目录
* /data/books/: 作为书库目录
* /data/release/www/calibre.talebook.org/: 作为代码目录

部署代码和书库
==========
```
mkdir -p /data/books/
mkdir -p /data/release/www/calibre.talebook.org/
mkdir /data/books/{library,extract,upload,convert,progress}
cd /data/release/www/calibre.talebook.org/
git clone https://github.com/talebook/my-calibre-server.git
cd /data/books/
git clone https://github.com/talebook/talebook-library.git
```
注意：如果要修改访问域名，可以不调整代码目录，只调整nginx中的配置即可。

填写配置
============
## 申请社交网站应用账号
在配置文件中，可以看到有相关的配置信息：
```
/data/release/www/calibre.talebook.org/my-calibre-server/webserver/settings.py
```

## QQ邮箱推送
进入[网址](http://service.mail.qq.com/cgi-bin/help?subtype=1&&no=1001256&&id=28), 申请SMTP账号，用于给Kindle推送。
```
'smtp_server'                      : "smtp.talebook.org",
'smtp_username'                    : "sender@talebook.org",
'smtp_password'                    : "password",
```

## 豆瓣登录(已废弃，豆瓣已不再提供登录服务)
进入[网址](https://developers.douban.com/apikey/)，申请豆瓣登录服务账号，填写到配置文件中。
```
'SOCIAL_AUTH_DOUBAN_OAUTH2_KEY'    : '',
'SOCIAL_AUTH_DOUBAN_OAUTH2_SECRET' : '',
```

## 微博登录
```
进入[网址](http://open.weibo.com/developers), 申请微博登录服务账号，填写到配置中。
'SOCIAL_AUTH_WEIBO_KEY'            : '',
'SOCIAL_AUTH_WEIBO_SECRET'         : '',
```

## QQ登录
进入[网址](https://connect.qq.com/), 申请QQ登录服务账号，填写到配置中。
```
'SOCIAL_AUTH_QQ_KEY'               : '',
'SOCIAL_AUTH_QQ_SECRET'            : '',
```

创建DB
=============
```
python /data/release/www/calibre.talebook.org/my-calibre-server/server.py --syncdb
```


启动服务
=============
## 配置supervisord
如果前面过程中，修改过代码目录路径，那么将 ``conf/supervisor/calibre-webserver.conf`` 中的路径调整一下，放到 ``/etc/supervisor/conf.d/`` 中。


## 配置NGINX
将 ``conf/nginx/talebook.org`` 中的域名修改为自己的网站域名，并放置到nginx的配置目录中。


## 启动
```
supervisorctl restart all
nginx -s start
```

访问
===============
* 打开 http://web_server_ip:8000/ 测试python启动是否正常；
* 打开 https://web_server_ip/ 测试nginx启动是否正常

