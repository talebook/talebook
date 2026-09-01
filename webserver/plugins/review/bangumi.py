from urllib.parse import quote

from webserver.plugins.runtime.domains import Review

from .base import CatalogReviewProvider, ReviewSourceSpec


SPEC = ReviewSourceSpec(
    plugin_id="talebook.review.bangumi",
    key="bangumi",
    name="Bangumi 漫画评价",
    homepage="https://bgm.tv",
    icon="mdi-book-open-outline",
    scale=10,
    brand_icon="/images/plugin-icons/bangumi.png",
)


class BangumiReviewProvider(CatalogReviewProvider):
    def __init__(self, transport=None):
        kwargs = {"transport": transport} if transport is not None else {}
        super().__init__(SPEC, **kwargs)

    def _fetch(self, context, query):
        subject_id = str(query.get("domain_id") or "")
        return "bangumi:%s" % subject_id, self.transport("GET", "https://api.bgm.tv/v0/subjects/" + quote(subject_id))

    def _parse(self, query, external_id, payload):
        rating = payload.get("rating", {}).get("score")
        if rating is None:
            raise ValueError("rating is missing")
        return Review.from_rating(
            self.spec.key,
            external_id,
            rating,
            self.spec.scale,
            sample_count=payload.get("rating", {}).get("total"),
            source_url="https://bgm.tv/subject/%s" % query.get("domain_id"),
            source_time=payload.get("date") or "",
            book_id=query.get("book_id"),
            domain_id=query.get("domain_id", ""),
            series_id=query.get("series_id", ""),
        ).to_dict()


PROVIDER = BangumiReviewProvider()
