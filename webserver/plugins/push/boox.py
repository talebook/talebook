import time

import requests

from .base import BaseUploader, DevicePushProvider, _manifest


class BooxUploader(BaseUploader):
    @staticmethod
    def _check_result(result, storage=False):
        label = "BOOX 存储接口" if storage else "BOOX 推送库"
        if not isinstance(result, dict) or type(result.get("code")) not in (int, float):
            raise ValueError(f"{label}未返回有效的成功结果")
        if result["code"] == 300001:
            raise ValueError("BOOX 设备已存在同名文件，请先在设备上检查")
        if result["code"] != 0:
            raise ValueError(f"{label}拒绝上传（业务码 {result['code']}）")
        if "isTokenInvalid" in result and result["isTokenInvalid"] is not False:
            raise ValueError("BOOX 设备拒绝访问，请重新开启文石互传并检查授权")
        flags = [result[key] for key in ("successful", "isSuccessful") if key in result]
        if any(value is not True for value in flags) or (not storage and not flags):
            raise ValueError(f"{label}未返回有效的成功结果")

    def get_upload_url(self, base_url):
        return base_url.rstrip("/") + "/api/library/upload"

    def upload(self, server_url):
        started = time.monotonic()
        try:
            with open(self.file_path, "rb") as file:
                files = {
                    "parent": (None, "null"),
                    "sender": (None, "web"),
                    "file": (self.filename, file, self.content_type),
                }
                response = requests.post(self.get_upload_url(server_url), files=files, timeout=self.timeout)
                if response.status_code in (403, 404, 405, 410, 501):
                    legacy_status = response.status_code
                    response.close()
                    remaining = self.timeout - (time.monotonic() - started)
                    if remaining <= 0:
                        raise requests.exceptions.Timeout("BOOX compatibility fallback deadline expired")
                    file.seek(0)
                    response = requests.post(
                        server_url.rstrip("/") + "/api/storage/upload",
                        files={"file": (self.filename, file, self.content_type)},
                        data={"path": "/Download"},
                        timeout=remaining,
                    )
                    try:
                        response.raise_for_status()
                        result = response.json()
                        self._check_result(result, storage=True)
                    except Exception as exc:
                        failure = self.handle_exception(exc, server_url)
                        failure["message"] = f"BOOX 旧接口返回 HTTP {legacy_status}；存储接口：{failure['message']}"
                        return failure
                    finally:
                        response.close()
                    return {"success": True, "data": result}
                response.raise_for_status()
                result = response.json()
                self._check_result(result)
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
