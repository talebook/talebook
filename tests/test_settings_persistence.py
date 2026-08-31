#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import os
from unittest import mock

from webserver import loader, main
from webserver.handlers import admin


def _candidate(nuxt_env_path):
    return {
        "installed": True,
        "site_title": "Original title",
        "google_analytics_id": "",
        "nuxt_env_path": str(nuxt_env_path),
        "user_database": "mysql+pymysql://talebook:secret@db.example.com/books",
        "ACTIVE_THEME": "graphite",
        "INTERNAL_ONLY_TEST_VALUE": "keep-me",
    }


def test_legacy_metadata_sources_migrate_to_booksource_without_removing_baidu():
    value = admin.normalize_meta_sources(["baidu", "youshu", "biquge", "booksource"])

    assert value == ["baidu", "booksource"]


def test_deprecated_douban_v1_falls_back_to_v2_without_dropping_the_source():
    """豆瓣 V1 依赖已停止发放的官方 apikey，存量选择自动改用 V2 而不是被丢弃。"""
    assert admin.normalize_meta_sources(["baidu", "douban"]) == ["baidu", "douban_v2"]
    # 两者同时存在时不产生重复项
    assert admin.normalize_meta_sources(["douban", "douban_v2"]) == ["douban_v2"]
    assert "douban" not in admin.META_ALL_SOURCES
    assert "douban" not in admin.DEFAULT_META_SOURCES


def test_settings_saver_persists_complete_candidate(tmp_path):
    conf = _candidate(tmp_path / ".env")
    args = loader.SettingsLoader()
    args.clear()
    args.update(conf)
    args["site_title"] = "Updated title"

    with mock.patch.object(admin, "CONF", conf):
        with mock.patch.object(args, "set_store_path", return_value=str(tmp_path)):
            result = admin.SettingsSaverLogic().save_extra_settings(args)

    namespace = {}
    path = tmp_path / "auto.py"
    exec(compile(path.read_text(encoding="utf-8"), str(path), "exec"), namespace)
    saved = namespace["settings"]

    assert result["err"] == "ok"
    assert conf["site_title"] == "Updated title"
    assert saved["site_title"] == "Updated title"
    assert saved["user_database"] == "mysql+pymysql://talebook:secret@db.example.com/books"
    assert saved["ACTIVE_THEME"] == "graphite"
    assert saved["INTERNAL_ONLY_TEST_VALUE"] == "keep-me"


def test_settings_saver_failure_keeps_runtime_and_disk_config(tmp_path):
    conf = _candidate(tmp_path / ".env")
    args = loader.SettingsLoader()
    args.clear()
    args.update(conf)
    args["site_title"] = "Must not be committed"
    auto_path = tmp_path / "auto.py"
    auto_path.write_text("original auto config\n", encoding="utf-8")
    (tmp_path / ".env").write_text("original nuxt config\n", encoding="utf-8")

    with mock.patch.object(admin, "CONF", conf):
        with mock.patch.object(args, "dumpfile", side_effect=OSError("disk full")):
            result = admin.SettingsSaverLogic().save_extra_settings(args)

    assert result["err"] == "file.permission"
    assert conf["site_title"] == "Original title"
    assert auto_path.read_text(encoding="utf-8") == "original auto config\n"
    assert (tmp_path / ".env").read_text(encoding="utf-8") == "original nuxt config\n"


def test_settings_dumpfile_replace_failure_is_atomic(tmp_path):
    settings = loader.SettingsLoader()
    settings.clear()
    settings["site_title"] = "new title"
    path = tmp_path / "auto.py"
    path.write_text("original config\n", encoding="utf-8")

    with mock.patch.object(settings, "set_store_path", return_value=str(tmp_path)):
        with mock.patch("webserver.loader.os.replace", side_effect=OSError("replace failed")):
            with mock.patch("webserver.loader.os.remove", wraps=os.remove) as remove:
                with mock.patch("webserver.loader.os.close", wraps=os.close) as close:
                    try:
                        settings.dumpfile()
                    except OSError:
                        pass
                    else:
                        raise AssertionError("replace failure must be propagated")

    assert path.read_text(encoding="utf-8") == "original config\n"
    assert sorted(item.name for item in tmp_path.iterdir()) == ["auto.py"]
    assert remove.called
    close.assert_not_called()


def test_atomic_write_closes_descriptor_when_fdopen_fails(tmp_path):
    path = tmp_path / "auto.py"

    with mock.patch("webserver.loader.os.fdopen", side_effect=OSError("fdopen failed")):
        with mock.patch("webserver.loader.os.close", wraps=os.close) as close:
            try:
                loader.atomic_write_text(str(path), "new config\n")
            except OSError:
                pass
            else:
                raise AssertionError("fdopen failure must be propagated")

    assert sorted(item.name for item in tmp_path.iterdir()) == []
    close.assert_called_once()


def test_update_config_passes_current_settings_to_nuxt_writer():
    previous_update_config = main.options.update_config
    main.options.update_config = True
    try:
        with mock.patch.object(admin.SettingsSaverLogic, "update_nuxtjs_env") as update_nuxtjs_env:
            try:
                main.make_app()
            except SystemExit as exc:
                assert exc.code == 0
            else:
                raise AssertionError("--update-config must exit after updating the Nuxt environment")
    finally:
        main.options.update_config = previous_update_config

    update_nuxtjs_env.assert_called_once_with(main.CONF)
