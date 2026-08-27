import requests

from .base import BaseUploader, DevicePushProvider, _manifest


class PureLibroUploader(BaseUploader):
    def get_upload_url(self, base_url):
        return base_url.rstrip("/") + "/upload"

    def upload(self, server_url):
        try:
            with open(self.file_path, "rb") as file:
                files = {"files[]": (self.filename, file, self.content_type)}
                response = requests.post(
                    self.get_upload_url(server_url),
                    files=files,
                    data={"path": "/"},
                    timeout=self.timeout,
                )
                response.raise_for_status()
                try:
                    return {"success": True, "data": response.json()}
                except Exception:
                    return {"success": True, "data": response.text}
        except Exception as exc:
            return self.handle_exception(exc, server_url)

    def default_port(self):
        return 80


class PureLibroProvider(DevicePushProvider):
    def __init__(self):
        super().__init__(
            _manifest(
                "talebook.push.purelibro",
                "PureLibro",
                "把书籍发送到 PureLibro 阅读设备。",
                "mdi-book-play-outline",
            ),
            PureLibroUploader,
        )


PROVIDER = PureLibroProvider()
