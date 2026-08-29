from .base import OPDSProvider


class KomgaProvider(OPDSProvider):
    def __init__(self):
        super().__init__("talebook.source.komga", "Komga", "Komga 自托管书库 OPDS 连接预设。", "https://komga.org/")


PROVIDER = KomgaProvider()
