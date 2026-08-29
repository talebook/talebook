from .base import OPDSProvider


class StandardEbooksProvider(OPDSProvider):
    def __init__(self):
        super().__init__(
            "talebook.source.standard-ebooks",
            "Standard Ebooks",
            "浏览 Standard Ebooks 官方开放 OPDS 目录。",
            "https://standardebooks.org/",
            endpoint="https://standardebooks.org/feeds/opds/all",
            license_name="Public domain / CC0",
        )


PROVIDER = StandardEbooksProvider()
