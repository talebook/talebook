#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import logging
import threading

from webserver import loader

CONF = loader.get_settings()


class WebDAVService:
    """WebDAV 服务，基于 wsgidav，允许外部设备以 WebDAV 协议访问书库。"""

    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self._server = None
        self._thread = None
        self._port = None

    @classmethod
    def instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
        return cls._instance

    def is_running(self):
        return self._thread is not None and self._thread.is_alive()

    def get_port(self):
        return self._port

    def start(self, library_path, port, username=None, password=None):
        if self.is_running():
            self.stop()
        try:
            from cheroot import wsgi
            from wsgidav.fs_dav_provider import FilesystemProvider
            from wsgidav.wsgidav_app import WsgiDAVApp
        except ImportError:
            logging.error("wsgidav 未安装，无法启动 WebDAV 服务。请安装: pip install wsgidav")
            return False

        config = {
            "provider_mapping": {"/": FilesystemProvider(library_path, readonly=True)},
            "verbose": 0,
            "logging": {"enable_loggers": []},
        }

        if username and password:
            config["http_authenticator"] = {
                "domain_controller": "wsgidav.dc.simple_dc.SimpleDomainController",
                "accept_basic": True,
                "accept_digest": False,
                "default_to_digest": False,
            }
            config["simple_dc"] = {
                "user_mapping": {
                    "*": {username: {"password": password}},
                }
            }

        try:
            app = WsgiDAVApp(config)
            server = wsgi.Server(("0.0.0.0", port), app)
            server.prepare()
            self._server = server
            self._port = port

            def run():
                try:
                    logging.info("WebDAV 服务启动在端口 %d", port)
                    server.serve()
                except Exception as e:
                    logging.error("WebDAV 服务异常: %s", e)
                finally:
                    logging.info("WebDAV 服务已停止")

            self._thread = threading.Thread(target=run, daemon=True, name="webdav-server")
            self._thread.start()
            return True
        except Exception as e:
            logging.error("WebDAV 服务启动失败: %s", e)
            self._port = None
            return False

    def stop(self):
        if self._server is not None:
            try:
                self._server.stop()
            except Exception as e:
                logging.error("WebDAV 服务停止失败: %s", e)
            finally:
                self._server = None
                self._port = None
        if self._thread is not None:
            self._thread.join(timeout=5)
            self._thread = None


def start_if_enabled():
    """从配置读取设置，若 WEBDAV_ENABLED=True 则启动 WebDAV 服务。"""
    if not CONF.get("WEBDAV_ENABLED", False):
        return
    port = int(CONF.get("WEBDAV_PORT", 8083))
    username = CONF.get("WEBDAV_USERNAME", "")
    password = CONF.get("WEBDAV_PASSWORD", "")
    library_path = CONF.get("with_library", "/data/books/library/")
    service = WebDAVService.instance()
    service.start(library_path, port, username or None, password or None)
