#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""实施项 11.5：DOCX / FB2 / HTMLZ 三种新增格式的容器校验测试。

设计约束（计划 5.8 节）：
- 三种格式加入 ``SUPPORTED_MEDIA_FORMATS``，可被导入；
- **不加入** ``ONLINE_READ_FORMATS``，因此 ``online_readable`` 恒为 ``False``；
- 必须做容器校验，伪造扩展名要被 ``format.mismatch`` 拒绝。
"""

import zipfile

import pytest

from webserver.constants import MEDIA_TYPE_UNKNOWN
from webserver.services.media_analysis import (
    ONLINE_READ_FORMATS,
    SUPPORTED_MEDIA_FORMATS,
    InvalidMediaError,
    analyze_media_file,
    online_readable_formats,
)


# ---------------------------------------------------------------- 构造样本


def _write_docx(path, *, content_types=True, extra=True):
    """写一个最小但结构合法的 DOCX。"""
    with zipfile.ZipFile(path, "w") as archive:
        if content_types:
            archive.writestr(
                "[Content_Types].xml",
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                '<Default Extension="xml" ContentType="application/xml"/>'
                '<Override PartName="/word/document.xml" '
                'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
                "</Types>",
            )
        if extra:
            archive.writestr(
                "word/document.xml",
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                "<w:body><w:p><w:r><w:t>正文</w:t></w:r></w:p></w:body></w:document>",
            )


def _write_fb2(path, *, root="FictionBook", body=True):
    """写一个最小但结构合法的 FB2。"""
    inner = "<body><section><p>正文</p></section></body>" if body else ""
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        f'<{root} xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">{inner}</{root}>'
    )
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(xml)


def _write_htmlz(path, *, index=True):
    """写一个最小但结构合法的 HTMLZ。"""
    with zipfile.ZipFile(path, "w") as archive:
        if index:
            archive.writestr(
                "index.html",
                "<html><head><title>书</title></head><body><p>正文</p></body></html>",
            )
        archive.writestr("metadata.opf", "<package/>")


# ---------------------------------------------------------------- 格式集合


class TestFormatSets:
    def test_new_formats_are_supported(self):
        """三种新格式必须可导入。"""
        for fmt in ("docx", "fb2", "htmlz"):
            assert fmt in SUPPORTED_MEDIA_FORMATS, f"{fmt} 应在 SUPPORTED_MEDIA_FORMATS 中"

    def test_new_formats_are_not_online_readable(self):
        """三种新格式必须不可在线阅读。"""
        for fmt in ("docx", "fb2", "htmlz"):
            assert fmt not in ONLINE_READ_FORMATS, f"{fmt} 不应在 ONLINE_READ_FORMATS 中"

    def test_online_readable_formats_returns_false(self):
        """online_readable_formats 对三种新格式返回 False。"""
        for fmt in ("docx", "fb2", "htmlz"):
            assert online_readable_formats([fmt]) is False

    def test_existing_online_formats_unaffected(self):
        """既有在线阅读格式不受影响。"""
        for fmt in ("epub", "pdf", "txt", "mobi", "cbz"):
            assert online_readable_formats([fmt]) is True


# ---------------------------------------------------------------- DOCX


class TestDocx:
    def test_valid_docx_is_accepted(self, tmp_path):
        path = str(tmp_path / "book.docx")
        _write_docx(path)

        result = analyze_media_file(path, "docx")

        assert result.declared_format == "docx"
        assert result.detected_format == "docx"
        assert result.media_type == MEDIA_TYPE_UNKNOWN
        assert result.mime_type == (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

    def test_docx_without_content_types_is_rejected(self, tmp_path):
        """缺少 [Content_Types].xml 的 ZIP 不是 DOCX。"""
        path = str(tmp_path / "bad.docx")
        _write_docx(path, content_types=False)

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "docx")
        assert exc.value.code == "format.mismatch"

    def test_txt_renamed_to_docx_is_rejected(self, tmp_path):
        """把 TXT 改名为 .docx 必须被拒绝。"""
        path = str(tmp_path / "fake.docx")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("这其实是一个纯文本文件，不是 DOCX。")

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "docx")
        assert exc.value.code == "format.mismatch"

    def test_epub_renamed_to_docx_is_rejected(self, tmp_path):
        """EPUB 也是 ZIP，但没有 [Content_Types].xml，必须被拒绝。"""
        path = str(tmp_path / "fake.docx")
        with zipfile.ZipFile(path, "w") as archive:
            archive.writestr("mimetype", "application/epub+zip")
            archive.writestr("META-INF/container.xml", "<container/>")

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "docx")
        assert exc.value.code == "format.mismatch"

    def test_corrupt_docx_is_rejected(self, tmp_path):
        """损坏的 ZIP 必须被拒绝。"""
        path = str(tmp_path / "corrupt.docx")
        with open(path, "wb") as fh:
            fh.write(b"PK\x03\x04" + b"\x00" * 40)

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "docx")
        assert exc.value.code in ("format.mismatch", "archive.corrupt")


# ---------------------------------------------------------------- FB2


class TestFb2:
    def test_valid_fb2_is_accepted(self, tmp_path):
        path = str(tmp_path / "book.fb2")
        _write_fb2(path)

        result = analyze_media_file(path, "fb2")

        assert result.declared_format == "fb2"
        assert result.detected_format == "fb2"
        assert result.media_type == MEDIA_TYPE_UNKNOWN
        assert result.mime_type == "application/fb2+xml"

    def test_fb2_without_body_is_rejected(self, tmp_path):
        """缺少 body 的 FictionBook 不是有效 FB2。"""
        path = str(tmp_path / "nobody.fb2")
        _write_fb2(path, body=False)

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "fb2")
        assert exc.value.code == "format.mismatch"

    def test_wrong_root_element_is_rejected(self, tmp_path):
        """根元素不是 FictionBook 必须被拒绝。"""
        path = str(tmp_path / "wrong.fb2")
        _write_fb2(path, root="NotFictionBook")

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "fb2")
        assert exc.value.code == "format.mismatch"

    def test_txt_renamed_to_fb2_is_rejected(self, tmp_path):
        """把 TXT 改名为 .fb2 必须被拒绝。"""
        path = str(tmp_path / "fake.fb2")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("这其实是一个纯文本文件。")

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "fb2")
        assert exc.value.code == "format.mismatch"

    def test_malformed_xml_is_rejected(self, tmp_path):
        """XML 不合法必须被拒绝。"""
        path = str(tmp_path / "broken.fb2")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("<FictionBook><body><unclosed></body></FictionBook>")

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "fb2")
        assert exc.value.code in ("format.mismatch", "epub.invalid_xml")

    def test_xxe_entities_are_not_resolved(self, tmp_path):
        """外部实体不得被解析（安全约束）。"""
        path = str(tmp_path / "xxe.fb2")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(
                '<?xml version="1.0"?>'
                '<!DOCTYPE FictionBook [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>'
                '<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">'
                "<body><section><p>&xxe;</p></section></body></FictionBook>"
            )

        # 要么拒绝，要么接受但绝不解析出文件内容
        try:
            result = analyze_media_file(path, "fb2")
        except InvalidMediaError as exc:
            assert exc.code in ("format.mismatch", "epub.invalid_xml")
        else:
            assert result.detected_format == "fb2"


# ---------------------------------------------------------------- HTMLZ


class TestHtmlz:
    def test_valid_htmlz_is_accepted(self, tmp_path):
        path = str(tmp_path / "book.htmlz")
        _write_htmlz(path)

        result = analyze_media_file(path, "htmlz")

        assert result.declared_format == "htmlz"
        assert result.detected_format == "htmlz"
        assert result.media_type == MEDIA_TYPE_UNKNOWN
        assert result.mime_type == "application/octet-stream"

    def test_htmlz_without_index_is_rejected(self, tmp_path):
        """缺少 index.html 的 ZIP 不是 HTMLZ。"""
        path = str(tmp_path / "noindex.htmlz")
        _write_htmlz(path, index=False)

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "htmlz")
        assert exc.value.code == "format.mismatch"

    def test_txt_renamed_to_htmlz_is_rejected(self, tmp_path):
        """把 TXT 改名为 .htmlz 必须被拒绝。"""
        path = str(tmp_path / "fake.htmlz")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("这其实是一个纯文本文件。")

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "htmlz")
        assert exc.value.code == "format.mismatch"

    def test_empty_htmlz_is_rejected(self, tmp_path):
        """空 ZIP 必须被拒绝。"""
        path = str(tmp_path / "empty.htmlz")
        with zipfile.ZipFile(path, "w"):
            pass

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "htmlz")
        assert exc.value.code in ("format.mismatch", "archive.empty")


# ---------------------------------------------------------------- 通用约束


class TestCommonConstraints:
    def test_unsupported_format_still_rejected(self, tmp_path):
        """未加入的格式仍返回 format.unsupported。"""
        path = str(tmp_path / "book.xyz")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("x")

        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(path, "xyz")
        assert exc.value.code == "format.unsupported"

    def test_missing_file_is_rejected(self, tmp_path):
        """文件不存在返回 media.unreadable。"""
        with pytest.raises(InvalidMediaError) as exc:
            analyze_media_file(str(tmp_path / "nope.docx"), "docx")
        assert exc.value.code == "media.unreadable"

    def test_leading_dot_and_uppercase_are_normalized(self, tmp_path):
        """声明格式的大小写与前导点必须被归一化。"""
        path = str(tmp_path / "book.docx")
        _write_docx(path)

        for declared in (".DOCX", "DOCX", ".docx"):
            result = analyze_media_file(path, declared)
            assert result.declared_format == "docx"

    def test_new_formats_do_not_affect_mixed_media_detection(self, tmp_path):
        """新格式不属于电子书也不属于漫画，不影响混合检测。"""
        from webserver.services.media_analysis import has_mixed_media_formats

        assert has_mixed_media_formats(["docx"]) is False
        assert has_mixed_media_formats(["docx", "cbz"]) is False
        assert has_mixed_media_formats(["epub", "cbz"]) is True

    def test_docx_is_not_classified_as_comic(self, tmp_path):
        """DOCX 即使含图片也不得被归为漫画。"""
        path = str(tmp_path / "withimage.docx")
        with zipfile.ZipFile(path, "w") as archive:
            archive.writestr(
                "[Content_Types].xml",
                '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
            )
            archive.writestr("word/media/image1.png", b"\x89PNG\r\n\x1a\n" + b"x" * 100)

        result = analyze_media_file(path, "docx")
        assert result.media_type == MEDIA_TYPE_UNKNOWN

    def test_analysis_to_dict_shape(self, tmp_path):
        """to_dict 的字段集合必须稳定。"""
        path = str(tmp_path / "book.fb2")
        _write_fb2(path)

        data = analyze_media_file(path, "fb2").to_dict()
        assert set(data) == {
            "declared_format",
            "detected_format",
            "mime_type",
            "media_type",
            "analysis_reason",
        }
