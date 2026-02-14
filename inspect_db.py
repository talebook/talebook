
import sqlite3
import os

db_path = 'tests/cases/metadata.db'

def inspect_db():
    if not os.path.exists(db_path):
        print(f"File not found: {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    print("Tables:")
    for table in tables:
        print(table[0])
        cursor.execute(f"PRAGMA table_info({table[0]})")
        columns = cursor.fetchall()
        # print(f"  Columns: {[col[1] for col in columns]}")

    conn.close()

if __name__ == '__main__':
    inspect_db()
