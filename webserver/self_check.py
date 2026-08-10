#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""容器启动自检。

以 root 身份作为 supervisor 的 bootstrap program 运行，在 nginx 已经起来之后
逐项校验运行环境（数据目录权限、nginx 配置、数据库初始化/迁移/配置写入），每完成
一步就把结果写入 status.json。任一步失败就停止后续步骤且不再拉起 tornado，但
nginx 不受影响，用户可以直接通过 /status.json、/status_page.html 看到诊断结果，
不需要进入容器查看日志。

status.json 只提供 phase/status/code，不写入 stderr、日志内容、环境变量或宿主机
路径；每个 code 对应的提示文案由前端（app/plugins/talebook.js）和
docker/status_page.html 各自维护一份固定白名单。
"""

import datetime
import json
import os
import subprocess
import sys


DATA_DIR = os.environ.get("TALEBOOK_DATA_DIR", "/data")
SERVER_DIR = os.environ.get("TALEBOOK_SERVER_DIR", "/var/www/talebook")
STATUS_DIR = os.environ.get("TALEBOOK_STATUS_DIR", "/var/www/talebook/status")
RUN_USER = os.environ.get("TALEBOOK_RUN_USER", "talebook")

SCHEMA_VERSION = 1
ATOMIC_WRITE_PROBE = """set -eu
tmp=$(mktemp "$1/.talebook-write-test.XXXXXX")
moved="${tmp}.replace"
trap 'rm -f "$tmp" "$moved"' 0
mv "$tmp" "$moved"
"""


def _status_path():
    return os.path.join(STATUS_DIR, "status.json")


def _now():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def write_status(steps, phase):
    os.makedirs(STATUS_DIR, exist_ok=True)
    doc = {
        "schema": SCHEMA_VERSION,
        "phase": phase,
        "updated_at": _now(),
        "steps": steps,
    }
    path = _status_path()
    tmp_path = path + ".tmp"
    with open(tmp_path, "w") as f:
        json.dump(doc, f)
    os.replace(tmp_path, path)


def run(cmd):
    """执行命令并把输出打印到 stdout（docker logs 可见，便于管理员排查），但不回传给
    调用方——status.json 只记录成功与否 + 错误 code，不落地 stderr/日志内容。"""
    print("[self_check] $ %s" % " ".join(cmd))
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    output = result.stdout.decode("utf-8", "replace")
    if output.strip():
        print(output)
    return result.returncode == 0


def check_atomic_write(directory):
    """以业务进程身份验证目录支持同目录临时文件和原子替换。"""
    identity = "%s:%s" % (RUN_USER, RUN_USER)
    cmd = ["gosu", identity, "sh", "-c", ATOMIC_WRITE_PROBE, "talebook-write-check", directory]
    return run(cmd)


def check_permission():
    """修复 /data/books 的属主，并校验书库与配置目录的原子写入能力。"""
    permission_file = os.path.join(DATA_DIR, ".permission")
    current = "%s:%s" % (os.environ.get("PUID", "0"), os.environ.get("PGID", "0"))
    books_dir = os.path.join(DATA_DIR, "books")
    settings_dir = os.path.join(books_dir, "settings")
    previous = None
    if os.path.exists(permission_file):
        with open(permission_file) as f:
            previous = f.read().strip()

    if previous != current:
        if not run(["chown", "-R", "%s:%s" % (RUN_USER, RUN_USER), books_dir]):
            return False, "permission_denied"
        with open(permission_file, "w") as f:
            f.write(current)
    elif not run(["chown", "-R", "%s:%s" % (RUN_USER, RUN_USER), settings_dir]):
        # settings 很小，标记命中时仍定向修复，避免宿主目录重建或预置文件复制后属主失真。
        return False, "permission_denied"

    for directory in (os.path.join(books_dir, "library"), settings_dir):
        if not check_atomic_write(directory):
            return False, "permission_denied"

    return True, None


def check_nginx_config():
    cmd = ["gosu", "%s:%s" % (RUN_USER, RUN_USER), "nginx", "-t"]
    return (True, None) if run(cmd) else (False, "nginx_config_invalid")


def check_syncdb():
    cmd = ["gosu", "%s:%s" % (RUN_USER, RUN_USER), os.path.join(SERVER_DIR, "server.py"), "--syncdb"]
    return (True, None) if run(cmd) else (False, "syncdb_failed")


def check_migrate():
    cmd = ["gosu", "%s:%s" % (RUN_USER, RUN_USER), "python3", os.path.join(SERVER_DIR, "webserver", "migrate_db.py")]
    return (True, None) if run(cmd) else (False, "migrate_failed")


def check_update_config():
    cmd = ["gosu", "%s:%s" % (RUN_USER, RUN_USER), os.path.join(SERVER_DIR, "server.py"), "--update-config"]
    return (True, None) if run(cmd) else (False, "update_config_failed")


# 顺序即自检顺序，也是 status.json 里 steps 的顺序
CHECKS = [
    ("permission", check_permission),
    ("nginx_config", check_nginx_config),
    ("syncdb", check_syncdb),
    ("migrate", check_migrate),
    ("update_config", check_update_config),
]


def start_tornado():
    # tornado 位于 [group:talebook] 中，supervisor 的进程名是 talebook:tornado
    subprocess.run(["supervisorctl", "start", "talebook:tornado"])


def run_bootstrap(checks=CHECKS, start_tornado_fn=start_tornado):
    steps = [{"name": name, "status": "pending", "code": None} for name, _ in checks]
    write_status(steps, phase="starting")

    for index, (name, check) in enumerate(checks):
        print("[self_check] ==== %s ====" % name)
        ok, code = check()
        steps[index]["status"] = "ok" if ok else "failed"
        steps[index]["code"] = code
        if not ok:
            print("[self_check] %s failed: %s" % (name, code))
            write_status(steps, phase="failed")
            return False
        write_status(steps, phase="starting")

    print("[self_check] all checks passed, starting tornado")
    write_status(steps, phase="ready")
    start_tornado_fn()
    return True


if __name__ == "__main__":
    sys.exit(0 if run_bootstrap() else 1)
