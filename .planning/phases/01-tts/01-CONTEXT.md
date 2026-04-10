# Phase 1: TTS 基础框架 - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

建立 TTS 服务抽象层 + 文本提取 + 对话识别，支持切换不同 TTS 引擎，输出单一角色 TTS 音频。
- TTS 服务抽象层（插件式引擎）
- 从 epub/txt 提取文本内容
- 对话识别（引号/标签内的对白）
- 单一角色 TTS 音频生成
</domain>

<decisions>
## Implementation Decisions

### TTS 引擎
- **D-01:** 免费引擎选择 **Piper TTS**（跨平台、无需 GPU、MIT 许可证）
- **D-02:** 抽象层为接口 + 单引擎实现，引擎可切换

### 文本提取
- **D-03:** TXT 提取：复用现有 `TxtParser`（正则章节识别）
- **D-04:** epub 提取：**复用 calibre convert** 将 epub 转 txt/HTML，再复用现有 parser

### 对话识别
- **D-05:** Phase 1 对话识别粒度：**仅引号/标签识别**（不区分说话人，Phase 2 才做角色检测）

### 音频存储
- **D-06:** 音频存储：**本地文件 + 数据库记录**（按 book_id/ 目录组织）
- **D-07:** 音频格式：**MP3**（体积小、兼容性好，Piper 配合 piper-phonemizer + ffmpeg 输出 MP3）

### 生成方式
- **D-08:** 异步生成：后台线程处理，复用现有 `AsyncService` 模式

### Claude's Discretion
- Piper TTS 详细配置（voice selection、语速、音调）由实现时决定
- epub 转 txt 的临时文件清理策略由实现时决定
- 数据库记录字段结构由实现时设计
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `webserver/services/async_service.py` — 异步服务模式，`@AsyncService.register_service` 装饰器
- `webserver/services/extract.py` — TXT 提取服务，`ExtractService` 参考
- `webserver/plugins/parser/txt.py` — 现有 TXT parser，正则章节识别规则
- `webserver/services/convert.py` — calibre `ebook-convert` 调用方式
- `webserver/plugins/meta/tomato/api.py` — 插件模式参考（KEY + API class 导出方式）
- `webserver/plugins/meta/__init__.py` — 插件注册导出模式
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AsyncService` + `@register_service` 装饰器：异步任务队列模式，可直接复用
- `ExtractService`：TXT→content.json 提取流程可参考
- `TxtParser`：正则规则系统可扩展用于 epub 章节标题识别
- calibre `ebook-convert`：已有转换能力，复用于 epub→txt

### Established Patterns
- 服务层注册在 `webserver/services/__init__.py`
- 插件层导出：`plugins/meta/{name}/__init__.py` 导出 KEY + Api class
- 异步任务日志写入 progress 文件

### Integration Points
- 新 TTS 服务：`webserver/services/tts.py`（新建）
- 新 TTS 插件：`webserver/plugins/tts/piper/`（新建插件目录）
- epub 提取：复用 `ConvertService.do_ebook_convert()` 接口
- 数据库：book 表关联 audio 记录（结构待设计）
</code_context>

<specifics>
## Specific Ideas

- 复用 npm-style 思路：TTS 引擎作为插件插入抽象层
- Piper TTS 优点：本地运行、无需 GPU、MIT 许可证可商用
- epub 提取用 calibre convert 是因为现有系统已有，降低改动成本
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

### Reviewed Todos (not folded)
- "支持AI识别角色朗读书籍" (score=0.4) — 属于 Phase 2 角色检测范围，暂不讨论

</deferred>

---

*Phase: 01-tts*
*Context gathered: 2026-04-09*
