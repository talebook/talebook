import base64
import hashlib
import json
import re

from cryptography.fernet import Fernet, InvalidToken


SENSITIVE_KEY_RE = re.compile(r"(?:^|_)(?:authorization|password|secret|token|api_key|apikey|cookie)(?:$|_)", re.I)
BEARER_RE = re.compile(r"(?i)(bearer\s+)[A-Za-z0-9._~+/=-]+")
ASSIGNMENT_RE = re.compile(r"(?i)\b(token|api[_-]?key|password|secret)=([^\s,;&]+)")


class SecretCipherError(RuntimeError):
    code = "plugin_secret_invalid"


def _key_material(settings):
    plugin_key = settings.get("PLUGIN_SECRET_KEY")
    cookie_secret = settings.get("cookie_secret")
    value = plugin_key or cookie_secret
    if not value or (not plugin_key and value == "cookie_secret"):
        raise SecretCipherError("Configure PLUGIN_SECRET_KEY or a non-default cookie_secret before storing credentials")
    if isinstance(value, bytes):
        return value
    return str(value).encode("utf-8")


class SecretCipher:
    """Authenticated encryption and rotation for plugin connection credentials."""

    def __init__(self, settings):
        digest = hashlib.sha256(b"talebook-plugin-secret-v1\0" + _key_material(settings)).digest()
        self.key_id = hashlib.sha256(digest).hexdigest()[:16]
        self._fernet = Fernet(base64.urlsafe_b64encode(digest))

    def encrypt(self, values):
        if not isinstance(values, dict) or not values:
            raise SecretCipherError("plugin credentials must be a non-empty object")
        plaintext = json.dumps(values, ensure_ascii=False, separators=(",", ":"), sort_keys=True).encode("utf-8")
        return self._fernet.encrypt(plaintext).decode("ascii")

    def decrypt(self, ciphertext):
        try:
            plaintext = self._fernet.decrypt(ciphertext.encode("ascii"))
            values = json.loads(plaintext.decode("utf-8"))
        except (InvalidToken, UnicodeError, ValueError, TypeError) as exc:
            raise SecretCipherError("plugin credential cannot be decrypted") from exc
        if not isinstance(values, dict):
            raise SecretCipherError("plugin credential payload is invalid")
        return values

    def rotate(self, ciphertext, previous_cipher):
        values = previous_cipher.decrypt(ciphertext)
        return self.encrypt(values)


def secret_mask_hint(values):
    if not isinstance(values, dict):
        return ""
    first = next((str(value) for value in values.values() if value not in (None, "")), "")
    return first[-4:] if first else ""


def redact(value, secrets=None):
    """Return a safe copy suitable for APIs, logs and persistent errors."""

    known_values = sorted({str(item) for item in (secrets or {}).values() if item not in (None, "")}, key=len, reverse=True)

    def scrub(item, key=""):
        if isinstance(item, dict):
            return {name: scrub(content, str(name)) for name, content in item.items()}
        if isinstance(item, list):
            return [scrub(content, key) for content in item]
        if isinstance(item, tuple):
            return tuple(scrub(content, key) for content in item)
        if SENSITIVE_KEY_RE.search(key):
            return "[REDACTED]"
        if not isinstance(item, str):
            return item
        result = item
        for secret in known_values:
            result = result.replace(secret, "[REDACTED]")
        result = BEARER_RE.sub(r"\1[REDACTED]", result)
        result = ASSIGNMENT_RE.sub(r"\1=[REDACTED]", result)
        return result

    return scrub(value)
