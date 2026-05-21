#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import datetime
import json
import logging
import ssl
import threading
import time
import urllib.error
import urllib.request

from webserver.version import VERSION


GITHUB_REPO = "talebook/talebook"
GITHUB_API_URL = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
CHECK_INTERVAL_SECONDS = 3 * 3600  # 3 hours
UPDATE_NOTIFY_STATUS = "system_update"
UPDATE_NOTIFY_VERSION_KEY = "update_version"
UPDATE_NOTIFY_URL_KEY = "update_url"
UPDATE_NOTIFY_BODY_KEY = "update_body"

_UNVERIFIED_CONTEXT = ssl.create_default_context()
_UNVERIFIED_CONTEXT.check_hostname = False
_UNVERIFIED_CONTEXT.verify_mode = ssl.CERT_NONE


def _compare_versions(v1, v2):
    """Compare two version strings, return True if v2 > v1"""
    try:
        parts1 = [int(x) for x in v1.split(".")]
        parts2 = [int(x) for x in v2.split(".")]
        for p1, p2 in zip(parts1, parts2, strict=True):
            if p2 > p1:
                return True
            if p2 < p1:
                return False
        return len(parts2) > len(parts1)
    except Exception:
        return v2 != v1


class UpdateChecker:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(UpdateChecker, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, "_initialized"):
            self.current_version = VERSION
            self.latest_version = None
            self.latest_release_url = None
            self.latest_release_name = None
            self.latest_release_body = None
            self.has_update = False
            self.check_error = None
            self.last_check_time = None
            self._scoped_session = None
            self._check_thread = None
            self._stop_event = threading.Event()
            self._initialized = True

    def set_scoped_session(self, scoped_session):
        self._scoped_session = scoped_session

    def check_for_updates(self):
        """Check GitHub for the latest release"""
        try:
            logging.info("Checking for updates on GitHub...")
            req = urllib.request.Request(
                GITHUB_API_URL,
                headers={
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "TaleBook-UpdateChecker",
                },
            )
            with urllib.request.urlopen(req, timeout=10, context=_UNVERIFIED_CONTEXT) as response:
                raw_body = response.read().decode("utf-8")

            if not raw_body or not raw_body.strip():
                self.check_error = "GitHub API returned empty response (rate limited?)"
                logging.error("Update check failed: %s", self.check_error)
                return

            data = json.loads(raw_body)

            if not isinstance(data, dict):
                self.check_error = f"Unexpected API response type: {type(data).__name__}"
                logging.error("Update check failed: %s", self.check_error)
                return

            self.latest_version = data.get("tag_name", "").lstrip("v")
            self.latest_release_url = data.get("html_url", "")
            self.latest_release_name = data.get("name", "")
            self.latest_release_body = data.get("body", "")
            self.last_check_time = time.time()

            if self.latest_version and self.latest_version != self.current_version:
                self.has_update = True
                logging.info(
                    "Update available: current=%s, latest=%s",
                    self.current_version,
                    self.latest_version,
                )
            else:
                self.has_update = False
                logging.info("Already up to date: version=%s", self.current_version)

            self.check_error = None

        except json.JSONDecodeError as e:
            self.check_error = f"GitHub API returned invalid JSON: {e}"
            logging.error("Update check failed: %s", self.check_error)
        except urllib.error.HTTPError as e:
            self.check_error = f"GitHub API error: {e.code} {e.reason}"
            logging.error("Update check failed: %s", self.check_error)
        except urllib.error.URLError as e:
            self.check_error = f"Network error: {e.reason}"
            logging.error("Update check failed: %s", self.check_error)
        except Exception as e:
            self.check_error = f"Unknown error: {str(e)}"
            logging.error("Update check failed: %s", self.check_error)

    def _notify_admins(self):
        """Send update notifications to all admin users (only called in background loop)"""
        if not self._scoped_session or not self.has_update:
            return

        try:
            session = self._scoped_session()
            from webserver.models import Message, Reader

            admins = session.query(Reader).filter(Reader.admin == True).all()  # noqa: E712
            if not admins:
                logging.warning("No admin users found for update notification")
                return

            for admin in admins:
                existing = (
                    session.query(Message)
                    .filter(Message.reader_id == admin.id, Message.status == UPDATE_NOTIFY_STATUS)
                    .first()
                )

                if existing:
                    existing_version = existing.data.get(UPDATE_NOTIFY_VERSION_KEY, "")
                    if existing_version == self.latest_version:
                        continue
                    if _compare_versions(existing_version, self.latest_version):
                        existing.data[UPDATE_NOTIFY_VERSION_KEY] = self.latest_version
                        existing.data[UPDATE_NOTIFY_URL_KEY] = self.latest_release_url
                        existing.data[UPDATE_NOTIFY_BODY_KEY] = self.latest_release_body
                        existing.data["message"] = f"发现新版本 {self.latest_version}，请及时更新"
                        existing.update_time = datetime.datetime.now()
                        existing.unread = True
                        existing.save()
                        logging.info("Updated notification for admin %s: version %s", admin.username, self.latest_version)
                else:
                    msg = Message(
                        user_id=admin.id,
                        status=UPDATE_NOTIFY_STATUS,
                        msg=f"发现新版本 {self.latest_version}，请及时更新",
                    )
                    msg.data[UPDATE_NOTIFY_VERSION_KEY] = self.latest_version
                    msg.data[UPDATE_NOTIFY_URL_KEY] = self.latest_release_url
                    msg.data[UPDATE_NOTIFY_BODY_KEY] = self.latest_release_body
                    session.add(msg)
                    logging.info("Created notification for admin %s: version %s", admin.username, self.latest_version)

            session.commit()
        except Exception as e:
            logging.error("Failed to send update notifications: %s", e)
        finally:
            if self._scoped_session:
                self._scoped_session.remove()

    def start_background_check(self):
        """Start periodic background update checking"""
        if self._check_thread and self._check_thread.is_alive():
            logging.info("Update checker already running")
            return

        self._stop_event.clear()
        self._check_thread = threading.Thread(
            target=self._background_loop,
            name="TaleBook.UpdateChecker",
            daemon=True,
        )
        self._check_thread.start()
        logging.info("Background update checker started (interval: %d hours)", CHECK_INTERVAL_SECONDS // 3600)

    def stop_background_check(self):
        """Stop the background update checking"""
        self._stop_event.set()
        if self._check_thread and self._check_thread.is_alive():
            self._check_thread.join(timeout=5)
        logging.info("Background update checker stopped")

    def _background_loop(self):
        """Background loop that periodically checks for updates"""
        self.check_for_updates()
        self._notify_admins()

        while not self._stop_event.is_set():
            self._stop_event.wait(CHECK_INTERVAL_SECONDS)
            if not self._stop_event.is_set():
                self.check_for_updates()
                self._notify_admins()

    def get_status(self):
        """Get update status information"""
        return {
            "current_version": self.current_version,
            "latest_version": self.latest_version,
            "has_update": self.has_update,
            "latest_release_url": self.latest_release_url,
            "latest_release_name": self.latest_release_name,
            "latest_release_body": self.latest_release_body,
            "check_error": self.check_error,
            "last_check_time": self.last_check_time,
        }
