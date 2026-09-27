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

    assert source_manifest["schema_version"] == 3
    assert len(books) == 10
    assert len(expected_files) == 10
    assert actual_files == expected_files
    assert format_counts == {".epub": 8, ".mobi": 1, ".azw3": 1}
    assert sum(book["language"] == "zh-CN" for book in books) == 5
    assert sum(book["language"] == "en-GB" for book in books) == 5
    assert all(Path(book["filename"]).suffix.lower() == f".{book['format'].lower()}" for book in books)


def test_source_manifest_is_auditable(source_manifest):
    assert source_manifest["generated_on"] == "2026-09-04"
    assert source_manifest["chinese_conversion"]["configuration"] == "t2s"
    assert source_manifest["format_conversion"]["version"] == "8.5.0"
    assert source_manifest["format_conversion"]["artifact_formats"] == ["EPUB", "MOBI", "AZW3"]
    assert "preserve author, language, cover" in source_manifest["format_conversion"]["metadata_policy"]

    for book in source_manifest["books"]:
        assert book["source"] in {"Project Gutenberg", "Standard Ebooks"}
        assert book["source_page"].startswith("https://")
        assert book["download_url"].startswith("https://")
        assert book["retrieved_on"] == "2026-07-23"
        assert re.fullmatch(r"[0-9a-f]{64}", book["source_sha256"])
        assert re.fullmatch(r"[0-9a-f]{64}", book["sha256"])
        assert "public domain" in book["rights"].lower()
        assert isinstance(book["transformations"], list)
        assert book["format"] in {"EPUB", "MOBI", "AZW3"}


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
        "alices-adventures-in-wonderland.epub",
        "frankenstein.epub",
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
    ("filename", "series_index"),
    [
        ("san-guo-zhi-yan-yi.epub", 1),
        ("shui-hu-zhuan.epub", 2),
        ("xi-you-ji.epub", 3),
        ("hong-lou-meng.epub", 4),
    ],
)
def test_four_classics_have_epub3_and_calibre_series_metadata(source_manifest, filename, series_index):
    record = next(book for book in source_manifest["books"] if book["filename"] == filename)
    with zipfile.ZipFile(BOOK_DIR / filename) as archive:
        _, package = load_package(archive)

    metadata = package.find("opf:metadata", OPF_NS)
    assert metadata is not None
    meta_elements = metadata.findall("opf:meta", OPF_NS)

    collection = next(
        element for element in meta_elements if element.attrib.get("property") == "belongs-to-collection"
    )
    collection_id = collection.attrib["id"]
    refined = {
        element.attrib.get("property"): element.text
        for element in meta_elements
        if element.attrib.get("refines") == f"#{collection_id}"
    }
    calibre = {
        element.attrib.get("name"): element.attrib.get("content")
        for element in meta_elements
        if element.attrib.get("name", "").startswith("calibre:")
    }

    assert collection.text == "中国四大名著"
    assert refined == {"collection-type": "series", "group-position": str(series_index)}
    assert calibre == {"calibre:series": "中国四大名著", "calibre:series_index": str(series_index)}
    assert record["series"] == "中国四大名著"
    assert record["series_index"] == series_index


@pytest.mark.parametrize(
    "filename",
    [
        "alices-adventures-in-wonderland.epub",
        "frankenstein.epub",
        "the-adventures-of-sherlock-holmes.epub",
    ],
)
def test_standard_ebooks_editions_keep_cc0_notice(filename):
    with zipfile.ZipFile(BOOK_DIR / filename) as archive:
        text = combined_text_resources(archive)

    assert "creativecommons.org/publicdomain/zero/1.0" in text


@pytest.mark.parametrize(
    ("filename", "minimum_subject_count"),
    [
        ("alices-adventures-in-wonderland.epub", 1),
        ("frankenstein.epub", 5),
    ],
)
def test_replacement_epubs_preserve_rich_source_metadata(source_manifest, filename, minimum_subject_count):
    record = next(book for book in source_manifest["books"] if book["filename"] == filename)
    with zipfile.ZipFile(BOOK_DIR / filename) as archive:
        _, package = load_package(archive)

    assert package.findtext("opf:metadata/dc:publisher", namespaces=OPF_NS) == "Standard Ebooks"
    assert len(package.findall("opf:metadata/dc:subject", OPF_NS)) >= minimum_subject_count
    assert package.find("opf:metadata/dc:description", OPF_NS) is not None
    assert record["source_sha256"] == record["sha256"]
    assert record["transformations"] == []
    assert record["calibre_import"]["author"] == record["author"]
    assert record["calibre_import"]["language"] == "eng"
    assert record["calibre_import"]["publisher"] == "Standard Ebooks"
    assert record["calibre_import"]["minimum_tag_count"] == minimum_subject_count


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
