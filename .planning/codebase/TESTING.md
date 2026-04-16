# Testing

## Framework

- **pytest 7.4.4** — Python test framework
- **pytest-cov** — Coverage reporting
- **unittest** — Standard library (some legacy tests)

## Test Structure

```
tests/
├── __init__.py
├── run.py                 # Test runner
├── cases/                 # Test data fixtures
│   ├── metadata.db       # SQLite DB for testing
│   ├── big-metadata.db
│   ├── users.db
│   ├── *.epub, *.mobi    # Test book files
│   └── book.txt
├── library/              # Test book library
│   └── [author]/
│       └── [book]/
│           ├── cover.jpg
│           └── *.epub
└── test_*.py             # Test modules
```

## Running Tests

```bash
# Run all tests
pytest tests/

# Run with coverage
pytest tests/ --cov=webserver --cov-report=html

# Run specific test
pytest tests/test_main.py

# Run with verbose output
pytest -v tests/
```

## Test Modules

| Module | Purpose |
|--------|---------|
| `test_admin.py` | Admin functionality |
| `test_baike.py` | Baidu Baike integration |
| `test_captcha.py` | Captcha verification |
| `test_douban.py` | Douban API |
| `test_main.py` | Main server functionality |
| `test_models.py` | Database models |
| `test_scan.py` | Library scanning |
| `test_service.py` | Service layer |
| `test_ssl_crt.py` | SSL certificate handling |
| `test_tomato_novel.py` | Tonghuashu integration |
| `test_txt.py` | TXT file parsing |
| `test_upload.py` | File upload |
| `test_utils.py` | Utility functions |
| `test_youshu.py` | Youshu integration |

## Test Data

- Book files in `tests/cases/` and `tests/library/`
- SQLite databases with test metadata
- Test fixtures are reused across multiple test modules

## Coverage

To generate coverage report:
```bash
pytest tests/ --cov=webserver --cov-report=term-missing
```
