本站基于 talebook(https://github.com/talebook/talebook) 项目，基于个人审美做了一点小改动。
主要是自用，有兴趣的朋友也可以拉取使用，配置和使用相关的文档请参考原项目。

docker安装命令：

docker run --name <容器名称> -d -p <外部端口>:80 -v <宿主机目录>:/data shenslink/talebook:latest


下面只介绍个人做的改动：
通过外挂CSS文件将界面改为Dark模式，页面配色和一些小细节做了一点修改。

CSS文件路径：

/books/logo/reset.css

我比较小白，不知道文件是否已经包含在镜像中，如果拉取镜像运行后没有，可在本项目根目录下载后放置到对应位置。
如果想要自己进一步调整CSS，仅需要在这个reset.css文件中修改即可。
