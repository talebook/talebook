# Requirements

## v1 Requirements (Local TTS)

### TTS-01: 本地 TTS 服务
- [ ] **TTS-01a**: TTS 服务抽象层，支持多种引擎插件
- [ ] **TTS-01b**: 支持至少一种免费 TTS 引擎（Coqui XTTS 或 Piper TTS）
- [ ] **TTS-01c**: 支持付费 TTS 引擎（Azure TTS 或 Google Cloud TTS）
- [ ] **TTS-01d**: 引擎配置界面（选择默认引擎、API 密钥等）

### TTS-02: AI 角色识别
- [ ] **TTS-02a**: 从 epub/txt 提取文本内容
- [ ] **TTS-02b**: 对话识别（识别引号/标签内的对白）
- [ ] **TTS-02c**: 角色检测（识别角色名、年龄、性别）
- [ ] **TTS-02d**: 角色信息存储（本地数据库）
- [ ] **TTS-02e**: 角色编辑界面（用户修正 AI 识别结果）

### TTS-03: 多角色 TTS 生成
- [ ] **TTS-03a**: 为不同角色分配不同声音
- [ ] **TTS-03b**: 按章节/段落生成音频
- [ ] **TTS-03c**: 生成进度显示
- [ ] **TTS-03d**: 音频本地存储
- [ ] **TTS-03e**: 播放界面（播放/暂停/进度条）

### TTS-04: 角色管理
- [ ] **TTS-04a**: 查看书籍所有已识别角色
- [ ] **TTS-04b**: 编辑角色信息（名称、年龄、性别、音色）
- [ ] **TTS-04c**: 删除/重新识别角色

## v2 Requirements (Local + Cloud)

### TTS-05: 中心服务集成
- [ ] **TTS-05a**: 配置中心服务地址（tingshu.ai）
- [ ] **TTS-05b**: 查询中心服务是否有本书的音频
- [ ] **TTS-05c**: 从中心服务下载音频

### TTS-06: 音频分享
- [ ] **TTS-06a**: 手动分享本地音频到中心服务
- [ ] **TTS-06b**: 分享时填写元数据（书名、角色列表）
- [ ] **TTS-06c**: 查看已分享的音频列表

## v2 Requirements (Metadata)

### META-01: Amazon 元数据
- [ ] **META-01a**: 支持 Amazon.com API 获取元数据
- [ ] **META-01b**: 获取标题、作者、封面、描述

### META-02: Goodreads 元数据
- [ ] **META-02a**: 支持 Goodreads API 获取元数据
- [ ] **META-02b**: 获取评分、评论、相似书籍

## Out of Scope

- Bug 修复（图书导入、权限问题等）
- SEO 增强
- 跨平台进度同步
- 鼠标滚轮翻页
- SSL 部署问题

## Traceability

| REQ-ID | Phase | Description |
|--------|-------|-------------|
| TTS-01a | 1 | TTS 服务抽象层 |
| TTS-01b | 1 | 免费 TTS 引擎 |
| TTS-02a | 1 | 文本提取 |
| TTS-02b | 1 | 对话识别 |
| TTS-02c | 1 | 角色检测 |
| TTS-03a | 2 | 多角色声音分配 |
| TTS-03b | 2 | 分段音频生成 |
| TTS-04a | 2 | 角色管理界面 |
| TTS-05a | 3 | 中心服务配置 |
| TTS-06a | 3 | 音频分享 |
| META-01a | 4 | Amazon 集成 |
| META-02a | 4 | Goodreads 集成 |
