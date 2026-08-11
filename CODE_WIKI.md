# TaleBook Code Wiki

> 项目代码知识库 - 全面解析 TaleBook 个人图书管理系统

---

## 目录

- [项目概述](#项目概述)
- [整体架构](#整体架构)
- [目录结构](#目录结构)
- [技术栈](#技术栈)
- [核心模块详解](#核心模块详解)
- [数据库设计](#数据库设计)
- [API 路由](#api-路由)
- [前端架构](#前端架构)
- [服务层](#服务层)
- [插件系统](#插件系统)
- [配置管理](#配置管理)
- [部署与运行](#部署与运行)
- [开发指南](#开发指南)
- [测试](#测试)

---

## 项目概述

**TaleBook** 是一个基于 Calibre 的个人图书管理系统，提供美观的 Web 界面和在线阅读功能。

### 核心特性

- 📚 **图书管理**：基于 Calibre 的完整图书元数据管理
- 🌐 **多用户系统**：支持社交账号登录 (QQ、微博、GitHub 等)
- 📖 **在线阅读**：支持 EPUB、PDF、MOBI、AZW3 等格式
- 📧 **邮件推送**：支持推送到 Kindle 设备
- 📡 **OPDS 支持**：兼容 KyBooks 等阅读 APP
- 🌍 **多语言**：支持中文、英文界面
- 🔒 **私人模式**：支持访问码限制
- 🔍 **元数据填充**：自动从豆瓣、百度百科等获取图书信息

### 项目地址

- GitHub: https://github.com/talebook/talebook
- Docker Hub: https://hub.docker.com/r/talebook/talebook

---

## 整体架构

### 架构图

```
┌─────────────────────────────────────────────────────────┐
│                      Nginx (反向代理)                     │
│                    SSL / 静态资源服务                       │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌──────────────────────┐              ┌──────────────────────┐
│   前端 (Nuxt 3)       │              │   后端 (Tornado)      │
│   - Vue 3            │◄────API─────►│   - Python 3.11+     │
│   - Vuetify 3        │    Proxy     │   - Calibre 集成     │
│   - Pinia            │              │   - SQLAlchemy       │
│   - i18n             │              │                      │
└──────────────────────┘              └──────────────────────┘
                                                │
                    ┌───────────────────────────┼───────────────────┐
                    │                           │                   │
                    ▼                           ▼                   ▼
          ┌─────────────────┐        ┌─────────────────┐  ┌─────────────────┐
          │  用户数据库      │        │  Calibre 书库   │  │  外部服务       │
          │  (SQLite/MySQL) │        │  (SQLite)       │  │  - 豆瓣 API     │
          │  - 用户信息      │        │  - 图书元数据   │  │  - 百度百科     │
          │  - 权限配置      │        │  - 文件路径     │  │  - 邮件服务     │
          └─────────────────┘        └─────────────────┘  └─────────────────┘
```

### 请求流程

1. **用户请求** → Nginx (80/443 端口)
2. **静态资源** → Nginx 直接返回 (`app/dist/`)
3. **API 请求** → Nginx 代理到后端 Tornado (8080 端口)
4. **后端处理** → Tornado Handler → Service → Calibre/Database
5. **响应返回** → JSON/HTML → 前端渲染

---

## 目录结构

```
talebook/
├── app/                          # 前端应用 (Nuxt 4 + Vue 3)
│   ├── assets/                   # 静态资源
│   │   └── css/                  # 样式文件
│   ├── components/               # Vue 组件
│   │   ├── AppHeader.vue        # 顶部导航栏
│   │   ├── AppFooter.vue        # 页脚
│   │   ├── AppPress.vue         # 公告/新闻组件
│   │   ├── BookCards.vue        # 图书卡片列表
│   │   ├── BookCards_Small.vue  # 小图书卡片
│   │   ├── BookList.vue         # 图书列表
│   │   ├── ListBook.vue         # 列表图书组件
│   │   ├── MetaList.vue         # 元数据列表
│   │   ├── Upload.vue           # 上传组件
│   │   ├── Loading.vue          # 加载动画
│   │   ├── SSLManager.vue       # SSL 管理组件
│   │   ├── CaptchaWidget.vue    # 人机验证组件
│   │   ├── ImageCaptchaWidget.vue  # 图片验证码组件
│   │   └── OpdsImportDialog.vue # OPDS 导入对话框
│   ├── pages/                    # 页面路由 (Nuxt 自动路由)
│   │   ├── index.vue            # 首页
│   │   ├── login.vue            # 登录页
│   │   ├── signup.vue           # 注册页
│   │   ├── search.vue           # 搜索页
│   │   ├── library.vue          # 书库浏览
│   │   ├── recent.vue           # 最近上架
│   │   ├── hot.vue              # 热门图书
│   │   ├── nav.vue              # 导航页
│   │   ├── book/[bid]/          # 图书详情页
│   │   │   ├── index.vue        # 详情展示
│   │   │   ├── edit.vue         # 编辑页
│   │   │   └── readtxt.vue      # TXT 阅读
│   │   ├── [meta]/[name].vue    # 元数据分类页 (作者/出版社/标签等)
│   │   ├── author.vue           # 作者页
│   │   ├── publisher.vue        # 出版社页
│   │   ├── rating.vue           # 评分页
│   │   ├── tag.vue              # 标签页
│   │   ├── series.vue           # 系列页
│   │   ├── format.vue           # 格式页
│   │   ├── admin/               # 管理后台
│   │   │   ├── books.vue        # 图书管理
│   │   │   ├── users.vue        # 用户管理
│   │   │   ├── settings.vue     # 系统设置
│   │   │   └── imports.vue      # 批量导入
│   │   └── user/                # 用户中心
│   │       ├── detail.vue       # 个人信息
│   │       └── history.vue      # 阅读历史
│   ├── layouts/                  # 布局模板
│   │   ├── default.vue          # 默认布局
│   │   ├── blank.vue            # 空白布局
│   │   └── error.vue            # 错误页面
│   ├── i18n/locales/             # 国际化文件
│   │   ├── zh-CN.json           # 简体中文
│   │   └── en-US.json           # 英文
│   ├── stores/                   # Pinia 状态管理
│   │   └── main.ts              # 主状态
│   ├── plugins/                  # 插件
│   │   └── talebook.js          # 全局工具
│   ├── utils/                    # 工具函数
│   │   └── sslValidator.js      # SSL 验证工具
│   ├── test/                     # 前端测试
│   │   ├── components/          # 组件测试
│   │   └── e2e/                 # E2E 测试
│   ├── nuxt.config.ts            # Nuxt 配置
│   ├── package.json              # 前端依赖
│   ├── tsconfig.json             # TypeScript 配置
│   ├── vitest.config.ts          # Vitest 测试配置
│   └── playwright.config.ts      # Playwright E2E 配置
│
├── webserver/                    # 后端应用 (Tornado + Python)
│   ├── handlers/                 # HTTP 请求处理器
│   │   ├── __init__.py          # 路由注册
│   │   ├── base.py              # 基础 Handler
│   │   ├── book.py              # 图书相关 API
│   │   ├── user.py              # 用户相关 API
│   │   ├── admin.py             # 管理后台 API
│   │   ├── admin_opds_sources.py # OPDS 源管理
│   │   ├── meta.py              # 元数据 API
│   │   ├── opds.py              # OPDS 服务
│   │   ├── files.py             # 文件下载
│   │   ├── scan.py              # 扫描导入
│   │   ├── captcha.py           # 人机验证
│   │   ├── barcode.py           # 条形码扫描
│   │   └── audio.py             # 音频相关
│   ├── services/                 # 业务逻辑层
│   │   ├── __init__.py          # 服务初始化
│   │   ├── async_service.py     # 异步任务服务
│   │   ├── mail.py              # 邮件服务
│   │   ├── convert.py           # 格式转换
│   │   ├── extract.py           # 封面/目录提取
│   │   ├── autofill.py          # 元数据自动填充
│   │   ├── batch_add.py         # 批量添加
│   │   ├── batch_convert.py     # 批量转换
│   │   ├── scan.py              # 扫描服务
│   │   ├── opds_import.py       # OPDS 导入
│   │   └── background_service.py # 后台服务
│   ├── plugins/                  # 插件系统
│   │   ├── meta/                # 元数据插件
│   │   │   ├── douban.py        # 豆瓣
│   │   │   ├── baike/           # 百度百科
│   │   │   ├── xhsd/            # 书伴
│   │   │   ├── youshu/          # 有书
│   │   │   ├── tomato/          # 番茄小说
│   │   │   ├── calibre/         # Calibre
│   │   │   └── ai/              # AI 元数据
│   │   ├── parser/              # 解析插件
│   │   │   └── txt.py           # TXT 解析
│   │   ├── captcha/             # 验证码插件
│   │   │   ├── base.py          # 验证码基类
│   │   │   ├── image_captcha.py # 图片验证码
│   │   │   └── geetest.py       # 极验验证码
│   │   └── sending/             # 推送插件
│   │       └── uploader.py      # 推送上传
│   ├── base/                     # 基础模块
│   │   ├── __init__.py
│   │   └── trash_manager.py     # 回收站管理
│   ├── models.py                 # 数据库模型
│   ├── settings.py               # 配置管理
│   ├── constants.py              # 常量定义
│   ├── utils.py                  # 工具函数
│   ├── loader.py                 # 配置加载
│   ├── main.py                   # 主入口
│   ├── i18n.py                   # 国际化
│   ├── social_routes.py          # 社交登录路由
│   ├── version.py                # 版本信息
│   └── migrate_db.py             # 数据库迁移
│
├── tests/                        # 后端测试
│   ├── test_main.py             # 主流程测试
│   ├── test_admin.py            # 管理功能测试
│   ├── test_upload.py           # 上传测试
│   ├── test_douban.py           # 豆瓣 API 测试
│   ├── test_baike.py            # 百度百科测试
│   ├── test_service.py          # 服务测试
│   ├── test_models.py           # 模型测试
│   ├── test_utils.py            # 工具测试
│   ├── test_ssl_crt.py          # SSL 证书测试
│   ├── test_txt.py              # TXT 解析测试
│   └── test_scan.py             # 扫描测试
│
├── scripts/                      # 工具脚本
│   ├── check_i18n_translation_missing.py   # 检查缺失翻译
│   └── check_i18n_translation_useless.py   # 检查冗余翻译
│
├── conf/                         # 配置文件模板
│   ├── nginx/                    # Nginx 配置
│   │   ├── talebook.conf        # 主配置
│   │   └── server-side-render.conf
│   └── supervisor/               # Supervisor 配置
│       ├── talebook.conf        # Tornado 进程
│       └── server-side-render.conf
│
├── docker/                       # Docker 相关
│   ├── start.sh                 # 容器启动脚本
│   └── book/                    # 预置书籍
│
├── kubernetes/                   # Kubernetes 配置
│   ├── talebook-deployment.yaml
│   ├── talebook-service.yaml
│   ├── douban-rs-api-deployment.yaml
│   └── douban-rs-api-service.yaml
│
├── .github/                      # GitHub 配置
│   ├── workflows/               # GitHub Actions
│   │   ├── build.yml           # Docker 构建
│   │   ├── ci.yml              # CI 测试
│   │   └── update-candle-reader.yml
│   └── ISSUE_TEMPLATE/          # Issue 模板
│
├── .planning/                    # 项目规划
│   ├── codebase/                # 代码库分析
│   │   ├── ARCHITECTURE.md
│   │   ├── STACK.md
│   │   └── STRUCTURE.md
│   └── todos/                   # 待办事项
│
├── .trae/                        # Trae IDE 配置
│   ├── documents/               # 开发文档
│   └── rules/                   # 代码规则
│
├── server.py                     # 程序入口
├── pyproject.toml               # Python 项目配置
├── requirements.txt              # Python 依赖
├── Dockerfile                    # Docker 构建文件
├── docker-compose.yml            # Docker Compose 配置
├── Makefile                      # Make 命令
└── README.md                     # 项目说明
```

---

## 技术栈

### 后端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| **Python** | 3.11+ | 主要编程语言 |
| **Tornado** | 6.5 | 异步 Web 框架 |
| **SQLAlchemy** | Latest | ORM 框架 |
| **APSW** | 3.51.2+ | SQLite 封装 (Calibre 数据库) |
| **Social Auth** | 1.0.0 | OAuth 认证 |
| **Jinja2** | 3.1.6 | 模板引擎 |
| **Calibre** | 7.6+ | 图书管理核心 |
| **bcrypt** | Latest | 密码加密 |
| **psutil** | 7.0+ | 系统监控 |

### 前端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| **Vue** | 3.5.27+ | 前端框架 |
| **Nuxt** | 4.3.0+ | SSR 框架 (最新 Nuxt 4) |
| **Vuetify** | 3.x | UI 组件库 |
| **Pinia** | 3.0.4+ | 状态管理 |
| **TypeScript** | Latest | 类型系统 |
| **@nuxtjs/i18n** | 10.2.3+ | 国际化 |
| **@mdi/font** | 7.4.47 | 图标库 |

### 测试工具

| 工具 | 版本 | 用途 |
|------|------|------|
| **pytest** | 7.4.4 | 单元测试框架 |
| **pytest-cov** | 4.1.0+ | 覆盖率报告 |
| **Playwright** | 1.58.0+ | E2E 测试 |
| **Vitest** | 3.2.4+ | 前端测试 |
| **ESLint** | 9.39.2+ | 代码检查 |

### 外部集成

- **豆瓣 API** - 图书元数据
- **百度百科** - 百科全书条目
- **书伴 (xhsd)** - 图书信息
- **有书** - 图书元数据
- **番茄小说** - 小说元数据
- **Cravatar** - 用户头像
- **SMTP** - 邮件推送
- **Google Analytics** - 访问统计
- **AI API** - AI 元数据填充 (支持 OpenAI/本地模型)

---

## 核心模块详解

### 1. 主入口模块

#### `server.py`

程序启动入口，负责加载并启动 Tornado 服务。

```python
#!/usr/bin/env python3
import sys
import webserver.main

sys.exit(webserver.main.main())
```

#### `webserver/main.py`

核心启动模块，包含：

- **Monkey Patch**: 修复 Tornado 对 UTF-8 文件名的支持
- **配置初始化**: 加载 Calibre 路径、数据库等配置
- **数据库绑定**: 初始化 SQLAlchemy Session
- **路由注册**: 绑定所有 HTTP Handler
- **服务启动**: 启动 Tornado IOLoop

**关键函数**:

```python
def make_app():
    """创建 Tornado 应用实例"""
    # 1. 初始化数据库 Session
    engine = create_engine(auth_db_path, **CONF["db_engine_args"])
    ScopedSession = scoped_session(sessionmaker(bind=engine))
    models.bind_session(ScopedSession)
    
    # 2. 初始化 Calibre
    init_calibre()
    book_db = LibraryDatabase(os.path.expanduser(options.with_library))
    cache = book_db.new_api
    
    # 3. 注册路由
    app = web.Application(
        social_routes.SOCIAL_AUTH_ROUTES + handlers.routes(),
        **app_settings
    )
    return app

def main():
    """主函数"""
    patch_tornado_header_validation()  # Monkey patch
    app = make_app()
    http_server = tornado.httpserver.HTTPServer(app)
    http_server.listen(options.port, options.host)
    tornado.ioloop.IOLoop.instance().start()
```

### 2. Handler 模块 (HTTP 请求处理)

#### `webserver/handlers/__init__.py`

路由注册中心:

```python
def routes():
    from . import admin, book, captcha, files, meta, opds, scan, user
    
    routes = []
    routes += admin.routes()
    routes += scan.routes()
    routes += opds.routes()
    routes += book.routes()
    routes += user.routes()
    routes += meta.routes()
    routes += captcha.routes()
    routes += files.routes()
    return routes
```

#### `webserver/handlers/base.py`

所有 Handler 的基类，提供:

- 用户认证 (`@auth` 装饰器)
- 管理员检查 (`@is_admin` 装饰器)
- JSON 响应 (`@js` 装饰器)
- 数据库访问 (`self.session`)
- Calibre 缓存访问 (`self.cache`)

**核心类**:

```python
class BaseHandler(tornado.web.RequestHandler):
    """所有 Handler 的基类"""
    
    def user_id(self):
        """获取当前用户 ID"""
        return self.get_secure_cookie("user_id")
    
    def get_book(self, book_id):
        """从 Calibre 获取图书信息"""
        return self.cache.get_book(book_id)
    
    def render_json(self, data):
        """返回 JSON 响应"""
        self.set_header('Content-Type', 'application/json')
        self.write(json.dumps(data))
```

#### `webserver/handlers/book.py`

图书相关 API，包含:

- **Index**: 首页图书列表
- **BookDetail**: 图书详情
- **BookSearch**: 图书搜索
- **BookUpload**: 图书上传
- **BookDownload**: 图书下载
- **BookPush**: 推送到 Kindle
- **BookConvert**: 格式转换

**示例**:

```python
class BookDetail(BaseHandler):
    @js
    def get(self, id):
        """获取图书详情"""
        book = self.get_book(id)
        item = self.session.query(Item).filter(Item.book_id == int(id)).first()
        
        # 检查权限
        if item and item.scope == "private":
            user_id = self.user_id()
            if not user_id or item.collector_id != user_id:
                return {"err": "permission.denied"}
        
        return utils.BookFormatter(self, book).format()

class BookSearch(BaseHandler):
    @js
    def get(self):
        """搜索图书"""
        q = self.get_argument("q", "")
        ids = list(self.cache.search(q))
        books = [b for b in self.get_books(ids=ids)]
        return {"books": [utils.BookFormatter(self, b).format() for b in books]}
```

#### `webserver/handlers/admin.py`

管理后台 API，包含:

- **AdminUsers**: 用户管理
- **AdminBooks**: 图书管理
- **AdminSettings**: 系统设置
- **AdminImports**: 批量导入
- **AdminOpdsSources**: OPDS 源管理

**关键功能**:

```python
class AdminUsers(BaseHandler):
    @js
    @auth
    def get(self):
        """获取用户列表"""
        if not self.admin_user:
            return {"err": "permission.not_admin"}
        
        num = int(self.get_argument("num", 20))
        page = max(0, int(self.get_argument("page", 1)) - 1)
        
        query = self.session.query(Reader).order_by(Reader.access_time.desc())
        total = query.count()
        users = query.limit(num).offset(page * num).all()
        
        return {"users": {"items": [u.to_dict() for u in users], "total": total}}
    
    @js
    @auth
    def post(self):
        """创建/更新用户"""
        data = tornado.escape.json_decode(self.request.body)
        # ... 用户创建逻辑
```

#### `webserver/handlers/user.py`

用户相关 API:

- **Login**: 登录
- **Logout**: 登出
- **Signup**: 注册
- **UserProfile**: 个人信息
- **UserHistory**: 阅读历史
- **UserSettings**: 个人设置 (Kindle 邮箱等)

#### `webserver/handlers/meta.py`

元数据管理 API:

- **MetaFill**: 自动填充元数据
- **MetaSources**: 元数据源管理
- **MetaBatchFill**: 批量填充

#### `webserver/handlers/opds.py`

OPDS 目录服务，支持:

- OPDS 1.2 规范
- 分类浏览
- 搜索接口
- 图书下载

### 3. 数据库模型

#### `webserver/models.py`

定义所有数据库表结构:

**Reader (用户表)**:

```python
class Reader(Base, SQLAlchemyMixin):
    __tablename__ = "readers"
    
    id = Column(Integer, primary_key=True)
    username = Column(String(200))
    password = Column(String(200))
    salt = Column(String(200))
    name = Column(String(100))
    email = Column(String(200))
    avatar = Column(String(200))
    admin = Column(Boolean, default=False)
    active = Column(Boolean, default=True)
    permission = Column(String(100), default="")
    create_time = Column(DateTime)
    update_time = Column(DateTime)
    access_time = Column(DateTime)
    extra = Column(MutableDict.as_mutable(JSONType), default={})
    
    # 权限检查方法
    def can_login(self): return self.has_permission("l")
    def can_read(self): return self.has_permission("r")
    def can_upload(self): return self.has_permission("u")
    def can_download(self): return self.has_permission("d")
    
    # 密码管理
    def set_secure_password(self, raw_password):
        """使用 bcrypt 加密密码"""
        self.salt = "__bcrypt__"
        hashed = bcrypt.hashpw(raw_password.encode("UTF-8"), bcrypt.gensalt())
        self.password = hashed.decode("UTF-8")
```

**Item (图书扩展信息表)**:

```python
class Item(Base, SQLAlchemyMixin):
    __tablename__ = "items"
    
    book_id = Column(Integer, default=0, primary_key=True)
    count_guest = Column(Integer, default=0)       # 访客访问数
    count_visit = Column(Integer, default=0)       # 总访问数
    count_download = Column(Integer, default=0)    # 下载次数
    collector_id = Column(Integer, ForeignKey("readers.id"))  # 收藏者
    scope = Column(String(50), default="public")   # public/private
    book_type = Column(String(20), default="ebook")
    create_time = Column(DateTime)
    src_path = Column(String(4096))                # 原始文件路径
```

**ScanFile (扫描文件表)**:

```python
class ScanFile(Base, SQLAlchemyMixin):
    __tablename__ = "scanfiles"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(512))
    path = Column(String(1024))
    hash = Column(String(512), unique=True)
    status = Column(String(24))  # new/drop/ready/exist/imported/failed
    book_id = Column(Integer, default=0)
    create_time = Column(DateTime)
```

**OpdsSource (OPDS 源配置表)**:

```python
class OpdsSource(Base, SQLAlchemyMixin):
    __tablename__ = "opds_sources"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    url = Column(String(1000), nullable=False)
    description = Column(String(500))
    active = Column(Boolean, default=True)
    data = Column(MutableDict.as_mutable(JSONType), default={})
```

**Device (阅读设备表)**:

```python
class Device(Base, SQLAlchemyMixin):
    __tablename__ = "devices"
    
    id = Column(Integer, primary_key=True)
    reader_id = Column(Integer, ForeignKey("readers.id"))
    name = Column(String(64))
    device_type = Column(String(32), default="duokan")
    ip = Column(String(128))
    port = Column(Integer, default=12121)
    mailbox = Column(String(256))  # 邮箱地址 (Kindle)
```

---

## 数据库设计

### ER 图

```
┌─────────────────┐         ┌─────────────────┐
│     Reader      │         │   Calibre DB    │
│  (用户表)        │         │   (图书元数据)   │
├─────────────────┤         ├─────────────────┤
│ id (PK)         │         │ books (id, ...) │
│ username        │         └────────┬────────┘
│ password        │                  │
│ email           │                  │ book_id (FK)
│ admin           │         ┌────────▼────────┐
│ active          │         │      Item       │
│ permission      │         │  (扩展信息表)    │
│ extra (JSON)    │         ├─────────────────┤
└────────┬────────┘         │ book_id (PK,FK) │
         │                  │ collector_id    │
         │ 1:N              │ scope           │
         │                  │ count_*         │
         ▼                  └─────────────────┘
┌─────────────────┐
│     Message     │
│   (消息表)      │
├─────────────────┤
│ id (PK)         │
│ reader_id (FK)  │
│ title           │
│ status          │
│ data (JSON)     │
└─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│    ScanFile     │         │  OpdsSource     │
│  (扫描文件表)    │         │  (OPDS 源表)     │
├─────────────────┤         ├─────────────────┤
│ id (PK)         │         │ id (PK)         │
│ path            │         │ name            │
│ hash (UNIQUE)   │         │ url             │
│ status          │         │ active          │
│ book_id         │         │ data (JSON)     │
└─────────────────┘         └─────────────────┘

┌─────────────────┐
│     Device      │
│  (设备表)       │
├─────────────────┤
│ id (PK)         │
│ reader_id (FK)  │
│ device_type     │
│ ip/port         │
│ mailbox         │
└─────────────────┘
```

### 数据库初始化

```bash
# 创建所有表
python server.py --syncdb
```

代码实现:

```python
def user_syncdb(engine):
    """创建所有数据库表"""
    Base.metadata.create_all(engine)
```

---

## API 路由

### 路由分类

#### 图书相关 (`/api/`)

| 方法 | 路径 | 描述 | Handler |
|------|------|------|---------|
| GET | `/api/index` | 首页数据 | `Index` |
| GET | `/api/book/<id>` | 图书详情 | `BookDetail` |
| GET | `/api/search` | 搜索图书 | `BookSearch` |
| POST | `/api/book/upload` | 上传图书 | `BookUpload` |
| GET | `/api/book/<id>/download` | 下载图书 | `BookDownload` |
| POST | `/api/book/push` | 推送图书 | `BookPush` |
| GET | `/api/book/<id>/convert` | 格式转换 | `BookConvert` |

#### 用户相关 (`/api/user/`)

| 方法 | 路径 | 描述 | Handler |
|------|------|------|---------|
| POST | `/api/user/login` | 登录 | `Login` |
| GET | `/api/user/logout` | 登出 | `Logout` |
| POST | `/api/user/signup` | 注册 | `Signup` |
| GET | `/api/user/profile` | 个人信息 | `UserProfile` |
| POST | `/api/user/settings` | 更新设置 | `UserSettings` |
| GET | `/api/user/history` | 阅读历史 | `UserHistory` |

#### 管理相关 (`/api/admin/`)

| 方法 | 路径 | 描述 | Handler |
|------|------|------|---------|
| GET | `/api/admin/users` | 用户列表 | `AdminUsers` |
| POST | `/api/admin/users` | 创建用户 | `AdminUsers` |
| PUT | `/api/admin/users/<id>` | 更新用户 | `AdminUsers` |
| DELETE | `/api/admin/users/<id>` | 删除用户 | `AdminUsers` |
| GET | `/api/admin/books` | 图书列表 | `AdminBooks` |
| PUT | `/api/admin/settings` | 系统设置 | `AdminSettings` |
| GET | `/api/admin/imports` | 导入任务 | `AdminImports` |

#### 元数据相关 (`/api/meta/`)

| 方法 | 路径 | 描述 | Handler |
|------|------|------|---------|
| POST | `/api/meta/fill` | 填充元数据 | `MetaFill` |
| GET | `/api/meta/sources` | 元数据源列表 | `MetaSources` |

#### OPDS 相关 (`/opds/`)

| 方法 | 路径 | 描述 | Handler |
|------|------|------|---------|
| GET | `/opds/` | OPDS 根目录 | `OpdsIndex` |
| GET | `/opds/search` | OPDS 搜索 | `OpdsSearch` |
| GET | `/opds/catalog/<id>` | OPDS 分类 | `OpdsCategory` |
| GET | `/opds/book/<id>` | OPDS 图书详情 | `OpdsBook` |

#### 文件相关 (`/get/`, `/read/`)

| 方法 | 路径 | 描述 | Handler |
|------|------|------|---------|
| GET | `/get/<id>/<format>` | 下载文件 | `FileDownload` |
| GET | `/read/<id>/txt` | 在线阅读 | `ReadTxt` |
| GET | `/read/<id>/epub` | EPUB 阅读 | `ReadEpub` |
| GET | `/read/<id>/pdf` | PDF 阅读 | `ReadPdf` |

---

## 前端架构

### 技术栈

- **Nuxt 3**: SSR 框架
- **Vue 3**: Composition API
- **Vuetify 3**: Material Design UI
- **Pinia**: 状态管理
- **Vue I18n**: 国际化

### 目录结构

```
app/
├── components/          # 可复用组件
├── pages/              # 页面 (自动路由)
├── layouts/            # 布局模板
├── stores/             # Pinia Store
├── i18n/locales/       # 语言包
└── plugins/            # 插件
```

### 核心组件

#### `AppHeader.vue`

顶部导航栏，包含:

- Logo
- 搜索框
- 导航菜单 (首页/书库/最近/热门)
- 用户菜单 (登录/注册/个人中心/管理后台)
- 语言切换 (中文/英文)
- 深色模式切换

#### `AppFooter.vue`

页脚组件，包含:

- 友情链接
- 社交媒体链接
- 版权信息
- 自定义 HTML 内容

#### `AppPress.vue`

公告/新闻组件，显示:

- 系统公告
- 欢迎信息
- 自定义通知

#### `BookCards.vue`

图书卡片网格布局:

```vue
<template>
  <v-row>
    <v-col v-for="book in books" :key="book.id" cols="6" md="3">
      <v-card>
        <v-img :src="book.cover" />
        <v-card-title>{{ book.title }}</v-card-title>
        <v-card-subtitle>{{ book.author }}</v-card-subtitle>
      </v-card>
    </v-col>
  </v-row>
</template>
```

#### `BookCards_Small.vue`

小型图书卡片，用于侧边栏或紧凑布局。

#### `BookList.vue` / `ListBook.vue`

图书列表组件，支持:

- 列表视图
- 网格视图切换
- 排序 (评分/热度/出版时间)
- 分页加载

#### `MetaList.vue`

元数据列表组件，用于展示:

- 作者列表
- 出版社列表
- 标签列表
- 系列列表

#### `Upload.vue`

文件上传组件，支持:

- 拖拽上传
- 多文件上传
- 进度显示
- 格式校验 (EPUB/MOBI/PDF/TXT 等)
- 批量上传

#### `Loading.vue`

加载动画组件:

- 全屏加载
- 局部加载
- 自定义提示文字

#### `SSLManager.vue`

SSL 证书管理组件:

- 证书上传
- 证书状态显示
- HTTPS 配置

#### `CaptchaWidget.vue` / `ImageCaptchaWidget.vue`

人机验证组件:

- 图片验证码
- 极验验证码
- 验证回调

#### `OpdsImportDialog.vue`

OPDS 导入对话框:

- OPDS 源配置
- 导入进度显示
- 导入结果反馈

### 页面路由

#### 首页 (`/`)

- 随机推荐图书
- 最新上架图书
- 热门图书
- 系统公告

#### 书库浏览 (`/library`)

- 全部分类浏览
- 排序筛选 (评分/热度/出版时间)
- 分页加载
- 网格/列表视图切换

#### 最近上架 (`/recent`)

- 按上传时间倒序排列
- 分页加载

#### 热门图书 (`/hot`)

- 按访问/下载统计排序
- 支持时间范围筛选

#### 图书详情 (`/book/:bid`)

- 封面展示
- 元数据信息 (书名/作者/出版社/ISBN/出版日期等)
- 评分和评论
- 操作按钮 (下载/推送/阅读/编辑)
- 相关推荐
- 访问统计

#### 元数据分类页 (`/[meta]/[name]`)

动态路由，支持:

- `/author/:name` - 作者作品列表
- `/publisher/:name` - 出版社作品列表
- `/tag/:name` - 标签相关作品
- `/rating/:star` - 评分作品列表
- `/series/:name` - 系列作品列表
- `/format/:ext` - 指定格式作品

#### 搜索页 (`/search`)

- 关键词搜索
- 高级搜索 (作者/出版社/标签组合)
- 搜索结果分页

#### 管理后台 (`/admin/*`)

- **图书管理** (`/admin/books`): 图书列表/编辑/删除/批量操作
- **用户管理** (`/admin/users`): 用户列表/权限设置/激活状态
- **系统设置** (`/admin/settings`): 站点配置/邮件配置/社交登录配置
- **批量导入** (`/admin/imports`): 扫描导入/OPDS 导入/进度显示

#### 用户中心 (`/user/*`)

- **个人信息** (`/user/detail`): 头像/昵称/邮箱/Kindle 邮箱设置
- **阅读历史** (`/user/history`): 阅读记录/下载记录

#### 其他页面

- **登录页** (`/login`): 账号密码登录/社交账号登录
- **注册页** (`/signup`): 用户注册 (需开启注册功能)
- **导航页** (`/nav`): 网站导航
- **安装向导** (`/install`): 首次安装配置向导

### 状态管理 (Pinia)

```typescript
// stores/main.ts
import { defineStore } from 'pinia'

export const useMainStore = defineStore('main', {
  state: () => ({
    user: null,
    settings: {},
    lang: 'zh-CN'
  }),
  
  actions: {
    setUser(user) {
      this.user = user
    },
    updateSettings(settings) {
      this.settings = settings
    }
  }
})
```

### 国际化

语言包结构:

```json
{
  "titles": {
    "home": "首页",
    "library": "书库",
    "search": "搜索"
  },
  "buttons": {
    "login": "登录",
    "signup": "注册",
    "download": "下载"
  },
  "messages": {
    "uploadSuccess": "上传成功",
    "downloadReady": "下载已准备"
  }
}
```

使用方式:

```vue
<template>
  <h1>{{ $t('titles.home') }}</h1>
  <button>{{ $t('buttons.login') }}</button>
</template>
```

---

## 服务层

### 服务层

#### AsyncService (`services/async_service.py`)

异步任务管理服务，基于 Tornado IOLoop:

```python
class AsyncService:
    """异步任务服务"""
    
    def setup(self, book_db, session_factory):
        """初始化"""
        self.book_db = book_db
        self.session_factory = session_factory
        self.ioloop = tornado.ioloop.IOLoop.instance()
    
    def spawn(self, func, *args, **kwargs):
        """在后台线程执行任务"""
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=10)
        future = executor.submit(func, *args, **kwargs)
        future.add_done_callback(self._on_task_done)
        return future
```

#### MailService (`services/mail.py`)

邮件推送服务:

```python
class MailService:
    """邮件服务"""
    
    def send_book(self, user_email, book, format='epub'):
        """发送图书到邮箱"""
        # 1. 获取图书文件
        book_path = self.get_book_path(book.id, format)
        
        # 2. 构建邮件
        msg = MIMEMultipart()
        msg['Subject'] = CONF['push_title'] % {'title': book.title}
        msg['From'] = CONF['smtp_username']
        msg['To'] = user_email
        
        # 3. 添加附件
        with open(book_path, 'rb') as f:
            part = MIMEApplication(f.read(), Name=book_path)
            part['Content-Disposition'] = f'attachment; filename="{book_path}"'
            msg.attach(part)
        
        # 4. 发送
        server = smtplib.SMTP(CONF['smtp_server'])
        server.sendmail(CONF['smtp_username'], [user_email], msg.as_string())
```

#### ConvertService (`services/convert.py`)

格式转换服务:

- EPUB → MOBI
- EPUB → AZW3
- EPUB → PDF
- TXT → EPUB

```python
class ConvertService:
    """格式转换服务"""
    
    def convert(self, book_id, from_format, to_format):
        """转换图书格式"""
        # 使用 Calibre 的 ebook-convert 工具
        cmd = [
            'ebook-convert',
            input_path,
            output_path,
            '--output-profile', 'kindle'
        ]
        subprocess.run(cmd, check=True)
```

#### ExtractService (`services/extract.py`)

封面和目录提取服务:

```python
class ExtractService:
    """提取服务"""
    
    def extract_cover(self, book_id):
        """提取封面"""
        cover = self.cache.cover(book_id)
        if cover:
            return cover
        
        # 从文件中提取
        book_path = self.get_book_path(book_id)
        return extract_cover_from_file(book_path)
    
    def extract_toc(self, book_id):
        """提取目录"""
        book_path = self.get_book_path(book_id)
        return extract_toc_from_epub(book_path)
```

#### AutofillService (`services/autofill.py`)

元数据自动填充服务:

```python
class AutoFillService:
    """元数据自动填充"""
    
    def fill_metadata(self, book_id, sources=['douban', 'baidu']):
        """自动填充元数据"""
        book = self.cache.get_book(book_id)
        
        for source in sources:
            try:
                # 搜索元数据
                meta = self.search_metadata(book.title, book.author, source)
                if meta:
                    # 更新图书信息
                    self.update_book_metadata(book_id, meta)
                    break
            except Exception as e:
                logging.error(f"Failed to fill from {source}: {e}")
```

#### ScanService (`services/scan.py`)

扫描导入服务:

```python
class ScanService:
    """扫描服务"""
    
    def scan_directory(self, path):
        """扫描目录"""
        for root, dirs, files in os.walk(path):
            for file in files:
                file_path = os.path.join(root, file)
                hash_value = self.calculate_hash(file_path)
                
                # 检查是否已存在
                existing = self.session.query(ScanFile).filter_by(hash=hash_value).first()
                if existing:
                    continue
                
                # 创建扫描记录
                scan_file = ScanFile(file_path, hash_value, scan_id)
                self.session.add(scan_file)
        
        self.session.commit()
```

#### OPDSImportService (`services/opds_import.py`)

OPDS 导入服务:

```python
class OPDSImportService:
    """OPDS 导入服务"""
    
    def import_from_url(self, url):
        """从 OPDS URL 导入"""
        feed = self.fetch_opds_feed(url)
        entries = self.parse_opds_entries(feed)
        
        for entry in entries:
            # 下载图书文件
            file_path = self.download_book(entry.download_url)
            
            # 添加到书库
            book_id = self.add_to_calibre(file_path, entry.metadata)
            
            # 创建 Item 记录
            item = Item(book_id=book_id, scope='public')
            self.session.add(item)
        
        self.session.commit()
```

---

## 插件系统

### 元数据插件

#### 豆瓣插件 (`plugins/meta/douban.py`)

```python
class DoubanApi:
    """豆瓣 API 客户端"""
    
    def __init__(self):
        self.apikey = CONF['douban_apikey']
        self.baseurl = CONF['douban_baseurl']
    
    def search_book(self, title, author=''):
        """搜索图书"""
        q = f"{title} {author}".strip()
        url = f"{self.baseurl}/v2/book/search?q={q}&apikey={self.apikey}"
        response = requests.get(url)
        books = response.json()['books']
        
        return [self.format_book(b) for b in books]
    
    def get_book(self, isbn):
        """获取图书详情"""
        url = f"{self.baseurl}/v2/book/isbn/{isbn}?apikey={self.apikey}"
        response = requests.get(url)
        return self.format_book(response.json())
```

#### 百度百科插件 (`plugins/meta/baike/api.py`)

```python
class BaikeApi:
    """百度百科 API"""
    
    def search(self, keyword):
        """搜索百科"""
        url = f"https://baike.baidu.com/search?word={keyword}"
        response = requests.get(url)
        return self.parse_result(response.text)
    
    def get_summary(self, title):
        """获取摘要"""
        # 爬虫实现
        pass
```

#### 书伴插件 (`plugins/meta/xhsd/api.py`)

书伴 (XinHua ShuDian) 图书信息插件。

#### 有书插件 (`plugins/meta/youshu/api.py`)

有书图书元数据插件。

#### 番茄小说插件 (`plugins/meta/tomato/api.py`)

番茄小说元数据插件。

#### AI 元数据插件 (`plugins/meta/ai/api.py`)

基于 AI 的图书元数据填充插件。

### 解析插件

#### TXT 解析 (`plugins/parser/txt.py`)

```python
def get_content_encoding(content):
    """检测 TXT 文件编码"""
    return chardet.detect(content)['encoding']

def parse_txt(file_path):
    """解析 TXT 文件"""
    with open(file_path, 'rb') as f:
        content = f.read()
    
    encoding = get_content_encoding(content)
    text = content.decode(encoding)
    
    # 分章节
    chapters = split_chapters(text)
    
    return {
        'title': extract_title(text),
        'author': extract_author(text),
        'chapters': chapters
    }
```

### 验证码插件

#### 图片验证码 (`plugins/captcha/image_captcha.py`)

生成和验证图片验证码。

#### 极验验证码 (`plugins/captcha/geetest.py`)

集成极验 (Geetest) 人机验证服务。

### 推送插件

#### 推送上传 (`plugins/sending/uploader.py`)

支持推送到第三方设备 (如多看、微信读书等)。

---

## 配置管理

### 配置文件

#### `webserver/settings.py`

核心配置文件:

```python
settings = {
    # 基本配置
    'installed': False,
    'autoreload': True,
    
    # 路径配置
    'nuxt_env_path': '../app/.env',
    'html_path': '../app/dist',
    'with_library': '/data/books/library/',
    'user_database': 'sqlite:////data/books/calibre-webserver.db',
    
    # 安全配置
    'cookie_secret': 'cookie_secret',
    'cookie_expire': 7*86400,
    
    # 社交登录配置
    'SOCIAL_AUTH_WEIBO_KEY': '',
    'SOCIAL_AUTH_WEIBO_SECRET': '',
    'SOCIAL_AUTH_QQ_KEY': '',
    'SOCIAL_AUTH_QQ_SECRET': '',
    'SOCIAL_AUTH_GITHUB_KEY': '',
    'SOCIAL_AUTH_GITHUB_SECRET': '',
    
    # 邮件配置
    'smtp_server': 'smtp.talebook.org',
    'smtp_encryption': 'TLS',
    'smtp_username': 'sender@talebook.org',
    'smtp_password': 'password',
    
    # 元数据配置
    'douban_apikey': '',
    'auto_fill_meta': False,
    'META_SELECTED_SOURCES': ['douban', 'baidu', 'google', 'amazon', 'xinhua'],
    
    # AI 配置
    'ai_api_url': 'https://api.openai.com/v1/chat/completions',
    'ai_api_key': '',
    'ai_model': 'gpt-3.5-turbo',
    
    # 人机验证配置
    'CAPTCHA_PROVIDER': '',
    'CAPTCHA_ENABLE_FOR_REGISTER': False,
    'GEETEST_CAPTCHA_ID': '',
    'GEETEST_CAPTCHA_KEY': '',
    
    # 界面配置
    'HEADER': '欢迎访问...',
    'FOOTER': '本站基于 Calibre 构建...',
    'SIDEBAR_EXTRA_HTML': '<img src="/logo/link.png">',
}
```

#### `app/nuxt.config.ts`

前端配置文件:

```typescript
export default defineNuxtConfig({
    modules: ['vuetify-nuxt-module', '@pinia/nuxt', '@nuxtjs/i18n'],
    
    css: ['@mdi/font/css/materialdesignicons.css'],
    
    vuetify: {
        vuetifyOptions: {
            theme: {
                defaultTheme: 'light'
            }
        }
    },
    
    runtimeConfig: {
        public: {
            api_url: process.env.API_URL || 'http://127.0.0.1:8080',
            site_title: process.env.TITLE || 'talebook'
        }
    },
    
    routeRules: {
        '/api/**': { proxy: 'http://127.0.0.1:8080/api/**' },
        '/get/**': { proxy: 'http://127.0.0.1:8080/get/**' },
        '/read/**': { proxy: 'http://127.0.0.1:8080/read/**' }
    },
    
    i18n: {
        strategy: 'no_prefix',
        defaultLocale: 'zh-CN',
        locales: [
            { code: 'zh-CN', name: '简体中文', file: 'zh-CN.json' },
            { code: 'en-US', name: 'English', file: 'en-US.json' }
        ]
    }
})
```

### 环境变量

通过 Docker 环境变量配置:

```yaml
environment:
  - PUID=1000
  - PGID=1000
  - TZ=Asia/Shanghai
```

### 配置加载

```python
# loader.py
def get_settings():
    """加载配置"""
    settings = copy.deepcopy(default_settings)
    
    # 加载用户配置
    user_settings_path = CONF['settings_path']
    auto_settings = os.path.join(user_settings_path, 'auto.py')
    
    if os.path.exists(auto_settings):
        import importlib.util
        spec = importlib.util.spec_from_file_location('auto', auto_settings)
        user_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(user_module)
        
        # 合并配置
        for key in dir(user_module):
            if key.isupper():
                settings[key] = getattr(user_module, key)
    
    return settings
```

---

## 部署与运行

### Docker 部署 (推荐)

#### Docker Compose

```yaml
version: "2.4"

services:
  talebook:
    restart: always
    image: talebook/talebook
    volumes:
      - "${TALEBOOK_DATA_DIR:-./data}:/data"
    ports:
      - "8080:80"
      - "8443:443"
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Asia/Shanghai
    depends_on:
      - douban-rs-api
  
  douban-rs-api:
    restart: always
    image: ghcr.io/cxfksword/douban-api-rs
```

#### 启动命令

默认数据目录为 Compose 文件旁的 `./data`，其中包含配置、用户数据库和书库。生产环境不要使用可能被系统清理的 `/tmp`；需要复用已有目录时，在 `.env` 中设置 `TALEBOOK_DATA_DIR`。

```bash
# 下载 docker-compose.yml
wget https://raw.githubusercontent.com/talebook/talebook/master/docker-compose.yml

# 启动服务
docker-compose -f docker-compose.yml up -d

# 查看日志
docker-compose logs -f talebook
```

#### 原生 Docker

```bash
docker run -d \
  --name talebook \
  -p 8080:80 \
  -v "$PWD/data:/data" \
  talebook/talebook
```

### 手动部署

#### 1. 准备目录

```bash
mkdir -p /data/log/nginx/
mkdir -p /var/www/talebook/
mkdir -p /data/books/{library,extract,upload,convert,progress,settings}
```

#### 2. 拉取代码

```bash
cd /var/www/
git clone https://github.com/talebook/talebook.git
cd talebook
```

#### 3. 安装 Calibre

```bash
apt-get install -y tzdata
apt-get install -y --no-install-recommends python3-pip unzip supervisor sqlite3 git nginx python-setuptools curl
apt-get install -y calibre
```

#### 4. 安装 Python 依赖

```bash
pip3 install -r requirements.txt
pip3 install flake8 pytest
```

#### 5. 安装 Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt-get install -y nodejs
```

#### 6. 编译前端

```bash
cd app/
npm install
npm run generate
```

#### 7. 初始化数据库

```bash
# 添加预置书籍
calibredb add --library-path=/data/books/library/ -r docker/book/

# 创建数据库表
python server.py --syncdb

# 创建配置文件
touch /data/books/settings/auto.py
```

#### 8. 配置服务

```bash
cp conf/nginx/talebook.conf /etc/nginx/conf.d/
cp conf/supervisor/talebook.conf /etc/supervisor/conf.d/

service nginx restart
service supervisor restart
```

### 开发模式

#### 后端开发

```bash
# 启动开发容器 (代码挂载)
make dev

# 查看日志
tail -f /tmp/demo/log/talebook.log
```

#### 前端开发

```bash
cd app
npm install
npm run dev
```

访问 `http://localhost:3000`，API 会自动代理到后端容器 (`http://127.0.0.1:8080`)。

### 测试

#### 后端测试

```bash
# 代码检查
make lint-py
make lint-py-fix

# 单元测试
make pytest
```

#### 前端测试

```bash
cd app

# ESLint
npm run lint
npm run lint:fix

# 组件测试
npx vitest run test/components/

# E2E 测试
npx playwright test
```

---

## 开发指南

### 代码规范

#### Python

- 遵循 PEP 8
- 使用 Black 格式化 (line-length: 127)
- 使用 Ruff 进行 linting
- 类型注解 (Python 3.11+)

#### Vue/TypeScript

- 使用 Composition API
- 遵循 Vue 3 风格指南
- ESLint + Prettier 格式化

### 添加新 API

1. 在 `webserver/handlers/` 创建新的 Handler 类
2. 继承 `BaseHandler`
3. 使用 `@js` 装饰器返回 JSON
4. 在 `routes()` 中注册路由

示例:

```python
# webserver/handlers/hello.py
from webserver.handlers.base import BaseHandler, js

class HelloHandler(BaseHandler):
    @js
    def get(self):
        return {"message": "Hello, World!"}

def routes():
    return [
        (r"/api/hello", HelloHandler),
    ]

# 在 webserver/handlers/__init__.py 中添加
from . import hello
routes += hello.routes()
```

### 添加新页面

1. 在 `app/pages/` 创建 `.vue` 文件
2. Nuxt 会自动生成路由
3. 使用 `useFetch` 调用 API

示例:

```vue
<!-- app/pages/hello.vue -->
<template>
  <div>
    <h1>{{ message }}</h1>
  </div>
</template>

<script setup>
const { data } = await useFetch('/api/hello')
const message = computed(() => data.value?.message)
</script>
```

### 添加元数据源

1. 在 `webserver/plugins/meta/` 创建插件目录
2. 实现 `search()` 和 `get_book()` 方法
3. 在配置中添加源名称

### 数据库迁移

新增表后执行:

```bash
python server.py --syncdb
```

### 国际化

#### 后端

```python
from gettext import gettext as _

msg = _("Hello, World!")
```

翻译文件: `webserver/i18n/zh.json`

#### 前端

```vue
<template>
  <h1>{{ $t('titles.home') }}</h1>
</template>
```

翻译文件: `app/i18n/locales/zh-CN.json`

---

## 测试

### 测试类型

1. **单元测试**: 测试单个函数/类
2. **集成测试**: 测试模块间交互
3. **E2E 测试**: 端到端测试

### 运行测试

```bash
# 后端测试
pytest tests/
pytest tests/test_main.py -v
pytest --cov=webserver tests/

# 前端测试
cd app
npx vitest run
npx playwright test
```

### 测试用例示例

```python
# tests/test_main.py
import unittest

class TestMain(unittest.TestCase):
    def test_index(self):
        response = self.fetch('/api/index')
        self.assertEqual(response.code, 200)
        data = json.loads(response.body)
        self.assertIn('random_books', data)
    
    def test_search(self):
        response = self.fetch('/api/search?q=test')
        self.assertEqual(response.code, 200)
```

---

## 常见问题

### 1. 后端启动失败

查看日志:

```bash
tail -100 /data/log/talebook.log
```

常见原因:

- Calibre 未正确安装
- 数据库路径错误
- 端口被占用

### 2. 前端无法连接后端

检查 `nuxt.config.ts` 中的 `routeRules`:

```typescript
routeRules: {
    '/api/**': { proxy: 'http://127.0.0.1:8080/api/**' }
}
```

确保后端在 `8080` 端口运行。

### 3. 上传失败

检查:

- 文件权限
- `MAX_UPLOAD_SIZE` 配置
- 磁盘空间

### 4. 中文文件名乱码

Tornado 6.5 已应用 Monkey Patch 修复 UTF-8 文件名支持。

---

## 性能优化

### 后端优化

1. **数据库连接池**: SQLAlchemy 已配置池化
2. **缓存**: Calibre 自带缓存
3. **异步任务**: 使用 `AsyncService` 处理耗时操作

### 前端优化

1. **SSR**: Nuxt 服务端渲染
2. **懒加载**: 路由懒加载
3. **图片优化**: WebP 格式、懒加载

---

## 安全

### 密码安全

- 使用 bcrypt 加密
- 支持从 SHA256 迁移到 bcrypt

### 权限控制

- 基于角色的权限 (RBAC)
- 细粒度权限 (login/read/upload/download)

### XSS 防护

- Jinja2 自动转义
- Vue 自动转义

### CSRF 防护

- Tornado 内置 CSRF 保护
- Cookie 验证

---

## 贡献指南

### 提交流程

1. Fork 项目
2. 创建分支 (`git checkout -b feature/xxx`)
3. 提交更改 (`git commit -m 'Add xxx'`)
4. 推送到分支 (`git push origin feature/xxx`)
5. 创建 Pull Request

### 代码检查

提交前确保:

```bash
# Python
make lint-py-fix
make lint-py
make pytest

# Frontend
cd app
npm run lint:fix
npm test
```

---

## 附录

### 支持的文件格式

- **电子书**: EPUB, MOBI, AZW3, PDF, TXT, FB2, HTMLZ, CBR, CBZ
- **音频**: MP3, WAV, OGG, FLAC (用于有声书)

### 环境变量列表

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `PUID` | 1000 | 运行用户 ID |
| `PGID` | 1000 | 运行组 ID |
| `TZ` | Asia/Shanghai | 时区 |

### 端口列表

| 端口 | 用途 |
|------|------|
| 80 | HTTP (Nginx) |
| 443 | HTTPS (Nginx) |
| 8080 | Tornado (后端) |
| 3000 | Nuxt Dev (前端开发) |

### 外部链接

- [Calibre 文档](https://manual.calibre-ebook.com/)
- [Tornado 文档](https://www.tornadoweb.org/)
- [Nuxt 文档](https://nuxt.com/docs)
- [Vue 文档](https://vuejs.org/)
- [Vuetify 文档](https://vuetifyjs.com/)

---

## 更新日志

### v4.x (当前版本)

- 升级到 **Nuxt 4** + Vue 3.5
- 升级到 **Tornado 6.5**
- 支持多语言 (i18n) - 中文/英文
- 新增人机验证 (图片验证码/极验)
- 新增 OPDS 导入功能
- 新增 AI 元数据填充
- 新增番茄小说元数据支持
- 优化 SSL 证书管理
- 新增 barcode 条形码扫描
- 新增音频书支持
- 优化前端组件 (AppPress/MetaList 等)
- 新增 E2E 测试 (Playwright)
- 新增组件单元测试 (Vitest)

### v3.x

- 升级到 Nuxt 3
- 支持 AI 元数据填充
- 新增播客功能

---

## 许可证

MIT License

---

## 联系方式

- GitHub Issues: https://github.com/talebook/talebook/issues
- QQ 群：5lSfpJGsBq
- 爱发电：https://afdian.com/@talebook

---

*最后更新：2026-05-06*
