import json
import time
from pathlib import Path
from unittest import mock

import pytest

from tests.test_main import TestWithUserLogin, get_db
from tests.test_main import setUpModule as init
from webserver import models
from webserver.plugins.runtime.domains import BookFile, SourceBookDetail
from webserver.plugins.runtime.protocol import UpstreamError
from webserver.plugins.source.tomato_downloader import PROVIDER
from webserver.services.booksource import save_service
from webserver.services.plugin_runtime import install_builtin, save_connection


IDENTITY = "7274791759849196579"
CONTENT = "西游记\n第一回\n测试正文".encode()
DETAIL = {"book_id": IDENTITY, "book_name": "西游记", "author": "吴承恩"}


def setUpModule():
    init()


class TestTomatoSourceFlow(TestWithUserLogin):
    def setUp(self):
        super().setUp()
        session = get_db()
        installation = install_builtin(session, PROVIDER.manifest["id"], 1)
        self.installation_id = installation.id
        connection = save_connection(
            session,
            {},
            installation.id,
            "instance",
            0,
            {},
            role="builtin",
            config={"binary_path": "/opt/tomato/downloader", "timeout_seconds": 600},
        )
        self.source_key = "plugin:%s" % connection.id

    def tearDown(self):
        session = get_db()
        session.get(models.PluginInstallation, self.installation_id).enabled = False
        session.commit()
        super().tearDown()

    @mock.patch("webserver.services.AsyncService.async_mode", return_value=False)
    @mock.patch("webserver.services.booksource.save_service.SaveOnlineBookService._save_meta")
    @mock.patch("calibre.db.legacy.LibraryDatabase.books_with_same_title", return_value=[])
    @mock.patch("calibre.db.legacy.LibraryDatabase.import_book")
    @mock.patch("webserver.plugins.source.tomato_downloader.DownloaderSession")
    def test_existing_search_detail_save_flow(self, factory, importer, _same, save_meta, _async):
        remote = factory.return_value.__enter__.return_value
        remote.request.side_effect = lambda _method, path, **_kwargs: (
            {"items": [{"book_id": IDENTITY, "title": "西游记", "author": "吴承恩"}]} if path == "/api/search" else DETAIL
        )
        remote.download.return_value = BookFile(filename=IDENTITY + ".txt", content=CONTENT, format="txt")
        paths = []

        def import_file(metadata, filenames):
            self.assertEqual(metadata.title, "西游记")
            self.assertEqual(metadata.authors, ["吴承恩"])
            paths.extend(filenames)
            self.assertEqual(Path(filenames[0]).read_bytes(), CONTENT)
            return 909091

        importer.side_effect = import_file
        sources = self.json("/api/book-sources")
        source = next(item for item in sources["items"] if item["source_key"] == self.source_key)
        self.assertEqual(source["download_mode"], "single_book")
        self.assertEqual(source["capabilities"], ["sources.acquire", "sources.search"])
        task = self.json("/api/book-sources/search?key=test&sources=" + self.source_key)
        deadline = time.monotonic() + 3
        while True:
            results = self.json("/api/book-sources/search/status?task_id=" + task["task_id"])
            if results.get("finished") or time.monotonic() >= deadline:
                break
            time.sleep(0.01)
        self.assertTrue(results["finished"])
        self.assertEqual(results["results"][0]["books"][0]["book_url"], IDENTITY)
        detail = self.json("/api/book-sources/book?source_id=" + self.source_key + "&book_url=" + IDENTITY)
        self.assertTrue(detail["book"]["downloadable"])
        result = self.json(
            "/api/book-sources/save",
            method="POST",
            body=json.dumps({"source_id": self.source_key, "book_url": IDENTITY, "fmt": "txt"}),
        )
        self.assertEqual(result["err"], "ok")
        importer.assert_called_once()
        save_meta.assert_called_once()
        self.assertTrue(paths)
        self.assertTrue(all(not Path(path).exists() for path in paths))

        importer.reset_mock()
        remote.download.side_effect = UpstreamError("番茄下载缺章，未入库")
        failure_id = "7274791759849196580"
        remote.request.side_effect = None
        remote.request.return_value = {**DETAIL, "book_id": failure_id}
        self.json(
            "/api/book-sources/save",
            method="POST",
            body=json.dumps({"source_id": self.source_key, "book_url": failure_id, "fmt": "txt"}),
        )
        failed = self.json("/api/book-sources/save/status?source_id=" + self.source_key + "&book_url=" + failure_id)
        self.assertEqual(failed["status"], "failed")
        importer.assert_not_called()


@pytest.mark.parametrize("mode", ["success", "failure", "duplicate", "add_format"])
def test_import_temporary_file_is_cleaned_on_all_paths(tmp_path, monkeypatch, mode):
    monkeypatch.setitem(save_service.CONF, "upload_path", str(tmp_path))
    service = object.__new__(save_service.SaveOnlineBookService)
    service.db = mock.Mock()
    service.db.books_with_same_title.return_value = []
    if mode in {"duplicate", "add_format"}:
        service.db.books_with_same_title.return_value = [1]
        service.db.get_data_as_dict.return_value = [
            {
                "id": 1,
                "authors": ["吴承恩"],
                "available_formats": "TXT" if mode == "duplicate" else "EPUB",
            }
        ]
    if mode == "failure":
        service.db.import_book.side_effect = RuntimeError("import failed")
    detail = SourceBookDetail(external_id=IDENTITY, title="西游记", authors=("吴承恩",))
    book_file = BookFile(filename="book.txt", content=CONTENT, format="txt")
    if mode == "failure":
        with pytest.raises(RuntimeError, match="import failed"):
            service._import_file(detail, book_file)
    else:
        service._import_file(detail, book_file)
    assert list(tmp_path.iterdir()) == []
