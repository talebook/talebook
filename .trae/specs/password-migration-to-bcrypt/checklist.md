# 密码存储从SHA256加盐哈希到bcrypt迁移 - 验证清单

- [x] 已更新 requirements.txt 添加 bcrypt 依赖
- [x] 成功安装所有依赖（包括 bcrypt）
- [x] Reader 模型有 bcrypt 加密密码的方法
- [x] Reader 模型能正确验证 bcrypt 密码
- [x] Reader 模型仍能正确验证旧 SHA256+盐密码
- [x] SignIn 登录流程在用户第一次登录后成功将 SHA256 密码迁移为 bcrypt
- [x] 已迁移用户后续登录正常且无需再次迁移
- [x] SignUp 注册功能使用 bcrypt 存储密码
- [x] UserUpdate 修改密码功能使用 bcrypt 存储密码
- [x] UserReset 重置密码功能使用 bcrypt 存储密码
- [x] 系统日志记录密码迁移事件
- [x] 所有单元测试和集成测试通过
- [x] 系统功能完整无错误
