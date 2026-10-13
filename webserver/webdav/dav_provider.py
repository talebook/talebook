# -*- coding: UTF-8 -*-
import logging
import os
import re
import time
from io import BytesIO
from urllib.parse import unquote

from wsgidav.dav_error import DAVError
from wsgidav.dav_provider import DAVCollection, DAVNonCollection, DAVProvider
from wsgidav.fs_dav_provider import FilesystemProvider

from webserver import loader
from webserver.i18n import _
from webserver.services.format_keys import apply_format_keys


CONF = loader.get_settings()


# WebDAV sync folder configuration
SYNC_FOLDER_NAME = "reader"  # Directory name shown under WebDAV

SUPPORTED_FORMATS = ["epub", "azw3", "mobi", "pdf", "txt"]
INVALID_TAG_CHARS = ("#", "!", "@", "&", "$", "%", "^", "=", "+", "?", ";", ",", "*", "~", ":", '"', "'", "-", "_", "）", "；")


def safe_filename(filename):
    """Make filename safe for filesystem by removing/replacing special characters"""
    filename = re.sub(r'[<>:"/\\|?*]', "_", filename)
    filename = "".join(c for c in filename if ord(c) >= 32)
    if len(filename) > 200:
        filename = filename[:200]
    return filename.strip()


def safe_xml(text):
    """Ensure text is safe for XML (remove control characters)"""
    if not text:
        return ""
    return "".join(c for c in str(text) if ord(c) >= 32)


class WebDavResource(DAVNonCollection):
    def __init__(self, path, environ, book, cache):
        super(WebDavResource, self).__init__(path, environ)
        self.book = book
        self.cache = cache
        self.formats = SUPPORTED_FORMATS
        self.fmt = None
        self.file_path = None

        for f in self.formats:
            key = "fmt_%s" % f
            if self.book.get(key):
                self.fmt = f
                self.file_path = self.book[key]
                break

        self.title = safe_filename(self.book.get("title", "Unknown"))
        self.title = safe_xml(self.title)
        self.id = self.book["id"]
        self.ext = self.fmt or "txt"

    def get_display_name(self):
        name = "%d.%s.%s" % (self.id, self.title, self.ext)
        return safe_xml(name)

    def get_content_length(self):
        if self.file_path and os.path.exists(self.file_path):
            return os.path.getsize(self.file_path)
        return 0

    def get_content_type(self):
        types = {
            "epub": "application/epub+zip",
            "azw3": "application/x-mobi8-ebook",
            "mobi": "application/x-mobipocket-ebook",
            "pdf": "application/pdf",
            "txt": "text/plain",
        }
        return types.get(self.fmt, "application/octet-stream")

    def get_content(self):
        logging.info(f"****** Getting content for book ID {self.id}, path: {self.file_path}")
        if self.file_path and os.path.exists(self.file_path):
            return open(self.file_path, "rb")
        return BytesIO(b"")

    def support_etag(self):
        return True

    def get_etag(self):
        if self.file_path and os.path.exists(self.file_path):
            try:
                stat = os.stat(self.file_path)
                return f"{self.id}-{stat.st_size}-{int(stat.st_mtime)}"
            except Exception:
                pass
        return f"{self.id}"

    def get_last_modified(self):
        if self.file_path and os.path.exists(self.file_path):
            try:
                return os.path.getmtime(self.file_path)
            except Exception:
                pass
        return None

    def delete(self):
        raise DAVError(403, "Book resources are read-only")

    def copy_move_single(self, dest_path, is_move):
        raise DAVError(403, "Book resources are read-only")

    def set_last_modified(self, dest_path, time_stamp, dry_run):
        raise DAVError(403, "Book resources are read-only")

    def begin_write(self, content_type=None):
        raise DAVError(403, "Book resources are read-only")


