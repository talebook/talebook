"""Bounded, file-only helpers for scan tasks; no ORM objects cross threads."""

import copy
import ctypes
import errno
import hashlib
import os
import queue
import select
import struct
import threading
import time
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor


def file_signature(path):
    stat = os.stat(path, follow_symlinks=False)
    if os.path.islink(path):
        raise OSError("symbolic links are not scan candidates")
    return [stat.st_dev, stat.st_ino, stat.st_size, stat.st_mtime_ns, stat.st_ctime_ns]


def clone_prepared(value):
    return {
        key: (item.deepcopy() if key == "metadata" and item is not None else copy.deepcopy(item))
        for key, item in value.items()
    }


class MetadataCache:
    """Bound both entry count and cover bytes; never deserialize executable data."""

    def __init__(self, capacity=128, byte_limit=32 * 1024 * 1024):
        self.capacity = capacity
        self.byte_limit = byte_limit
        self.entries = OrderedDict()
        self.size = 0
        self.lock = threading.Lock()

    def get(self, path, signature):
        with self.lock:
            entry = self.entries.get(path)
            if entry is None:
                return None
            if entry[0] != signature:
                self._remove(path)
                return None
            self.entries.move_to_end(path)
            return clone_prepared(entry[1])

    def _remove(self, path):
        self.size -= self.entries.pop(path)[2]

    def put(self, path, signature, value):
        # Metadata may contain large comments or cover bytes. Count a conservative
        # serialized representation plus binary cover data, without retaining it.
        size = len(repr(value).encode("utf-8"))
        mi = value.get("metadata")
        if mi is not None:
            size += len(repr(mi.__dict__).encode("utf-8"))
        with self.lock:
            if path in self.entries:
                self._remove(path)
            if size > self.byte_limit:
                return
            self.entries[path] = (list(signature), clone_prepared(value), size)
            self.size += size
            while len(self.entries) > self.capacity or self.size > self.byte_limit:
                self._remove(next(iter(self.entries)))


def full_hash(path, cancelled=lambda: False):
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            if cancelled():
                raise InterruptedError("scan cancelled")
            digest.update(block)
    return "sha256:" + digest.hexdigest()


def prepared_files(paths, prepare, cancelled, capacity=8):
    """One producer, bounded queue, and deterministic shutdown on early consumer exit."""
    pending = queue.Queue(maxsize=capacity)
    stopped = threading.Event()
    sentinel = object()

    def put(value):
        while not stopped.is_set() and not cancelled():
            try:
                pending.put(value, timeout=0.1)
                return True
            except queue.Full:
                pass
        return False

    def produce():
        try:
            for path in paths:
                if stopped.is_set() or cancelled():
                    break
                try:
                    result = prepare(path)
                except Exception as err:
                    result = err
                if not put((path, result)):
                    break
        finally:
            put(sentinel)

    with ThreadPoolExecutor(max_workers=1, thread_name_prefix="scan-prepare") as executor:
        future = executor.submit(produce)
        try:
            while not cancelled():
                try:
                    value = pending.get(timeout=0.1)
                except queue.Empty:
                    if future.done():
                        future.result()
                        break
                    continue
                if value is sentinel:
                    break
                yield value
        finally:
            stopped.set()
            future.result()


class FolderEvents:
    """Linux inotify hints; overflow/new directories force a periodic-scan fallback."""

    MASK = 0x8 | 0x80 | 0x100 | 0x200 | 0x400 | 0x800  # close-write/move/create/delete

    def __init__(self, root, formats, max_pending=4096):
        self.root = os.path.realpath(root)
        self.formats = set(formats)
        self.max_pending = max_pending
        self.fd = -1
        self.watches = {}
        self.pending = {}
        self.rescan = False
        try:
            self.libc = ctypes.CDLL(None, use_errno=True)
            self.fd = self.libc.inotify_init1(os.O_NONBLOCK | os.O_CLOEXEC)
            if self.fd < 0:
                raise OSError(ctypes.get_errno(), "inotify_init1")
            self.libc.inotify_add_watch.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_uint32]
            for directory, dirs, _ in os.walk(self.root):
                dirs[:] = [
                    d for d in dirs if not d.startswith((".", "@__")) and not os.path.islink(os.path.join(directory, d))
                ]
                wd = self.libc.inotify_add_watch(self.fd, os.fsencode(directory), self.MASK)
                if wd < 0:
                    raise OSError(ctypes.get_errno(), "inotify_add_watch")
                self.watches[wd] = directory
        except (OSError, AttributeError):
            self.close()

    def close(self):
        if self.fd >= 0:
            os.close(self.fd)
            self.fd = -1

    def feed(self, data, now):
        offset = 0
        while offset + 16 <= len(data):
            wd, mask, _, length = struct.unpack_from("iIII", data, offset)
            name = os.fsdecode(data[offset + 16 : offset + 16 + length].split(b"\0", 1)[0])
            offset += 16 + length
            if mask & (0x4000 | 0x40000000 | 0x400 | 0x800 | 0x8000):
                self.rescan = True
                continue
            directory = self.watches.get(wd)
            if not directory or not name or name.startswith(".") or os.path.basename(name) != name:
                continue
            if not mask & (0x8 | 0x80):
                continue
            if name.rsplit(".", 1)[-1].lower() not in self.formats:
                continue
            path = os.path.join(directory, name)
            if len(self.pending) >= self.max_pending and path not in self.pending:
                self.rescan = True
                self.pending.clear()
            else:
                self.pending[path] = now

    def wait(self, timeout, debounce=1.0):
        if self.fd < 0:
            time.sleep(timeout)
            return [], False
        if select.select([self.fd], [], [], timeout)[0]:
            while True:
                try:
                    self.feed(os.read(self.fd, 65536), time.monotonic())
                except OSError as err:
                    if err.errno != errno.EAGAIN:
                        self.rescan = True
                    break
        now = time.monotonic()
        paths = [path for path, changed in self.pending.items() if now - changed >= debounce]
        for path in paths:
            del self.pending[path]
        rescan, self.rescan = self.rescan, False
        return paths, rescan
