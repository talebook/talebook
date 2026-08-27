import requests

from .base import BaseUploader, DevicePushProvider, _manifest


class DangdangUploader(BaseUploader):
    def upload(self, server_url):
        try:
            with open(self.file_path, "rb") as file:
                files = {"files[]": (self.filename, file, self.content_type)}
                response = requests.post(server_url, files=files, timeout=self.timeout)
                response.raise_for_status()
                try:
                    return {"success": True, "data": response.json()}
                except Exception:
                    return {"success": True, "data": response.text}
        except Exception as exc:
            return self.handle_exception(exc, server_url)

    def default_port(self):
        return 11111


class DangdangProvider(DevicePushProvider):
    def __init__(self):
        super().__init__(
            _manifest(
                "talebook.push.dangdang",
                "当当阅读器",
                "把书籍发送到当当阅读器。",
                "mdi-tablet-dashboard",
            ),
            DangdangUploader,
        )


PROVIDER = DangdangProvider()
