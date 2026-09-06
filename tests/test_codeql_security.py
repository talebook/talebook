"""Regression coverage for the security findings reported on PR #977."""

import re
import subprocess
import sys
from unittest import mock
from urllib.parse import quote, unquote, urlencode, urlsplit

import pytest
from tornado.web import Application

from tests import test_main
from webserver import models
from webserver.handlers.meta import AuthorBooksUpdate, PubBooksUpdate


def setUpModule():
    test_main.setUpModule()


@pytest.mark.parametrize("email", ["reader@example.com", "a+b@books.example.org", "读者@书库.中国"])
def test_email_accepts_supported_addresses(email):
    assert re.match(models.Reader.RE_EMAIL, email)


@pytest.mark.parametrize(
    "email",
    [
        "reader",
        "@example.com",
        "a@@example.com",
        "a@.com",
        "a@example..com",
        "a@example.com@evil",
        "a@exam ple.com",
        "a@example.com\nextra",
    ],
)
def test_email_rejects_malformed_addresses(email):
    assert not re.match(models.Reader.RE_EMAIL, email)


def test_email_long_invalid_input_has_bounded_runtime():
    # Isolate the regex so a regression cannot hang the test runner itself.
    code = "import re, sys; assert re.match(sys.argv[1], '?' * 100000 + '@' + '?' * 100000) is None"
    subprocess.run([sys.executable, "-c", code, models.Reader.RE_EMAIL], check=True, timeout=5)


def test_reset_password_without_account_timestamps():
    reader = models.Reader()
    password = reader.reset_password()
    assert len(password) == 16
    assert re.fullmatch(models.Reader.RE_PASSWORD, password)
    assert reader.salt == "__bcrypt__"
    assert reader.get_secure_password(password) == reader.password
    next_password = reader.reset_password()
    assert next_password != password
    assert reader.get_secure_password(password) != reader.password
    assert reader.get_secure_password(next_password) == reader.password


class TestSecurityEndpoints(test_main.TestWithUserLogin):
    def test_registration_rejects_invalid_email_before_saving_or_sending_mail(self):
        body = urlencode(dict(email="a@example.com@evil", nickname="security", username="security", password="Password123"))
        with mock.patch("webserver.handlers.user.check_captcha", return_value=(True, "")):
            with mock.patch.object(models.Reader, "save") as save:
                with mock.patch("webserver.handlers.user.SignUp.send_active_email") as send_mail:
                    result = self.json("/api/user/sign_up", method="POST", body=body)
        self.assertEqual(result["err"], "params.email.invalid")
        save.assert_not_called()
        send_mail.assert_not_called()

    def test_installation_rejects_invalid_email_before_saving(self):
        body = urlencode(dict(email="a@example.com@evil", username="security", password="Password123", title="Books"))
        with mock.patch.dict("webserver.handlers.admin.CONF", {"installed": False}):
            with mock.patch.object(models.Reader, "save") as save:
                result = self.json("/api/admin/install", method="POST", body=body)
        self.assertEqual(result["err"], "params.email.invalid")
        save.assert_not_called()


class TestMetadataUpdateRedirects(test_main.TestWithUserLogin):
    def get_app(self):
        # Exercise the legacy handlers directly, independently of catch-all routes.
        app = super().get_app()
        return Application(
            [
                (r"/api/author/(.*)/update", AuthorBooksUpdate),
                (r"/api/publisher/(.*)/update", PubBooksUpdate),
            ],
            **app.settings,
        )

    def test_metadata_update_redirect_encodes_name_as_one_path_segment(self):
        db = self._app.settings["legacy"]
        names = [
            "中文名字",
            "name/part?query#fragment",
            "../..//evil.example",
            "\\evil.example",
            "//evil.example",
            "%2f%2fevil.example",
        ]
        with mock.patch.object(db.new_api, "get_item_id", return_value=1):
            with mock.patch.object(db, "get_books_for_category", return_value=[]):
                for category in ("author", "publisher"):
                    for name in names:
                        with self.subTest(category=category, name=name):
                            response = self.fetch(
                                "/api/%s/%s/update" % (category, quote(name, safe="")),
                                method="POST",
                                body="",
                                follow_redirects=False,
                            )
                            self.assertEqual(response.code, 302)
                            location = response.headers["Location"]
                            parsed = urlsplit(location)
                            self.assertEqual(parsed.netloc, "")
                            self.assertEqual(parsed.query, "")
                            self.assertEqual(parsed.fragment, "")
                            self.assertTrue(location.startswith("/%s/" % category))
                            segment = location[len(category) + 2 :]
                            self.assertNotIn("/", segment)
                            self.assertEqual(unquote(segment), name)
