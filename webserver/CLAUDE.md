# CLAUDE.md

本文件为 Claude Code 在 `webserver/` 目录中工作时提供指引。

## 常用命令

```bash
# 在项目根目录执行
make pytest                        # pytest tests -v --cov=webserver
pytest tests/test_main.py -v       # 运行单个测试文件
pytest tests/test_book.py::TestBookHandler::test_get -v  # 运行单个用例
make lint-py                       # flake8 代码检查
```

## 架构

### 请求处理

`main.py` 初始化 Tornado 应用，URL 路由在 `handlers/__init__.py:routes()` 中组装。

所有 handler 继承自 `handlers/base.py` 中的 `BaseHandler`。两个装饰器贯穿全局：

- **`@js`** — 将返回的 dict 序列化为 JSON 并附加 CORS 头；异常自动捕获并返回 `{"err": "exception", "msg": "..."}` 而不是 500。
- **`@auth`** — 检查登录状态，未登录返回 `{"err": "not_login"}`。
- **`@is_admin`**（在部分 handler 中）— 检查管理员权限。

新增接口的标准模式：
```python
class MyHandler(BaseHandler):
    @js
    @auth
    def get(self):
        # 直接 return dict，@js 负责序列化
        return {"err": "ok", "data": {...}}
```

### 配置系统

`loader.py` 提供单例 `CONF = loader.get_settings()`，所有模块在文件顶部导入它。配置按以下顺序叠加（后者覆盖前者）：

1. `settings.py` — 默认值，提交到仓库
2. `/data/books/settings/auto.py` — 管理员在 UI 中保存的配置，运行时写入
3. `manual.py`（可选）— 本地开发覆盖，不提交

### 数据模型

`models.py` 定义 SQLAlchemy 模型，管理 Talebook 自身的业务数据（**不是** Calibre 书库）：

| 模型 | 说明 |
|------|------|
| `Reader` | 用户账号、密码、Kindle 邮箱、权限等 |
| `Item` | 书籍的扩展属性（收藏者、访问/下载计数等） |
| `Message` | 用户消息/通知 |
| `ScanFile` | 扫描导入任务的文件记录 |
| `OpdsSource` | 外部 OPDS 订阅源 |

Calibre 书库数据通过 `BaseHandler.db`（Calibre DB 实例）读写，**不经过** SQLAlchemy。

### 异步任务

`services/async_service.py` 的 `AsyncService`（单例）用于长耗时后台任务（格式转换、邮件推送、扫描导入等）。使用方式：

```python
service = AsyncService()
queue = service.start_service(some_service_func)
queue.put((args, kwargs))
```

每个 service 对应一个守护线程，循环消费队列中的任务。

### 元数据插件

`plugins/meta/` 下每个插件（`douban`、`baike`、`youshu`、`tomato`）负责从外部数据源抓取书籍元数据，对外暴露统一接口，由 `handlers/meta.py` 统一调用。

### 工具类

`utils.py` 中的 `SimpleBookFormatter` / `BookFormatter` 负责将 Calibre book 对象转换为前端所需的 JSON 结构（拼接封面 URL、格式化日期等）。直接序列化 Calibre 对象时请使用这两个类，不要手动拼字段。

### 测试 Fixture

`tests/cases/` 包含预置的 Calibre 书库和 SQLite DB。`tests/test_main.py` 中定义了书籍 ID 常量（`BID_EPUB=1`、`BID_TXT=2` 等），对应 `tests/library/` 中的真实书籍文件。大多数集成测试通过 `tornado.testing.AsyncHTTPTestCase` 启动真实 Tornado 服务器，直接测试 HTTP 层。

## 测试要求

**每新增一个 feature，必须在 `tests/` 中添加对应的测试用例。**

### 测试类继承关系

根据场景选择基类：

| 基类 | 适用场景 |
|------|---------|
| `TestApp` | 无需登录的接口（公开页面、OPDS 等） |
| `TestWithUserLogin` | 需要普通用户登录的接口（已通过 `mock.patch` 模拟 `user_id=1`） |
| `TestWithAdminUser` | 需要管理员权限的接口 |

### 写法规范

```python
from tests.test_main import TestWithUserLogin, setUpModule as init

def setUpModule():
    init()  # 必须调用，初始化 Tornado app 和 mock

class TestMyFeature(TestWithUserLogin):
    def test_normal_case(self):
        d = self.json("/api/my/endpoint")   # 发 GET 并解析 JSON
        self.assertEqual(d["err"], "ok")

    def test_post_case(self):
        d = self.json("/api/my/endpoint", method="POST", body="param=value")
        self.assertEqual(d["err"], "ok")

    @mock.patch("webserver.handlers.book.SomeExternalCall")
    def test_with_mock(self, m):
        m.return_value = "fake"
        d = self.json("/api/my/endpoint")
        self.assertEqual(d["err"], "ok")
```

- 使用 `self.json(url, ...)` 代替 `self.fetch()`，它会断言状态码为 200 并自动解析 JSON。
- 外部调用（邮件、Calibre 写操作、异步任务）用 `@mock.patch` 隔离，不要在测试中产生真实副作用。
- 每个测试方法只验证一个行为，优先断言 `d["err"]` 的值。
