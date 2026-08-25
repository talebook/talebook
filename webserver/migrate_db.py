#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""
Database Migration Script - Automatically compare model definitions with actual database schema
and add missing columns.

Usage:
    python migrate_db.py

Features:
    1. Read all table definitions from models.py
    2. Compare with actual database schema
    3. Automatically create missing tables and add missing columns
    4. Will not delete existing fields or tables (data safety guaranteed)
"""

import json
import logging
import os
import sys


# Add project path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, inspect, text

from webserver import loader, models


class RawSQL:
    """Marker for SQL expressions that should be inserted without quotes."""

    def __init__(self, sql):
        self.sql = sql

    def __str__(self):
        return self.sql


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
logger = logging.getLogger(__name__)


class TargetNotEmptyError(Exception):
    """Raised when the target database already has data and force=False."""

    def __init__(self, count):
        self.count = count
        super().__init__(f"Target database has {count} existing rows")


def get_column_type(column):
    """Convert SQLAlchemy Column type to SQLite type string"""
    from social_sqlalchemy.storage import JSONType
    from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text

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
    """Get column definitions from models.py"""
    model_columns = {}

    # Get all model classes
    for model_class in models.Base.registry._class_registry.values():
        if not hasattr(model_class, "__tablename__"):
            continue

        # Skip if model doesn't have __table__ attribute
        if not hasattr(model_class, "__table__"):
            continue

        tablename = model_class.__tablename__
        columns = {}

        for column in model_class.__table__.columns:
            # Skip if not a Column object
            if not hasattr(column, "type"):
                continue

            try:
                default_val = getattr(column.default, "arg", None) if column.default else None
                if callable(default_val) and not isinstance(default_val, type):
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
                logger.warning(f"Skipping column {tablename}.{column.name}: {e}")

        model_columns[tablename] = columns

    return model_columns


def get_database_columns(engine):
    """Get column definitions from actual database"""

    inspector = inspect(engine)
    db_columns = {}

    for table_name in inspector.get_table_names():
        columns = {}

        for col in inspector.get_columns(table_name):
            # inspector.get_columns() returns dict, not Column object
            try:
                col_name = col["name"]
                col_type = str(col["type"])
                col_nullable = col.get("nullable", True)
                col_default = col.get("default")
                col_primary_key = col.get("primary_key", False)

                # Handle default value - it can be a string or an object with .arg attribute
                default_value = None
                if col_default is not None:
                    if hasattr(col_default, "arg"):
                        default_value = col_default.arg
                    else:
                        # It's already a string representation
                        default_value = col_default

                columns[col_name] = {
                    "type": col_type,
                    "nullable": col_nullable,
                    "default": default_value,
                    "primary_key": col_primary_key,
                }
            except Exception as e:
                logger.warning(f"Skipping database column {table_name}.{col.get('name', 'unknown')}: {e}")

        db_columns[table_name] = columns

    return db_columns


def compare_and_migrate(engine):
    """Compare model definitions with database schema and perform migration"""
    logger.info("=" * 60)
    logger.info("Starting database schema migration")
    logger.info("=" * 60)

    # Get model definitions and actual database schema
    model_columns = get_model_columns()
    db_columns = get_database_columns(engine)

    # Create whole missing tables first so their constraints and indexes are
    # preserved. Existing tables keep the historical additive-column behavior.
    missing_tables = [table for table in models.Base.metadata.sorted_tables if table.name not in db_columns]
    for table in missing_tables:
        logger.info("Creating missing table '%s'", table.name)
        table.create(engine, checkfirst=True)

    if missing_tables:
        db_columns = get_database_columns(engine)

    # Compare and generate migration operations
    migrations_needed = []

    for table_name, columns in model_columns.items():
        if table_name not in db_columns:
            logger.error("Table '%s' is still missing after create_all migration", table_name)
            return False

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

    # Perform migration
    if not migrations_needed:
        logger.info("Database schema is up to date, no migration needed")
        return True

    logger.info(f"Found {len(migrations_needed)} columns to migrate:")
    for migration in migrations_needed:
        logger.info(f"  - {migration['table']}.{migration['column']}")

    logger.info("-" * 60)
    logger.info("Starting migration execution...")

    success_count = 0
    error_count = 0

    for migration in migrations_needed:
        try:
            if migration["action"] == "add_column":
                add_column(engine, migration)
                success_count += 1
        except Exception as e:
            logger.error(f"Migration failed for {migration['table']}.{migration['column']}: {e}")
            error_count += 1

    logger.info("-" * 60)
    logger.info(f"Migration completed: {success_count} succeeded, {error_count} failed")
    logger.info("=" * 60)

    if error_count == 0:
        backfill_plugin_connection_roles(engine)
        migrate_plugin_connection_unique_constraint(engine)

    return error_count == 0


def backfill_plugin_connection_roles(engine):
    """为存量插件连接回填 role。

    role 取代 name 成为查询键。历史连接的 name 是中文展示文案
    （「内置连接」「微信读书」），据此推导：实例级内置连接为 builtin，
    其余为 default。同一 (installation, owner_type, owner_id) 下若有多条，
    保留最早一条为主 role，其余以 id 后缀区分，避免撞唯一约束。
    """
    from sqlalchemy import text

    with engine.begin() as conn:
        rows = conn.execute(
            text(
                "SELECT id, installation_id, owner_type, owner_id, name FROM plugin_connections "
                "WHERE role IS NULL OR role = '' ORDER BY id"
            )
        ).fetchall()
        if not rows:
            return
        logger.info("Backfilling role for %d plugin connections", len(rows))
        seen = set()
        for row in rows:
            role = "builtin" if (row.owner_type == "instance" and row.name == "内置连接") else "default"
            key = (row.installation_id, row.owner_type, row.owner_id, role)
            if key in seen:
                role = "%s-%d" % (role, row.id)
                key = (row.installation_id, row.owner_type, row.owner_id, role)
            seen.add(key)
            conn.execute(
                text("UPDATE plugin_connections SET role = :role WHERE id = :id"),
                {"role": role, "id": row.id},
            )


def migrate_plugin_connection_unique_constraint(engine):
    """把插件连接的唯一约束从 name 切到 role。

    `ALTER TABLE ADD COLUMN` 只加列，不动约束——升级上来的库会保留
    `uq_plugin_connection_owner_name`，导致 role 唯一性不生效、同名连接照旧冲突。
    模型（models.py）里已改为 `uq_plugin_connection_owner_role`，这里让存量库跟上。
    """
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    if "plugin_connections" not in inspector.get_table_names():
        return
    # 唯一约束在 SQLite 上既可能是表定义的一部分，也可能是独立索引，两处都要看。
    constraints = {item.get("name") for item in inspector.get_unique_constraints("plugin_connections")}
    indexes = {item.get("name") for item in inspector.get_indexes("plugin_connections")}
    existing = constraints | indexes
    if "uq_plugin_connection_owner_role" in existing:
        return
    if "uq_plugin_connection_owner_name" not in existing:
        # 全新建库由 create_all 直接建出正确约束，无需迁移。
        return

    logger.info("Migrating plugin_connections unique constraint: owner_name -> owner_role")
    if engine.dialect.name == "sqlite":
        # SQLite 不支持 DROP CONSTRAINT。独立索引可以直接换；写死在表定义里的
        # 只能靠重建表，这里不做——留给应用层保证，重建库后自动生效。
        if "uq_plugin_connection_owner_name" not in indexes:
            logger.warning(
                "plugin_connections 的唯一约束写在表定义里，SQLite 无法就地修改；role 唯一性将由应用层保证，重建库后自动生效"
            )
            return
        with engine.begin() as conn:
            conn.execute(text("DROP INDEX uq_plugin_connection_owner_name"))
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX uq_plugin_connection_owner_role "
                    "ON plugin_connections (installation_id, owner_type, owner_id, role)"
                )
            )
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE plugin_connections DROP INDEX uq_plugin_connection_owner_name"))
        conn.execute(
            text(
                "ALTER TABLE plugin_connections "
                "ADD CONSTRAINT uq_plugin_connection_owner_role "
                "UNIQUE (installation_id, owner_type, owner_id, role)"
            )
        )


def add_column(engine, migration):
    """Add new column to database table"""
    table_name = migration["table"]
    col_name = migration["column"]
    col_def = migration["definition"]

    # Build SQL statement
    sql_parts = [f"ALTER TABLE {table_name}", f"ADD COLUMN {col_name} {col_def['type']}"]

    # Add default value
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

    # Add NOT NULL constraint (if has default value)
    if not col_def["nullable"] and col_def["default"] is not None:
        sql_parts.append("NOT NULL")

    sql = " ".join(sql_parts)

    logger.info(f"Executing: {sql}")

    with engine.connect() as conn:
        conn.execute(text(sql))
        conn.commit()

    logger.info(f"Successfully added column: {table_name}.{col_name}")


def main():
    """Main function"""
    logger.info("Database Migration Tool v1.0")
    logger.info("=" * 60)

    # Load configuration
    try:
        CONF = loader.get_settings()
        auth_db_path = CONF["user_database"]
        logger.info(f"Database path: {auth_db_path}")
    except Exception as e:
        logger.error(f"Failed to load configuration: {e}")
        return False

    # Create database engine
    try:
        engine = create_engine(auth_db_path)
        logger.info("Database connection successful")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        return False

    # Perform migration
    try:
        success = compare_and_migrate(engine)
        return success
    except Exception as e:
        logger.error(f"Migration error: {e}")
        import traceback

        traceback.print_exc()
        return False


def build_engine_args(db_url):
    """Return SQLAlchemy engine kwargs appropriate for the given database URL."""
    args = {"echo": False, "pool_size": 5, "max_overflow": 10, "pool_recycle": 3600}
    if db_url.startswith("sqlite"):
        args["connect_args"] = {"check_same_thread": False, "timeout": 30}
    else:
        args["pool_pre_ping"] = True
    return args


def migrate_data(source_url, target_url, force=False):
    """Copy all data from source database to target database.

    Creates all tables in the target, then copies every row.  The target is
    cleared table-by-table before inserting so the operation is idempotent.

    If the target already contains data and force=False, raises TargetNotEmptyError
    with the total existing row count so the caller can prompt for confirmation.
    Pass force=True to skip the check and overwrite existing data.
    """
    from sqlalchemy import text

    logger.info(f"Migrating data: {source_url!r} -> {target_url!r}")

    source_engine = create_engine(source_url, **build_engine_args(source_url))
    target_engine = create_engine(target_url, **build_engine_args(target_url))

    models.Base.metadata.create_all(target_engine)
    logger.info("Tables created in target database")

    is_mysql_target = not target_url.startswith("sqlite")

    if not force:
        total_existing = 0
        with target_engine.connect() as check_conn:
            for table in models.Base.metadata.sorted_tables:
                count = check_conn.execute(text(f"SELECT COUNT(*) FROM `{table.name}`")).scalar()
                total_existing += count or 0
        if total_existing > 0:
            source_engine.dispose()
            target_engine.dispose()
            raise TargetNotEmptyError(total_existing)

    with source_engine.connect() as src:
        with target_engine.connect() as tgt:
            if is_mysql_target:
                tgt.execute(text("SET FOREIGN_KEY_CHECKS=0"))

            for table in models.Base.metadata.sorted_tables:
                rows = src.execute(table.select()).fetchall()
                tgt.execute(table.delete())
                if rows:
                    tgt.execute(table.insert(), [dict(r._mapping) for r in rows])
                logger.info(f"Migrated table {table.name}: {len(rows)} rows")

            if is_mysql_target:
                tgt.execute(text("SET FOREIGN_KEY_CHECKS=1"))
            tgt.commit()

    source_engine.dispose()
    target_engine.dispose()
    logger.info("Migration completed successfully")


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
