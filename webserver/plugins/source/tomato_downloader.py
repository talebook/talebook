"""Adapter for the pinned Tomato Novel Downloader release; see document/tomato-downloader.md."""

import datetime
import hashlib
import json
import os
import platform
import re
import secrets
import socket
import subprocess
import tempfile
import time
from pathlib import Path

import requests

from webserver.plugins.runtime.domains import BookFile, CheckReport, Page, SourceBook, SourceBookDetail
from webserver.plugins.runtime.protocol import ProviderResult, UpstreamError
from webserver.plugins.runtime.safe_http import SafeHttpClient

from .base import SourceBase, _manifest


VERSION = "2.4.15"
RELEASE_HASHES = {
    "x86_64": "d9db872448e3cda78a18eaa3c7ee162ce631251ed51eb789f8e6676abe118722",
    "aarch64": "3df139fd891ebcf88c6c8b476c755b45e61b3c31075e0b465fc9d14c46800201",
}
MAX_BOOK_BYTES = 64 * 1024 * 1024


def book_id(value):
    value = str(value or "").strip()
    match = re.fullmatch(r"(?:https://fanqienovel\.com/page/)?([0-9]{10,25})/?", value)
    if not match:
        raise UpstreamError("请输入番茄书籍 ID 或 https://fanqienovel.com/page/书籍ID")
    return match.group(1)


