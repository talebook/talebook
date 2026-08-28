from __future__ import annotations

import argparse
import getpass
import sys
from collections.abc import Sequence

from .client import TalebookClient, TalebookError
from .config import AppPaths, Config, ConfigError, load_config, save_config
from .models import Audiobook, Chapter
from .player import MpvPlayer, PlayerError, format_time


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="talebook-audio", description="浏览和播放 Talebook 已发布的有声书")
    subparsers = parser.add_subparsers(dest="command", required=True)

    configure = subparsers.add_parser("configure", help="保存 Talebook 服务地址和用户名")
    configure.add_argument("--server", required=True, help="Talebook 根地址，例如 https://books.example.com")
    configure.add_argument("--username", required=True, help="Talebook 用户名")

    login = subparsers.add_parser("login", help="使用账号密码登录并保存会话")
    login.add_argument("--password-stdin", action="store_true", help="从标准输入读取一行密码")

    subparsers.add_parser("logout", help="删除本地登录会话")
    subparsers.add_parser("books", help="列出可访问的已发布有声书")

    chapters = subparsers.add_parser("chapters", help="列出有声版本章节")
    chapters.add_argument("edition_id", type=int, help="有声版本 ID（见 books 输出）")

    play = subparsers.add_parser("play", help="选择并播放有声书")
    choice = play.add_mutually_exclusive_group()
    choice.add_argument("--book-id", type=int, help="直接选择书籍 ID")
    choice.add_argument("--edition-id", type=int, help="直接选择有声版本 ID")
    play.add_argument("--chapter", type=int, help="从章节编号开始")
    return parser


def _client(paths: AppPaths) -> TalebookClient:
    return TalebookClient(load_config(paths), paths)


def _print_books(books: Sequence[Audiobook]) -> None:
    if not books:
        print("当前账号没有可播放的已发布有声书；请先在 Talebook 中生成并发布有声版本")
        return
    for book in books:
        print(f"{book.title} — {book.author}")
        print(
            f"  书籍 ID：{book.book_id}  有声版本 ID：{book.edition_id}  "
            f"章节：{book.chapter_count}  时长：{format_time(book.duration_ms / 1000)}"
        )


def _print_chapters(chapters: Sequence[Chapter]) -> None:
    if not chapters:
        print("这个有声版本没有可播放章节；请在 Talebook 中检查生成和发布状态")
        return
    for chapter in chapters:
        print(f"{chapter.number:>3}. {chapter.title}（{format_time(chapter.duration_ms / 1000)}）")


def _select(prompt: str, length: int) -> int:
    if not sys.stdin.isatty():
        raise TalebookError("交互选择需要终端；请使用 --book-id 或 --edition-id，并用 --chapter 指定起始章节")
    while True:
        try:
            value = int(input(prompt).strip())
        except EOFError as exc:
            raise TalebookError("没有读到选择；请重新运行命令并输入编号") from exc
        except ValueError:
            print(f"请输入 1 到 {length} 的编号", file=sys.stderr)
            continue
        if 1 <= value <= length:
            return value - 1
        print(f"请输入 1 到 {length} 的编号", file=sys.stderr)


def _find_book(books: Sequence[Audiobook], book_id: int | None, edition_id: int | None) -> Audiobook:
    if book_id is None and edition_id is None:
        for index, book in enumerate(books, 1):
            print(f"{index:>3}. {book.title} — {book.author}（{book.chapter_count} 章）")
        return books[_select("选择书籍：", len(books))]
    for book in books:
        if book_id is not None and book.book_id == book_id:
            return book
        if edition_id is not None and book.edition_id == edition_id:
            return book
    target = f"书籍 ID {book_id}" if book_id is not None else f"有声版本 ID {edition_id}"
    raise TalebookError(f"当前账号的有声书列表中找不到 {target}")


def _chapter_index(chapters: Sequence[Chapter], requested: int | None) -> int:
    if requested is not None:
        for index, chapter in enumerate(chapters):
            if chapter.number == requested:
                return index
        raise TalebookError(f"找不到章节编号 {requested}")
    for index, chapter in enumerate(chapters, 1):
        print(f"{index:>3}. {chapter.title}（{format_time(chapter.duration_ms / 1000)}）")
    return _select("选择起始章节：", len(chapters))


def main(argv: Sequence[str] | None = None, *, paths: AppPaths | None = None) -> int:
    args = build_parser().parse_args(argv)
    app_paths = paths or AppPaths.default()
    try:
        if args.command == "configure":
            save_config(Config(server=args.server, username=args.username), app_paths)
            print(f"配置已保存：{load_config(app_paths).server}（用户 {load_config(app_paths).username}）")
            return 0

        client = _client(app_paths)
        if args.command == "login":
            password = sys.stdin.readline().rstrip("\r\n") if args.password_stdin else getpass.getpass("Talebook 密码：")
            client.login(password)
            print(f"登录成功：{client.config.username}")
            return 0
        if args.command == "logout":
            client.logout()
            print("本地登录会话已删除")
            return 0
        if args.command == "books":
            _print_books(client.list_audiobooks())
            return 0
        if args.command == "chapters":
            client.require_login()
            _print_chapters(client.list_chapters(args.edition_id))
            return 0
        if args.command == "play":
            books = client.list_audiobooks()
            if not books:
                raise TalebookError("当前账号没有可播放的已发布有声书；请先在 Talebook 中生成并发布有声版本")
            book = _find_book(books, args.book_id, args.edition_id)
            chapters = client.list_chapters(book.edition_id)
            if not chapters:
                raise TalebookError("这个有声版本没有可播放章节；请在 Talebook 中检查生成和发布状态")
            start_index = _chapter_index(chapters, args.chapter)
            MpvPlayer(chapters, app_paths.cookie_file).run(start_index)
            return 0
    except (ConfigError, TalebookError, PlayerError) as exc:
        print(f"错误：{exc}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("\n已停止", file=sys.stderr)
        return 130
    return 0


def entrypoint() -> None:
    raise SystemExit(main())


if __name__ == "__main__":
    entrypoint()
