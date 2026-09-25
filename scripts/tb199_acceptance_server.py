"""Disposable real Talebook server using repository fixture books, without auth/API mocks.

Run only in an isolated Docker container; setup_server resets the fixture databases.
"""
import json
import os
import secrets
from pathlib import Path

from tornado.ioloop import IOLoop
from tests import test_main
from webserver import main, models

main.CONF.update({"autoreload": False, "static_path": "/work/app/public/static",
                  "ALLOW_GUEST_READ": True, "auto_login": 0})
test_main.setup_server()
app = test_main._app
session = test_main.get_db()
user = models.Reader(username="tb199-acceptance", name="TB199 验收", permission="")
password = secrets.token_urlsafe(24)
user.set_secure_password(password)
session.add(user)
session.commit()
credential_path = Path("/qa/.credentials.json")
fd = os.open(credential_path, os.O_CREAT | os.O_WRONLY | os.O_TRUNC, 0o600)
with os.fdopen(fd, "w") as output:
    json.dump({"username": user.username, "password": password}, output)
app.listen(8080)
print("TB199 acceptance server ready", flush=True)
IOLoop.current().start()