class DownloaderSession:
    """One operation owns one authenticated process and all its temporary files."""

    def __init__(self, context):
        self.config = context.get("config") or {}
        seconds = min(3600, max(5, float(self.config.get("timeout_seconds", 600))))
        if context.get("deadline"):
            remaining = (datetime.datetime.fromisoformat(context["deadline"]) - datetime.datetime.now()).total_seconds()
            seconds = min(seconds, remaining)
        # Leave time for process reap and directory cleanup before the runtime returns.
        self.deadline = time.monotonic() + max(0, seconds - 2)
        self.process = None
        self.temp = None
        self.http = None

    def remaining(self):
        remaining = self.deadline - time.monotonic()
        if remaining <= 0:
            raise UpstreamError("番茄下载器操作超时；请稍后重试或增加连接超时时间")
        return remaining

    def __enter__(self):
        try:
            self._start()
            return self
        except BaseException:
            self.__exit__(None, None, None)
            raise

    def _start(self):
        expected = RELEASE_HASHES.get(platform.machine()) if platform.system() == "Linux" else None
        if not expected:
            raise UpstreamError("番茄下载器仅支持 Linux amd64/arm64，请在 Talebook 容器中安装")
        binary = Path(str(self.config.get("binary_path") or "")).expanduser()
        if not binary.is_absolute() or not binary.is_file():
            raise UpstreamError("未安装番茄下载器；请按部署文档安装 v2.4.15 并配置绝对路径")
        try:
            with binary.open("rb") as stream:
                digest = hashlib.file_digest(stream, "sha256").hexdigest()
        except OSError:
            raise UpstreamError("无法读取番茄下载器文件") from None
        if digest != expected:
            raise UpstreamError("番茄下载器 SHA-256 不匹配；需要 v2.4.15 Linux musl 发行文件")
        self.remaining()
        self.temp = tempfile.TemporaryDirectory(prefix="talebook-tomato-")
        self.root = Path(self.temp.name)
        self.output = self.root / "books"
        self.output.mkdir()
        config = {
            "save_path": str(self.output),
            "novel_format": "txt",
            "bulk_files": False,
            "use_official_api": True,
            "api_endpoints": [],
            "preferred_book_name_field": "book_name",
            "ask_format_after_download": False,
            "auto_open_downloaded_files": False,
            "enable_audiobook": False,
            "enable_segment_comments": False,
            "max_workers": 1,
            "max_retries": 1,
            "request_timeout": 15,
        }
        (self.root / "config.yml").write_text(json.dumps(config), encoding="utf-8")
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            port = listener.getsockname()[1]
        password = secrets.token_urlsafe(32)
        self.endpoint = "http://127.0.0.1:%d" % port
        # Keep local HTTP out of proxies; no inherited application credentials.
        env = {key: os.environ[key] for key in ("PATH", "LANG", "SSL_CERT_FILE", "SSL_CERT_DIR") if key in os.environ}
        env.update(
            CARGO="talebook-pinned-release",
            TOMATO_WEB_ADDR="127.0.0.1:%d" % port,
            TOMATO_WEB_PASSWORD=password,
            TMPDIR=str(self.root),
        )
        session = requests.Session()
        session.trust_env = False
        self.http = SafeHttpClient(session=session, allowed_hosts=("127.0.0.1",))
        self.headers = {"x-tomato-password": password}
        try:
            self.process = subprocess.Popen(
                [str(binary), "--server", "--data-dir", str(self.root)],
                cwd=self.root,
                env=env,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except OSError:
            raise UpstreamError("无法启动番茄下载器；请检查可执行权限与系统架构") from None
        while True:
            self.remaining()
            if self.process.poll() is not None:
                raise UpstreamError("番茄下载器启动失败，请检查安装与运行环境")
            try:
                status = self.request("GET", "/api/status")
                if status.get("version") != VERSION:
                    raise UpstreamError("番茄下载器版本不匹配")
                return
            except requests.ConnectionError:
                time.sleep(min(0.1, self.remaining()))

    def request(self, method, path, **kwargs):
        try:
            payload = self.http.json(
                method,
                self.endpoint + path,
                headers=self.headers,
                timeout=min(15, self.remaining()),
                **kwargs,
            )
        except requests.Timeout:
            raise UpstreamError("番茄下载器请求超时，请稍后重试") from None
        if not isinstance(payload, dict):
            raise UpstreamError("番茄下载器返回了无效响应")
        if payload.get("error"):
            # Upstream diagnostics can contain private API endpoints or tokens.
            raise UpstreamError("番茄上游服务不可用或当前构建不支持此操作，请稍后重试")
        return payload

    def download(self, identity):
        job = self.request("POST", "/api/jobs", json={"book_id": identity})
        job_id = job.get("id")
        if type(job_id) is not int or job_id < 1:
            raise UpstreamError("番茄下载器未返回有效任务 ID")
        while True:
            self.remaining()
            items = self.request("GET", "/api/jobs", params={"id": job_id}).get("items") or []
            current = next((item for item in items if item.get("id") == job_id), None)
            if not current or current.get("book_id") != identity:
                raise UpstreamError("番茄下载任务丢失，请重新保存")
            state = current.get("state")
            if state == "done":
                break
            if state not in {"queued", "running"}:
                raise UpstreamError("番茄下载失败，上游服务可能暂时不可用，请稍后重试")
            if current.get("book_name_options") or current.get("format_options"):
                raise UpstreamError("番茄下载器意外要求交互选择，请检查发行版本")
            time.sleep(min(0.25, self.remaining()))
        history = self.request("GET", "/api/history", params={"limit": 1}).get("items") or []
        record = history[0] if history else {}
        total = record.get("selected_chapters", 0)
        if (
            record.get("book_id") != identity
            or not isinstance(total, int)
            or total <= 0
            or record.get("success_chapters") != total
            or record.get("failed_chapters") != 0
        ):
            raise UpstreamError("番茄下载缺章或完整性无法确认，未入库；请稍后重试")
        files = list(self.output.glob("*.txt"))
        if len(files) != 1 or files[0].is_symlink() or not files[0].is_file():
            raise UpstreamError("番茄下载器未生成唯一的 TXT 文件，未入库")
        with files[0].open("rb") as stream:
            content = stream.read(MAX_BOOK_BYTES + 1)
        if not content or len(content) > MAX_BOOK_BYTES:
            raise UpstreamError("番茄下载文件为空或超过 64 MiB，未入库")
        return BookFile(filename=identity + ".txt", content=content, format="txt", media_type="text/plain")

    def __exit__(self, *_args):
        try:
            if self.process is not None:
                if self.process.poll() is None:
                    self.process.kill()
                self.process.wait()
        finally:
            if self.http is not None:
                self.http.session.close()
            if self.temp is not None:
                self.temp.cleanup()


class TomatoDownloaderProvider(SourceBase):
    source_name = "番茄小说下载器"
    manifest = _manifest(
        "talebook.source.tomato-downloader",
        source_name,
        "搜索番茄小说或输入书籍 ID，下载完整 TXT 到本地书库。需安装下载器，依赖上游在线服务。",
        ["sources.search", "sources.acquire"],
        {
            "type": "object",
            "properties": {
                "binary_path": {"type": "string", "title": "下载器绝对路径", "default": "/opt/tomato/downloader"},
                "timeout_seconds": {
                    "type": "number",
                    "title": "操作超时时间（秒）",
                    "default": 600,
                    "minimum": 5,
                    "maximum": 3600,
                },
            },
            "required": ["binary_path"],
        },
        homepage="https://github.com/zhongbai2333/Tomato-Novel-Downloader",
        runtime_kind="file",
    )

    def search(self, query, cursor, context):
        query = str(query or "").strip()
        if not query or int((cursor or {}).get("page", 1)) > 1:
            return Page(items=[])
        if (query.isascii() and query.isdigit()) or query.startswith("https://fanqienovel.com/page/"):
            detail = self.get_book(book_id(query), context)
            return Page(items=[SourceBook.from_dict({**detail.to_dict(), "access": "download"})])
        with DownloaderSession(context) as session:
            items = session.request("GET", "/api/search", params={"q": query[:200]}).get("items")
        if not isinstance(items, list):
            raise UpstreamError("番茄搜索返回了无效结果")
        books = []
        for item in items[:50]:
            identity = book_id(item.get("book_id"))
            books.append(
                SourceBook(
                    external_id=identity,
                    title=str(item.get("title") or identity),
                    authors=(str(item["author"]),) if item.get("author") else (),
                    source=self.source_name,
                    source_url="https://fanqienovel.com/page/" + identity,
                    format="txt",
                    access="download",
                    license="作品版权归原权利人所有",
                )
            )
        return Page(items=books)

    def get_categories(self, context):
        return []

    def get_book(self, external_id, context):
        identity = book_id(external_id)
        with DownloaderSession(context) as session:
            item = session.request("GET", "/api/preview/" + identity)
        if str(item.get("book_id")) != identity or not item.get("book_name"):
            raise UpstreamError("番茄书籍信息缺失或不匹配")
        return SourceBookDetail(
            external_id=identity,
            title=str(item["book_name"]),
            authors=(str(item["author"]),) if item.get("author") else (),
            description=str(item.get("description") or ""),
            categories=tuple(item.get("tags") or []),
            source_url="https://fanqienovel.com/page/" + identity,
            source=self.source_name,
            format="txt",
            downloadable=True,
        )

    def download(self, book, context):
        identity = book_id(book.external_id)
        with DownloaderSession(context) as session:
            return session.download(identity)

    def self_check(self, context):
        with DownloaderSession(context) as session:
            status = session.request("GET", "/api/status")
        if status.get("prewarm_error"):
            raise UpstreamError("下载器已启动，但上游设备注册失败；请稍后重试")
        return CheckReport(healthy=True, message="下载器 v2.4.15 可启动；搜索和正文可用性仍取决于上游服务")

    def execute(self, context):
        return ProviderResult(health_message=self.self_check(context).message)


PROVIDER = TomatoDownloaderProvider()
