#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""实施项 11.5 的边界与错误路径测试。

补齐三条新格式校验函数里未被主测试覆盖的分支：
DOCX 缺 word/ 目录、DOCX/HTMLZ 损坏 ZIP、FB2 超大文件与读取失败。
"""

import os
import zipfile

import pytest

from webserver.services import media_analysis
from webserver.services.media_analysis import (
    InvalidMediaError,
    analyze_media_file,
)


class TestDocxBoundaries:
    def test_docx_without_word_directory_is_rejected(self, tmp_path):
        """有 [Content_Types].xml 但没有 word/ 目录的不是 DOCX。"""
        path = str(tmp_path / "noword.docx")
        with zipfile.ZipFile(path, "w") as archive:
            archive.writestr(
                "[Content_Types].xml",
                '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
            )
            archive.writestr("docProps/app.xml", "<Properties/>")

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "docx")
        assert exc.value.code == "format.mismatch"
        assert "word/" in exc.value.message

    def test_corrupt_docx_zip_is_rejected(self, tmp_path):
        """ZIP 头正确但内容损坏时必须报 archive.corrupt。"""
        path = str(tmp_path / "corrupt.docx")
        # 合法 ZIP 签名 + 垃圾数据：ZipFile 打开时会抛 BadZipFile
        with open(path, "wb") as fh:
            fh.write(b"PK\x03\x04")
            fh.write(b"\xff" * 200)

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "docx")
        assert exc.value.code in ("archive.corrupt", "format.mismatch")

    def test_truncated_docx_reports_archive_corrupt(self, tmp_path):
        """截断掉中央目录的 DOCX 必须报 archive.corrupt。

        注意：这一情形由 `_preflight_zip_directory` 拦下（它先于 ZipFile 运行），
        因此报的是 preflight 的错误，而非 `_analyze_docx` 里的 except 分支。
        """
        path = str(tmp_path / "truncated.docx")
        with zipfile.ZipFile(path, "w") as archive:
            archive.writestr("[Content_Types].xml", "<Types/>")
            archive.writestr("word/document.xml", "<w:document/>")
        data = open(path, "rb").read()
        with open(path, "wb") as fh:
            fh.write(data[: len(data) // 2])

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "docx")
        assert exc.value.code == "archive.corrupt"

    def test_bad_central_directory_magic_reports_archive_corrupt(self, tmp_path):
        """中央目录条目签名被破坏时必须报 archive.corrupt。

        这是 `_analyze_docx` 里 `except (OSError, BadZipFile, LargeZipFile)`
        分支的确定性触发方式：EOCD 结构完好（通过 preflight），
        但 ZipFile 解析中央目录时抛 BadZipFile。
        """
        path = str(tmp_path / "badcd.docx")
        with zipfile.ZipFile(path, "w") as archive:
            archive.writestr("[Content_Types].xml", "<Types/>")
            archive.writestr("word/document.xml", "<w:document/>")

        data = bytearray(open(path, "rb").read())
        marker = data.find(b"PK\x01\x02")
        assert marker >= 0, "样本应含中央目录条目"
        data[marker : marker + 4] = b"XXXX"
        with open(path, "wb") as fh:
            fh.write(bytes(data))

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "docx")
        assert exc.value.code == "archive.corrupt"
        assert "DOCX" in exc.value.message

    def test_docx_with_word_dir_but_no_content_types(self, tmp_path):
        """有 word/ 但没有 [Content_Types].xml 仍被拒绝。"""
        path = str(tmp_path / "nocontenttypes.docx")
        with zipfile.ZipFile(path, "w") as archive:
            archive.writestr("word/document.xml", "<w:document/>")

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "docx")
        assert exc.value.code == "format.mismatch"
        assert "Content_Types" in exc.value.message


class TestHtmlzBoundaries:
    def test_corrupt_htmlz_zip_is_rejected(self, tmp_path):
        """ZIP 头正确但内容损坏时必须报 archive.corrupt。"""
        path = str(tmp_path / "corrupt.htmlz")
        with open(path, "wb") as fh:
            fh.write(b"PK\x03\x04")
            fh.write(b"\xff" * 200)

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "htmlz")
        assert exc.value.code in ("archive.corrupt", "format.mismatch")

    def test_truncated_htmlz_reports_archive_corrupt(self, tmp_path):
        """截断掉中央目录的 HTMLZ 必须报 archive.corrupt。"""
        path = str(tmp_path / "truncated.htmlz")
        with zipfile.ZipFile(path, "w") as archive:
            archive.writestr("index.html", "<html/>")
        data = open(path, "rb").read()
        with open(path, "wb") as fh:
            fh.write(data[: len(data) // 2])

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "htmlz")
        assert exc.value.code == "archive.corrupt"

    def test_bad_central_directory_magic_reports_archive_corrupt(self, tmp_path):
        """中央目录条目签名被破坏时必须报 archive.corrupt。

        这是 `_analyze_htmlz` 里 except 分支的确定性触发方式。
        """
        path = str(tmp_path / "badcd.htmlz")
        with zipfile.ZipFile(path, "w") as archive:
            archive.writestr("index.html", "<html/>")

        data = bytearray(open(path, "rb").read())
        marker = data.find(b"PK\x01\x02")
        assert marker >= 0, "样本应含中央目录条目"
        data[marker : marker + 4] = b"XXXX"
        with open(path, "wb") as fh:
            fh.write(bytes(data))

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "htmlz")
        assert exc.value.code == "archive.corrupt"
        assert "HTMLZ" in exc.value.message

    def test_htmlz_with_index_in_subdirectory_is_rejected(self, tmp_path):
        """index.html 必须在压缩包根目录。"""
        path = str(tmp_path / "nested.htmlz")
        with zipfile.ZipFile(path, "w") as archive:
            archive.writestr("sub/index.html", "<html/>")

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "htmlz")
        assert exc.value.code == "format.mismatch"


class TestFb2Boundaries:
    def test_oversized_fb2_is_rejected(self, tmp_path, monkeypatch):
        """超过 MAX_DOCUMENT_XML_BYTES 的 FB2 必须被拒绝。"""
        path = str(tmp_path / "big.fb2")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(
                '<?xml version="1.0"?>'
                '<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">'
                "<body><section><p>x</p></section></body></FictionBook>"
            )

        # 把上限压到 10 字节，触发 size 检查
        monkeypatch.setattr(media_analysis, "MAX_DOCUMENT_XML_BYTES", 10)

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "fb2")
        assert exc.value.code == "format.mismatch"
        assert "过大" in exc.value.message

    def test_fb2_post_read_size_check(self, tmp_path, monkeypatch):
        """文件在 getsize 之后变大时，读取后的长度检查必须拦住。

        这是 `if len(data) > MAX_DOCUMENT_XML_BYTES` 分支的确定性触发方式：
        让 getsize 返回小值、而实际读取超过上限。
        """
        path = str(tmp_path / "grow.fb2")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("<FictionBook><body/></FictionBook>")

        real_getsize = os.path.getsize

        def fake_getsize(p):
            if str(p) == path:
                return 1  # 骗过前置检查
            return real_getsize(p)

        monkeypatch.setattr(media_analysis.os.path, "getsize", fake_getsize)
        monkeypatch.setattr(media_analysis, "MAX_DOCUMENT_XML_BYTES", 10)

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "fb2")
        assert exc.value.code == "format.mismatch"
        assert "过大" in exc.value.message

    def test_fb2_read_error_is_reported(self, tmp_path, monkeypatch):
        """读取 FB2 失败时报 media.unreadable。"""
        path = str(tmp_path / "book.fb2")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("<FictionBook><body/></FictionBook>")

        real_open = open

        def failing_open(p, *args, **kwargs):
            if str(p) == path:
                raise OSError("模拟读取失败")
            return real_open(p, *args, **kwargs)

        monkeypatch.setattr("builtins.open", failing_open)

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "fb2")
        assert exc.value.code == "media.unreadable"

    def test_fb2_without_namespace_is_accepted(self, tmp_path):
        """无命名空间的 FictionBook 也应被接受（宽松匹配）。"""
        path = str(tmp_path / "nons.fb2")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write('<?xml version="1.0"?><FictionBook><body><section/></body></FictionBook>')

        result = analyze_media_file(path, "fb2")
        assert result.detected_format == "fb2"

    def test_fb2_with_extra_root_children_is_accepted(self, tmp_path):
        """body 之外还有 description 等子元素时应被接受。"""
        path = str(tmp_path / "full.fb2")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(
                '<?xml version="1.0"?>'
                '<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">'
                "<description><title-info><book-title>书</book-title></title-info></description>"
                "<body><section><p>正文</p></section></body>"
                "<binary id='c.png' content-type='image/png'>AAAA</binary>"
                "</FictionBook>"
            )

        result = analyze_media_file(path, "fb2")
        assert result.detected_format == "fb2"

    def test_fb2_empty_file_is_rejected(self, tmp_path):
        """空文件不是有效 FB2。"""
        path = str(tmp_path / "empty.fb2")
        with open(path, "w", encoding="utf-8"):
            pass

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "fb2")
        assert exc.value.code in ("format.mismatch", "epub.invalid_xml")


class TestFormatSetInvariants:
    def test_download_only_formats_are_disjoint_from_online(self):
        """可下载格式与在线阅读格式必须完全不相交。"""
        assert not (media_analysis.DOWNLOAD_ONLY_FORMATS & media_analysis.ONLINE_READ_FORMATS)

    def test_download_only_formats_are_supported(self):
        """可下载格式必须都在 SUPPORTED_MEDIA_FORMATS 里。"""
        assert media_analysis.DOWNLOAD_ONLY_FORMATS <= media_analysis.SUPPORTED_MEDIA_FORMATS

    def test_download_only_formats_are_not_ebook_or_comic(self):
        """可下载格式不属于电子书也不属于漫画容器。"""
        assert not (media_analysis.DOWNLOAD_ONLY_FORMATS & media_analysis.EBOOK_MEDIA_FORMATS)
        assert not (media_analysis.DOWNLOAD_ONLY_FORMATS & media_analysis.COMIC_CONTAINER_FORMATS)

    def test_supported_is_union_of_all_groups(self):
        """SUPPORTED_MEDIA_FORMATS 必须是各分组的并集。"""
        expected = (
            media_analysis.EBOOK_MEDIA_FORMATS
            | media_analysis.COMIC_CONTAINER_FORMATS
            | media_analysis.MANAGED_DOCUMENT_FORMATS
            | media_analysis.DOWNLOAD_ONLY_FORMATS
        )
        assert media_analysis.SUPPORTED_MEDIA_FORMATS == expected

    def test_online_read_is_ebook_plus_comic(self):
        """ONLINE_READ_FORMATS 必须恰好是电子书与漫画容器的并集。"""
        expected = media_analysis.EBOOK_MEDIA_FORMATS | media_analysis.COMIC_CONTAINER_FORMATS
        assert media_analysis.ONLINE_READ_FORMATS == expected
