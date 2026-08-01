import hashlib
import json
import re
import zipfile
from collections import Counter
from pathlib import Path, PurePosixPath
from xml.etree import ElementTree

import pytest


REPO_ROOT = Path(__file__).resolve().parents[1]
BOOK_DIR = REPO_ROOT / "docker" / "book"
SOURCE_MANIFEST = BOOK_DIR / "sources.json"
CONTAINER_NS = {"container": "urn:oasis:names:tc:opendocument:xmlns:container"}
OPF_NS = {
    "dc": "http://purl.org/dc/elements/1.1/",
    "opf": "http://www.idpf.org/2007/opf",
}
XHTML_NS = {
    "epub": "http://www.idpf.org/2007/ops",
    "xhtml": "http://www.w3.org/1999/xhtml",
}
XML_SUFFIXES = {".html", ".ncx", ".opf", ".svg", ".xhtml", ".xml"}


@pytest.fixture(scope="module")
def source_manifest():
    return json.loads(SOURCE_MANIFEST.read_text(encoding="utf-8"))


def archive_path(base_path, href):
    return (PurePosixPath(base_path).parent / href).as_posix()


def load_package(archive):
    container = ElementTree.fromstring(archive.read("META-INF/container.xml"))
    rootfile = container.find("container:rootfiles/container:rootfile", CONTAINER_NS)
    assert rootfile is not None
    package_path = rootfile.attrib["full-path"]
    return package_path, ElementTree.fromstring(archive.read(package_path))


def manifest_items(package):
    return {
        item.attrib["id"]: item
        for item in package.findall("opf:manifest/opf:item", OPF_NS)
        if "id" in item.attrib
    }


def navigation_links(archive, package_path, package):
    navigation = next(
        (
            item
            for item in package.findall("opf:manifest/opf:item", OPF_NS)
            if "nav" in item.attrib.get("properties", "").split()
        ),
        None,
    )
    assert navigation is not None
    navigation_path = archive_path(package_path, navigation.attrib["href"])
    navigation_root = ElementTree.fromstring(archive.read(navigation_path))
    toc = next(
        (
            nav
            for nav in navigation_root.findall(".//xhtml:nav", XHTML_NS)
            if nav.attrib.get("{http://www.idpf.org/2007/ops}type") == "toc"
        ),
        None,
    )
    assert toc is not None
    return toc.findall(".//xhtml:a", XHTML_NS)


def combined_text_resources(archive):
    chunks = []
    for name in archive.namelist():
        if PurePosixPath(name).suffix.lower() not in {".html", ".ncx", ".opf", ".xhtml", ".xml"}:
            continue
        chunks.append(archive.read(name).decode("utf-8-sig"))
    return "\n".join(chunks)


def test_preset_collection_contains_exactly_ten_books_in_expected_formats(source_manifest):
    books = source_manifest["books"]
    expected_files = {book["filename"] for book in books}
    actual_files = {path.name for path in BOOK_DIR.iterdir() if path.name != SOURCE_MANIFEST.name}
    format_counts = Counter(path.suffix.lower() for path in BOOK_DIR.iterdir() if path.name != SOURCE_MANIFEST.name)

    assert source_manifest["schema_version"] == 2
    assert len(books) == 10
    assert len(expected_files) == 10
    assert actual_files == expected_files
    assert format_counts == {".epub": 6, ".mobi": 1, ".azw3": 1, ".txt": 1, ".pdf": 1}
    assert sum(book["language"] == "zh-CN" for book in books) == 5
    assert sum(book["language"] == "en-GB" for book in books) == 5
    assert all(Path(book["filename"]).suffix.lower() == f".{book['format'].lower()}" for book in books)


def test_source_manifest_is_auditable(source_manifest):
    assert source_manifest["generated_on"] == "2026-07-23"
    assert source_manifest["chinese_conversion"]["configuration"] == "t2s"
    assert source_manifest["format_conversion"]["version"] == "8.5.0"
    assert "TXT and PDF" in source_manifest["format_conversion"]["metadata_limit"]

    for book in source_manifest["books"]:
        assert book["source"] in {"Project Gutenberg", "Standard Ebooks"}
        assert book["source_page"].startswith("https://")
        assert book["download_url"].startswith("https://")
        assert book["retrieved_on"] == "2026-07-23"
        assert re.fullmatch(r"[0-9a-f]{64}", book["source_sha256"])
        assert re.fullmatch(r"[0-9a-f]{64}", book["sha256"])
        assert "public domain" in book["rights"].lower()
        assert isinstance(book["transformations"], list)
        assert book["format"] in {"EPUB", "MOBI", "AZW3", "TXT", "PDF"}


def test_preset_artifact_hashes_match_source_manifest(source_manifest):
    for book in source_manifest["books"]:
        artifact = BOOK_DIR / book["filename"]
        assert hashlib.sha256(artifact.read_bytes()).hexdigest() == book["sha256"]


