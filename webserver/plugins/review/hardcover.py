from webserver.plugins.runtime.domains import Review

from .base import CatalogReviewProvider, ReviewSourceSpec


SPEC = ReviewSourceSpec(
    plugin_id="talebook.review.hardcover",
    key="hardcover",
    name="Hardcover",
    homepage="https://hardcover.app",
    icon="mdi-book-star-outline",
    scale=5,
    brand_icon="/images/plugin-icons/hardcover.png",
    requires_token=True,
)


class HardcoverProvider(CatalogReviewProvider):
    def __init__(self, transport=None):
        kwargs = {"transport": transport} if transport is not None else {}
        super().__init__(SPEC, **kwargs)

    def _fetch(self, context, query):
        token = (context.get("secrets") or {}).get("token", "")
        isbn = str(query.get("isbn") or "")
        body = {
            "query": "query($isbn:String!){books(where:{editions:{isbn_13:{_eq:$isbn}}},limit:1){id slug rating rating_count users_read_count}}",
            "variables": {"isbn": isbn},
        }
        return "hardcover:%s" % isbn, self.transport(
            "POST",
            "https://api.hardcover.app/v1/graphql",
            headers={"Authorization": "Bearer %s" % token} if token else {},
            body=body,
        )

    def _parse(self, query, external_id, payload):
        value = (payload.get("data", {}).get("books") or [])[0]
        rating = value["rating"]
        if rating is None:
            raise ValueError("rating is missing")
        return Review.from_rating(
            self.spec.key,
            external_id,
            rating,
            self.spec.scale,
            sample_count=value.get("rating_count") or value.get("users_read_count"),
            source_url="https://hardcover.app/books/%s" % value.get("slug", value["id"]),
            book_id=query.get("book_id"),
            domain_id=query.get("domain_id", ""),
            series_id=query.get("series_id", ""),
        ).to_dict()


PROVIDER = HardcoverProvider()
