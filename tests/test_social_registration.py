"""Exercise the real callback and pipeline with a local, deterministic provider."""

from unittest.mock import patch

from social_core.backends.base import BaseAuth
from social_core.pipeline import DEFAULT_AUTH_PIPELINE
from social_sqlalchemy.storage import SQLAlchemyMixin
from social_tornado import models as social_models
from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.orm import declarative_base, scoped_session, sessionmaker
from tornado.testing import AsyncHTTPTestCase
from tornado.web import Application, create_signed_value

from webserver import models, social_routes


class FixtureReader:
    id = Column(Integer, primary_key=True)
    username = Column(String(200))
    email = Column(String(200))


class FixtureStorage(social_models.TornadoStorage):
    pass


class FixtureProvider(BaseAuth):
    name = "fixture"

    def auth_complete(self, *args, **kwargs):
        return self.strategy.authenticate(
            self,
            *args,
            response={"id": "fixture-reader", "username": "test_reader"},
            **kwargs,
        )

    def get_user_id(self, details, response):
        return response["id"]

    def get_user_details(self, response):
        return {"username": response["username"]}


class TestSocialRegistration(AsyncHTTPTestCase):
    def get_app(self):
        base = declarative_base()
        self.reader = type("SocialFixtureReader", (FixtureReader, base), {"__tablename__": "readers"})
        self.engine = create_engine("sqlite://")
        self.session = scoped_session(sessionmaker(bind=self.engine))
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.session.remove)

        # Earlier app tests may leave the shared save hook bound to a different
        # database. Bind the real hook to this fixture and restore it on cleanup.
        self.enterContext(patch.object(models.Base, "_session", create=True))
        self.enterContext(patch.object(SQLAlchemyMixin, "_session"))
        self.enterContext(patch.object(SQLAlchemyMixin, "_save_instance"))
        models.bind_session(self.session)

        with (
            patch.object(social_models, "TornadoStorage", FixtureStorage),
            patch.object(social_models, "module_member", return_value=self.reader),
        ):
            social_models.init_social(base, self.session, {"SOCIAL_AUTH_USER_MODEL": "unused"})
        base.metadata.create_all(self.engine)

        conf = social_routes.CONF
        patcher = patch.dict(conf, {"ALLOW_REGISTER": False, "DEMO_MODE": False})
        patcher.start()
        self.addCleanup(patcher.stop)
        return Application(
            social_routes.SOCIAL_AUTH_ROUTES,
            cookie_secret="fixture-secret",
            SOCIAL_AUTH_LOGIN_URL=conf["SOCIAL_AUTH_LOGIN_URL"],
            SOCIAL_AUTH_LOGIN_REDIRECT_URL=conf["SOCIAL_AUTH_LOGIN_REDIRECT_URL"],
            SOCIAL_AUTH_PIPELINE=conf.get("SOCIAL_AUTH_PIPELINE", DEFAULT_AUTH_PIPELINE),
            SOCIAL_AUTH_STORAGE=f"{__name__}.FixtureStorage",
            SOCIAL_AUTH_AUTHENTICATION_BACKENDS=(f"{__name__}.FixtureProvider",),
        )

    def complete(self, cookie=None):
        headers = {"Accept-Language": "en-US"}
        if cookie:
            headers["Cookie"] = cookie
        return self.fetch(
            "/auth/complete/fixture.do",
            follow_redirects=False,
            headers=headers,
        )

    def assert_login_cookie(self, response):
        assert any(header.startswith("user_id=") for header in response.headers.get_list("Set-Cookie"))

    def test_closed_registration_leaves_no_new_user_or_association(self):
        response = self.complete()
        assert response.code == 403
        assert response.body == b"This site has disabled self-registration. Contact the administrator for an account."
        assert not any(header.startswith("user_id=") for header in response.headers.get_list("Set-Cookie"))
        assert self.session.query(self.reader).count() == 0
        assert self.session.query(FixtureStorage.user).count() == 0

    def test_existing_social_binding_can_sign_in_when_closed(self):
        reader = self.reader(username="known_reader")
        self.session.add(reader)
        self.session.commit()
        FixtureStorage.user.create_social_auth(reader, "fixture-reader", "fixture")

        response = self.complete()
        assert response.code == 302
        assert response.headers["Location"] == "/api/done/"
        self.assert_login_cookie(response)
        assert self.session.query(self.reader).count() == 1
        assert self.session.query(FixtureStorage.user).count() == 1

    def test_enabling_registration_applies_without_rebuilding_application(self):
        social_routes.CONF["ALLOW_REGISTER"] = True
        response = self.complete()
        assert response.code == 302
        assert response.headers["Location"] == "/api/done/"
        self.assert_login_cookie(response)
        assert self.session.query(self.reader).one().username == "test_reader"
        assert self.session.query(FixtureStorage.user).one().uid == "fixture-reader"

    def test_signed_in_reader_can_still_bind_without_creating_an_account(self):
        reader = self.reader(username="existing_reader")
        self.session.add(reader)
        self.session.commit()
        cookie = create_signed_value("fixture-secret", "user_id", str(reader.id)).decode()

        response = self.complete(cookie="user_id=" + cookie)
        assert response.code == 302
        assert self.session.query(self.reader).count() == 1
        assert self.session.query(FixtureStorage.user).one().user_id == reader.id

    def test_demo_mode_still_rejects_social_callbacks(self):
        social_routes.CONF["DEMO_MODE"] = True
        social_routes.CONF["ALLOW_REGISTER"] = True
        response = self.complete()
        assert response.code == 403
        assert self.session.query(self.reader).count() == 0
