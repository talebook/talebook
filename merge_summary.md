此次合并主要在 book.py 文件中添加了对 Metadata 对象的处理逻辑，将其转换为字典格式，同时调整了类型检查的条件判断结构。这些变更旨在增强系统对不同类型书籍数据的处理能力，确保后续操作能够正确处理 Metadata 类型的对象。
| 文件 | 变更 |
|------|---------|
| webserver/handlers/book.py | - 添加了对 Metadata 对象的处理逻辑，当书籍对象具有 title 和 authors 属性时将其转换为字典格式<br>- 构建了包含 title、authors、author、author_sort、publisher、isbn、comments、cover_url、source、website、provider_key、provider_value、pubdate 等字段的字典<br>- 修改了类型检查的条件判断，将 if 改为 elif，以适应新增的 Metadata 对象处理逻辑 |