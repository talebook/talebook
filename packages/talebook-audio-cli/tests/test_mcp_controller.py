import asyncio

import pytest
from talebook_audio_cli.mcp_controller import McpControllerError, McpPlaybackController
from talebook_audio_cli.mcp_server import BRIDGE_CONTROL_KEY, PLAYBACK_STARTED_SIGNAL
from talebook_audio_cli.models import Audiobook, Chapter


class FakeTalebookClient:
    def __init__(self):
        self.books = [
            Audiobook(10, 1, "西游记", "吴承恩", 2, 120000),
            Audiobook(11, 2, "西游记续", "测试作者", 1, 30000),
        ]
        self.chapters = {
            1: [
                Chapter(101, 1, "第一回", 60000, "https://books.example.com/one.mp3"),
                Chapter(102, 2, "第二回", 60000, "https://books.example.com/two.mp3"),
            ],
            2: [Chapter(201, 1, "续篇", 30000, "https://books.example.com/next.mp3")],
        }

    def list_audiobooks(self):
        return self.books

    def list_chapters(self, edition_id):
        return self.chapters[edition_id]


class FakePlayer:
    def __init__(self, chapters):
        self.chapters = chapters
        self.current_index = 0
        self.position = 0.25
        self.duration = 60.0
        self.paused = False
        self.idle = True
        self.loads = []
        self.closed = False

    def load(self, index):
        self.current_index = index
        self.loads.append(index)
        self.position = 0.25
        self.paused = False
        self.idle = False

    def status(self):
        return self.position, self.duration, self.paused, self.idle

    def toggle_pause(self):
        self.paused = not self.paused
        return self.paused

    def close(self):
        self.closed = True
        self.idle = True


def test_mcp_controller_lists_plays_and_controls_queue():
    async def scenario():
        players = []

        def factory(chapters):
            player = FakePlayer(chapters)
            players.append(player)
            return player

        controller = McpPlaybackController(client=FakeTalebookClient(), player_factory=factory, monitor_interval=10)
        listing = await controller.list_audiobooks("吴承恩")
        assert listing["total"] == 1
        assert listing["books"][0]["edition_id"] == 1

        chapters = await controller.list_chapters(1)
        assert [chapter["number"] for chapter in chapters["chapters"]] == [1, 2]

        started = await controller.play_audiobook(edition_id=1, chapter=1)
        assert started.playback_started is True
        assert "第一回" in started.message
        assert players[0].loads == [0]

        status = await controller.status()
        assert status["state"] == "playing"
        assert status["book_title"] == "西游记"
        assert status["chapter"] == 1

        assert (await controller.pause()).message.startswith("已暂停")
        assert (await controller.pause()).message == "当前已经暂停"
        assert (await controller.resume()).message.startswith("已恢复")

        next_result = await controller.next_chapter()
        assert next_result.playback_started is True
        assert players[0].loads[-1] == 1
        previous_result = await controller.previous_chapter()
        assert previous_result.playback_started is True
        assert players[0].loads[-1] == 0

        assert (await controller.stop()).message.startswith("已停止")
        assert players[0].closed is True
        assert (await controller.status())["state"] == "idle"

    asyncio.run(scenario())


def test_mcp_controller_auto_advances_when_chapter_finishes():
    async def scenario():
        player = None

        def factory(chapters):
            nonlocal player
            player = FakePlayer(chapters)
            return player

        controller = McpPlaybackController(client=FakeTalebookClient(), player_factory=factory, monitor_interval=0.01)
        await controller.play_audiobook(edition_id=1)
        assert player is not None
        player.idle = True
        for _ in range(20):
            if controller.current_index == 1:
                break
            await asyncio.sleep(0.01)
        assert controller.current_index == 1
        assert player.loads == [0, 1]
        await controller.shutdown()

    asyncio.run(scenario())


def test_mcp_controller_requires_unambiguous_book_selector():
    async def scenario():
        controller = McpPlaybackController(client=FakeTalebookClient(), player_factory=FakePlayer)
        with pytest.raises(McpControllerError, match="匹配到多本"):
            await controller.play_audiobook(query="西游记")
        await controller.shutdown()

    asyncio.run(scenario())


def test_playback_signal_matches_open_xiaoai_contract():
    assert BRIDGE_CONTROL_KEY == "x-open-xiaoai-bridge"
    assert PLAYBACK_STARTED_SIGNAL == {
        "version": 1,
        "action": "end_turn_silently",
        "reason": "playback_started",
    }
