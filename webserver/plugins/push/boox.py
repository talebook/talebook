import requests

from .base import BaseUploader, DevicePushProvider, _manifest


class BooxUploader(BaseUploader):
    def get_upload_url(self, base_url):
        return base_url.rstrip("/") + "/api/library/upload"

    def upload(self, server_url):
        try:
            with open(self.file_path, "rb") as file:
                files = {
                    "parent": (None, "null"),
                    "sender": (None, "web"),
                    "file": (self.filename, file, self.content_type),
                }
                response = requests.post(self.get_upload_url(server_url), files=files, timeout=self.timeout)
                response.raise_for_status()
                result = response.json()
                if result.get("code") != 0 or not result.get("successful"):
                    raise Exception(f"Upload failed: {result}")
                return {"success": True, "data": result}
        except Exception as exc:
            return self.handle_exception(exc, server_url)

    def default_port(self):
        return 8085


class BooxProvider(DevicePushProvider):
    def __init__(self):
        super().__init__(
            _manifest(
                "talebook.push.boox",
                "文石 BOOX",
                "把书籍发送到文石 BOOX 设备的推送库。",
                "mdi-tablet-android",
                "https://www.boox.com/",
                brand_icon="/images/plugin-icons/boox.png",
            ),
            BooxUploader,
        )


PROVIDER = BooxProvider()
