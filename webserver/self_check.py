#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""容器启动自检。

以 root 身份作为 supervisor 的 bootstrap program 运行，在 nginx 已经起来之后
逐项校验运行环境（数据目录权限、nginx 配置、数据库初始化/迁移/配置写入），每完成
一步就把结果写入 status.json。任一步失败就停止后续步骤且不再拉起 booksvr，但
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

    for directory in (os.path.join(books_dir, "library"), settings_dir, "/books"):
        if not check_atomic_write(directory):
            return False, "permission_denied"

    return True, None


def check_nginx_config():
    cmd = ["gosu", "%s:%s" % (RUN_USER, RUN_USER), "nginx", "-t"]
    return (True, None) if run(cmd) else (False, "nginx_config_invalid")


def check_syncdb():
    cmd = ["gosu", "%s:%s" % (RUN_USER, RUN_USER), "python3", os.path.join(SERVER_DIR, "server.py"), "--syncdb"]
    return (True, None) if run(cmd) else (False, "syncdb_failed")


def check_migrate():
    cmd = ["gosu", "%s:%s" % (RUN_USER, RUN_USER), "python3", os.path.join(SERVER_DIR, "webserver", "migrate_db.py")]
    return (True, None) if run(cmd) else (False, "migrate_failed")


def check_update_config():
    cmd = ["gosu", "%s:%s" % (RUN_USER, RUN_USER), "python3", os.path.join(SERVER_DIR, "server.py"), "--update-config"]
    return (True, None) if run(cmd) else (False, "update_config_failed")


# 顺序即自检顺序，也是 status.json 里 steps 的顺序
CHECKS = [
    ("permission", check_permission),
    ("nginx_config", check_nginx_config),
    ("syncdb", check_syncdb),
    ("migrate", check_migrate),
    ("update_config", check_update_config),
]


def read_cookie_secret():
    """从 Talebook 配置体系读出 cookie_secret。

    cookie_secret 不是环境变量，而是安装时写入 /data/books/settings/auto.py 的
    Python dict 字面量（由 webserver/loader.py 的 import auto 加载）。booksvr
    需要同一密钥才能解析 Tornado 的 secure cookie，因此在这里读出并转交。

    本脚本以 /opt/talebook-upgrade/self_check.py 运行，`webserver` 不在 sys.path，
    因此先把 SERVER_DIR 加进去再导入 loader；导入失败时回退到直接读 auto.py。

    读不到时返回空串，由调用方决定是否跳过 booksvr。
    """
    try:
        if SERVER_DIR not in sys.path:
            sys.path.insert(0, SERVER_DIR)
        from webserver import loader

        secret = str(loader.get_settings().get("cookie_secret") or "")
        if secret:
            return secret
    except Exception as exc:  # noqa: BLE001 - 自检不得因读取失败而中断
        print("[self_check] 导入 webserver.loader 失败，回退读 auto.py: %s" % exc)

    # 回退：直接解析 /data/books/settings/auto.py 的 settings dict。
    try:
        import ast

        auto_path = os.path.join(DATA_DIR, "books", "settings", "auto.py")
        with open(auto_path, encoding="utf-8") as fh:
            tree = ast.parse(fh.read())
        for node in tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == "settings":
                        values = ast.literal_eval(node.value)
                        return str(values.get("cookie_secret") or "")
    except Exception as exc:  # noqa: BLE001
        print("[self_check] 读取 auto.py 失败: %s" % exc)
    return ""


def start_booksvr(secret=None):
    """拉起 booksvr（唯一对外 HTTP 后端，监听 8000）。

    必须在 syncdb/migrate 之后调用：booksvr 打开数据库前，建表与迁移必须已完成。
    密钥经环境变量传入，不写在命令行，避免 ps 泄露。
    """
    if secret is None:
        secret = read_cookie_secret()
    if not secret:
        print("[self_check] 未取到 cookie_secret，跳过 booksvr")
        return False

    # `supervisorctl` talks to the already-running supervisord; its own environment
    # is not inherited by the program being started. The supervised entrypoint reads
    # the same settings file and exports BOOKSVR_COOKIE_SECRET immediately before
    # exec'ing booksvr.
    return run(["supervisorctl", "start", "talebook:booksvr"])


def run_bootstrap(checks=CHECKS, start_booksvr_fn=start_booksvr):
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

    print("[self_check] all checks passed, starting booksvr")
    # booksvr 是唯一对外后端，本地服务全部 215 条 legacy 路由；
    # 它需要 syncdb/migrate 已完成才能打开数据库。
    if not start_booksvr_fn():
        print("[self_check] booksvr 启动失败")
        write_status(steps, phase="failed")
        return False
    write_status(steps, phase="ready")
    return True


if __name__ == "__main__":
    sys.exit(0 if run_bootstrap() else 1)
