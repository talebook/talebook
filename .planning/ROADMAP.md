# Roadmap

## Phase Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|-----------------|
| 1 | TTS 基础框架 | TTS 服务抽象层 + 文本提取 + 对话识别 | TTS-01a, TTS-01b, TTS-02a, TTS-02b | 服务层可用，单引擎可生成 |
| 2 | 多角色朗读 | 角色检测 + 多角色分配 + 角色管理 | TTS-01c, TTS-02c, TTS-02d, TTS-02e, TTS-03 | 多角色音频可生成 |
| 3 | 中心服务 | 本地+云端集成，搜索下载分享 | TTS-01d, TTS-03b, TTS-03c, TTS-03d, TTS-03e, TTS-05, TTS-06 | 音频可分享到云端 |
| 4 | 元数据增强 | Amazon + Goodreads 国际数据源 | META-01, META-02 | 国际书籍可自动填充 |

## Phase 1: TTS 基础框架

**Goal:** 建立 TTS 服务抽象层，实现文本提取和对话识别

**Requirements:**
- TTS-01a: TTS 服务抽象层，支持多种引擎插件
- TTS-01b: 支持至少一种免费 TTS 引擎（Coqui XTTS 或 Piper TTS）
- TTS-02a: 从 epub/txt 提取文本内容
- TTS-02b: 对话识别（识别引号/标签内的对白）

**Success Criteria:**
1. TTS 服务抽象层可切换不同引擎
2. 文本内容可从 epub/txt 提取
3. 对话段落可被识别
4. 单一角色 TTS 音频可生成

## Phase 2: 多角色朗读

**Goal:** 实现 AI 角色识别和多角色声音分配

**Requirements:**
- TTS-01c: 支持付费 TTS 引擎（Azure TTS 或 Google Cloud TTS）
- TTS-02c: 角色检测（识别角色名、年龄、性别）
- TTS-02d: 角色信息存储（本地数据库）
- TTS-02e: 角色编辑界面（用户修正 AI 识别结果）
- TTS-03a: 为不同角色分配不同声音

**Success Criteria:**
1. AI 可识别书中角色（名称、年龄、性别）
2. 用户可编辑/修正角色信息
3. 不同角色可分配不同声音
4. 多角色 TTS 音频可生成

## Phase 3: 中心服务

**Goal:** 实现本地+云端集成，支持分享和下载

**Requirements:**
- TTS-01d: 引擎配置界面
- TTS-03b: 按章节/段落生成音频
- TTS-03c: 生成进度显示
- TTS-03d: 音频本地存储
- TTS-03e: 播放界面
- TTS-05: 中心服务集成
- TTS-06: 音频分享

**Success Criteria:**
1. 用户可选择 TTS 引擎并配置
2. 生成进度可见
3. 音频可本地存储和播放
4. 音频可分享到 tingshu.ai
5. 可从云端搜索/下载其他用户分享的音频

## Phase 4: 元数据增强

**Goal:** 支持国际数据源

**Requirements:**
- META-01: Amazon 元数据获取
- META-02: Goodreads 元数据获取

**Success Criteria:**
1. Amazon.com 元数据可获取
2. Goodreads 元数据可获取
3. 国际化书籍元数据自动填充

---

*Last updated: 2026-04-09*
