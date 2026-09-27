"""Deterministic regressions for shared host queue limits and wakeups."""

import threading
import time
from concurrent.futures import ThreadPoolExecutor
from contextlib import ExitStack

import pytest

from webserver.plugins.runtime.safe_http import HostQueueTimeout, _PluginHostQueue


class ObservedCondition(threading.Condition):
    """Expose wait boundaries and optionally pause a notified thread."""

    def __init__(self):
        super().__init__()
        self.waiting = {name: threading.Event() for name in ("C", "D")}
        self.pause_c = False
        self.c_notified = threading.Event()
        self.resume_c = threading.Event()

    def wait(self, timeout=None):
        name = threading.current_thread().name
        self.waiting[name].set()
        result = super().wait(timeout)
        if name == "C" and self.pause_c:
            self.pause_c = False
            self.release()
            try:
                self.c_notified.set()
                assert self.resume_c.wait(3)
            finally:
                self.acquire()
        return result


def slot(queue, limit):
    return queue.slot("test.plugin", "https://books.example/book", limit, time.monotonic() + 2)


def hold_slot(queue, name, limit, entered, release):
    threading.current_thread().name = name
    with slot(queue, limit):
        entered.set()
        assert release.wait(3), "request was not released"


@pytest.mark.parametrize("raise_error", [False, True])
def test_low_limit_expires_after_request_finishes_with_high_limit_waiters(raise_error):
    queue = _PluginHostQueue()
    condition = queue._condition = ObservedCondition()
    entered = [threading.Event(), threading.Event()]
    release = threading.Event()
    with ThreadPoolExecutor(max_workers=2) as pool:
        try:
            try:
                with slot(queue, 1):
                    futures = [
                        pool.submit(hold_slot, queue, name, 3, entered[i], release) for i, name in enumerate(("C", "D"))
                    ]
                    assert all(event.wait(1) for event in condition.waiting.values())
                    assert not any(event.is_set() for event in entered)
                    if raise_error:
                        raise ValueError("HTTP failure")
            except ValueError:
                assert raise_error
            # Both must enter before either finishes: the host never goes idle
            # because the high-limit requests were already queued.
            assert all(event.wait(1) for event in entered)
        finally:
            release.set()
        for future in futures:
            future.result(timeout=3)
    assert not queue._states


def test_expired_low_limit_waiter_does_not_pin_a_busy_host():
    queue = _PluginHostQueue()
    with slot(queue, 3):
        with pytest.raises(HostQueueTimeout):
            with queue.slot("test.plugin", "https://books.example/book", 1, time.monotonic()):
                pytest.fail("low-limit request entered while host was busy")
        with slot(queue, 3):
            pass
    assert not queue._states


def test_same_limit_is_retained_until_its_last_request_finishes():
    queue = _PluginHostQueue()
    with slot(queue, 2):
        with slot(queue, 2):
            pass
        with slot(queue, 3):
            with pytest.raises(HostQueueTimeout):
                with queue.slot("test.plugin", "https://books.example/book", 3, time.monotonic()):
                    pytest.fail("remaining low-limit request must still constrain the host")
    assert not queue._states


def test_advancing_head_wakes_new_waiter_when_multiple_slots_are_free():
    queue = _PluginHostQueue()
    condition = queue._condition = ObservedCondition()
    condition.pause_c = True
    entered_c, entered_d, release = (threading.Event() for _ in range(3))
    with ExitStack() as active, ThreadPoolExecutor(max_workers=2) as pool:
        # A, B and E occupy all three slots; E stays active throughout.
        a, b = ExitStack(), ExitStack()
        active.enter_context(a)
        active.enter_context(b)
        a.enter_context(slot(queue, 3))
        b.enter_context(slot(queue, 3))
        active.enter_context(slot(queue, 3))
        try:
            c = pool.submit(hold_slot, queue, "C", 3, entered_c, release)
            assert condition.waiting["C"].wait(1)
            with condition:
                a.close()
                b.close()
            assert condition.c_notified.wait(1)
            # D arrives after the release notifications, before C reacquires
            # the lock. D waits behind C despite there being two free slots.
            d = pool.submit(hold_slot, queue, "D", 3, entered_d, release)
            assert condition.waiting["D"].wait(1)
            condition.resume_c.set()
            assert entered_c.wait(1)
            assert entered_d.wait(1), "free slot was stranded until an unrelated request completed"
        finally:
            condition.resume_c.set()
            release.set()
        c.result(timeout=3)
        d.result(timeout=3)
    assert not queue._states
