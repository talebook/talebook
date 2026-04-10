# Phase 1: TTS 基础框架 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 01-tts
**Areas discussed:** TTS引擎, 对话识别粒度, 存储方案, epub提取, 抽象层设计, 音频格式, 生成方式

---

## TTS引擎选择

| Option | Description | Selected |
|--------|-------------|----------|
| Piper TTS | 免费、无需 GPU、跨平台。适合 Phase 1 快速验证。 | ✓ |
| Coqui XTTS | 效果好但需 GPU，商业用途有许可证限制，Docker 部署复杂 | |
| 仅抽象层 | 先不集成具体引擎，只写抽象层 + Mock 实现，引擎后期再插拔 | |
| 暂不确定 | 先调研各引擎优缺点再决定 | |

**User's choice:** Piper TTS

---

## 对话识别粒度

| Option | Description | Selected |
|--------|-------------|----------|
| 仅引号/标签识别 | 只识别引号内文字为对话，不区分说话人。实现简单，Phase 1 够用 | ✓ |
| 基础说话人推断 | 尝试从上下文推断说话人，但 AI 识别角色是 Phase 2 的事 | |
| 暂不做对话识别 | Phase 1 先不做对话识别，仅提取纯文本 | |

**User's choice:** 仅引号/标签识别

---

## 音频存储方案

| Option | Description | Selected |
|--------|-------------|----------|
| 本地文件 + 数据库记录 | 保持与现有文件存储一致，按 book_id/ 目录组织 | ✓ |
| 数据库 BLOB 存储 | 保存为二进制到数据库，方便管理但单文件大时有问题 | |
| 仅指定根目录 | 指定存放根目录，其他由实现决定 | |

**User's choice:** 本地文件 + 数据库记录

---

## epub提取方案

| Option | Description | Selected |
|--------|-------------|----------|
| 包含 epub 提取 | Phase 1 就支持 epub 内容提取（需新增 epub parser） | |
| 仅 TXT | Phase 1 只做 TXT 提取，epub 放到 Phase 2 或后续 | ✓ |
| 先调研再定 | 先调研 calibre 已有 epub→txt 能力，看能否复用 | |

**User's choice:** 仅 TXT

---

## epub解析实现

| Option | Description | Selected |
|--------|-------------|----------|
| 复用 calibre convert | 复用 calibre 的 ebook-convert 将 epub 转 txt/HTML，再复用现有 parser | ✓ |
| 新增 epub parser | 自己写 epub 解析（解析 epub 的 XML 结构），更可控但工作量大 | |
| 先转 HTML 再解析 | ebook-convert 转 html，再解析 html | |

**User's choice:** 复用 calibre convert

---

## TTS抽象层设计

| Option | Description | Selected |
|--------|-------------|----------|
| 接口 + 单引擎实现 | 接口 + Piper 实现，引擎可切换，Phase 1 验证可用 | ✓ |
| 仅接口+Mock | 接口 + Mock/TTS stub，引擎实现放 Phase 2 | |
| 多引擎插件架构 | 支持同时注册多个引擎，调用时按优先级选用 | |

**User's choice:** 接口 + 单引擎实现

---

## 音频格式

| Option | Description | Selected |
|--------|-------------|----------|
| MP3 | 体积小、播放兼容性好，Pipeline 成熟 | ✓ |
| WAV | 无损、可直接加工，但体积大 | |
| OGG | 体积最小，但 Piper 默认可能不支持 | |

**User's choice:** MP3

---

## TTS生成方式

| Option | Description | Selected |
|--------|-------------|----------|
| 异步生成 | 后台线程处理，用户不阻塞。可复用现有 AsyncService 模式 | ✓ |
| 同步生成 | 前端轮询/长连接，适合小段文字测试 | |
| 先同步后期改 | 先做同步快速验证，后期再改异步 | |

**User's choice:** 异步生成

---

## Claude's Discretion

- Piper TTS 详细配置（voice selection、语速、音调）由实现时决定
- epub 转 txt 的临时文件清理策略由实现时决定
- 数据库记录字段结构由实现时设计

## Deferred Ideas

- "支持AI识别角色朗读书籍" (todo, score=0.4) — 属于 Phase 2 角色检测范围，暂不讨论
