#!/usr/bin/env python3

import argparse
import re
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path


FILENAME_PATTERN = re.compile(
    r"^(?P<date>\d{8})-(?P<feature>[a-z0-9]+(?:-[a-z0-9]+)*)\.(?P<status>wip|active|superseded)\.html$"
)
RESERVED_MODULES = {"design", "document"}
RESOURCE_ATTRIBUTES = {
    "audio": ("src",),
    "embed": ("src",),
    "feimage": ("href", "xlink:href"),
    "iframe": ("src",),
    "image": ("href", "xlink:href"),
    "img": ("src", "srcset"),
    "input": ("src",),
    "link": ("href",),
    "object": ("data",),
    "script": ("src",),
    "source": ("src", "srcset"),
    "track": ("src",),
    "use": ("href", "xlink:href"),
    "video": ("src", "poster"),
}
CSS_URL_PATTERN = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)", re.IGNORECASE)
TEMPLATE_PATH = Path("TEMPLATE.html")


def css_has_external_resource(css):
    if re.search(r"@import\b", css, re.IGNORECASE):
        return True
    return any(not value.strip().lower().startswith(("data:", "#")) for _, value in CSS_URL_PATTERN.findall(css))


class DesignHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.has_doctype = False
        self.has_html = False
        self.has_chinese_lang = False
        self.has_head = False
        self.has_title = False
        self.has_utf8_charset = False
        self.has_body = False
        self.external_resource_found = False
        self.in_style = False

    def handle_decl(self, decl):
        if decl.lower() == "doctype html":
            self.has_doctype = True

    def handle_starttag(self, tag, attrs):
        attributes = {name.lower(): (value or "") for name, value in attrs}
        tag = tag.lower()
        for attribute in RESOURCE_ATTRIBUTES.get(tag, ()):
            value = attributes.get(attribute, "").strip().lower()
            if value and not value.startswith(("data:", "#")):
                self.external_resource_found = True
        if css_has_external_resource(attributes.get("style", "")):
            self.external_resource_found = True

        if tag == "html":
            self.has_html = True
            self.has_chinese_lang = attributes.get("lang", "").lower() == "zh-cn"
        elif tag == "head":
            self.has_head = True
        elif tag == "title":
            self.has_title = True
        elif tag == "meta" and attributes.get("charset", "").lower() == "utf-8":
            self.has_utf8_charset = True
        elif tag == "body":
            self.has_body = True
        elif tag == "style":
            self.in_style = True

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag.lower() == "style":
            self.in_style = False

    def handle_data(self, data):
        if self.in_style and css_has_external_resource(data):
            self.external_resource_found = True

    @property
    def has_required_structure(self):
        return all(
            (
                self.has_doctype,
                self.has_html,
                self.has_chinese_lang,
                self.has_head,
                self.has_title,
                self.has_utf8_charset,
                self.has_body,
            )
        )


def validate_path(repo_root, design_root, path):
    relative_path = path.relative_to(design_root)
    if relative_path == TEMPLATE_PATH:
        return True
    if len(relative_path.parts) != 2:
        return False

    module, filename = relative_path.parts
    match = FILENAME_PATTERN.fullmatch(filename)
    if match is None:
        return False

    module_is_valid = module == "project" or (
        module not in RESERVED_MODULES
        and not module.startswith(".")
        and ((repo_root / module).is_dir() or match.group("status") == "superseded")
    )
    if not module_is_valid:
        return False

    try:
        datetime.strptime(match.group("date"), "%Y%m%d")
    except ValueError:
        return False

    return True


def inspect_html(path):
    parser = DesignHTMLParser()
    try:
        parser.feed(path.read_text(encoding="utf-8"))
        parser.close()
    except (OSError, UnicodeError):
        return False, False
    return parser.has_required_structure, not parser.external_resource_found


def check_design_docs(repo_root):
    design_root = repo_root / "design"
    if not design_root.is_dir():
        return ["design directory does not exist"], 0

    files = sorted(path for path in design_root.rglob("*") if path.is_file())
    if not files:
        return ["design directory contains no documents"], 0

    errors = []
    for path in files:
        if not validate_path(repo_root, design_root, path):
            errors.append(f"invalid design document path: {path.relative_to(repo_root)}")
            continue
        if path.name.endswith(".wip.html"):
            errors.append(f"WIP design document cannot be merged: {path.relative_to(repo_root)}")
        valid_structure, resources_are_embedded = inspect_html(path)
        if not valid_structure:
            errors.append(f"invalid HTML structure: {path.relative_to(repo_root)}")
        if not resources_are_embedded:
            errors.append(f"external resource is not allowed: {path.relative_to(repo_root)}")

    return errors, len(files)


def main():
    parser = argparse.ArgumentParser(description="Validate internal design documents.")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1], help="Repository root")
    args = parser.parse_args()

    errors, document_count = check_design_docs(args.root.resolve())
    if errors:
        print("Design document check failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"{document_count} design document(s) passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
