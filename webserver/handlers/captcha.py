"""Human verification and scoped access grants for books."""

import base64
import hashlib
import json
import time
import urllib.parse

from tornado import web

from webserver import loader
from webserver.base_path import public_url
from webserver.handlers.base import BaseHandler, js
from webserver.i18n import _
from webserver.plugins import captcha as captcha_module
from webserver.plugins.captcha.image_captcha import ImageCaptchaProvider


CONF = loader.get_settings()
BOOK_CAPTCHA_TTL = 30 * 60


def check_captcha(handler, scene, consume=True, required=False):
    """Verify only the configured provider; consume image answers on submission."""
    if not required and not captcha_module.is_captcha_enabled(CONF, scene):
        return True, None
    provider = captcha_module.get_captcha_provider(CONF)
    if not provider or not provider.is_configured():
        return False, _("人机验证未正确配置，请联系管理员")
    if provider.name == "image":
        code = handler.get_argument("captcha_code", "")
        answer = handler.get_secure_cookie("captcha_answer")
        generated = handler.get_secure_cookie("captcha_generate_time")
        if not code:
            return False, _("请完成人机验证")
        try:
            age = time.time() - float(generated)
            if not answer or not 0 <= age <= 120:
                return False, _("验证码已过期，请刷新")
            passed = provider.verify(captcha_code=code, captcha_answer=answer.decode("utf-8"))
        except (TypeError, ValueError, UnicodeError):
            return False, _("验证码已过期，请刷新")
        if passed and consume:
            handler.clear_cookie("captcha_answer")
            handler.clear_cookie("captcha_generate_time")
    elif provider.name == "turnstile":
        passed = provider.verify(
            turnstile_token=handler.get_argument("turnstile_token", ""),
            remote_ip=handler.request.remote_ip,
            scene=scene,
        )
    else:
        parameters = {key: handler.get_argument(key, "") for key in ("lot_number", "captcha_output", "pass_token", "gen_time")}
        if not all(parameters.values()):
            return False, _("请完成人机验证")
        passed = provider.verify(**parameters)
    return (True, None) if passed else (False, _("人机验证失败，请重试"))


def _grant_context(handler):
    # Invalidate grants when the account or the provider credentials change.
    credentials = [
        CONF.get(key, "")
        for key in (
            "CAPTCHA_PROVIDER",
            "TURNSTILE_SITE_KEY",
            "TURNSTILE_SECRET_KEY",
            "GEETEST_CAPTCHA_ID",
            "GEETEST_CAPTCHA_KEY",
        )
    ]
    principal = handler.current_user
    admin = handler.admin_user
    return {
        "user": principal.id if principal else None,
        "admin": admin.id if admin else None,
        "provider": hashlib.sha256(json.dumps(credentials).encode()).hexdigest(),
    }


def _book_grants(handler, scene):
    try:
        payload = json.loads(handler.get_secure_cookie("captcha_" + scene) or b"{}")
        if payload.get("context") == _grant_context(handler):
            now = time.time()
            return {
                bid: issued
                for bid, issued in payload.get("books", {}).items()
                if isinstance(issued, (int, float)) and 0 <= now - issued < BOOK_CAPTCHA_TTL
            }
    except (ValueError, TypeError, AttributeError, UnicodeError):
        pass
    return {}


def book_captcha_enabled(scene):
    return captcha_module.is_captcha_enabled(CONF, scene)


def require_book_captcha(handler, book_id, scene, redirect=False):
    if not book_captcha_enabled(scene):
        return True
    handler.set_header("Cache-Control", "private, no-store")
    if str(int(book_id)) in _book_grants(handler, scene):
        return True
    if redirect:
        # Router URL normalization can split escaped query separators; use a URL-safe payload.
        target = base64.urlsafe_b64encode(public_url(handler.request.uri).encode()).decode().rstrip("=")
        query = urllib.parse.urlencode({"scene": scene, "next_b64": target})
        handler.redirect("/book/%d/verify?%s" % (int(book_id), query))
    else:
        handler.set_status(403)
        handler.set_header("Cache-Control", "no-store")
        handler.finish({"err": "captcha.required", "msg": _("请完成人机验证")})
    return False


class CaptchaBaseHandler(BaseHandler):
    def should_be_invited(self):
        pass


class CaptchaConfigHandler(CaptchaBaseHandler):
    @js
    def get(self):
        return {
            "err": "ok",
            "config": captcha_module.get_captcha_config(CONF),
            "scenes": {
                scene: captcha_module.is_captcha_enabled(CONF, scene)
                for scene in ("register", "login", "welcome", "reset", "download", "read")
            },
        }


class CaptchaImageHandler(CaptchaBaseHandler):
    @js
    def get(self):
        result = ImageCaptchaProvider(CONF).generate()
        for key, value in (("captcha_answer", result["code"]), ("captcha_generate_time", str(time.time()))):
            web.RequestHandler.set_secure_cookie(self, key, value, expires_days=120 / 86400, httponly=True, samesite="Lax")
        return {"err": "ok", "captcha_id": result["captcha_id"], "image": result["image"]}


class CaptchaVerifyHandler(CaptchaBaseHandler):
    @js
    def post(self):
        provider = self.get_argument("provider", "")
        if not provider or provider != CONF.get("CAPTCHA_PROVIDER"):
            return {"err": "params.invalid", "msg": _("验证提供商不匹配")}
        scene = self.get_argument("scene", "")
        if scene:
            if scene not in ("download", "read"):
                return {"err": "params.invalid", "msg": _("验证场景无效")}
            try:
                book_id = int(self.get_argument("book_id", ""))
            except ValueError:
                return {"err": "params.invalid", "msg": _("书籍编号无效")}
            if not self.get_book(book_id, raise_exception=False):
                return {"err": "not_found", "msg": _("抱歉，这本书不存在")}
            if not captcha_module.is_captcha_enabled(CONF, scene):
                return {"err": "ok"}
        else:
            # ImageCaptchaWidget previews the answer before its parent submits it.
            if provider != "image":
                return {"err": "params.invalid", "msg": _("验证场景无效")}
            scene = "preview"
        valid, message = check_captcha(self, scene, consume=scene != "preview", required=True)
        if not valid:
            return {"err": "captcha.invalid", "msg": message}
        if scene != "preview":
            grants = _book_grants(self, scene)
            grants[str(book_id)] = time.time()
            grants = dict(sorted(grants.items(), key=lambda item: item[1])[-20:])
            web.RequestHandler.set_secure_cookie(
                self,
                "captcha_" + scene,
                json.dumps({"context": _grant_context(self), "books": grants}),
                expires_days=BOOK_CAPTCHA_TTL / 86400,
                httponly=True,
                samesite="Lax",
                secure=self.request.protocol == "https",
            )
            self.set_header("Cache-Control", "no-store")
        return {"err": "ok", "msg": _("验证通过")}


def routes():
    return [
        (r"/api/captcha/config", CaptchaConfigHandler),
        (r"/api/captcha/image", CaptchaImageHandler),
        (r"/api/captcha/verify", CaptchaVerifyHandler),
    ]
