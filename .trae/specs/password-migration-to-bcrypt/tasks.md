# 密码存储从SHA256加盐哈希到bcrypt迁移 - 实施计划

## [x] Task 1: 更新 requirements.txt，添加bcrypt依赖
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 在项目根目录的 requirements.txt 中添加 bcrypt 库
  - 确保 bcrypt 库可以正常安装
- **Acceptance Criteria Addressed**: AC-1 (依赖项准备)
- **Test Requirements**:
  - `programmatic` TR-1.1: pip install -r requirements.txt 成功安装包含 bcrypt 在内的所有依赖
  - `programmatic` TR-1.2: 在 Python 中 import bcrypt 可以正常导入
- **Notes**: 

## [x] Task 2: 修改 models.py，实现bcrypt密码加密与验证
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 给 Reader 模型添加新的 bcrypt 相关方法
  - 更新 set_secure_password 方法，优先使用 bcrypt
  - 更新 get_secure_password 方法，支持自动检测哈希类型（bcrypt或旧SHA256+盐）并相应验证
  - 保留原 SHA256 验证逻辑，用于迁移
  - 使用 salt 列作为标记，例如设置为 "__bcrypt__" 来表示该用户已使用 bcrypt（因为 bcrypt 哈希本身包含盐值，不需要单独存储）
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-2.1: 新用户调用 set_secure_password 后 password 列是 bcrypt 哈希，salt 列设置为 "__bcrypt__"
  - `programmatic` TR-2.2: 使用 bcrypt 哈希的用户密码调用 get_secure_password 能正确验证
  - `programmatic` TR-2.3: 使用旧 SHA256+盐的用户密码调用 get_secure_password 仍然能正确验证
- **Notes**: 保持现有数据库结构不变

## [x] Task 3: 修改登录流程（SignIn 类），实现密码透明迁移
- **Priority**: P0
- **Depends On**: Task 2
- **Description**: 
  - 修改 webserver/handlers/user.py 中的 SignIn.post() 方法
  - 验证成功后，检查该用户是否仍使用旧 SHA256+盐（通过 salt 列判断）
  - 如果是旧的，立即调用 user.set_secure_password 重新加密密码为 bcrypt，并保存到数据库
  - 添加日志，记录迁移事件（user id, username, migration timestamp）
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-6
- **Test Requirements**:
  - `programmatic` TR-3.1: 旧 SHA256 用户第一次登录后 password 变为 bcrypt，salt 变为 __bcrypt__
  - `programmatic` TR-3.2: 已迁移用户后续登录不需要再迁移
  - `programmatic` TR-3.3: 日志中有该用户的迁移记录
- **Notes**: 迁移必须在用户验证登录成功后立即进行

## [x] Task 4: 确保注册、修改密码、重置密码功能直接使用bcrypt
- **Priority**: P1
- **Depends On**: Task 2
- **Description**: 
  - 检查并确保 SignUp 类调用 user.set_secure_password 正常工作
  - 检查并确保 UserUpdate 类修改密码调用 user.set_secure_password 正常工作
  - 检查并确保 UserReset 类重置密码调用 user.set_secure_password 正常工作
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-4.1: 新用户注册后使用 bcrypt 哈希
  - `programmatic` TR-4.2: 用户修改密码后使用 bcrypt 哈希
  - `programmatic` TR-4.3: 用户重置密码后使用 bcrypt 哈希
- **Notes**: 这些功能已经在使用 set_secure_password，主要是验证

## [x] Task 5: 编写单元测试和集成测试
- **Priority**: P1
- **Depends On**: Task 2, Task 3, Task 4
- **Description**: 
  - 编写或更新 tests/test_models.py，测试 Reader 的密码处理功能
  - 测试 bcrypt 哈希验证
  - 测试 SHA256 哈希验证
  - 测试透明迁移
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-5.1: 所有测试通过
  - `programmatic` TR-5.2: 测试覆盖 bcrypt 验证、SHA256 验证、迁移
- **Notes**: 检查是否已有 tests/test_models.py 文件

## [x] Task 6: 运行完整测试，确保系统功能正常
- **Priority**: P2
- **Depends On**: All Tasks
- **Description**: 
  - 运行项目完整测试
  - 确保无错误
- **Acceptance Criteria Addressed**: All ACs
- **Test Requirements**:
  - `programmatic` TR-6.1: pytest 运行完整测试套件，无错误
- **Notes**:
