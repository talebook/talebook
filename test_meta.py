#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.abspath('.'))

from webserver.handlers.meta import MetaList

# Mock the necessary dependencies
class MockCache:
    def __init__(self):
        self.backend = MockBackend()
    
    def get_item_id(self, category, name):
        return 1

class MockBackend:
    def __init__(self):
        self.conn = MockConn()

class MockConn:
    def get(self, sql, params=None):
        # Mock the SQL query results for format
        if 'format' in sql.lower() and 'group by' in sql.lower():
            # Return 2 columns: name, count
            return [('EPUB', 10), ('MOBI', 5), ('PDF', 3)]
        return []

class MockDB:
    def get_books_for_category(self, category, item_id):
        return [1, 2, 3]
    
    def get_data_as_dict(self, ids=None):
        return []

class MockHandler:
    def __init__(self):
        self.cache = MockCache()
        self.db = MockDB()
        self.request = MockRequest()
    
    def get_argument(self, name, default=None):
        return default

class MockRequest:
    def __init__(self):
        self.headers = {}

# Test the MetaList.get method
try:
    handler = MockHandler()
    meta_list = MetaList()
    meta_list.cache = handler.cache
    meta_list.db = handler.db
    meta_list.request = handler.request
    
    # Call the get method with 'format' as meta
    result = meta_list.get('format')
    print("Test passed!")
    print(f"Result: {result}")
except Exception as e:
    print(f"Test failed with error: {e}")
    import traceback
    traceback.print_exc()
