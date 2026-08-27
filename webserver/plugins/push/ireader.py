import requests
from requests_toolbelt.multipart.encoder import MultipartEncoder

from .base import BaseUploader, DevicePushProvider, _manifest


class IReaderUploader(BaseUploader):
    def get_upload_url(self, base_url):
        return base_url.rstrip("/") + "/?action=addBook"

    def upload(self, server_url):
        try:
            with open(self.file_path, "rb") as file:
                multipart = MultipartEncoder(
                    fields={
                        "Filename": self.filename,
                        "Filedata": (self.filename, file, self.content_type),
                        "Upload": "Submit Query",
                    }
                )
                response = requests.post(
                    self.get_upload_url(server_url),
                    data=multipart,
                    headers={"Content-Type": "application/octet-stream"},
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
        return 10123


class IReaderProvider(DevicePushProvider):
    def __init__(self):
        super().__init__(
            _manifest(
                "talebook.push.ireader",
                "掌阅 iReader",
                "把书籍发送到掌阅 iReader 设备。",
                "mdi-book-arrow-right-outline",
            ),
            IReaderUploader,
        )


PROVIDER = IReaderProvider()
