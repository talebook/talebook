from .base import OPDSProvider


class StandardEbooksProvider(OPDSProvider):
    def __init__(self):
        super().__init__(
            "talebook.source.standard-ebooks",
            "Standard Ebooks · 最新上架",
            "浏览 Standard Ebooks 官方开放的最新公共版权电子书。",
            "https://standardebooks.org/",
            endpoint="https://standardebooks.org/feeds/atom/new-releases",
            license_name="Public domain / CC0",
            brand_icon="/images/plugin-icons/standard-ebooks.png",
        )
        self.manifest["ui"]["catalog_access"] = "public_free"

    @staticmethod
    def initial_enabled(settings):
        return True


PROVIDER = StandardEbooksProvider()
