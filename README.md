# Moke

**Moke** 是 [Talebook](https://github.com/talebook/talebook) 自托管电子书服务器的桌面客户端。在电脑上浏览、搜索、下载你的电子书库，内嵌专业阅读器，离线也能随时打开阅读。

## 功能

- **书库浏览** — 按分类、标签、作者、出版商等方式浏览服务器上的电子书
- **元数据搜索** — 快速检索书名、作者、简介等元数据
- **离线下载** — 将书籍下载到本地，断网也能阅读
- **专业阅读** — 内嵌 readest 阅读器，支持 EPUB、PDF 等多种格式
- **局域网友好** — 支持自签名证书和纯 HTTP 局域网服务器
- **完整认证** — 支持访问码、登录、注册等 Talebook 服务器的全部认证方式

## 安装

从 [Releases](../../releases) 页面下载对应平台的安装包：

| 平台 | 安装包格式 |
|---|---|
| Windows | `.msi` / `.exe` |
| macOS | `.dmg` |
| Linux | `.AppImage` / `.deb` |
| Android（平板） | `.apk` |
| iPadOS | `.ipa`（自签名安装，需将设备 UDID 加入开发者描述文件） |

> **系统要求**：Windows 10 1809+ / macOS 11+ / Linux（glibc 2.31+）/ Android 8+ / iPadOS 17+

## 使用

1. 启动 Moke，输入你的 Talebook 服务器地址（例如 `http://192.168.1.100:8080` 或 `https://mytalebook.example.com`）
2. 根据服务器设置，输入访问码或登录账号
3. 开始浏览、搜索、下载和阅读

下载的书籍存储在本地，在书架页面可以离线打开阅读。

## 在 Mihon 中阅读 Talebook 漫画

Android 用户还可以通过 [Talebook Mihon Plugin](https://github.com/hehetoshang/mihon-talebook-plugin) 将自托管 Talebook 书库接入 Mihon，浏览、搜索和阅读漫画。

- **版本要求**：Mihon 0.20.0+、Android 8.0+，以及包含漫画 API 的 Talebook v26.09.01+。
- **内容范围**：仅展示服务器明确标记为 `media_type = comic` 的书籍，普通 EPUB、PDF 等电子书不会出现在插件的浏览或搜索结果中。
- **阅读方式**：每本 Talebook 漫画对应一个 Mihon 漫画条目和一个“完整漫画”章节，按服务端提供的页序加载图片。

配置步骤：

1. 从[插件仓库](https://github.com/hehetoshang/mihon-talebook-plugin)的 Releases 或 Actions 构建产物下载并安装 APK，在 Mihon 中确认信任该扩展。
2. 打开 Mihon 的“浏览 → 扩展 → Talebook → 设置”，填写服务器地址、用户名、密码和访问码（未启用访问码时可留空）。
3. 点击“测试连接”，成功后进入 Talebook 书源浏览或搜索漫画。

插件目前无法完成登录或访问码的交互式验证码；具体配置与兼容性说明请参阅[插件 README](https://github.com/hehetoshang/mihon-talebook-plugin#readme)。

## 相关链接

- [Talebook 服务器](https://github.com/talebook/talebook) — 自托管电子书服务端，Moke 的数据来源
- [Talebook Mihon Plugin](https://github.com/hehetoshang/mihon-talebook-plugin) — 在 Android 的 Mihon 中连接 Talebook 并阅读漫画的书源扩展
- [readest](https://github.com/readest/readest) — 内嵌的专业电子书阅读器
- [报告 Bug](../../issues) — 发现 Bug？请告诉我们
- [参与贡献](CONTRIBUTING.md) — 开发者贡献指南

## 支持

如果 Moke 对你有帮助，欢迎请维护者喝杯咖啡~

<div align="center">
  <table>
    <tr>
      <td align="center"><img src="public/contributors/houheya/weixin.jpg" width="200" alt="微信赞赏码" /><br/>微信</td>
      <td align="center"><img src="public/contributors/houheya/alipay.jpg" width="200" alt="支付宝收款码" /><br/>支付宝</td>
    </tr>
  </table>
</div>

感谢微信用户金海先生的打赏支持

## 许可证

GPLv3
