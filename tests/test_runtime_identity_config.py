#!/usr/bin/env pytest
# -*- coding: UTF-8 -*-

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative_path):
    return (ROOT / relative_path).read_text(encoding="utf-8")


def test_all_supervisor_variants_run_nginx_as_talebook():
    for relative_path in (
        "conf/supervisor/talebook.conf",
        "conf/supervisor/server-side-render.conf",
        "conf/supervisor/dev.conf",
    ):
        nginx_section = read(relative_path).split("[program:nginx]", 1)[1].split("[", 1)[0]
        assert "user=talebook" in nginx_section


def test_dockerfile_grants_only_nginx_low_port_capability_and_moves_pid():
    dockerfile = read("Dockerfile")
    assert "setcap cap_net_bind_service=+ep /usr/sbin/nginx" in dockerfile
    assert "COPY conf/nginx/nginx.conf /etc/nginx/nginx.conf" in dockerfile
    assert "sed -i '/^user[[:space:]]/d' /etc/nginx/nginx.conf" not in dockerfile
    assert "sed -i 's#^pid /run/nginx.pid;" not in dockerfile

    nginx_config = read("conf/nginx/nginx.conf")
    assert "pid /run/talebook/nginx.pid;" in nginx_config
    assert not any(line.strip().startswith("user ") for line in nginx_config.splitlines())
    assert "include /etc/nginx/modules-enabled/*.conf;" in nginx_config
    assert "include /etc/nginx/conf.d/*.conf;" in nginx_config
    assert "include /etc/nginx/sites-enabled/*;" in nginx_config


def test_start_scripts_prepare_nginx_runtime_directories():
    for relative_path in ("docker/start.sh", "docker/start-dev.sh"):
        script = read(relative_path)
        assert "mkdir -p /root/.npm /run/talebook /data/books/ssl" in script
        assert "/run/talebook" in script
        assert "/data/books/ssl" in script
        assert "/var/log/nginx" in script
        assert "PUID=0 runs Talebook application processes as root" in script
        assert "chmod 0600 /data/books/ssl/ssl.key" in script


def test_start_scripts_grant_atomic_nuxt_config_parent_without_recursive_app_chown():
    for relative_path in ("docker/start.sh", "docker/start-dev.sh"):
        script = read(relative_path)

        assert "chown talebook:talebook /var/www/talebook/app" in script
        recursive_chown = script.split("chown -R talebook:talebook \\", 1)[1].split("\n\n", 1)[0]
        assert "  /var/www/talebook/app \\" not in recursive_chown
