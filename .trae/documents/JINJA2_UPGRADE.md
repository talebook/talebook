# Jinja2 3.1.4 → 3.1.6 升级说明

## 升级概述

本次升级将 Jinja2 从 3.1.4 升级到 3.1.6，这是一个**强制的安全更新**，修复了两个高危沙盒逃逸漏洞。

## 升级原因

### 1. 关键安全修复（重要）

#### CVE-2025-27516（3.1.6 修复）

- **漏洞描述**：Jinja2 沙盒环境在与 `|attr` 过滤器交互时存在缺陷，攻击者可利用该过滤器获取字符串的 `format` 方法，绕过沙盒执行**任意 Python 代码**
- **CVSS 评分**：8.8 (High)
- **影响版本**：3.1.5 及更早版本
- **攻击场景**：应用渲染用户提供的模板内容（或模板名称来自外部输入）

#### CVE-2024-56326（3.1.5 修复）

- **漏洞描述**：攻击者可通过间接调用 `str.format`（例如通过存储的过滤器引用）来绕过沙盒限制
- **影响版本**：3.1.4 及更早版本

### 2. Bug 修复与改进

- 使 `|unique` 过滤器支持异步
- 改进 `|int` 过滤器对科学计数法的处理
- 修复 `copy/pickle` 与 `Undefined` 对象的交互问题
- 改进 `FileSystemLoader` 的错误信息

**官方承诺**：这些版本是安全修复版本，**不会引入破坏性变更**。

## 代码检查

项目使用 Jinja2 的位置：

| 文件 | 使用方式 | 安全评估 |
|------|----------|----------|
| `webserver/handlers/base.py` | 使用 `Environment` + `FileSystemLoader` 渲染模板 | 模板来自文件系统，非用户输入，风险较低 |

**结论**：当前代码未直接使用 `SandboxedEnvironment`，模板来自文件系统而非用户输入，但仍建议升级以获得安全保护。

## 兼容性

| Jinja2 版本 | 兼容性状态 |
|------------|-----------|
| 3.1.4 | ✅ 当前版本（有安全漏洞） |
| 3.1.5 | ✅ 修复 CVE-2024-56326 |
| 3.1.6 | ✅ 修复 CVE-2025-27516（推荐版本） |

## 升级步骤

1. **更新依赖**
   ```bash
   pip install --upgrade jinja2==3.1.6
   ```

2. **运行测试**
   ```bash
   pytest
   ```

3. **重点测试功能**
   - 模板渲染（页面显示）
   - 自定义过滤器（`day`、`website`）
   - 所有涉及模板生成的功能

## 验证清单

- [ ] `requirements.txt` 中 Jinja2 版本为 3.1.6
- [ ] 所有单元测试通过
- [ ] 页面渲染功能正常
- [ ] 自定义模板过滤器工作正常

## 参考链接

- [Jinja2 3.1.6 Release Notes](https://jinja.palletsprojects.com/en/stable/changes/#version-3-1-6)
- [Jinja2 3.1.5 Release Notes](https://jinja.palletsprojects.com/en/stable/changes/#version-3-1-5)
- [CVE-2025-27516](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2025-27516)
- [CVE-2024-56326](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-56326)
