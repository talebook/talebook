from .base import COMMON_CONFIG_PROPERTIES, SourceBase, _format_from, _manifest


class GutenbergProvider(SourceBase):
    source_name = "Project Gutenberg"
    license_name = "Project Gutenberg License"
    endpoint = "https://gutendex.com/books/"
    manifest = _manifest(
        "talebook.source.gutenberg",
        source_name,
        "检索 Project Gutenberg 的合法开放电子书。",
        ["book_sources.browse", "book_sources.search", "book_sources.acquire"],
        {"type": "object", "properties": COMMON_CONFIG_PROPERTIES},
        homepage="https://www.gutenberg.org/",
        brand_icon="/images/plugin-icons/project-gutenberg.png",
    )
    manifest["ui"]["catalog_access"] = "public_free"

    @staticmethod
    def initial_enabled(settings):
        return True

    def discover(self, context):
        response = self.http.request("GET", self.endpoint, headers={"Accept": "application/json"})
        payload = response.json()
        entries = []
        for book in payload.get("results", [])[:200]:
            for mime, url in (book.get("formats") or {}).items():
                fmt = _format_from(url, mime)
                if not fmt or fmt not in self._formats(context) or not url:
                    continue
                entries.append(
                    self._normalize(
                        context,
                        identity="%s:%s" % (book.get("id"), fmt),
                        title=book.get("title"),
                        authors=[item.get("name", "") for item in book.get("authors", [])],
                        format_name=fmt,
                        source_url="https://www.gutenberg.org/ebooks/%s" % book.get("id"),
                        acquisition_url=url,
                        access="download",
                    )
                )
        return entries, {"next": payload.get("next") or "", "seen": len(entries)}


PROVIDER = GutenbergProvider()
