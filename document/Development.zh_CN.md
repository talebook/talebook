本文主要面向开发者，希望搭建talebook开发环境，修改代码；或者希望手动搭建环境，满足网站定制化需求的人士。

前端开发
===========
本程序使用的前端框架是[Vue](https://cn.vuejs.org/)（[nuxtjs](https://www.nuxtjs.cn/guide) + [vuetify](https://vuetifyjs.com/zh-Hans/)），对于前端开发者，需要安装nodejs，熟悉vue框架即可，即可进行开发。参考命令如下：
```
$ cd talebook/app/
$ npm install
$ npm run dev
```

因为前端访问的后端地址是固化的（强制为浏览器URL下的/api/地址），所以要调试后台时，需要一些技巧进行设置。

可行的方案如下：
1. 配置一个NGINX服务，将 后台的URL 转发到后台server去；（例如你搭建好的talebook程序；或者其他可用的后端）
```
server {
    listen 80;
    server_name mydev.com;
    index index.php index.html index.htm;
    root        /data/code/talebook/app/dist;

    # 这里是后台的地址
    location ~ ^/(api|get|read|auth|opds)/ {
        proxy_pass http://127.0.0.1:8082;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Scheme $scheme;
        proxy_redirect off;
    }

    # 其他地址转发到nodejs上（端口在vue.config.js配置）
    location ~ / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Scheme $scheme;
        proxy_redirect off;
    }
}
```

2. 直接修改 `talebook.js` 文件中的 `backend()` 函数，把url地址hardcode改掉。（不太建议使用这种方案；会遇到CORS相关的问题，需要有更高的配置技巧）


后台开发：基于Docker容器开发
===========
但是想要修改后台代码的开发者，因此推荐使用docker运行容器作为开发环境，然后将本地python代码目录挂载进入容器内；修改完代码后，容器server会自动重启，简单又轻便。

建议学习下[docker-composer](https://docs.docker.com/compose/)这个工具（可以查阅些[中文学习材料](https://yeasy.gitbook.io/docker_practice/compose/introduction)）。然后，可以参考这个`docker-composer.yml`启动一个容器环境。其中，因为后台目录都在webserver里面，因此yml配置中指定了将该目录挂载进入了容器中。（可以依据自己实际情况进行修改）
```
version: "2.4"
services:
  # main service
  dev:
    image: talebook/talebook
    volumes:
      - /data/dev:/data # 这个是存储数据和日志的
      - /data/code/talebook/webserver:/var/www/talebook/webserver # 这个是代码
    ports:
      - "8082:80"  # 这个是端口
    depends_on:
      - douban-rs-api

  # optional, for meta plugins
  # please set "http://douban-rs-api" in settings
  douban-rs-api:
    image: ghcr.io/cxfksword/douban-api-rs
```

然后，就可以尽情修改代码啦！修改完毕后，可以从 `/data/dev/log/talebook.log` 中查看日志。如果因为语法异常导致程序挂掉，那么可以用`docker restart`来重启下。


手动搭建
===========

首先，介绍下本程序的主要架构和依赖：
```
talebook
  - app/          # 前端Web代码：依赖 nuxtjs + vuetifyjs -> vuejs -> nodejs
  - webserver/    # 后台服务代码：依赖 tornado -> calibre -> PyQt5
  - tests/        # 后台单元测试代码
  - conf/         # 外围程序的配置文件（nginx和supervisor）
  - docker/       # docker镜像启动脚本，以及预置书籍
```

其次，想要完整手动搭建talebook程序的话，推荐是在Linux环境下进行搭建；在Windows和Mac环境下搭建的话，我自己没有研究过，可以自行折腾。

### 总体说明

随着版本更新，本文档列举的命令可能不能及时更新；如果遇到问题，建议参考下 [talebook/calibre-docker项目中的Dockerfile](https://github.com/talebook/calibre-docker/blob/master/Dockerfile) ，搭建出基础的calibre环境；然后再根据本仓库的[Dockerfile](../Dockerfile)中的指令，安装nodejs和python的依赖。

### 准备目录
* /data/books/: 作为书库目录
* /var/www/: 作为代码目录

### 创建目录
提示：各个目录的配置项，都可以在配置文件```webserver/settings.py```找到，可以根据自己的需求进行调整。建议整套玩溜后再作调整

```
mkdir -p /data/log/nginx/
mkdir -p /var/www/talebook/
mkdir -p /data/books/{library,extract,upload,convert,progress,settings}
```

### 拉取代码
```
cd /var/www/
git clone https://github.com/talebook/talebook.git
cd talebook
```

### 安装calibre基础环境
建议参考：[talebook/calibre-docker项目中的Dockerfile](https://github.com/talebook/calibre-docker/blob/master/Dockerfile)

```
# 安装基础依赖
apt-get install -y tzdata
apt-get install -y --no-install-recommends python3-pip unzip supervisor sqlite3 git nginx python-setuptools curl

# 安装calibre库（会同时安装一大堆的PyQt5库）
apt-get install -y calibre
```

### 安装python库依赖
建议参考：[本仓库的Dockerfile](../Dockerfile)
```
# 如果服务器在中国境内，安装过程较慢，可以使用国内的镜像源
# pip3 config set global.index-url https://mirrors.tencent.com/pypi/simple/

# 安装依赖库
pip3 install -r /var/www/talebook/requirements.txt

# 安装单测工具
pip3 install flake8 pytest
```

### 安装nodejs
Linux发行版里自带的nodejs版本一般比较旧了，推荐安装到nodejs的LTS版本
```
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
RUN apt-get install -y nodejs
```
### 安装其他工具（可选）
建议参考：[本仓库的Dockerfile](https://github.com/talebook/talebook/blob/master/Dockerfile)
envsubst命令是用来生成nginx.conf配置的；如果你手动配置nginx，那么可以不安装此工具
```
# 安装 envsubst 命令
apt-get install -y gettext
```

### 编译打包Web代码
使用nodejs自带的npm工具，安装Web端的依赖库
```
# 如果服务器在中国境内，安装过程较慢，可以使用国内的镜像源
# npm config set registry http://mirrors.tencent.com/npm/

cd /var/www/talebook/app/
npm install
npm build
```
前端，搞定！打包出来的web文件都在 `/var/www/talebook/app/dist/` 目录中，后续会在nginx中配置使用。

### 创建书库
使用以下命令，基于代码自带的书籍，创建书库：
```
calibredb add --library-path=/data/books/library/  -r /var/www/talebook/docker/book/
```

或者可以从github下载talebook.org的书库（非常非常大，极其慢，需要个把小时）
```
git clone https://github.com/talebook/talebook-library.git /data/books/library
```

### 创建DB
执行以下命令，创建程序DB。
```
python /var/www/talebook/server.py --syncdb

# 这个是程序保存的用户配置项文件，预先创建下
touch /data/books/settings/auto.py

```

后端，搞定！依赖的环境和文件都准备完毕！

### 配置并启动服务
因为是python作为后端，我们选择supervisor作为服务管理器；当然，前端文件则由nginx进行服务。预设的配置文件在 `conf` 目录下都有提供，可以直接使用：
```
cd /var/www/talebook/
copy conf/nginx/talebook.conf /etc/nginx/conf.d/
copy conf/supervisor/talebook.conf /etc/supervisor/conf.d/
```

然后，启动程序
```
service nginx restart
service supervisor restart
```

服务启动完毕！快访问下 `http://127.0.0.1/` 试试看吧~

### 访问测试
* 打开 http://web_server_ip:8000/ 测试python启动是否正常；
* 打开 http://web_server_ip/ 测试nginx启动是否正常


问题排查
===============
### supervisord启动失败

如果有调整过supervisord里面的配置（例如端口、目录），一定要执行```sudo supervisorctl reload all```重新读取配置，不然是不会生效的，可能会导致启动失败。

如果提示```talebook:tornado-8000: ERROR(spawn error)```，那么说明环境没配置正确。
请打开日志文件```/data/log/talebook.log```查看原因，重点查看最后一次出现Traceback报错，关注其中```Traceback (most recent call last)```提示的错误原因。

### 网站能打开，但是提示```500: internal server error```

这种情况，一般是服务运行时出现异常，常见原因有目录权限没有配置正常、数据库没创建好、或者触发了某个代码BUG。

请打开日志文件```/data/log/talebook.log```查看原因，重点查看最后一次出现Traceback报错，关注其中```Traceback (most recent call last)```提示的错误原因，并提issue联系开发者排查。
