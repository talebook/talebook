#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
import logging
import os
import ssl
import threading
import time
import urllib.error
import urllib.request

from webserver.version import VERSION


GITHUB_REPO = "talebook/talebook"
GITHUB_API_URL = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
CHECK_INTERVAL_SECONDS = 3 * 3600  # 3 hours

# Docker 环境中可能缺少 CA 证书，跳过 SSL 验证
_UNVERIFIED_CONTEXT = ssl.create_default_context()
_UNVERIFIED_CONTEXT.check_hostname = False
_UNVERIFIED_CONTEXT.verify_mode = ssl.CERT_NONE


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
            self._check_thread = None
            self._stop_event = threading.Event()
            self._initialized = True

    def check_for_updates(self):
        """Check GitHub for the latest release"""
        raw_body = None

        # Temporarily clear proxy env vars to bypass local proxy
        original_proxy_vars = {}
        proxy_keys = ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "no_proxy", "NO_PROXY"]
        for key in proxy_keys:
            if key in os.environ:
                original_proxy_vars[key] = os.environ.pop(key)

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
                status_code = response.getcode()
                raw_body = response.read().decode("utf-8")

            if status_code != 200:
                self.check_error = f"GitHub API returned HTTP {status_code}: {raw_body[:200]}"
                logging.error("Update check failed: %s", self.check_error)
                return

            stripped = raw_body.strip()
            if not stripped:
                self.check_error = "GitHub API returned empty response"
                logging.error("Update check failed: %s", self.check_error)
                return

            # Log first 100 chars of response for debugging
            logging.debug("GitHub API response (first 100 chars): %s", stripped[:100])

            data = json.loads(stripped)

            if not isinstance(data, dict):
                self.check_error = f"Unexpected API response type: {type(data).__name__}, body={stripped[:200]}"
                logging.error("Update check failed: %s", self.check_error)
                return

            if "message" in data and "tag_name" not in data:
                self.check_error = f"GitHub API error: {data.get('message', 'unknown')}"
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
            body_preview = (raw_body or "")[:300]
            self.check_error = f"GitHub API returned invalid JSON: {e}. Response preview: {body_preview}"
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
        finally:
            for key, value in original_proxy_vars.items():
                os.environ[key] = value

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
        # Check immediately on startup
        self.check_for_updates()

        while not self._stop_event.is_set():
            self._stop_event.wait(CHECK_INTERVAL_SECONDS)
            if not self._stop_event.is_set():
                self.check_for_updates()

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
