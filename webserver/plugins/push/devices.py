from pathlib import Path
import requests


class BaseUploader:
    def __init__(self, file_path, file_name=None, timeout=60):
        self.file_path = Path(file_path)
        self.filename = self.file_path.name if file_name is None else file_name
        self.file_extension = self.file_path.suffix.lower()
        self.content_type = self._get_content_type()
        self.timeout = timeout
        self._check_file()

    def _check_file(self):
        if not self.file_path.exists():
            raise FileNotFoundError(f"File not found: {self.file_path}")
        if self.file_extension not in [".epub", ".azw3", ".pdf", ".txt"]:
            raise ValueError(f"Unsupported file format: {self.file_extension}, only epub, azw3 and pdf are supported")

    def _get_content_type(self):
        if self.file_extension == ".epub":
            return "application/epub+zip"
        elif self.file_extension == ".pdf":
            return "application/pdf"
        return "application/octet-stream"

    def handle_exception(self, e, server_url=None):
        if hasattr(e, "response") and e.response is not None:
            return {
                "success": False,
                "error_type": "http",
                "status_code": e.response.status_code,
                "message": f"HTTP error: {e.response.status_code}",
                "response_text": e.response.text,
            }
        if isinstance(e, requests.exceptions.Timeout):
            return {
                "success": False,
                "error_type": "timeout",
                "status_code": None,
                "message": f"Upload timeout: {self.file_path}",
                "response_text": str(e),
            }
        elif isinstance(e, requests.exceptions.ConnectionError):
            return {
                "success": False,
                "error_type": "connection",
                "status_code": None,
                "message": f"Connection failed: {server_url}",
                "response_text": str(e),
            }
        else:
            return {
                "success": False,
                "error_type": "other",
                "status_code": None,
                "message": f"Upload failed: {str(e)}",
                "response_text": str(e),
            }

    def get_upload_url(self, base_url):
        return base_url

    def upload(self, server_url):
        raise NotImplementedError("Subclass must implement upload method")

    def default_port(self):
        return 12121


class DuokanUploader(BaseUploader):
    def get_upload_url(self, base_url):
        if not base_url.endswith("/"):
            base_url += "/"
        return base_url + "files"

    def upload(self, server_url):
        try:
            upload_url = self.get_upload_url(server_url)
            with open(self.file_path, "rb") as file:
                files = {"newfile": (self.filename, file, self.content_type)}
                response = requests.post(upload_url, files=files, timeout=self.timeout)
                response.raise_for_status()
                try:
                    return {"success": True, "data": response.json()}
                except Exception:
                    return {"success": True, "data": response.text}
        except Exception as e:
            return self.handle_exception(e, server_url)

    def default_port(self):
        return 12121


class BooxUploader(BaseUploader):
    def get_upload_url(self, base_url):
        if not base_url.endswith("/"):
            base_url += "/"
        return base_url + "api/library/upload"

    def upload(self, server_url):
        try:
            upload_url = self.get_upload_url(server_url)
            with open(self.file_path, "rb") as file:
                files = {
                    "parent": (None, "null"),
                    "sender": (None, "web"),
                    "file": (self.filename, file, self.content_type),
                }
                response = requests.post(upload_url, files=files, timeout=self.timeout)
                response.raise_for_status()
                result = response.json()
                if result.get("code") != 0 or not result.get("successful"):
                    raise Exception(f"Upload failed: {result}")
                return {"success": True, "data": result}
        except Exception as e:
            return self.handle_exception(e, server_url)

    def default_port(self):
        return 8085


class HanwangUploader(BaseUploader):
    def get_upload_url(self, base_url):
        if not base_url.endswith("/"):
            base_url += "/"
        return base_url + "files"

    def upload(self, server_url):
        from urllib.parse import quote

        try:
            upload_url = self.get_upload_url(server_url)
            with open(self.file_path, "rb") as file:
                files = {"newfile": (self.filename, file, self.content_type)}
                data = {"fileName": quote(self.filename)}
                response = requests.post(upload_url, files=files, data=data, timeout=self.timeout)
                response.raise_for_status()
                try:
                    return {"success": True, "data": response.json()}
                except Exception:
                    return {"success": True, "data": response.text}
        except Exception as e:
            return self.handle_exception(e, server_url)

    def default_port(self):
        return 9310


class IReaderUploader(BaseUploader):
    def get_upload_url(self, base_url):
        if not base_url.endswith("/"):
            base_url += "/"
        return base_url + "?action=addBook"

    def upload(self, server_url):
        from requests_toolbelt.multipart.encoder import MultipartEncoder

        try:
            upload_url = self.get_upload_url(server_url)
            with open(self.file_path, "rb") as file:
                m = MultipartEncoder(
                    fields={
                        "Filename": self.filename,
                        "Filedata": (self.filename, file, self.content_type),
                        "Upload": "Submit Query",
                    }
                )
                headers = {"Content-Type": "application/octet-stream"}
                response = requests.post(upload_url, data=m, headers=headers, timeout=self.timeout)
                response.raise_for_status()
                try:
                    return {"success": True, "data": response.json()}
                except Exception:
                    return {"success": True, "data": response.text}
        except Exception as e:
            return self.handle_exception(e, server_url)

    def default_port(self):
        return 10123


class DangdangUploader(BaseUploader):
    def get_upload_url(self, base_url):
        return base_url

    def upload(self, server_url):
        try:
            upload_url = self.get_upload_url(server_url)
            with open(self.file_path, "rb") as file:
                files = {"files[]": (self.filename, file, self.content_type)}
                response = requests.post(upload_url, files=files, timeout=self.timeout)
                response.raise_for_status()
                try:
                    return {"success": True, "data": response.json()}
                except Exception:
                    return {"success": True, "data": response.text}
        except Exception as e:
            return self.handle_exception(e, server_url)

    def default_port(self):
        return 11111


class PureLibroUploader(BaseUploader):
    def get_upload_url(self, base_url):
        if not base_url.endswith("/"):
            base_url += "/"
        return base_url + "upload"

    def upload(self, server_url):
        try:
            upload_url = self.get_upload_url(server_url)
            with open(self.file_path, "rb") as file:
                files = {"files[]": (self.filename, file, self.content_type)}
                data = {"path": "/"}
                response = requests.post(upload_url, files=files, data=data, timeout=self.timeout)
                response.raise_for_status()
                try:
                    return {"success": True, "data": response.json()}
                except Exception:
                    return {"success": True, "data": response.text}
        except Exception as e:
            return self.handle_exception(e, server_url)

    def default_port(self):
        return 80
