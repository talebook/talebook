"""Cloudflare Turnstile verification using the official Siteverify API."""

import logging

import requests

from .base import BaseCaptchaProvider


class TurnstileProvider(BaseCaptchaProvider):
    name = "turnstile"
    sdk_url = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    verify_url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

    def is_configured(self):
        return bool(self.settings.get("TURNSTILE_SITE_KEY") and self.settings.get("TURNSTILE_SECRET_KEY"))

    def get_frontend_config(self):
        return {"provider": self.name, "siteKey": self.settings.get("TURNSTILE_SITE_KEY", ""), "sdkUrl": self.sdk_url}

    def verify(self, **kwargs):
        token = kwargs.get("turnstile_token", "")
        if not self.is_configured() or not isinstance(token, str) or not token or len(token) > 2048:
            return False
        data = {"secret": self.settings["TURNSTILE_SECRET_KEY"], "response": token}
        if kwargs.get("remote_ip"):
            data["remoteip"] = kwargs["remote_ip"]
        try:
            response = requests.post(self.verify_url, data=data, timeout=10)
            if response.status_code != 200:
                return False
            result = response.json()
            if not isinstance(result, dict) or result.get("success") is not True:
                return False
            return not kwargs.get("scene") or result.get("action") == kwargs["scene"]
        except (requests.RequestException, ValueError):
            logging.warning("Cloudflare Turnstile verification unavailable")
            return False
