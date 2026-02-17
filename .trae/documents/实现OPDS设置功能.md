# OPDS 设置功能开发计划

## 一、后端实现

### 1. 添加OPDS_ENABLED配置项
- 在 `webserver/settings.py` 中添加 `OPDS_ENABLED` 配置项，默认值为 `True`

### 2. 修改OPDS处理器
- 在 `webserver/handlers/opds.py` 中的所有处理器方法（如 `opds()`, `opds_navcatalog()`, `opds_search()` 等）添加开关检查
- 当 `OPDS_ENABLED` 为 `False` 时，返回 404 错误

### 3. 更新设置API
- 确保 `OPDS_ENABLED` 配置项能够通过管理接口读取和保存

## 二、前端实现

### 1. 添加OPDS设置模块
- 在 `app/pages/admin/settings.vue` 中新增「OPDS 设置」卡片
- 添加 OPDS 开关控件，绑定到 `settings.OPDS_ENABLED`

### 2. 修改导航菜单
- 在 `app/components/AppHeader.vue` 中的 `sys_links` 数组中，为 OPDS 介绍链接添加条件判断
- 当 `store.sys.allow.OPDS_ENABLED` 为 `False` 时，隐藏该链接

## 三、功能验证

### 1. 测试关闭状态
- 关闭 OPDS 开关后，访问 `/opds` 接口应返回 404
- OPDS 帮助入口应在侧边栏中隐藏

### 2. 测试开启状态
- 开启 OPDS 开关后，`/opds` 接口应正常返回数据
- OPDS 帮助入口应在侧边栏中显示

## 四、代码质量

### 1. 遵循现有代码风格
- 保持与现有代码一致的缩进、命名规范
- 使用现有组件和工具函数

### 2. 确保类型安全
- 确保前端和后端的数据类型匹配
- 处理可能的边界情况

## 五、实施步骤

1. 修改后端 `settings.py` 添加配置项
2. 修改后端 `opds.py` 添加开关检查逻辑
3. 修改前端 `settings.vue` 添加设置界面
4. 修改前端 `AppHeader.vue` 添加条件显示逻辑
5. 测试功能是否正常工作
6. 检查代码是否有语法错误或类型问题