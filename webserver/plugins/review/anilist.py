from datetime import datetime, timezone

from webserver.plugins.runtime.domains import Review

from .base import CatalogReviewProvider, ReviewSourceSpec


SPEC = ReviewSourceSpec(
    plugin_id="talebook.review.anilist",
    key="anilist",
    name="AniList 漫画评价",
    homepage="https://anilist.co",
    icon="mdi-format-list-numbered",
    scale=100,
)


class AniListReviewProvider(CatalogReviewProvider):
    def __init__(self, transport=None):
        kwargs = {"transport": transport} if transport is not None else {}
        super().__init__(SPEC, **kwargs)

    def _fetch(self, context, query):
        media_id = str(query.get("domain_id") or "")
        body = {
            "query": "query($id:Int){Media(id:$id,type:MANGA){id siteUrl averageScore popularity updatedAt}}",
            "variables": {"id": int(media_id)},
        }
        return "anilist:%s" % media_id, self.transport("POST", "https://graphql.anilist.co", body=body)

    def _parse(self, query, external_id, payload):
        value = payload.get("data", {}).get("Media") or {}
        rating = value["averageScore"]
        if rating is None:
            raise ValueError("rating is missing")
        source_time = datetime.fromtimestamp(value["updatedAt"], timezone.utc).isoformat() if value.get("updatedAt") else ""
        return Review.from_rating(
            self.spec.key,
            external_id,
            rating,
            self.spec.scale,
            sample_count=value.get("popularity"),
            source_url=value.get("siteUrl", ""),
            source_time=source_time,
            book_id=query.get("book_id"),
            domain_id=query.get("domain_id", ""),
            series_id=query.get("series_id", ""),
        ).to_dict()


PROVIDER = AniListReviewProvider()
