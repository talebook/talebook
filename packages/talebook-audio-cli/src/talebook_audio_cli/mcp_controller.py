from __future__ import annotations

import asyncio
from collections.abc import Callable
from dataclasses import asdict, dataclass
from typing import Any

from .client import TalebookClient, TalebookError
from .config import AppPaths, ConfigError, load_config
from .models import Audiobook, Chapter
from .player import PlayerError, XiaoAiPlayer, format_time


class McpControllerError(RuntimeError):
    """An actionable error safe to expose through MCP."""


@dataclass(frozen=True, slots=True)
class PlaybackResult:
    message: str
    playback_started: bool = False


class McpPlaybackController:
    """Own the Talebook queue and OpenXiaoAI player for one MCP process."""

    def __init__(
        self,
        *,
        paths: AppPaths | None = None,
        client: TalebookClient | None = None,
        player_factory: Callable[[list[Chapter]], XiaoAiPlayer] = XiaoAiPlayer,
        monitor_interval: float = 0.5,
    ):
        self.paths = paths or AppPaths.default()
        self._talebook = client
        self._player_factory = player_factory
        self._monitor_interval = monitor_interval
        self._lock = asyncio.Lock()
        self._monitor_task: asyncio.Task[None] | None = None
        self._generation = 0
        self.player: XiaoAiPlayer | None = None
        self.book: Audiobook | None = None
        self.chapters: list[Chapter] = []
        self.current_index: int | None = None
        self.finished = False

    def _client(self) -> TalebookClient:
        if self._talebook is None:
            self._talebook = TalebookClient(load_config(self.paths), self.paths)
        return self._talebook

    @staticmethod
    def _safe_error(exc: Exception) -> McpControllerError:
        if isinstance(exc, (ConfigError, TalebookError, PlayerError, McpControllerError)):
            return McpControllerError(str(exc))
        return McpControllerError(f"Talebook MCP 操作失败（{exc.__class__.__name__}）")

    async def list_audiobooks(self, query: str | None = None) -> dict[str, Any]:
        try:
            async with self._lock:
                books = await asyncio.to_thread(self._client().list_audiobooks)
        except Exception as exc:
            raise self._safe_error(exc) from exc
        normalized = (query or "").strip().casefold()
        if normalized:
            books = [book for book in books if normalized in book.title.casefold() or normalized in book.author.casefold()]
        return {
            "query": query or "",
            "total": len(books),
            "books": [asdict(book) for book in books],
        }

    async def list_chapters(self, edition_id: int) -> dict[str, Any]:
        try:
            async with self._lock:
                chapters = await asyncio.to_thread(self._client().list_chapters, edition_id)
        except Exception as exc:
            raise self._safe_error(exc) from exc
        return {
            "edition_id": edition_id,
            "total": len(chapters),
            "chapters": [
                {
                    "id": chapter.id,
                    "number": chapter.number,
                    "title": chapter.title,
                    "duration_ms": chapter.duration_ms,
                }
                for chapter in chapters
            ],
        }

    async def _select_book(
        self,
        *,
        edition_id: int | None,
        book_id: int | None,
        query: str | None,
    ) -> Audiobook:
        selectors = sum(value is not None and value != "" for value in (edition_id, book_id, query))
        if selectors > 1:
            raise McpControllerError("edition_id、book_id 和 query 只能提供一个")
        books = await asyncio.to_thread(self._client().list_audiobooks)
        if edition_id is not None:
            matches = [book for book in books if book.edition_id == edition_id]
        elif book_id is not None:
            matches = [book for book in books if book.book_id == book_id]
        elif query:
            normalized = query.strip().casefold()
            matches = [book for book in books if normalized in book.title.casefold() or normalized in book.author.casefold()]
        elif len(books) == 1:
            matches = books
        else:
            raise McpControllerError("请提供 edition_id、book_id 或 query；可先调用 list_audiobooks")
        if not matches:
            raise McpControllerError("没有找到匹配且已发布的有声书")
        if len(matches) > 1:
            options = "、".join(f"{book.title}(edition {book.edition_id})" for book in matches[:5])
            raise McpControllerError(f"匹配到多本有声书：{options}；请改用 edition_id")
        return matches[0]

    async def _cancel_monitor(self) -> None:
        task = self._monitor_task
        self._monitor_task = None
        if task is None or task is asyncio.current_task() or task.done():
            return
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    async def play_audiobook(
        self,
        *,
        edition_id: int | None = None,
        book_id: int | None = None,
        query: str | None = None,
        chapter: int = 1,
    ) -> PlaybackResult:
        await self._cancel_monitor()
        try:
            async with self._lock:
                book = await self._select_book(edition_id=edition_id, book_id=book_id, query=query)
                chapters = await asyncio.to_thread(self._client().list_chapters, book.edition_id)
                try:
                    index = next(index for index, item in enumerate(chapters) if item.number == chapter)
                except StopIteration as exc:
                    raise McpControllerError(f"有声书《{book.title}》没有第 {chapter} 章") from exc
                if self.player is not None:
                    await asyncio.to_thread(self.player.close)
                self.player = None
                self.book = None
                self.chapters = []
                self.current_index = None
                player = self._player_factory(chapters)
                await asyncio.to_thread(player.load, index)
                self.player = player
                self.book = book
                self.chapters = chapters
                self.current_index = index
                self.finished = False
                self._generation += 1
                generation = self._generation
        except Exception as exc:
            raise self._safe_error(exc) from exc
        self._monitor_task = asyncio.create_task(self._monitor(generation))
        return PlaybackResult(
            f"正在播放《{book.title}》第 {chapter} 章：{chapters[index].title}",
            playback_started=True,
        )

    async def _monitor(self, generation: int) -> None:
        try:
            while True:
                await asyncio.sleep(self._monitor_interval)
                async with self._lock:
                    if generation != self._generation or self.player is None or self.current_index is None:
                        return
                    _position, _duration, _paused, idle = await asyncio.to_thread(self.player.status)
                    if not idle:
                        continue
                    next_index = self.current_index + 1
                    if next_index >= len(self.chapters):
                        self.finished = True
                        return
                    await asyncio.to_thread(self.player.load, next_index)
                    self.current_index = next_index
        except asyncio.CancelledError:
            raise
        except Exception:
            self.finished = True

    async def pause(self) -> PlaybackResult:
        try:
            async with self._lock:
                if self.player is None:
                    return PlaybackResult("当前没有 Talebook 有声书在播放")
                _position, _duration, paused, idle = await asyncio.to_thread(self.player.status)
                if idle:
                    return PlaybackResult("当前没有 Talebook 有声书在播放")
                if paused:
                    return PlaybackResult("当前已经暂停")
                await asyncio.to_thread(self.player.toggle_pause)
                return PlaybackResult("已暂停 Talebook 有声书")
        except Exception as exc:
            raise self._safe_error(exc) from exc

    async def resume(self) -> PlaybackResult:
        try:
            async with self._lock:
                if self.player is None:
                    return PlaybackResult("当前没有可恢复的 Talebook 有声书")
                _position, _duration, paused, idle = await asyncio.to_thread(self.player.status)
                if idle:
                    return PlaybackResult("当前没有可恢复的 Talebook 有声书")
                if not paused:
                    return PlaybackResult("Talebook 有声书正在播放中")
                await asyncio.to_thread(self.player.toggle_pause)
                return PlaybackResult("已恢复 Talebook 有声书播放")
        except Exception as exc:
            raise self._safe_error(exc) from exc

    async def _move(self, delta: int) -> PlaybackResult:
        try:
            async with self._lock:
                if self.player is None or self.current_index is None:
                    return PlaybackResult("当前没有 Talebook 章节队列")
                target = self.current_index + delta
                if target < 0:
                    return PlaybackResult("已经是第一章")
                if target >= len(self.chapters):
                    return PlaybackResult("已经是最后一章")
                await asyncio.to_thread(self.player.load, target)
                self.current_index = target
                self.finished = False
                chapter = self.chapters[target]
                return PlaybackResult(
                    f"正在播放第 {chapter.number} 章：{chapter.title}",
                    playback_started=True,
                )
        except Exception as exc:
            raise self._safe_error(exc) from exc

    async def next_chapter(self) -> PlaybackResult:
        return await self._move(1)

    async def previous_chapter(self) -> PlaybackResult:
        return await self._move(-1)

    async def stop(self) -> PlaybackResult:
        await self._cancel_monitor()
        try:
            async with self._lock:
                if self.player is not None:
                    await asyncio.to_thread(self.player.close)
                self.player = None
                self.book = None
                self.chapters = []
                self.current_index = None
                self.finished = False
                self._generation += 1
                return PlaybackResult("已停止 Talebook 有声书")
        except Exception as exc:
            raise self._safe_error(exc) from exc

    async def status(self) -> dict[str, Any]:
        try:
            async with self._lock:
                if self.player is None or self.current_index is None or self.book is None:
                    return {"state": "idle", "message": "当前没有 Talebook 有声书在播放"}
                position, duration, paused, idle = await asyncio.to_thread(self.player.status)
                chapter = self.chapters[self.current_index]
                state = "finished" if self.finished else "idle" if idle else "paused" if paused else "playing"
                return {
                    "state": state,
                    "book_id": self.book.book_id,
                    "edition_id": self.book.edition_id,
                    "book_title": self.book.title,
                    "chapter": chapter.number,
                    "chapter_title": chapter.title,
                    "queue_position": self.current_index + 1,
                    "queue_total": len(self.chapters),
                    "position_seconds": int(position),
                    "duration_seconds": int(duration),
                    "message": (
                        f"{state}：《{self.book.title}》第 {chapter.number} 章 {chapter.title}，"
                        f"{format_time(position)}/{format_time(duration)}，队列 {self.current_index + 1}/{len(self.chapters)}"
                    ),
                }
        except Exception as exc:
            raise self._safe_error(exc) from exc

    async def shutdown(self) -> None:
        try:
            await self.stop()
        except McpControllerError:
            pass
