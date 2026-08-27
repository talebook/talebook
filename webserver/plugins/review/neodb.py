from webserver.plugins.runtime.domains import Review

from .base import CatalogReviewProvider, ReviewSourceSpec


SPEC = ReviewSourceSpec(
    plugin_id="talebook.review.neodb",
    key="neodb",
    name="NeoDB 评价",
    homepage="https://neodb.social",
    icon="mdi-star-circle-outline",
    scale=10,
)


class NeoDBReviewProvider(CatalogReviewProvider):
    def __init__(self, transport=None):
        kwargs = {"transport": transport} if transport is not None else {}
        super().__init__(SPEC, **kwargs)

    def _fetch(self, context, query):
        token = (context.get("secrets") or {}).get("token", "")
        key = str(query.get("isbn") or query.get("title") or "")
        return "neodb:%s" % key, self.transport(
            "GET",
            "https://neodb.social/api/catalog/search",
            headers={"Authorization": "Bearer %s" % token} if token else {},
            params={"query": key},
        )

    def _parse(self, query, external_id, payload):
        value = (payload.get("data") or payload.get("results") or [])[0]
        rating = value.get("rating") or value.get("rating_score")
        if rating is None:
            raise ValueError("rating is missing")
        return Review.from_rating(
            self.spec.key,
            external_id,
            rating,
            self.spec.scale,
            sample_count=value.get("rating_count") or value.get("rating_number"),
            source_url=value.get("url") or value.get("id", ""),
            source_time=value.get("updated_at") or "",
            book_id=query.get("book_id"),
            domain_id=query.get("domain_id", ""),
            series_id=query.get("series_id", ""),
        ).to_dict()


PROVIDER = NeoDBReviewProvider()
