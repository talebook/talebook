"""Local, permission-scoped book recommendations without external tracking."""

import datetime
import heapq
import math
from collections import Counter

from webserver.models import Item, ReadingState


_FIELDS = ("authors", "tags", "series", "rating", "timestamp")
_UNKNOWN = {"unknown", "未知", "佚名", "none", "无", "未分类"}
_FEATURE_WEIGHTS = {"authors": 10.0, "tags": 8.0, "series": 12.0}
_MAX_SEEDS = 100


def _terms(value):
    if not value:
        return frozenset()
    values = (value,) if isinstance(value, str) else value
    return frozenset(term for v in values if (term := str(v).strip().casefold()) and term not in _UNKNOWN)


def _timestamp(value):
    if not isinstance(value, datetime.datetime):
        return 0.0
    if value.tzinfo is None:
        value = value.replace(tzinfo=datetime.timezone.utc)
    return value.timestamp()


def recent_book_ids(cache, book_ids, count):
    if count <= 0 or not book_ids:
        return []
    timestamps = cache.all_field_for("timestamp", book_ids)
    return heapq.nlargest(count, book_ids, key=lambda bid: (_timestamp(timestamps.get(bid)), bid))


def _state_time(state):
    return max(
        _timestamp(getattr(state, name, None)) for name in ("favorite_date", "wants_date", "read_date", "progress_update_time")
    )


def _signal_weight(state):
    # Explicit interest is stronger than simply opening or finishing a book.
    return max(5 * bool(state.favorite), 3 * bool(state.wants), 2 * (state.read_state == 2), state.read_state == 1)


def _popularity(book):
    return max(0, book.get("count_visit") or 0) + 2 * max(0, book.get("count_download") or 0)


def rank_book_ids(books, states=(), count=12, now=None):
    """Rank lightweight metadata. Both books and states must already be scoped to the reader."""
    if count <= 0 or not books:
        return []
    now_ts = _timestamp(now or datetime.datetime.now(datetime.timezone.utc))
    book_map = {book["id"]: book for book in books}
    state_map = {state.book_id: state for state in states if state.book_id in book_map}
    eligible = {
        bid: book
        for bid, book in book_map.items()
        if not ((state := state_map.get(bid)) and (state.read_state in (1, 2) or state.progress))
    }
    seeds = sorted(
        (state for state in state_map.values() if _signal_weight(state)),
        key=lambda state: (_state_time(state), state.book_id),
        reverse=True,
    )[:_MAX_SEEDS]
    if not seeds:
        # Without personal interest, show genuinely popular books first.
        # Ratings and recency only break heat ties; do not cap or diversify heat.
        return heapq.nlargest(
            count,
            eligible,
            key=lambda bid: (
                _popularity(eligible[bid]),
                min(10, max(0, eligible[bid].get("rating") or 0)),
                _timestamp(eligible[bid].get("timestamp")),
                bid,
            ),
        )
    features = {bid: {field: _terms(book.get(field)) for field in _FEATURE_WEIGHTS} for bid, book in book_map.items()}
    tag_frequency = Counter(tag for feature in features.values() for tag in feature["tags"])
    profiles = {field: Counter() for field in _FEATURE_WEIGHTS}
    for state in seeds:
        age_days = max(0, now_ts - _state_time(state)) / 86400 if _state_time(state) else 0
        weight = _signal_weight(state) / (1 + age_days / 180)
        for field, terms in features[state.book_id].items():
            for term in terms:
                profiles[field][term] += weight
    # Tags found on almost every book convey less interest than specific genres.
    for tag in profiles["tags"]:
        profiles["tags"][tag] *= math.log1p(len(books) / (1 + tag_frequency[tag]))
    profile_max = {field: max(profile.values(), default=1) for field, profile in profiles.items()}

    scores = {}
    for bid, book in eligible.items():
        state = state_map.get(bid)
        score = 0.0
        for field, weight in _FEATURE_WEIGHTS.items():
            match = max((profiles[field][term] for term in features[bid][field]), default=0)
            score += weight * match / profile_max[field]
        if state:
            score += 6 * bool(state.favorite) + 4 * bool(state.wants)
        # Calibre ratings range from zero to ten. Popularity is capped so one
        # heavily exposed title cannot overwhelm content affinity.
        score += 6 * min(10, max(0, book.get("rating") or 0)) / 10
        score += min(2, math.log1p(_popularity(book)) / 4)
        timestamp = _timestamp(book.get("timestamp"))
        if timestamp:
            score += 1 / (1 + max(0, now_ts - timestamp) / (86400 * 90))
        scores[bid] = score

    def order_key(bid, score):
        return score, _timestamp(book_map[bid].get("timestamp")), bid

    # Bound greedy diversification work; metadata is read from the cache once,
    # and only selected books later need full formatting and file information.
    pool = set(heapq.nlargest(max(100, count * 8), scores, key=lambda bid: order_key(bid, scores[bid])))
    representatives = {}
    for bid in scores:
        for field in ("authors", "series"):
            for term in features[bid][field]:
                identity = (field, term)
                previous = representatives.get(identity)
                if previous is None or order_key(bid, scores[bid]) > order_key(previous, scores[previous]):
                    representatives[identity] = bid
    pool.update(
        heapq.nlargest(max(100, count * 2), set(representatives.values()), key=lambda bid: order_key(bid, scores[bid]))
    )
    heap = [(*(-value for value in order_key(bid, scores[bid])), bid) for bid in pool]
    heapq.heapify(heap)
    authors = Counter()
    series = Counter()
    result = []
    while heap and len(result) < count:
        bid = heapq.heappop(heap)[-1]
        author_penalty = 4 * max((authors[term] for term in features[bid]["authors"]), default=0)
        series_penalty = 6 * max((series[term] for term in features[bid]["series"]), default=0)
        key = order_key(bid, scores[bid] - author_penalty - series_penalty)
        priority = (*(-value for value in key), bid)
        # Repetition penalties only increase, so cached priorities are upper
        # bounds. Refresh a candidate until it beats every remaining bound.
        if heap and priority > heap[0]:
            heapq.heappush(heap, priority)
            continue
        result.append(bid)
        authors.update(features[bid]["authors"])
        series.update(features[bid]["series"])
    return result


def recommend_book_ids(cache, session, user_id, book_ids, count):
    """Use only visible books and this reader's states; do not cache across readers."""
    if count <= 0 or not book_ids:
        return []
    metadata = {field: cache.all_field_for(field, book_ids) for field in _FIELDS}
    # Avoid one SQL placeholder per library book (large libraries can exceed
    # SQLite's variable limit). Hidden and stale rows never enter the ranking.
    visible_ids = set(book_ids)
    items = session.query(Item.book_id, Item.count_visit, Item.count_download).all()
    popularity = {item.book_id: item for item in items if item.book_id in visible_ids}
    books = []
    for bid in book_ids:
        book = {field: values.get(bid) for field, values in metadata.items()}
        book["id"] = bid
        item = popularity.get(bid)
        if item:
            book.update(count_visit=item.count_visit, count_download=item.count_download)
        books.append(book)
    states = []
    if user_id:
        states = [
            state
            for state in session.query(ReadingState).filter(ReadingState.reader_id == user_id).all()
            if state.book_id in visible_ids
        ]
    return rank_book_ids(books, states, count)
