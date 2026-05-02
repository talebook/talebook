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
    3. Automatically add missing columns
    4. Will not delete existing fields (data safety guaranteed)
"""

import json
import logging
import os
import sys


# Add project path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, inspect, text

from webserver import loader, models


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
logger = logging.getLogger(__name__)


def get_column_type(column):
    """Convert SQLAlchemy Column type to SQLite type string"""
    from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
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
                columns[column.name] = {
                    "type": get_column_type(column),
                    "nullable": column.nullable,
                    "default": getattr(column.default, "arg", None) if column.default else None,
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

    # Compare and generate migration operations
    migrations_needed = []

    for table_name, columns in model_columns.items():
        if table_name not in db_columns:
            logger.info(f"Table '{table_name}' does not exist, will be created later")
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

    return error_count == 0


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
        if isinstance(default_value, str):
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


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
