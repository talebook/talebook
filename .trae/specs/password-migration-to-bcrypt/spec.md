# 密码存储从SHA256加盐哈希到bcrypt迁移 - 产品需求文档

## Overview
- **Summary**: 本项目实现将Talebook系统的用户密码存储方式从SHA256加盐哈希算法迁移至更安全的bcrypt算法，同时提供透明的用户登录时自动迁移机制。
- **Purpose**: 提升系统密码存储的安全性，bcrypt算法相比SHA256更适合存储密码。
- **Target Users**: Talebook系统的所有用户和管理员。

## Goals
- 实现bcrypt算法的密码加密与验证功能
- 在用户登录时实现透明的SHA256→bcrypt密码迁移
- 保留SHA256加盐验证功能直至所有用户完成迁移
- 实现迁移状态跟踪与日志记录
- 添加完整的单元测试和集成测试

## Non-Goals (Out of Scope)
- 批量强制迁移所有用户密码（不登录的用户无需迁移）
- 修改用户注册或密码重置流程之外的其他功能
- 添加新的认证方法或改变现有登录UI
- 引入新的数据库迁移脚本进行离线迁移

## Background & Context
- 当前系统使用SHA256加盐哈希存储用户密码（models.py中定义）
- Reader模型使用password列存储哈希，salt列存储盐值
- 用户登录、注册等流程在user.py中实现
- 使用SQLAlchemy ORM进行数据库操作
- 需要引入bcrypt库用于密码处理

## Functional Requirements
- **FR-1**: 实现bcrypt密码加密与验证
- **FR-2**: 在用户登录时自动检测SHA256密码并验证
- **FR-3**: 验证成功后将用户密码自动转换为bcrypt存储
- **FR-4**: 支持用户注册时直接使用bcrypt
- **FR-5**: 支持用户修改密码时直接使用bcrypt
- **FR-6**: 支持重置密码时使用bcrypt
- **FR-7**: 记录密码迁移日志
- **FR-8**: 跟踪用户密码迁移状态

## Non-Functional Requirements
- **NFR-1**: 密码迁移完全透明，对用户无感知
- **NFR-2**: 安全性：密码处理过程中不暴露明文
- **NFR-3**: 性能：验证密码过程不明显降低用户体验

## Constraints
- **Technical**: 使用Python的bcrypt库，保持现有数据库结构不变或最小化修改
- **Business**: 所有现有用户必须正常登录
- **Dependencies**: 安装bcrypt Python库

## Assumptions
- 所有用户在登录时提供正确密码
- bcrypt库可以正常安装和使用
- 现有数据库可以处理更长的bcrypt哈希值（bcrypt生成的哈希值长度约60字符
- 现有的数据库列（password和salt列长度足够容纳bcrypt哈希值

## Acceptance Criteria

### AC-1: 实现bcrypt密码加密验证
- **Given**: 系统安装了bcrypt库
- **When**: 新用户注册时
- **Then**: 该用户的密码以bcrypt哈希值存储，salt列保留为特殊标识
- **Verification**: programmatic

### AC-2: 现有SHA256密码迁移
- **Given**: 用户使用SHA256加盐方式存储密码的旧密码
- **When**: 用户使用该密码登录
- **Then**: 登录成功后，该用户密码更新为bcrypt哈希值存储，且下次登录使用bcrypt验证
- **Verification**: programmatic

### AC-3: 兼容性保持
- **Given**: 用户密码已迁移为bcrypt后
- **When**: 用户再次使用原密码登录
- **Then**: 使用bcrypt验证成功登录成功
- **Verification**: programmatic

### AC-4: 密码修改
- **Given**: 用户已登录
- **When**: 用户修改密码
- **Then**: 使用bcrypt哈希存储
- **Verification**: programmatic

### AC-5: 密码重置
- **Given**: 用户通过密码重置请求
- **When**: 重置密码成功后
- **Then**: 使用bcrypt哈希存储
- **Verification**: programmatic

### AC-6: 日志记录
- **Given**: 用户登录密码迁移
- **When**: 用户密码从SHA256成功迁移为bcrypt
- **Then**: 系统日志中记录该次迁移记录（包括用户ID、迁移时间）
- **Verification**: programmatic

## Open Questions
- [ ] 是否需要在数据库中增加列专门标记迁移状态？