class VirtualCollection(DAVCollection):
    def __init__(self, path, environ, title, provider, children=None):
        super(VirtualCollection, self).__init__(path, environ)
        self.title = safe_xml(title)
        self.provider = provider
        self.fixed_children = children  # List of DAVResource objects

    def get_display_name(self):
        return self.title

    def support_recursive_move(self, dest_path):
        return False

    def support_recursive_delete(self):
        return False

    def create_empty_resource(self, name):
        raise DAVError(403, "Virtual collections are read-only")

    def create_collection(self, name):
        raise DAVError(403, "Virtual collections are read-only")

    def delete(self):
        raise DAVError(403, "Virtual collections are read-only")

    def copy_move_single(self, dest_path, is_move):
        raise DAVError(403, "Virtual collections are read-only")

    def set_last_modified(self, dest_path, time_stamp, dry_run):
        raise DAVError(403, "Virtual collections are read-only")

    def get_member_list(self):
        if self.fixed_children is not None:
            return self.fixed_children
        return self.get_dynamic_members()

    def get_member_names(self):
        members = self.get_member_list()
        names = []
        for m in members:
            if hasattr(m, "path") and m.path:
                name = m.path.rstrip("/").split("/")[-1]
                names.append(name)
            elif hasattr(m, "name"):
                names.append(m.name)
            elif hasattr(m, "get_display_name"):
                names.append(m.get_display_name())
        return [safe_xml(n) for n in names]

    def get_dynamic_members(self):
        return []

    def get_creation_date(self):
        return time.time()

    def get_last_modified(self):
        return time.time()


class BooksCollection(VirtualCollection):
    def __init__(self, path, environ, title, provider, book_ids):
        super(BooksCollection, self).__init__(path, environ, title, provider)
        self.book_ids = book_ids

    def get_dynamic_members(self):
        books = []
        user_id = self.provider._get_user_id_from_environ(self.environ)
        private_ids = self.provider._get_other_private_book_ids(user_id)
        for book_id in self.book_ids:
            if book_id in private_ids:
                continue
            logging.info(f"Processing book ID {book_id} for collection '{self.title}'")
            try:
                mi = self.provider.cache.get_metadata(book_id, get_cover=False, get_user_categories=False)
                if not mi or mi.is_null("title"):
                    continue

                item = {
                    "id": book_id,
                    "title": mi.title or _("未知"),
                    "authors": mi.authors or [],
                    "fmt_epub": None,
                    "fmt_azw3": None,
                    "fmt_mobi": None,
                    "fmt_pdf": None,
                }

                formats = self.provider.cache.formats(book_id, verify_formats=False)
                if formats:
                    for fmt in formats:
                        fmt_lower = fmt.lower()
                        if fmt_lower in SUPPORTED_FORMATS:
                            fmt_path = self.provider.cache.format_abspath(book_id, fmt)
                            if fmt_path:
                                item[f"fmt_{fmt_lower}"] = fmt_path

                # WebDAV 不走 get_books()，需在此单独注入 book_formats 的路径。
                # 未迁移的库没有该表，apply_format_keys 直接返回 0，
                # 此时保留上面从 cache.format_abspath() 得到的 Calibre 原值。
                if self.provider.get_session_func:
                    session = self.provider.get_session_func()
                    try:
                        apply_format_keys(session, [item])
                    finally:
                        session.close()

                selected_fmt = None
                for f in SUPPORTED_FORMATS:
                    if item.get(f"fmt_{f}"):
                        selected_fmt = f
                        break

                if not selected_fmt:
                    logging.info(f"No supported format found for book ID {book_id}, skipping")
                    continue

                base = self.path if self.path.endswith("/") else self.path + "/"
                book_name = f"{item['id']}.{safe_filename(item['title'])}.{selected_fmt}"
                book_name = safe_xml(book_name)
                books.append(WebDavResource(base + book_name, self.environ, item, self.provider.cache))
            except Exception as e:
                logging.error(f"Error fetching book {book_id}: {e}")
                continue

        return books


