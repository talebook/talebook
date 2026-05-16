#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""
更新 tests/cases/users.db 使其 schema 与 webserver/models.py 一致
参照 migrate_db.py 的实现，添加缺失列和缺失表，不删除不改动已有列
"""

import logging
import os
import sys


sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import json

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, create_engine, inspect, text

from webserver import models


class RawSQL:
    """Marker for SQL expressions that should be inserted without quotes."""

    def __init__(self, sql):
        self.sql = sql

    def __str__(self):
        return self.sql


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
logger = logging.getLogger(__name__)

MODELS_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "webserver", "models.py"
)
TARGET_DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "users.db")


def get_column_type(column):
    from social_sqlalchemy.storage import JSONType

    col_type = type(column.type)

    if col_type == Integer:
        return "INTEGER"
    elif col_type == String:
        length = column.type.length if hasattr(column.type, "length") else 255
        return f"VARCHAR({length})" if length else "VARCHAR(255)"
    elif col_type == Boolean:
        return "BOOLEAN"
    elif col_type == DateTime:
        return "DATETIME"
    elif col_type == Float:
        return "FLOAT"
    elif col_type == Text:
        return "TEXT"
    elif col_type == JSONType:
        return "TEXT"

    return "VARCHAR(255)"


def get_model_columns():
    model_columns = {}

    for model_class in models.Base.registry._class_registry.values():
        if not hasattr(model_class, "__tablename__"):
            continue
        if not hasattr(model_class, "__table__"):
            continue

        tablename = model_class.__tablename__
        columns = {}

        for column in model_class.__table__.columns:
            if not hasattr(column, "type"):
                continue

            try:
                default_val = getattr(column.default, "arg", None) if column.default else None
                if callable(default_val) and not isinstance(default_val, type):
                    # Convert known callables to SQL equivalents
                    qualname = getattr(default_val, "__qualname__", "")
                    if qualname == "datetime.now":
                        default_val = RawSQL("CURRENT_TIMESTAMP")
                    else:
                        default_val = None
                columns[column.name] = {
                    "type": get_column_type(column),
                    "nullable": column.nullable,
                    "default": default_val,
                    "primary_key": column.primary_key,
                }
            except Exception as e:
                logger.warning("Skipping column %s.%s: %s", tablename, column.name, e)

        model_columns[tablename] = columns

    return model_columns


def get_database_columns(engine):
    inspector = inspect(engine)
    db_columns = {}

    for table_name in inspector.get_table_names():
        columns = {}

        for col in inspector.get_columns(table_name):
            try:
                col_name = col["name"]
                col_type = str(col["type"])
                col_nullable = col.get("nullable", True)
                col_default = col.get("default")
                col_primary_key = col.get("primary_key", False)

                default_value = None
                if col_default is not None:
                    if hasattr(col_default, "arg"):
                        default_value = col_default.arg
                    else:
                        default_value = col_default

                columns[col_name] = {
                    "type": col_type,
                    "nullable": col_nullable,
                    "default": default_value,
                    "primary_key": col_primary_key,
                }
            except Exception as e:
                logger.warning("Skipping database column %s.%s: %s", table_name, col.get("name", "unknown"), e)

        db_columns[table_name] = columns

    return db_columns


def compare_and_migrate(engine):
    logger.info("=" * 60)
    logger.info("Updating %s to match %s", TARGET_DB, MODELS_FILE)
    logger.info("=" * 60)

    model_columns = get_model_columns()
    db_columns = get_database_columns(engine)

    migrations_needed = []

    for table_name, columns in model_columns.items():
        if table_name not in db_columns:
            migrations_needed.append(
                {
                    "action": "create_table",
                    "table": table_name,
                    "columns": columns,
                }
            )
            continue

        for col_name, col_def in columns.items():
            if col_name not in db_columns[table_name]:
                migrations_needed.append(
                    {
                        "action": "add_column",
                        "table": table_name,
                        "column": col_name,
                        "definition": col_def,
                    }
                )

    if not migrations_needed:
        logger.info("Database schema is up to date")
        return True

    logger.info("Found %d migration(s):", len(migrations_needed))
    for migration in migrations_needed:
        action = migration["action"]
        if action == "add_column":
            logger.info("  - [add] %s.%s (%s)", migration["table"], migration["column"], migration["definition"]["type"])
        elif action == "create_table":
            logger.info("  - [new] table %s (%d columns)", migration["table"], len(migration["columns"]))

    logger.info("-" * 60)

    success_count = 0
    error_count = 0

    for migration in migrations_needed:
        try:
            if migration["action"] == "add_column":
                add_column(engine, migration)
                success_count += 1
            elif migration["action"] == "create_table":
                create_table(engine, migration["table"], migration["columns"])
                success_count += 1
        except Exception as e:
            logger.error("Failed: %s - %s", migration.get("table", "?"), e)
            error_count += 1

    logger.info("-" * 60)
    logger.info("Done: %d succeeded, %d failed", success_count, error_count)
    logger.info("=" * 60)

    return error_count == 0


def add_column(engine, migration):
    table_name = migration["table"]
    col_name = migration["column"]
    col_def = migration["definition"]

    sql_parts = [f"ALTER TABLE {table_name}", f"ADD COLUMN {col_name} {col_def['type']}"]

    if col_def["default"] is not None:
        default_value = col_def["default"]
        if isinstance(default_value, RawSQL):
            sql_parts.append(f"DEFAULT {default_value.sql}")
        elif isinstance(default_value, str):
            sql_parts.append(f"DEFAULT '{default_value}'")
        elif isinstance(default_value, bool):
            sql_parts.append(f"DEFAULT {1 if default_value else 0}")
        elif isinstance(default_value, (dict, list)):
            sql_parts.append(f"DEFAULT '{json.dumps(default_value)}'")
        else:
            sql_parts.append(f"DEFAULT {default_value}")

    if not col_def["nullable"] and col_def["default"] is not None:
        sql_parts.append("NOT NULL")

    sql = " ".join(sql_parts)
    logger.info("Executing: %s", sql)

    with engine.connect() as conn:
        conn.execute(text(sql))
        conn.commit()

    logger.info("Added: %s.%s", table_name, col_name)


def create_table(engine, table_name, columns):
    sql_parts = [f"CREATE TABLE {table_name} ("]
    col_lines = []
    pk_columns = []

    for col_name, col_def in columns.items():
        line = f"    {col_name} {col_def['type']}"

        if col_def["primary_key"]:
            pk_columns.append(col_name)

        if col_def["default"] is not None:
            default_value = col_def["default"]
            if isinstance(default_value, RawSQL):
                line += f" DEFAULT {default_value.sql}"
            elif isinstance(default_value, str):
                line += f" DEFAULT '{default_value}'"
            elif isinstance(default_value, bool):
                line += f" DEFAULT {1 if default_value else 0}"
            elif isinstance(default_value, (dict, list)):
                line += f" DEFAULT '{json.dumps(default_value)}'"
            else:
                line += f" DEFAULT {default_value}"

        if not col_def["nullable"] and col_def["default"] is not None:
            line += " NOT NULL"

        col_lines.append(line)

    # Handle primary key(s) - use table-level constraint for composite keys
    if len(pk_columns) == 1:
        for i, line in enumerate(col_lines):
            if pk_columns[0] in line:
                col_lines[i] = line + " PRIMARY KEY"
                break
    elif len(pk_columns) > 1:
        col_lines.append(f"    PRIMARY KEY ({', '.join(pk_columns)})")

    sql_parts.append(",\n".join(col_lines))
    sql_parts.append(")")

    sql = "\n".join(sql_parts)
    logger.info("Executing:\n%s", sql)

    with engine.connect() as conn:
        conn.execute(text(sql))
        conn.commit()

    logger.info("Created table: %s", table_name)


def main():
    logger.info("users.db Update Script")
    logger.info("Target: %s", TARGET_DB)
    logger.info("Source: %s", MODELS_FILE)
    logger.info("=" * 60)

    engine = create_engine(f"sqlite:///{TARGET_DB}")
    return compare_and_migrate(engine)


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
