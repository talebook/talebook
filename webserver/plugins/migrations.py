"""内置插件历史身份的显式升级表。

这里只记录真实发布过、需要迁移存量数据库的旧 ID。不要根据当前 ID
推导历史身份：新插件不应因为命名空间相同就被假定存在旧版本。
"""

LEGACY_PLUGIN_KEY_MIGRATIONS = {
    "talebook.book-source.opds": "talebook.source.opds",
    "talebook.book-source.legado": "talebook.source.legado",
    "talebook.book-source.kavita": "talebook.source.kavita",
    "talebook.book-source.komga": "talebook.source.komga",
    "talebook.book-source.booklore": "talebook.source.booklore",
    "talebook.book-source.standard-ebooks": "talebook.source.standard-ebooks",
    "talebook.book-source.gutenberg": "talebook.source.gutenberg",
    "talebook.book-source.internet-archive": "talebook.source.internet-archive",
    "talebook.book-source.webdav": "talebook.source.webdav",
    "talebook.book-source.watch-folder": "talebook.source.watch-folder",
    "talebook.reviews.hardcover": "talebook.review.hardcover",
    "talebook.reviews.neodb": "talebook.review.neodb",
    "talebook.reviews.google-books": "talebook.review.google-books",
    "talebook.reviews.bangumi": "talebook.review.bangumi",
    "talebook.reviews.anilist": "talebook.review.anilist",
    "talebook.reviews.file-import": "talebook.review.file-import",
    "talebook.annotations.brs": "talebook.annotation.brs",
}


__all__ = ["LEGACY_PLUGIN_KEY_MIGRATIONS"]
