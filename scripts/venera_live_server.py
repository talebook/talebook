"""Disposable real Talebook/Calibre server for Venera live acceptance (no API mocks)."""

import argparse
import datetime
import json
import os
import secrets
import shutil
import tempfile
from pathlib import Path

import tornado.ioloop

from webserver import main, models
from webserver.plugins.source.venera import PLUGIN_ID
from webserver.services.plugin_runtime import BUILTIN_CONNECTION_ROLE, install_builtin, save_connection


def run():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--access-file", required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    with tempfile.TemporaryDirectory(prefix="tb236-live-") as temporary:
        library = Path(temporary) / "library"
        shutil.copytree(root / "tests/library", library)
        shutil.copyfile(root / "tests/cases/users.db", library / "users.db")
        shutil.copyfile(root / "tests/cases/metadata.db", library / "metadata.db")
        main.options.with_library = str(library)
        main.CONF.update(
            {
                "installed": True,
                "INVITE_MODE": False,
                "auto_login": 0,
                "autoreload": False,
                "user_database": f"sqlite:///{library}/users.db",
                "cookie_secret": secrets.token_urlsafe(32),
                "PLUGIN_SECRET_KEY": secrets.token_urlsafe(32),
                "html_path": str(root / "app/public"),
                "resource_path": str(root / "webserver/resources"),
                "settings_path": temporary,
                "themes_path": str(Path(temporary) / "themes"),
                "upload_path": temporary,
                "extract_path": temporary,
                "progress_path": temporary,
                "scan_upload_path": temporary,
                "nuxt_env_path": str(Path(temporary) / ".env"),
                "AUDIOBOOK_PATH": str(Path(temporary) / "audiobooks"),
                "AUDIOBOOK_RUNNER_ENABLED": False,
                "BOOKSOURCE_RESUME_PENDING_CHECK_ON_START": False,
                "BOOKSOURCE_HTTP_TIMEOUT": 45,
            }
        )
        app = main.make_app()
        session = app.settings["SessionMaker"]()
        try:
            models.Base.metadata.create_all(session.get_bind())
            password = secrets.token_urlsafe(12)
            reader = models.Reader(
                username="venera_acceptance",
                name="Venera 实际验证",
                email="acceptance@example.test",
                admin=True,
                active=True,
                create_time=datetime.datetime.now(),
                permission="",
                extra={},
            )
            reader.set_secure_password(password)
            session.add(reader)
            session.commit()
            installation = install_builtin(session, PLUGIN_ID, installed_by=reader.id, enabled=True)
            connection = save_connection(
                session,
                main.CONF,
                installation.id,
                "instance",
                0,
                {},
                role=BUILTIN_CONNECTION_ROLE,
                config={"source": "MangaDex", "timeout_seconds": 45},
            )
            access = Path(args.access_file)
            access.parent.mkdir(parents=True, exist_ok=True)
            descriptor = os.open(access, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            with os.fdopen(descriptor, "w") as output:
                json.dump({"username": reader.username, "password": password, "source_id": f"plugin:{connection.id}"}, output)
        finally:
            session.close()
        app.listen(args.port, address="127.0.0.1")
        print(f"Real Talebook backend ready on port {args.port}", flush=True)
        tornado.ioloop.IOLoop.current().start()


if __name__ == "__main__":
    run()
