#!/usr/bin/env python3
"""Load the configured cookie secret before exec'ing the supervised booksvr."""

import os
import sys


UPGRADE_DIR = "/opt/talebook-upgrade"
if UPGRADE_DIR not in sys.path:
    sys.path.insert(0, UPGRADE_DIR)

from self_check import read_cookie_secret  # noqa: E402


def main():
    command = sys.argv[1:]
    if not command:
        print("booksvr-entrypoint: missing command", file=sys.stderr)
        return 2

    secret = read_cookie_secret()
    if not secret:
        print("booksvr-entrypoint: cookie_secret is missing from Talebook settings", file=sys.stderr)
        return 1

    env = os.environ.copy()
    env["BOOKSVR_COOKIE_SECRET"] = secret
    os.execvpe(command[0], command, env)
    return 127


if __name__ == "__main__":
    raise SystemExit(main())
