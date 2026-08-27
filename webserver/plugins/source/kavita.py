from .base import OPDSProvider


class KavitaProvider(OPDSProvider):
    def __init__(self):
        super().__init__(
            "talebook.source.kavita",
            "Kavita",
            "Kavita 自托管书库 OPDS 连接预设。",
            "https://www.kavitareader.com/",
        )


PROVIDER = KavitaProvider()
