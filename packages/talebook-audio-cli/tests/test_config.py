import json
import stat

import pytest
from talebook_audio_cli.config import AppPaths, Config, ConfigError, load_config, normalize_server_url, save_config


def test_save_config_normalizes_url_and_uses_private_permissions(tmp_path):
    paths = AppPaths(tmp_path / "settings")
    save_config(Config("HTTPS://Books.Example.COM/base/", "alice"), paths)

    assert load_config(paths) == Config("https://books.example.com/base", "alice")
    assert stat.S_IMODE(paths.config_file.stat().st_mode) == 0o600
    assert "password" not in json.loads(paths.config_file.read_text())


@pytest.mark.parametrize(
    "value",
    ["books.example.com", "ftp://books.example.com", "https://user:secret@books.example.com", "https://books.example.com?q=1"],
)
def test_normalize_server_url_rejects_unsafe_or_ambiguous_values(value):
    with pytest.raises(ConfigError):
        normalize_server_url(value)


def test_missing_config_has_actionable_message(tmp_path):
    with pytest.raises(ConfigError, match="configure"):
        load_config(AppPaths(tmp_path / "missing"))