@pytest.mark.parametrize(
    "filename",
    [
        "hong-lou-meng.epub",
        "xi-you-ji.epub",
        "san-guo-zhi-yan-yi.epub",
        "shui-hu-zhuan.epub",
        "dao-de-jing.epub",
        "the-adventures-of-sherlock-holmes.epub",
    ],
)
def test_preset_epub_structure_metadata_cover_and_content(source_manifest, filename):
    record = next(book for book in source_manifest["books"] if book["filename"] == filename)
    epub_path = BOOK_DIR / filename

    with zipfile.ZipFile(epub_path) as archive:
        first_entry = archive.infolist()[0]
        assert first_entry.filename == "mimetype"
        assert first_entry.compress_type == zipfile.ZIP_STORED
        assert archive.read("mimetype") == b"application/epub+zip"
        assert archive.testzip() is None

        for name in archive.namelist():
            if PurePosixPath(name).suffix.lower() in XML_SUFFIXES:
                ElementTree.fromstring(archive.read(name))

        package_path, package = load_package(archive)
        assert package.findtext("opf:metadata/dc:title", namespaces=OPF_NS) == record["title"]
        assert package.findtext("opf:metadata/dc:creator", namespaces=OPF_NS) == record["author"]
        assert package.findtext("opf:metadata/dc:language", namespaces=OPF_NS) == record["language"]

        items = manifest_items(package)
        cover = next(
            (item for item in items.values() if "cover-image" in item.attrib.get("properties", "").split()),
            None,
        )
        assert cover is not None
        cover_path = archive_path(package_path, cover.attrib["href"])
        assert archive.getinfo(cover_path).file_size > 0

        spine_ids = [
            itemref.attrib["idref"]
            for itemref in package.findall("opf:spine/opf:itemref", OPF_NS)
            if itemref.attrib.get("idref") in items
        ]
        text_bytes = sum(
            archive.getinfo(archive_path(package_path, items[item_id].attrib["href"])).file_size
            for item_id in spine_ids
            if items[item_id].attrib.get("media-type") == "application/xhtml+xml"
        )
        assert text_bytes > 25_000

        links = navigation_links(archive, package_path, package)
        if "chapter_count" in record:
            chapter_links = [link for link in links if "#chapter-" in link.attrib.get("href", "")]
            assert len(chapter_links) == record["chapter_count"]
        else:
            assert len(links) >= record["minimum_navigation_entries"]


@pytest.mark.parametrize(
    ("filename", "traditional_title"),
    [
        ("hong-lou-meng.epub", "紅樓夢"),
        ("xi-you-ji.epub", "西遊記"),
        ("san-guo-zhi-yan-yi.epub", "三國志演義"),
        ("shui-hu-zhuan.epub", "水滸傳"),
        ("dao-de-jing.epub", "道德經"),
    ],
)
def test_chinese_editions_are_simplified_and_keep_gutenberg_notice(filename, traditional_title):
    with zipfile.ZipFile(BOOK_DIR / filename) as archive:
        text = combined_text_resources(archive)

    assert traditional_title not in text
    assert "THE FULL PROJECT GUTENBERG" in text
    assert "Project Gutenberg 使用说明" in text


@pytest.mark.parametrize(
    "filename",
    [
        "the-adventures-of-sherlock-holmes.epub",
    ],
)
def test_standard_ebooks_editions_keep_cc0_notice(filename):
    with zipfile.ZipFile(BOOK_DIR / filename) as archive:
        text = combined_text_resources(archive)

    assert "creativecommons.org/publicdomain/zero/1.0" in text


@pytest.mark.parametrize(
    ("filename", "title", "author", "minimum_size"),
    [
        ("pride-and-prejudice.mobi", b"Pride and Prejudice", b"Jane Austen", 900_000),
        ("the-picture-of-dorian-gray.azw3", b"The Picture of Dorian Gray", b"Oscar Wilde", 600_000),
    ],
)
def test_kindle_formats_have_palm_database_signature_and_metadata(filename, title, author, minimum_size):
    data = (BOOK_DIR / filename).read_bytes()

    assert data[60:68] == b"BOOKMOBI"
    assert title in data
    assert author in data
    assert len(data) > minimum_size


def test_frankenstein_txt_is_complete_utf8_with_visible_metadata_and_rights():
    data = (BOOK_DIR / "frankenstein.txt").read_bytes()
    text = data.decode("utf-8")

    assert data.startswith(b"Frankenstein\n")
    assert "\r\n" not in text
    assert "Mary Shelley" in text[:500]
    assert re.search(r"Chapter\s+I\b", text)
    assert re.search(r"Chapter\s+XXIV\b", text)
    assert "CC0 1.0 Universal Public Domain Dedication" in text
    assert len(text.splitlines()) == 2087
    assert len(data) > 400_000


def test_alice_pdf_has_valid_signature_complete_file_and_illustrations(source_manifest):
    data = (BOOK_DIR / "alices-adventures-in-wonderland.pdf").read_bytes()
    record = next(book for book in source_manifest["books"] if book["format"] == "PDF")

    assert data.startswith(b"%PDF-1.7")
    assert data.rstrip().endswith(b"%%EOF")
    assert data.count(b"/Subtype /Image") >= 80
    assert len(data) > 10_000_000
    assert record["page_count"] == 102
