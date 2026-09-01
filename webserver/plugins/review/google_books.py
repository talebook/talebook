from webserver.plugins.runtime.domains import Review

from .base import CatalogReviewProvider, ReviewSourceSpec


SPEC = ReviewSourceSpec(
    plugin_id="talebook.review.google-books",
    key="google_books",
    name="Google Books 评价",
    homepage="https://books.google.com",
    icon="mdi-google",
    scale=5,
    brand_icon="/images/plugin-icons/google-books.ico",
)


class GoogleBooksReviewProvider(CatalogReviewProvider):
    def __init__(self, transport=None):
        kwargs = {"transport": transport} if transport is not None else {}
        super().__init__(SPEC, **kwargs)

    def _fetch(self, context, query):
        isbn = str(query.get("isbn") or "")
        return "google-books:%s" % isbn, self.transport(
            "GET",
            "https://www.googleapis.com/books/v1/volumes",
            params={"q": "isbn:%s" % isbn},
        )

    def _parse(self, query, external_id, payload):
        value = (payload.get("items") or [])[0]
        info = value.get("volumeInfo") or {}
        rating = info["averageRating"]
        if rating is None:
            raise ValueError("rating is missing")
        return Review.from_rating(
            self.spec.key,
            external_id,
            rating,
            self.spec.scale,
            sample_count=info.get("ratingsCount"),
            source_url=info.get("infoLink") or value.get("selfLink", ""),
            source_time=info.get("publishedDate") or "",
            book_id=query.get("book_id"),
            domain_id=query.get("domain_id", ""),
            series_id=query.get("series_id", ""),
        ).to_dict()


PROVIDER = GoogleBooksReviewProvider()
