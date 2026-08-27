import urllib.parse

from .base import COMMON_CONFIG_PROPERTIES, SourceBase, _format_from, _manifest


class InternetArchiveProvider(SourceBase):
    source_name = "Internet Archive"
    endpoint = "https://archive.org/advancedsearch.php?q=mediatype%3Atexts&fl%5B%5D=identifier,title,creator&rows=25&page=1&output=json"
    manifest = _manifest(
        "talebook.source.internet-archive",
        source_name,
        "检索 Internet Archive；仅明确开放文件可进入待审取得。",
        ["book_sources.browse", "book_sources.search", "book_sources.acquire"],
        {"type": "object", "properties": COMMON_CONFIG_PROPERTIES},
        homepage="https://archive.org/details/texts",
    )

    def discover(self, context):
        search = self.http.request("GET", self.endpoint, headers={"Accept": "application/json"}).json()
        entries = []
        for doc in search.get("response", {}).get("docs", [])[:25]:
            identifier = doc.get("identifier")
            if not identifier:
                continue
            metadata_url = "https://archive.org/metadata/%s" % urllib.parse.quote(str(identifier), safe="")
            metadata = self.http.request("GET", metadata_url, headers={"Accept": "application/json"}).json()
            item_meta = metadata.get("metadata") or {}
            restricted = str(item_meta.get("access-restricted-item", "false")).lower() == "true"
            downloadable = [] if restricted else self._open_files(metadata.get("files") or [], context)
            if downloadable:
                for file_info, fmt in downloadable:
                    name = file_info.get("name", "")
                    entries.append(
                        self._normalize(
                            context,
                            identity="%s:%s" % (identifier, name),
                            title=doc.get("title") or item_meta.get("title"),
                            authors=[doc.get("creator")] if isinstance(doc.get("creator"), str) else doc.get("creator") or [],
                            format_name=fmt,
                            source_url="https://archive.org/details/%s" % identifier,
                            acquisition_url="https://archive.org/download/%s/%s"
                            % (urllib.parse.quote(str(identifier), safe=""), urllib.parse.quote(name)),
                            access="download",
                            license_name=item_meta.get("licenseurl") or item_meta.get("rights") or "由条目权利声明决定",
                        )
                    )
            else:
                entries.append(
                    self._normalize(
                        context,
                        identity=identifier,
                        title=doc.get("title") or item_meta.get("title"),
                        authors=[doc.get("creator")] if isinstance(doc.get("creator"), str) else doc.get("creator") or [],
                        source_url="https://archive.org/details/%s" % identifier,
                        access="restricted" if restricted else "external_link",
                        license_name=item_meta.get("licenseurl") or item_meta.get("rights") or "需查看条目权利声明",
                    )
                )
        return entries, {"seen": len(entries)}

    def _open_files(self, files, context):
        selected = []
        for file_info in files:
            if str(file_info.get("private", "false")).lower() == "true":
                continue
            fmt = _format_from(file_info.get("name", ""), file_info.get("format", ""))
            if fmt and fmt in self._formats(context):
                selected.append((file_info, fmt))
        return selected


PROVIDER = InternetArchiveProvider()
