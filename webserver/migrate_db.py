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

import sys
import os
import logging

# Add project path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, inspect, text
from webserver import loader, models

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


def get_column_type(column):
    """Convert SQLAlchemy Column type to SQLite type string"""
    from sqlalchemy import Integer, String, Boolean, DateTime, Float, Text
    
    type_map = {
        Integer: 'INTEGER',
        String: lambda col: f'VARCHAR({col.length})' if col.length else 'VARCHAR(255)',
        Boolean: 'BOOLEAN',
        DateTime: 'DATETIME',
        Float: 'FLOAT',
        Text: 'TEXT',
    }
    
    col_type = type(column.type)
    if col_type in type_map:
        handler = type_map[col_type]
        if callable(handler):
            return handler(column)
        return handler
    
    # Default to VARCHAR
    return 'VARCHAR(255)'


def get_model_columns():
    """Get column definitions from models.py"""
    model_columns = {}
    
    # Get all model classes
    for model_class in models.Base.registry._class_registry.values():
        if not hasattr(model_class, '__tablename__'):
            continue
        
        tablename = model_class.__tablename__
        columns = {}
        
        for column in model_class.__table__.columns:
            columns[column.name] = {
                'type': get_column_type(column),
                'nullable': column.nullable,
                'default': column.default.arg if column.default else None,
                'primary_key': column.primary_key,
            }
        
        model_columns[tablename] = columns
    
    return model_columns


def get_database_columns(engine):
    """Get column definitions from actual database"""
    inspector = inspect(engine)
    db_columns = {}
    
    for table_name in inspector.get_table_names():
        columns = {}
        for column in inspector.get_columns(table_name):
            columns[column.name] = {
                'type': str(column.type),
                'nullable': column.nullable,
                'default': column.default.arg if column.default else None,
                'primary_key': column.primary_key,
            }
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
                migrations_needed.append({
                    'action': 'add_column',
                    'table': table_name,
                    'column': col_name,
                    'definition': col_def,
                })
            else:
                # Check type matching (optional, for future enhancement)
                db_col = db_columns[table_name][col_name]
    
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
            if migration['action'] == 'add_column':
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
    table_name = migration['table']
    col_name = migration['column']
    col_def = migration['definition']
    
    # Build SQL statement
    sql_parts = [
        f"ALTER TABLE {table_name}",
        f"ADD COLUMN {col_name} {col_def['type']}"
    ]
    
    # Add default value
    if col_def['default'] is not None:
        default_value = col_def['default']
        if isinstance(default_value, str):
            sql_parts.append(f"DEFAULT '{default_value}'")
        elif isinstance(default_value, bool):
            sql_parts.append(f"DEFAULT {1 if default_value else 0}")
        else:
            sql_parts.append(f"DEFAULT {default_value}")
    
    # Add NOT NULL constraint (if has default value)
    if not col_def['nullable'] and col_def['default'] is not None:
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
