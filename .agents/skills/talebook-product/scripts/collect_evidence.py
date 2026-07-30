#!/usr/bin/env python3
"""Collect read-only Talebook Git and GitHub evidence as JSON."""

from __future__ import annotations

import argparse
import json
import shlex
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def bounded_int(value: str, minimum: int, maximum: int) -> int:
    number = int(value)
    if not minimum <= number <= maximum:
        raise argparse.ArgumentTypeError(f"expected {minimum}..{maximum}, got {number}")
    return number


def run(command: list[str], cwd: Path, timeout: int) -> dict[str, Any]:
    result: dict[str, Any] = {"command": shlex.join(command)}
    try:
        completed = subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            check=False,
        )
        result.update(
            ok=completed.returncode == 0,
            returncode=completed.returncode,
            stdout=completed.stdout.strip(),
            stderr=completed.stderr.strip(),
        )
    except FileNotFoundError as error:
        result.update(ok=False, returncode=None, stdout="", stderr=str(error))
    except subprocess.TimeoutExpired as error:
        stdout = error.stdout.decode("utf-8", "replace") if isinstance(error.stdout, bytes) else error.stdout or ""
        stderr = error.stderr.decode("utf-8", "replace") if isinstance(error.stderr, bytes) else error.stderr or ""
        result.update(ok=False, returncode=None, stdout=stdout.strip(), stderr=f"timeout: {stderr.strip()}")
    return result


def git_evidence(repo: Path, timeout: int, log_limit: int, remote_limit: int) -> dict[str, Any]:
    evidence = {
        "root": run(["git", "rev-parse", "--show-toplevel"], repo, timeout),
        "status": run(["git", "status", "--short", "--branch"], repo, timeout),
        "tags": run(
            [
                "git",
                "for-each-ref",
                "refs/tags",
                "--sort=-version:refname",
                "--count=20",
                "--format=%(refname:short)",
            ],
            repo,
            timeout,
        ),
        "recent_commits": run(
            [
                "git",
                "log",
                f"-{log_limit}",
                "--no-merges",
                "--date=iso-strict",
                "--pretty=format:%H%x09%ad%x09%an%x09%s",
            ],
            repo,
            timeout,
        ),
        "issue_linked_commits": run(
            [
                "git",
                "log",
                "--all",
                f"-{log_limit}",
                "--no-merges",
                "--extended-regexp",
                "--grep=#[0-9]+",
                "--date=iso-strict",
                "--pretty=format:%H%x09%ad%x09%s",
            ],
            repo,
            timeout,
        ),
        "recent_remote_refs": run(
            [
                "git",
                "for-each-ref",
                "refs/remotes",
                "--sort=-committerdate",
                f"--count={remote_limit}",
                "--format=%(committerdate:iso-strict)%09%(refname:short)%09%(subject)",
            ],
            repo,
            timeout,
        ),
    }
    latest_tag = run(["git", "describe", "--tags", "--abbrev=0"], repo, timeout)
    evidence["latest_tag"] = latest_tag
    if latest_tag["ok"] and latest_tag["stdout"]:
        evidence["changes_since_latest_tag"] = run(
            ["git", "diff", "--stat=120,80,80", f"{latest_tag['stdout']}..HEAD"], repo, timeout
        )
    return evidence


def github_evidence(repo: Path, timeout: int, github_repo: str, limit: int) -> dict[str, Any]:
    return {
        "repository": run(
            [
                "gh",
                "repo",
                "view",
                github_repo,
                "--json",
                "name,description,defaultBranchRef,updatedAt,url,stargazerCount,forkCount",
            ],
            repo,
            timeout,
        ),
        "open_issues": run(
            [
                "gh",
                "issue",
                "list",
                "--repo",
                github_repo,
                "--state",
                "open",
                "--limit",
                str(limit),
                "--json",
                "number,title,labels,updatedAt,url",
            ],
            repo,
            timeout,
        ),
        "open_pull_requests": run(
            [
                "gh",
                "pr",
                "list",
                "--repo",
                github_repo,
                "--state",
                "open",
                "--limit",
                str(limit),
                "--json",
                "number,title,labels,updatedAt,url,isDraft",
            ],
            repo,
            timeout,
        ),
        "releases": run(
            ["gh", "release", "list", "--repo", github_repo, "--limit", "10"], repo, timeout
        ),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path.cwd(), help="local Talebook repository")
    parser.add_argument("--github-repo", default="talebook/talebook", help="GitHub owner/repository")
    parser.add_argument("--log-limit", type=lambda value: bounded_int(value, 1, 200), default=40)
    parser.add_argument("--remote-limit", type=lambda value: bounded_int(value, 1, 100), default=30)
    parser.add_argument("--github-limit", type=lambda value: bounded_int(value, 1, 100), default=50)
    parser.add_argument("--timeout", type=lambda value: bounded_int(value, 1, 120), default=20)
    parser.add_argument("--no-github", action="store_true", help="skip gh queries")
    parser.add_argument("--pretty", action="store_true", help="pretty-print JSON")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo = args.repo.resolve()
    report: dict[str, Any] = {
        "schema_version": 1,
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "local_repo": str(repo),
        "github_repo": args.github_repo,
        "git": git_evidence(repo, args.timeout, args.log_limit, args.remote_limit),
        "github": {"skipped": True}
        if args.no_github
        else github_evidence(repo, args.timeout, args.github_repo, args.github_limit),
    }
    json.dump(report, sys.stdout, ensure_ascii=False, indent=2 if args.pretty else None)
    sys.stdout.write("\n")
    return 0 if report["git"]["root"]["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
