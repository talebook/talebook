"""Ephemeral Talebook backend for Venera integration, using only test data.

Run in a test container with its own network port. Changes only tests/library,
never a deployed library or instance. Stop the container after the test.
"""

import io
import json
import zipfile
from pathlib import Path

import tornado.ioloop
from PIL import Image

from tests import test_main
from webserver import main
from webserver.models import Item, Reader


def run():
    test_main.setup_server()  # Actual handlers and authentication; no user mocks.
    app = test_main._app
    main.CONF["CAPTCHA_ENABLE_FOR_LOGIN"] = False
    session = test_main.get_db()
    reader = session.get(Reader, 1)
    reader.username = "venera-integration"
    reader.set_secure_password("test-only-password")
    reader.active = True
    reader.permission = "lrv"
    reader.admin = False
    reader.extra = {}
    archive = Path(test_main.testdir) / "library/venera-integration.cbz"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as container:
        for name, color in [("page10.png", "blue"), ("page2.png", "green"), ("page1.png", "red")]:
            data = io.BytesIO()
            Image.new("RGB", (48, 64), color).save(data, "PNG")
            container.writestr(name, data.getvalue())
    db = app.settings["legacy"]
    db.add_format(1, "CBZ", str(archive), index_is_id=True)
    item = session.query(Item).filter(Item.book_id == 1).one()
    item.media_type = "comic"
    item.scope = "public"
    session.commit()
    app.listen(8080, address="0.0.0.0")
    print(json.dumps({"status": "ready", "book_id": 1}), flush=True)
    tornado.ioloop.IOLoop.current().start()


if __name__ == "__main__":
    run()
