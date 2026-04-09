# Project Name

talebook 增强 — 智能个人图书馆

## What This Is

改进现有 talebook 项目，增强两个核心能力：
1. 元数据获取：支持更多国际数据源
2. AI 多角色朗读：本地 TTS 服务 + 中心分享平台

## Core Value

让用户更便捷地管理电子书，并享受智能朗读体验。

## Target Users

- 电子书爱好者
- 私人图书馆运营者
- 需要无障碍阅读辅助的用户

## In Scope

### 元数据增强
- 支持 Amazon.com 元数据获取
- 支持 Goodreads 元数据获取
- 保留现有数据源（豆瓣、百度百科、书伴等）

### AI 多角色朗读
- 本地 TTS 服务（支持多种引擎，免费+付费）
- 中心服务存储+分享音频（类似 npm publish 机制）
- 用户手动分享音频到中心服务
- 其他用户可搜索/下载已分享的音频

### 现有功能保持
- epub 等格式上传管理
- 基础元数据自动填充
- 多用户管理

## Out of Scope

- Bug 修复（图书导入、权限问题等）— 后续迭代
- SEO 增强
- 跨平台进度同步
- 鼠标滚轮翻页
- SSL 部署问题
- 中心服务（tingshu.ai）本身搭建 — 仅对接现有/第三方服务

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TTS 服务本地化 | 性能、隐私、多角色支持 | — Pending |
| 分享机制类 npm | 开发者熟悉的模式 | 用户手动 publish |
| 中心服务仅存储+分享 | 简化架构，专注核心功能 | — Pending |

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **META-01**: 支持 Amazon.com 元数据获取
- [ ] **META-02**: 支持 Goodreads 元数据获取
- [ ] **TTS-01**: 本地 TTS 服务，支持多引擎（免费+付费）
- [ ] **TTS-02**: 多角色识别（角色、年龄、性别）
- [ ] **TTS-03**: 中心服务音频分享（publish/download）
- [ ] **TTS-04**: 中心服务音频搜索和下载

### Out of Scope

- [Bug 修复] 图书导入问题 — 后续迭代
- [Bug 修复] 访客阅读权限 — 后续迭代
- [SEO] SEO 增强 — 后续迭代
- [同步] 跨平台进度同步 — 后续迭代
- [阅读体验] 鼠标滚轮翻页 — 后续迭代

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-09 after initialization*