class MyBooksDavProvider(DAVProvider):
    def __init__(self, cache, get_session_func=None):
        super(MyBooksDavProvider, self).__init__()
        self.cache = cache
        self.get_session_func = get_session_func
        self.readonly = False  # Allow read-write for the sync folder
        self.sections = {
            "分类": "分类",
            "标签": "标签",
            "作者": "作者",
            "最新": "最新",
            "我的收藏": "我的收藏",
            "我的待读": "我的待读",
            "我的在读": "我的在读",
            "我的已读": "我的已读",
        }

        # Read WEBDAV_SYNC_FOLDER configuration (per-user writable directory).
        self.enable_sync_folder = False
        self.sync_folder_name = SYNC_FOLDER_NAME
        # Per-user FilesystemProvider cache: {user_id: FilesystemProvider}
        self._user_fs_providers = {}

        try:
            self.enable_sync_folder = CONF.get("WEBDAV_SYNC_FOLDER", False)
            custom_sync_name = CONF.get("WEBDAV_SYNC_FOLDER_NAME")
            if custom_sync_name:
                self.sync_folder_name = custom_sync_name

            if self.enable_sync_folder:
                logging.info(f"WebDAV sync folder enabled (per-user isolation, folder name: {self.sync_folder_name})")
        except Exception as e:
            logging.error(f"Error initializing sync folder: {e}")
            self.enable_sync_folder = False

    def _get_user_sync_path(self, user_id):
        return f"/data/{self.sync_folder_name}/{user_id}/"

    def _get_or_create_fs_provider(self, user_id):
        if user_id not in self._user_fs_providers:
            path = self._get_user_sync_path(user_id)
            self._ensure_sync_folder(path)
            self._user_fs_providers[user_id] = FilesystemProvider(path)
            logging.info(f"Created FilesystemProvider for user {user_id}: {path}")
        return self._user_fs_providers[user_id]

    def _ensure_sync_folder(self, folder_path):
        try:
            if not os.path.exists(folder_path):
                os.makedirs(folder_path, mode=0o755, exist_ok=True)
                logging.info(f"Created sync folder: {folder_path}")

                try:
                    import pwd

                    current_user = pwd.getpwuid(os.getuid())
                    os.chown(folder_path, current_user.pw_uid, current_user.pw_gid)
                    logging.info(f"Set owner of sync folder to: {current_user.pw_name}")
                except Exception as e:
                    logging.warning(f"Could not set owner of sync folder: {e}")
            else:
                logging.debug(f"Sync folder already exists: {folder_path}")
        except Exception as e:
            logging.error(f"Error ensuring sync folder exists: {e}")
            raise

    def _parse_book_id_from_filename(self, filename):
        # Ignore dotfiles (e.g. macOS ._filename).
        if filename.startswith("."):
            return None

        try:
            book_id_str = filename.split(".")[0]
            if not book_id_str:
                return None
            return int(book_id_str)
        except (ValueError, IndexError):
            return None

    def _resolve_book(self, filename, path, environ):
        """Resolve a book filename to WebDavResource, respecting private-book access."""
        book_id = self._parse_book_id_from_filename(filename)
        if book_id is None:
            return None

        user_id = self._get_user_id_from_environ(environ)
        private_ids = self._get_other_private_book_ids(user_id)
        if book_id in private_ids:
            return None

        mi = self.cache.get_metadata(book_id, get_cover=False)
        if not mi:
            return None

        item = self._build_book_item(book_id, mi)
        return WebDavResource(path, environ, item, self.cache)

    def get_resource_inst(self, path, environ):
        original_path = path

        if not path.startswith("/"):
            path = "/" + path

        path = unquote(path)
        if "%" in path:
            path = unquote(path)

        path = path.rstrip("/")
        if not path:
            path = "/"

        if original_path != path:
            logging.info(f"Path decoded: '{original_path}' -> '{path}'")

        if path == "/":
            children = [VirtualCollection("/" + s, environ, s, self) for s in self.sections.keys()]
            if self.enable_sync_folder:
                user_id = self._get_user_id_from_environ(environ)
                if user_id:
                    try:
                        fs_provider = self._get_or_create_fs_provider(user_id)
                        sync_resource = fs_provider.get_resource_inst("/", environ)
                        if sync_resource:
                            sync_resource.path = f"/{self.sync_folder_name}"
                            children.append(sync_resource)
                    except Exception as e:
                        logging.error(f"Error getting sync folder for user {user_id}: {e}")
            return VirtualCollection("/", environ, "root", self, children)

        parts = path.lstrip("/").split("/")
        section = parts[0]
        logging.debug(f"Processing path: {path}, section: {section}, parts: {parts}")

        # Sync directory: the only writable section, isolated per-user.
        if section == self.sync_folder_name and self.enable_sync_folder:
            user_id = self._get_user_id_from_environ(environ)
            if not user_id:
                logging.warning("WebDAV sync folder access denied: no authenticated user")
                return None
            try:
                fs_provider = self._get_or_create_fs_provider(user_id)
            except Exception as e:
                logging.error(f"Error getting sync folder provider for user {user_id}: {e}")
                return None
            prefix_len = len(self.sync_folder_name) + 1
            fs_path = path[prefix_len:] if len(path) > prefix_len else "/"
            if not fs_path:
                fs_path = "/"
            logging.debug(f"Mapping WebDAV path {path} -> user {user_id} fs path: {fs_path}")
            resource = fs_provider.get_resource_inst(fs_path, environ)
            if resource:
                resource.path = path
                return resource
            return None

        if section == "分类":
            return self.handle_category(path, environ, parts)
        elif section == "标签":
            return self.handle_tags(path, environ, parts)
        elif section == "作者":
            return self.handle_authors(path, environ, parts)
        elif section == "最新":
            return self.handle_recent(path, environ, parts)
        elif section == "我的收藏":
            return self.handle_favorite(path, environ, parts)
        elif section == "我的待读":
            return self.handle_wants(path, environ, parts)
        elif section == "我的在读":
            return self.handle_reading(path, environ, parts)
        elif section == "我的已读":
            return self.handle_read_done(path, environ, parts)
        else:
            logging.warning(f"Unknown section '{section}' in path '{path}'")
            if self.enable_sync_folder:
                user_id = self._get_user_id_from_environ(environ)
                if user_id:
                    logging.info(f"Attempting to handle '{section}' as filesystem path for user {user_id}")
                    prefix_len = len(section) + 1
                    fs_path = path[prefix_len:] if len(path) > prefix_len else "/"
                    if not fs_path:
                        fs_path = "/"
                    try:
                        fs_provider = self._get_or_create_fs_provider(user_id)
                        return fs_provider.get_resource_inst(fs_path, environ)
                    except Exception as e:
                        logging.error(f"Failed to handle as filesystem path: {e}")
            return None

    def handle_category(self, path, environ, parts):
        if len(parts) == 1:
            children = []
            try:
                # Talebook has no custom '#category' column by default, so the
                # 分类 section is empty unless that column has been created.
                if "#category" in self.cache.field_metadata:
                    all_cats = self.cache.get_categories()
                    if "#category" in all_cats:
                        for cat in all_cats["#category"]:
                            name = cat.name if hasattr(cat, "name") else str(cat)
                            name = safe_xml(name)
                            child_path = path if path.endswith("/") else path + "/"
                            child_path = child_path + name
                            children.append(VirtualCollection(child_path, environ, name, self))
            except Exception as e:
                logging.error(f"Error getting categories: {e}")
                import traceback

                logging.error(traceback.format_exc())

            return VirtualCollection(path, environ, "分类", self, children)

        elif len(parts) == 2:
            cat_name = unquote(parts[1])
            try:
                ids = self.cache.search(f'#category:"={cat_name}"')
                return BooksCollection(path, environ, safe_xml(cat_name), self, ids)
            except Exception as e:
                logging.error(f"Error searching category {cat_name}: {e}")
                return None

        elif len(parts) == 3:
            try:
                return self._resolve_book(unquote(parts[2]), path, environ)
            except Exception as e:
                logging.error(f"Error getting book {parts[2]}: {e}")
                return None

        return None

    def handle_tags(self, path, environ, parts):
        if len(parts) == 1:
            children = []
            try:
                for tag in self.cache.all_field_names("tags"):
                    if tag is None or len(tag) < 2 or tag[0] in INVALID_TAG_CHARS:
                        continue
                    tag_str = safe_xml(str(tag))
                    child_path = path if path.endswith("/") else path + "/"
                    child_path = child_path + tag_str
                    children.append(VirtualCollection(child_path, environ, tag_str, self))
            except Exception as e:
                logging.error(f"Error getting tags: {e}")
                pass

            return VirtualCollection(path, environ, "标签", self, children)
        elif len(parts) == 2:
            tag_name = unquote(parts[1])
            try:
                ids = self.cache.search(f'tags:"={tag_name}"')
                return BooksCollection(path, environ, safe_xml(tag_name), self, ids)
            except Exception:
                return None
        elif len(parts) == 3:
            try:
                return self._resolve_book(unquote(parts[2]), path, environ)
            except Exception as e:
                logging.error(f"Error getting book {parts[2]}: {e}")
                return None
        return None

    def handle_authors(self, path, environ, parts):
        if len(parts) == 1:
            children = []
            try:
                for author in self.cache.all_field_names("authors"):
                    author_str = safe_xml(str(author))
                    child_path = path if path.endswith("/") else path + "/"
                    child_path = child_path + author_str
                    children.append(VirtualCollection(child_path, environ, author_str, self))
            except Exception as e:
                logging.error(f"Error getting authors: {e}")
            return VirtualCollection(path, environ, "作者", self, children)
        elif len(parts) == 2:
            author_name = unquote(parts[1])
            try:
                ids = self.cache.search(f'authors:"={author_name}"')
                return BooksCollection(path, environ, safe_xml(author_name), self, ids)
            except Exception:
                pass
        elif len(parts) == 3:
            try:
                return self._resolve_book(unquote(parts[2]), path, environ)
            except Exception as e:
                logging.error(f"Error getting book {parts[2]}: {e}")
                return None
        return None

    def _get_user_id_from_environ(self, environ):
        """Resolve the current WebDAV user's id from the authenticated username."""
        username = environ.get("wsgidav.auth.user_name", None)
        if not username or not self.get_session_func:
            return None

        try:
            from webserver.models import Reader

            session = self.get_session_func()
            try:
                user = session.query(Reader).filter(Reader.username == username).first()
                return user.id if user else None
            finally:
                session.close()
        except Exception as e:
            logging.error(f"Error getting user ID: {e}")
            return None

    def _get_other_private_book_ids(self, user_id):
        """Return private book ids invisible to the current WebDAV user."""
        if not self.get_session_func:
            return set()
        from webserver.models import Item, Reader

        session = self.get_session_func()
        try:
            if user_id:
                user = session.get(Reader, user_id)
                if user and user.is_admin():
                    return set()
                items = session.query(Item).filter(Item.scope == "private", Item.collector_id != user_id).all()
            else:
                items = session.query(Item).filter(Item.scope == "private").all()
            return {item.book_id for item in items}
        finally:
            session.close()

    def _get_reading_state_books(self, environ, filter_func):
        """Return book ids matching a ReadingState predicate for the current user."""
        user_id = self._get_user_id_from_environ(environ)
        if not user_id:
            logging.warning("No user ID found in environ for reading state")
            return []

        try:
            from webserver.models import ReadingState

            session = self.get_session_func()
            try:
                reading_states = session.query(ReadingState).filter(ReadingState.reader_id == user_id).all()

                filtered_states = [state for state in reading_states if filter_func(state)]
                return [state.book_id for state in filtered_states]
            finally:
                session.close()

        except Exception as e:
            logging.error(f"Error getting reading state books: {e}")
            return []

    def handle_recent(self, path, environ, parts):
        """List most recently added books."""
        if len(parts) == 1:
            try:
                sql = "SELECT id FROM books ORDER BY id DESC LIMIT 100"
                book_ids = [v[0] for v in self.cache.backend.conn.get(sql)]
            except Exception as e:
                logging.error(f"Error getting recent books: {e}")
                book_ids = []
            return BooksCollection(path, environ, "最新", self, book_ids)
        elif len(parts) == 2:
            try:
                filename = unquote(parts[1])
                book_id = self._parse_book_id_from_filename(filename)
                if book_id is None:
                    return None
                mi = self.cache.get_metadata(book_id, get_cover=False)
                if not mi:
                    return None
                item = self._build_book_item(book_id, mi)
                return WebDavResource(path, environ, item, self.cache)
            except Exception as e:
                logging.error(f"Error getting book {parts[1]}: {e}")
                return None
        return None

    def handle_favorite(self, path, environ, parts):
        """List the user's favorited books."""
        if len(parts) == 1:
            book_ids = self._get_reading_state_books(environ, lambda state: state.favorite == 1)
            return BooksCollection(path, environ, "我的收藏", self, book_ids)
        elif len(parts) == 2:
            try:
                filename = unquote(parts[1])
                book_id = self._parse_book_id_from_filename(filename)
                if book_id is None:
                    return None
                mi = self.cache.get_metadata(book_id, get_cover=False)
                if not mi:
                    return None

                item = self._build_book_item(book_id, mi)
                return WebDavResource(path, environ, item, self.cache)
            except Exception as e:
                logging.error(f"Error getting book {parts[1]}: {e}")
                return None
        return None

    def handle_wants(self, path, environ, parts):
        """List the user's 'want to read' books."""
        if len(parts) == 1:
            book_ids = self._get_reading_state_books(environ, lambda state: state.wants == 1)
            return BooksCollection(path, environ, "我的待读", self, book_ids)
        elif len(parts) == 2:
            try:
                filename = unquote(parts[1])
                book_id = self._parse_book_id_from_filename(filename)
                if book_id is None:
                    return None
                mi = self.cache.get_metadata(book_id, get_cover=False)
                if not mi:
                    return None

                item = self._build_book_item(book_id, mi)
                return WebDavResource(path, environ, item, self.cache)
            except Exception as e:
                logging.error(f"Error getting book {parts[1]}: {e}")
                return None
        return None

    def handle_reading(self, path, environ, parts):
        """List the user's 'currently reading' books."""
        if len(parts) == 1:
            book_ids = self._get_reading_state_books(environ, lambda state: state.read_state == 1)
            logging.info(f"Handling '在读' books, ids: {book_ids}")
            return BooksCollection(path, environ, "我的在读", self, book_ids)
        elif len(parts) == 2:
            try:
                filename = unquote(parts[1])
                book_id = self._parse_book_id_from_filename(filename)
                if book_id is None:
                    return None
                mi = self.cache.get_metadata(book_id, get_cover=False)
                if not mi:
                    return None

                item = self._build_book_item(book_id, mi)
                return WebDavResource(path, environ, item, self.cache)
            except Exception as e:
                logging.error(f"Error getting book {parts[1]}: {e}")
                return None
        return None

    def handle_read_done(self, path, environ, parts):
        """List the user's 'finished reading' books."""
        if len(parts) == 1:
            book_ids = self._get_reading_state_books(environ, lambda state: state.read_state == 2)
            return BooksCollection(path, environ, "我的已读", self, book_ids)
        elif len(parts) == 2:
            try:
                filename = unquote(parts[1])
                book_id = self._parse_book_id_from_filename(filename)
                if book_id is None:
                    return None
                mi = self.cache.get_metadata(book_id, get_cover=False)
                if not mi:
                    return None

                item = self._build_book_item(book_id, mi)
                return WebDavResource(path, environ, item, self.cache)
            except Exception as e:
                logging.error(f"Error getting book {parts[1]}: {e}")
                return None
        return None

    def _build_book_item(self, book_id, mi):
        """Build a book item dict from a Calibre Metadata object."""
        item = {
            "id": book_id,
            "title": mi.title or _("未知"),
            "authors": mi.authors or [],
            "fmt_epub": None,
            "fmt_azw3": None,
            "fmt_mobi": None,
            "fmt_pdf": None,
        }

        formats = self.cache.formats(book_id, verify_formats=False)
        if formats:
            for fmt in formats:
                fmt_lower = fmt.lower()
                if fmt_lower in SUPPORTED_FORMATS:
                    fmt_path = self.cache.format_abspath(book_id, fmt)
                    if fmt_path:
                        item[f"fmt_{fmt_lower}"] = fmt_path

        return item

    def _loc_to_file_path(self, path, environ=None):
        """Convert a WebDAV path to a filesystem path (sync folder only)."""
        if not self.enable_sync_folder:
            raise DAVError(403, "Filesystem operations not supported")

        user_id = self._get_user_id_from_environ(environ) if environ else None
        if not user_id:
            raise DAVError(403, "Cannot resolve filesystem path: no authenticated user")

        fs_provider = self._get_or_create_fs_provider(user_id)

        if path.startswith("/" + self.sync_folder_name):
            prefix_len = len(self.sync_folder_name) + 1
            fs_path = path[prefix_len:] if len(path) > prefix_len else "/"
        else:
            fs_path = path

        return fs_provider._loc_to_file_path(fs_path, environ)
