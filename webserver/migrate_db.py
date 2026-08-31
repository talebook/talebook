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
import re
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
        logger.info("Database columns are up to date; checking data and constraints")
        backfill_plugin_connection_roles(engine)
        migrate_plugin_connection_unique_constraint(engine)
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
        role_added = any(
            migration["table"] == "plugin_connections" and migration["column"] == "role" for migration in migrations_needed
        )
        backfill_plugin_connection_roles(engine, include_default=role_added)
        migrate_plugin_connection_unique_constraint(engine)

    return error_count == 0


def backfill_plugin_connection_roles(engine, include_default=False):
    """为存量插件连接回填 role。

    role 取代 name 成为查询键。历史连接的 name 是中文展示文案
    （「内置连接」「微信读书」），据此推导：实例级内置连接为 builtin，
    其余为 default。同一 (installation, owner_type, owner_id) 下若有多条，
    保留最早一条为主 role，其余以 id 后缀区分，避免撞唯一约束。
    """
    from sqlalchemy import text

    with engine.begin() as conn:
        all_rows = conn.execute(
            text("SELECT id, installation_id, owner_type, owner_id, name, role FROM plugin_connections ORDER BY id")
        ).fetchall()
        rows = [row for row in all_rows if row.role is None or row.role == "" or (include_default and row.role == "default")]
        if not rows:
            return
        logger.info("Backfilling role for %d plugin connections", len(rows))
        candidate_ids = {row.id for row in rows}
        seen = {
            (row.installation_id, row.owner_type, row.owner_id, row.role) for row in all_rows if row.id not in candidate_ids
        }
        for row in rows:
            base_role = "builtin" if (row.owner_type == "instance" and row.name == "内置连接") else "default"
            role = base_role
            key = (row.installation_id, row.owner_type, row.owner_id, role)
            if key in seen:
                role = "%s-%d" % (base_role, row.id)
                key = (row.installation_id, row.owner_type, row.owner_id, role)
            suffix = 2
            while key in seen:
                role = "%s-%d-%d" % (base_role, row.id, suffix)
                key = (row.installation_id, row.owner_type, row.owner_id, role)
                suffix += 1
            seen.add(key)
            conn.execute(
                text("UPDATE plugin_connections SET role = :role WHERE id = :id"),
                {"role": role, "id": row.id},
            )


def _rebuild_sqlite_plugin_connections(engine):
    """以当前数据重建旧 SQLite 表，替换写在 CREATE TABLE 里的唯一约束。"""
    shadow = "plugin_connections__role_migration"
    old_constraint = re.compile(
        r'(?:CONSTRAINT\s+["`\[]?uq_plugin_connection_owner_name["`\]]?\s+)?'
        r"UNIQUE\s*\(\s*installation_id\s*,\s*owner_type\s*,\s*owner_id\s*,\s*name\s*\)",
        re.IGNORECASE,
    )
    with engine.connect() as conn:
        foreign_keys = bool(conn.exec_driver_sql("PRAGMA foreign_keys").scalar())
        conn.commit()
        if foreign_keys:
            conn.exec_driver_sql("PRAGMA foreign_keys=OFF")
            conn.commit()
        try:
            with conn.begin():
                table_sql = conn.execute(
                    text("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'plugin_connections'")
                ).scalar_one()
                body = table_sql[table_sql.index("(") :]
                body, replaced = old_constraint.subn(
                    "CONSTRAINT uq_plugin_connection_owner_role UNIQUE (installation_id, owner_type, owner_id, role)",
                    body,
                    count=1,
                )
                if replaced != 1:
                    raise RuntimeError("无法定位 plugin_connections 的旧唯一约束")
                schema_sql = [
                    row.sql
                    for row in conn.execute(
                        text(
                            "SELECT sql FROM sqlite_master WHERE type IN ('index', 'trigger') "
                            "AND tbl_name = 'plugin_connections' AND sql IS NOT NULL"
                        )
                    ).fetchall()
                    if row.sql and "uq_plugin_connection_owner_name" not in row.sql
                ]
                columns = [row.name for row in conn.execute(text("PRAGMA table_info(plugin_connections)"))]
                quoted_columns = ", ".join('"%s"' % name.replace('"', '""') for name in columns)
                shadow_exists = conn.execute(
                    text("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = :name"),
                    {"name": shadow},
                ).scalar()
                if shadow_exists:
                    raise RuntimeError("检测到上次迁移留下的临时表，拒绝覆盖：%s" % shadow)
                conn.execute(text("CREATE TABLE %s %s" % (shadow, body)))
                conn.execute(
                    text("INSERT INTO %s (%s) SELECT %s FROM plugin_connections" % (shadow, quoted_columns, quoted_columns))
                )
                conn.execute(text("DROP TABLE plugin_connections"))
                conn.execute(text("ALTER TABLE %s RENAME TO plugin_connections" % shadow))
                for sql in schema_sql:
                    conn.execute(text(sql))
                for index in models.PluginConnection.__table__.indexes:
                    index.create(bind=conn, checkfirst=True)
        finally:
            if foreign_keys:
                conn.exec_driver_sql("PRAGMA foreign_keys=ON")
                conn.commit()


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
    # 旧库通过 ADD COLUMN 得到 role 时，SQLite 会把已有行全部填成 default；
    # 在建立新唯一键前必须按旧 name 语义重新推导并消解冲突。
    backfill_plugin_connection_roles(engine, include_default=True)
    if engine.dialect.name == "sqlite":
        # 独立唯一索引可直接替换；CREATE TABLE 内的 UNIQUE 需要重建表。
        if "uq_plugin_connection_owner_name" not in indexes:
            _rebuild_sqlite_plugin_connections(engine)
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
