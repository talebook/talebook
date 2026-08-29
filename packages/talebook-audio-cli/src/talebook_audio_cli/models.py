from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Audiobook:
    book_id: int
    edition_id: int
    title: str
    author: str
    chapter_count: int
    duration_ms: int


@dataclass(frozen=True, slots=True)
class Chapter:
    id: int
    number: int
    title: str
    duration_ms: int
    audio_url: str
