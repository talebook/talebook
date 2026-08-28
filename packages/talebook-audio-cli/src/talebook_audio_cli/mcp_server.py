from __future__ import annotations

import asyncio
from typing import Any

from .mcp_controller import McpPlaybackController, PlaybackResult


BRIDGE_CONTROL_KEY = "x-open-xiaoai-bridge"
PLAYBACK_STARTED_SIGNAL = {
    "version": 1,
    "action": "end_turn_silently",
    "reason": "playback_started",
}


class McpServerError(RuntimeError):
    pass


def _sdk():
    try:
        from mcp.server.fastmcp import FastMCP
        from mcp.types import CallToolResult, TextContent
    except ModuleNotFoundError as exc:
        raise McpServerError("MCP 模式需要可选依赖；请安装 talebook-audio-cli[mcp]") from exc
    return FastMCP, CallToolResult, TextContent


def create_mcp_server(controller: McpPlaybackController | None = None):
    FastMCP, CallToolResult, TextContent = _sdk()
    playback = controller or McpPlaybackController()
    server = FastMCP(
        "talebook-audio",
        instructions=(
            "浏览和播放当前账号可访问的 Talebook 有声书。播放前优先调用 list_audiobooks；"
            "不要索要或传递用户密码，登录会话由管理员预先配置。"
        ),
    )

    def result(value: PlaybackResult):
        structured = {BRIDGE_CONTROL_KEY: PLAYBACK_STARTED_SIGNAL} if value.playback_started else None
        return CallToolResult(
            content=[TextContent(type="text", text=value.message)],
            structuredContent=structured,
        )

    @server.tool(
        title="列出 Talebook 有声书",
        description="列出当前账号可访问且已发布的 Talebook 有声书；可按书名或作者过滤。",
        structured_output=True,
    )
    async def list_audiobooks(query: str | None = None) -> dict[str, Any]:
        return await playback.list_audiobooks(query)

    @server.tool(
        title="列出有声书章节",
        description="按 list_audiobooks 返回的 edition_id 列出章节编号、标题和时长。",
        structured_output=True,
    )
    async def list_chapters(edition_id: int) -> dict[str, Any]:
        return await playback.list_chapters(edition_id)

    @server.tool(
        title="播放 Talebook 有声书",
        description=(
            "播放 Talebook 有声书并建立自动续播章节队列。edition_id、book_id、query 三选一；"
            "若当前只有一本书也可省略。chapter 是起始章节编号，默认 1。"
        ),
        structured_output=False,
    )
    async def play_audiobook(
        edition_id: int | None = None,
        book_id: int | None = None,
        query: str | None = None,
        chapter: int = 1,
    ):
        value = await playback.play_audiobook(
            edition_id=edition_id,
            book_id=book_id,
            query=query,
            chapter=chapter,
        )
        return result(value)

    @server.tool(title="暂停有声书", description="暂停当前 Talebook 有声书播放。", structured_output=False)
    async def pause():
        return result(await playback.pause())

    @server.tool(title="恢复有声书", description="恢复已暂停的 Talebook 有声书。", structured_output=False)
    async def resume():
        return result(await playback.resume())

    @server.tool(title="下一章", description="播放当前 Talebook 章节队列中的下一章。", structured_output=False)
    async def next_chapter():
        return result(await playback.next_chapter())

    @server.tool(title="上一章", description="播放当前 Talebook 章节队列中的上一章。", structured_output=False)
    async def previous_chapter():
        return result(await playback.previous_chapter())

    @server.tool(title="停止有声书", description="停止播放并清空 Talebook 章节队列。", structured_output=False)
    async def stop():
        return result(await playback.stop())

    @server.tool(
        title="有声书播放状态",
        description="查询当前 Talebook 书籍、章节、队列位置和播放进度。",
        structured_output=True,
    )
    async def status() -> dict[str, Any]:
        return await playback.status()

    return server, playback


async def run_mcp_server_async() -> None:
    server, controller = create_mcp_server()
    try:
        await server.run_stdio_async()
    finally:
        await controller.shutdown()


def run_mcp_server() -> None:
    asyncio.run(run_mcp_server_async())
