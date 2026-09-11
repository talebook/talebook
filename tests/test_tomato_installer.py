import hashlib
import io
from unittest import mock

import pytest

from scripts import install_tomato_downloader as installer
from webserver.plugins.source.tomato_downloader import RELEASE_HASHES, VERSION


def test_installer_and_runtime_agree_on_release():
    assert installer.VERSION == VERSION
    assert installer.ARTIFACTS["amd64"][1] == RELEASE_HASHES["x86_64"]
    assert installer.ARTIFACTS["arm64"][1] == RELEASE_HASHES["aarch64"]


def test_install_verifies_bytes_and_preserves_license(tmp_path, monkeypatch):
    binary = b"release-fixture"
    monkeypatch.setitem(installer.ARTIFACTS, "amd64", ("Linux_musl_amd64", hashlib.sha256(binary).hexdigest()))
    with mock.patch.object(installer.urllib.request, "urlopen", return_value=io.BytesIO(binary)) as download:
        result = installer.install(tmp_path, "amd64")
    assert result.read_bytes() == binary
    assert result.stat().st_mode & 0o111
    license_text = (tmp_path / "LICENSE").read_text()
    assert "Copyright (c) 2025 zhongbai2333" in license_text
    assert "THE SOFTWARE IS PROVIDED" in license_text
    assert (tmp_path / "NOTICE.md").is_file()
    assert download.call_args.args[0].endswith("/v2.4.15/TomatoNovelDownloader-Linux_musl_amd64-v2.4.15")
    assert not list(tmp_path.glob(".tomato-install-*"))


def test_bad_digest_preserves_existing_installation(tmp_path):
    (tmp_path / "downloader").write_bytes(b"previous")
    with mock.patch.object(installer.urllib.request, "urlopen", return_value=io.BytesIO(b"tampered")):
        with pytest.raises(ValueError, match="SHA-256"):
            installer.install(tmp_path, "amd64")
    assert (tmp_path / "downloader").read_bytes() == b"previous"
    assert not list(tmp_path.glob(".tomato-install-*"))
