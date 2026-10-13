#!/usr/bin/env python3
"""从 webserver/models.py 的 SQLAlchemy 元数据导出建表 DDL。

Go 侧 userdb 包的测试需要跑在与生产完全一致的 schema 上，但仓库里的
tests/cases/users.db fixture 只含早期 15 张表，其余表由 user_syncdb()
在运行时创建。本脚本导出权威 DDL 到 booksvr/internal/userdb/testdata/schema.sql。

用法：
    python scripts/export_userdb_schema.py
"""

import os
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT = os.path.join(REPO_ROOT, "booksvr", "internal", "userdb", "testdata", "schema.sql")

sys.path.insert(0, REPO_ROOT)

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.schema import CreateTable  # noqa: E402

from webserver import models  # noqa: E402


def main():
    engine = create_engine("sqlite://")
    statements = []
    for table in models.Base.metadata.sorted_tables:
        statements.append(str(CreateTable(table).compile(engine)).strip() + ";")

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(statements) + "\n")

    print("已写入 %s（%d 张表）" % (OUTPUT, len(statements)))


if __name__ == "__main__":
    main()