# TaleBook 项目开发规范

## 🎯 核心原则：小步修改

**必须遵守:**
1. 每次只修改一小部分 (每个文件≤3 个修改点)
2. 大任务必须拆分成多个小步骤
3. 保持原有结构和格式
4. 每步完成后必须验证

## 📝 修改规范

### 翻译文件 (i18n)
- ✅ 每次只添加一个分类 (如先 title，再 button)
- ❌ 禁止一次性修改所有内容
- 每步验证 JSON 格式

### 代码文件
- ✅ 每次只修改一个函数/类
- ❌ 禁止同时修改多个不相关部分
- Python 文件需验证语法

### Vue 文件
- ✅ 先 template，再 script，分步验证
- ❌ 禁止同时修改多个部分

## 🔄 验证要求

**JSON 文件:**
```bash
python -c "import json; json.load(open('文件路径', encoding='utf-8'))"
```

**Python 文件:**
```bash
python -m py_compile 文件路径
```

## 🚫 禁止行为

1. 一次性大规模修改
2. 不验证就继续下一步
3. 破坏原有文件结构
4. 不读取文件就直接修改

## ✅ 推荐做法

1. 小步快跑，及时验证
2. 保持向后兼容
3. 遵循项目已有规范
4. 遇到问题及时沟通

## 项目规范

- 前端：`app/` | 后端：`webserver/`
- Python: PEP 8 | Vue: Composition API
- 翻译键：嵌套结构 `titles.addOpdsSource`
- 数据库：新增表需 `--syncdb`
