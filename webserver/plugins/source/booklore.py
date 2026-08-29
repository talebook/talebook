from .base import OPDSProvider


class BookLoreProvider(OPDSProvider):
    def __init__(self):
        super().__init__(
            "talebook.source.booklore",
            "BookLore",
            "BookLore 自托管书库 OPDS 连接预设。",
            "https://booklore.org/",
        )


PROVIDER = BookLoreProvider()
