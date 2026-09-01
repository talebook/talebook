# Talebook Domain Language

Talebook 用统一语言描述书库、阅读与插件平台。本文只定义稳定的领域术语；接口、目录和实现约束属于开发指南。

## 插件平台

**插件（Plugin）**：
一个有独立身份、版本和实例级启停状态的产品能力单元，可以提供一种或多种能力。
_Avoid_: Provider、可安装扩展、功能卡片

**插件 ID（Plugin ID）**：
插件跨版本保持稳定的全局身份；重命名展示名称不改变插件 ID。
_Avoid_: 插件名称、连接名称、来源名称

**能力（Capability）**：
平台能够发现和调用的一类标准业务契约；业务入口依赖能力，而不依赖某个具体插件。
_Avoid_: 分类、按钮动作、插件类型

**Provider**：
一个插件对一组能力的具体实现角色；它不是所有插件必须继承的通用父类，也不等同于插件本身。
_Avoid_: Plugin、PluginProvider

**综合插件（Combo Plugin）**：
同时提供多个业务类别能力、无法归入单一类别的插件。
_Avoid_: integrations 插件、套餐插件、大杂烩插件

**额外功能（Extra Feature）**：
无法表达为平台标准能力、但仍由插件显式声明和授权的专属功能。
_Avoid_: 通用 execute、任意动作、隐藏接口

## 生命周期与所有权

**插件定义（Plugin Definition）**：
某个插件版本声明的身份、能力、权限和配置契约。
_Avoid_: 安装、连接、运行实例

**插件启用状态（Plugin Activation）**：
管理员决定一个内置插件是否可供当前 Talebook 实例使用的全局状态。
_Avoid_: 已安装、用户启用、连接健康

**连接（Plugin Connection）**：
插件与一个所有者之间的配置绑定，包含公开配置、凭据、授权范围和健康状态；停用插件时连接可以继续保留。
_Avoid_: 插件、账号、安装

**实例连接（Instance Connection）**：
由管理员维护、对当前 Talebook 实例共享的连接。
_Avoid_: 系统账号、租户连接、个人设置

**用户连接（User Connection）**：
由某个用户维护、只代表该用户外部账号或设备设置的连接。
_Avoid_: 租户连接、全局配置、共享账号

**插件运行（Plugin Run）**：
一次经过授权的插件调用及其可审计结果。
_Avoid_: 插件状态、后台服务、连接

**连接健康（Connection Health）**：
连接最近一次调用反映出的可用性，不代表插件是否启用或是否已经配置。
_Avoid_: 插件状态、启用状态、安装状态

## 业务能力

**元数据能力（Metadata Capability）**：
根据书名、作者、ISBN 等信息查询书籍描述信息与封面候选的能力。
_Avoid_: 书源、评价、文件内置元数据

**书源能力（Source Capability）**：
浏览、搜索、阅读或获取外部书籍内容的能力。
_Avoid_: Book Source Capability、元数据源、OPDS 输出服务、本地书库

**评价能力（Review Capability）**：
查询或导入外部评分、书评和章评的能力。
_Avoid_: 划线笔记、元数据评分字段

**划线笔记能力（Annotation Capability）**：
在 Talebook 与外部服务之间导入或发送划线、笔记和章评的能力。
_Avoid_: 评价能力、阅读进度

**书籍工具（Book Tool）**：
对 Talebook 中的书籍文件执行预览或转换处理的能力。
_Avoid_: 手工工作台、通用脚本、元数据插件

**发送到设备（Send to Device）**：
把用户选择的书籍文件发送到其阅读设备或接收邮箱的能力。
_Avoid_: 设备推送、全局设备类型、下载

## 划线笔记同步

**本地划线笔记（Local Annotation）**：
Talebook 保存并负责权限判定的权威划线、笔记或章评记录。
_Avoid_: 缓存、副本、BRS 笔记

**外部副本（Annotation Replica）**：
本地划线笔记在某个外部服务中的对应记录及同步状态。
_Avoid_: 权威笔记、第二份本地笔记
