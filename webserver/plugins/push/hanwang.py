from urllib.parse import quote

import requests

from .base import BaseUploader, DevicePushProvider, _manifest


class HanwangUploader(BaseUploader):
    def get_upload_url(self, base_url):
        return base_url.rstrip("/") + "/files"

    def upload(self, server_url):
        try:
            with open(self.file_path, "rb") as file:
                files = {"newfile": (self.filename, file, self.content_type)}
                response = requests.post(
                    self.get_upload_url(server_url),
                    files=files,
                    data={"fileName": quote(self.filename)},
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
        return 9310


class HanwangProvider(DevicePushProvider):
    def __init__(self):
        super().__init__(
            _manifest(
                "talebook.push.hanwang",
                "汉王电纸书",
                "通过 WiFi 传书把书籍发送到汉王电纸书。",
                "mdi-book-open-outline",
            ),
            HanwangUploader,
        )


PROVIDER = HanwangProvider()
