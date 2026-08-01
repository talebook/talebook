# Talebook 行业与竞品研究

## 先定义研究问题

把问题写成可支持决策的形式，例如：

- Talebook 应如何降低大书库首次入库的失败恢复成本？
- 哪些跨端阅读状态应该由服务端统一，哪些应留给客户端？
- 书单、书架、阅读状态和智能筛选如何避免概念重叠？

避免从“对比所有功能”开始。

## 选择竞品分组

每次从官方来源刷新，不把本列表当作完整或永久事实：

- Calibre 生态：[Calibre-Web](https://github.com/janeczku/calibre-web)。
- 自托管综合阅读：[Kavita](https://github.com/Kareadita/Kavita)、[BookLore](https://github.com/booklore-app/booklore)。
- 邻近媒体品类：[Komga](https://github.com/gotson/komga)、[Audiobookshelf](https://github.com/advplyr/audiobookshelf)。
- 客户端与协议生态：[KOReader](https://github.com/koreader/koreader)、[Readest](https://github.com/readest/readest)、[Legado](https://github.com/gedoor/legado)、[Anx Reader](https://github.com/Anxcye/anx-reader)、OPDS、WebDAV 和 Kobo Sync。

## 使用信源层级

1. 官方仓库、文档、API 和最新 Release：确认当前能力与定位。
2. 官方 Issue、Discussion 和公开路线图：观察痛点、需求热度和维护者取舍。
3. 用户评论、社区文章和演示：补充体验线索，但降低置信度并警惕版本过期。

为每个结论记录检索日期和直接链接。不要只按 Star、Issue 数或功能数量判断。

## 比较维度

| 维度 | 要回答的问题 |
| --- | --- |
| 目标用户 | 个人、家庭、小团队还是公共内容服务？谁负责运维？ |
| 核心任务 | 主要解决管理、阅读、漫画、有声、同步还是内容获取？ |
| 部署维护 | 安装、升级、备份、诊断、多架构和资源消耗如何？ |
| 入库与元数据 | 扫描、监听、去重、批处理、来源、人工确认和失败恢复如何？ |
| 发现与组织 | 搜索、筛选、智能书架、书单、系列和自定义字段如何？ |
| 阅读体验 | 格式、阅读模式、笔记、高亮、书签、统计和离线如何？ |
| 跨端生态 | OPDS、WebDAV、Kobo/KOReader、客户端、进度与身份如何？ |
| 多用户与权限 | 角色、内容范围、隐私和审计如何？ |
| 扩展与安全 | API、插件、脚本、外部请求和默认安全边界如何？ |
| 可持续性 | 社区、发布节奏、付费功能、维护负担和迁移成本如何？ |

## 输出结论

每个结论写成：`观察 → 用户意义 → Talebook 选择 → 风险/验证`，并区分：

- **借鉴**：改善核心闭环且维护成本可控。
- **差异化**：利用 Calibre、中文元数据/书源、自托管简洁或跨端生态形成优势。
- **不进入**：与定位冲突、法律/安全风险高或维护成本过大。

报告至少包含研究问题、范围与日期、竞品分组、关键证据、比较矩阵、Talebook 决策和待验证项。
