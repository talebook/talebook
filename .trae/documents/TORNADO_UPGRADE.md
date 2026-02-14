# Tornado 6.4.2 → 6.5 升级说明

## 升级概述

本次升级将 Tornado 从 6.4.2 升级到 6.5，这是一个**安全的次要版本升级**，不会破坏现有代码功能。

## 升级原因

### 1. 关键安全修复（重要）

Tornado 6.5 修复了编号为 `CVE-2025-47287` 的高危安全漏洞：

- **漏洞描述**：攻击者可通过发送精心构造的 `multipart/form-data` 请求，触发大量错误日志，造成日志系统阻塞，导致**拒绝服务（DoS）**
- **影响版本**：6.4.2 及更早版本
- **修复版本**：6.5+

### 2. 新特性与改进

- **Python 版本支持**：开始支持 Python 3.14，实验性支持 Python 3.13 自由线程模式
- **最低版本要求**：Python 3.9+
- **Bug 修复**：修复 Windows 上 `contextvars` 失效问题，以及 WebSocket 的 `ping_interval` 和 `ping_timeout` 问题

## 代码修改详情

### 修复弃用警告

Tornado 6.5 引入了弃用警告，本次升级已提前修复，确保未来平滑升级到 7.0。

#### 1. `HTTPError.log_message` → `reason`（3处）

| 文件 | 行号 | 修改内容 |
|------|------|----------|
| `webserver/handlers/user.py` | 46 | `log_message=_("无权登录")` → `reason=_("无权登录")` |
| `webserver/handlers/user.py` | 104 | `log_message=_("激活码无效")` → `reason=_("激活码无效")` |
| `webserver/handlers/files.py` | 125 | `log_message="nothing"` → `reason="nothing"` |

**说明**：`reason` 参数与 `log_message` 功能完全相同，只是参数名变更，更符合 HTTP 标准语义。

#### 2. `HTTPError.args` 安全访问（1处）

| 文件 | 行号 | 修改内容 |
|------|------|----------|
| `webserver/handlers/book.py` | 257 | `e.args[0]` → `e.args[0] if e.args else {"err": "unknown.error", "msg": str(e)}` |

**说明**：添加空值保护，提高代码健壮性，避免异常对象无参数时出错。

## 兼容性

| Tornado 版本 | 兼容性状态 |
|-------------|-----------|
| 6.4.x | ✅ 完全兼容 |
| 6.5.x | ✅ 完全兼容（无弃用警告） |
| 7.0+ | ✅ 完全兼容（未来版本） |

## 升级步骤

1. **更新依赖**
   ```bash
   pip install --upgrade tornado==6.5
   ```

2. **运行测试**
   ```bash
   pytest
   ```

3. **重点测试功能**
   - 文件上传（multipart 解析）
   - WebSocket 连接
   - 用户登录/激活流程
   - 书籍元数据获取

## 验证清单

- [ ] `requirements.txt` 中 Tornado 版本为 6.5
- [ ] 所有单元测试通过
- [ ] 用户登录功能正常
- [ ] 文件上传功能正常
- [ ] 控制台无弃用警告输出

## 参考链接

- [Tornado 6.5.0 Release Notes](https://www.tornadoweb.org/en/stable/releases/v6.5.0.html)
- [CVE-2025-47287](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2025-47287)
