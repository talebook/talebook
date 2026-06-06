# 网络小说「保存到本地」进度展示方案（内存版）

日期：2026-06-07

## 背景与问题

网络书详情页 `/network/book?source_id=..&book_url=..` 点击「保存到本地」后，后端
`NetworkSave` 立即返回「已开始后台保存，完成后将通知您」，但页面上**没有任何地方能看到
进度**。用户希望在当前页面看到实时进度（如 `123/1546 章`）。

## 现状梳理：三套并存的异步任务机制

| 机制 | 用途 | 存储 | 是否可查 |
|------|------|------|---------|
| `SearchTaskService`（`services/booksource_search.py`） | **仅**网络书库搜索：线程池并发各书源，前端轮询 `/api/network/search/status?task_id=` 逐步拿结果 | 纯内存（TTL 清理） | 有专属 status 接口，前端在用，闭环完整 |
| `BackgroundService`（`services/background_service.py`） | **通用**后台任务台账：convert / batch_convert / autofill / scan / audio / ai_fill / title_sort / **online_save** | **纯内存**（`self._tasks = {}`，`BackgroundTask` 是普通类、非 ORM 模型，无任何持久化） | 有 `get_running_tasks/get_task/get_task_by_service`，但**全代码库零调用、无 HTTP 暴露、前端不读** |
| 站内信 `Message`（`/user/messages` → 顶栏铃铛） | 任务**完成**时的最终通知 | DB | 前端在用 |

关键结论：

- `online_save` 的进度**其实已经在写**（`save_service` 里 `update_progress(task.id, %, {total, done})`），
  但因为 BackgroundService 没有查询接口、前端也不读，所以**用户看不到**。
- BackgroundService **纯内存、零持久化**：进程一重启，所有任务记录（含中断痕迹）全部丢失，
  自增 id 也不跨重启唯一。

## 本次决策

- **存储：先用内存版的 BackgroundService**，不引入 DB 表。持久化（`AsyncTask` 表）作为后续独立一步。
- **范围：本次只接 `online_save`**，完成 book.vue 的进度展示。search / scan 等保持原样。

## 实施方案（内存版）

### 1. BackgroundService 增加「按 tag 查找」能力（最小改动，约 10 行）

- `BackgroundTask` 增加 `tag` 字段（默认 `""`）。
- `add_task(..., tag="")` 接受该参数。
- 新增 `get_task_by_tag(tag)`，返回该 tag 最新一条的 `to_dict()`。

`service_item` 仍保存可读标题（`[online]书名`），`tag` 专用于按页面参数定位。**不引入新表、不引入新 service。**

### 2. save_service 接入 tag、丰富 output

- `save_online_book` 增加 `source_id`、`book_url` 入参，构造
  `tag = "online_save:{source_id}:{book_url}"`，`add_task(..., tag=tag)`。
- 抓章循环里的 `update_progress` 保留每 20 章节流，`progress_data` 维持 `{total, done}`。
- 收尾：成功时把 `book_id` 写进完成那条 `progress_data`；失败 `complete_task(error_message=...)`（已支持，置 failed）。

### 3. HTTP（`handlers/network_library.py`）

- `NetworkSave` 返回值加上 `tag`：`{"err":"ok","tag":tag,"msg":...}`（handler 用 source_id+book_url 拼 tag，后台线程用同一个 tag）。
- 新增 `GET /api/network/save/status?source_id=&book_url=`：内部拼 tag → `BackgroundService().get_task_by_tag(tag)` →
  返回 `{"err":"ok","found":bool,"status","progress","done","total","book_id","error"}`。
- 风格对齐已有的 `/api/network/search/status`。

### 4. 前端 `app/pages/network/book.vue`

- 点「保存到本地」→ 拿 tag → 每约 1s 轮询 status，页面展示进度条 + `已保存 {done}/{total} 章`。
- `status=completed` → 显示「已保存」+ 本地书链接；`failed` → 显示错误信息。
- **进入 / 刷新页面**先查一次：有 running 任务就接着显示进度。
- 复用搜索页的 token 防串台 + `onBeforeUnmount` 停轮询写法。

### 5. 内存版已知局限（写进代码注释并告知用户）

- **后端重启会丢任务**：轮询将拿到 `found:false`。前端策略——之前在跑、突然查不到 → 停止轮询并提示
  「无法获取进度（可能已完成或服务重启），请查看站内通知」。最终结果有**站内信**兜底（成功/失败都会发 `Message`）。
- 用 tag 定位、不依赖自增 id，故 id 不跨重启唯一这点无影响。

### 6. 测试

- 后端：`BackgroundService.get_task_by_tag`；`NetworkSave` 返回 tag；`/network/save/status` 在有/无任务时的返回。
- 前端：e2e 用 mock 让 status 先返回进行中（done/total）再返回 completed，断言进度文案与完成态。

## 后续（本次不做）

- 把 BackgroundService 整体迁移为持久化的 `AsyncTask` 表（沿用此处的 `tag` / `output` 约定，平滑升级），
  并提供通用 `GET /api/async/tasks?tag=` 与全局「任务中心」页面。
- 视情况再把 SearchTaskService 也并入统一存储。

## 涉及文件

- `webserver/services/background_service.py`（+tag、+get_task_by_tag）
- `webserver/services/booksource/save_service.py`（构造 tag、收尾写 book_id/error）
- `webserver/handlers/network_library.py`（NetworkSave 返回 tag、新增 save/status 接口）
- `app/pages/network/book.vue`（进度 UI + 轮询）
- 对应前后端测试
