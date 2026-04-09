# Structure

## Root Directory

```
talebook/
├── app/                    # Nuxt 3 frontend
├── webserver/              # Tornado backend
├── tests/                  # pytest test cases
├── tools/                  # Utility scripts and spiders
├── scripts/                # Build/maintenance scripts
├── document/              # Documentation
├── docker/                # Docker files
├── kubernetes/             # K8s manifests
├── conf/                  # Configuration (nginx, supervisor)
├── talebook-showcase/      # Landing page HTML
├── pyproject.toml          # Python project config
├── requirements.txt         # Python dependencies
├── server.py               # Entry point
└── Makefile               # Build commands
```

## Frontend (`app/`)

```
app/
├── nuxt.config.ts          # Nuxt configuration
├── app.vue                 # Root Vue component
├── assets/                 # Static assets (fonts, css)
├── components/             # Vue components
│   ├── AppFooter.vue
│   ├── AppHeader.vue
│   ├── BookCards.vue
│   ├── BookList.vue
│   ├── CaptchaWidget.vue
│   ├── ImageCaptchaWidget.vue
│   ├── ListBook.vue
│   ├── Loading.vue
│   ├── MetaList.vue
│   ├── OpdsImportDialog.vue
│   ├── SSLManager.vue
│   └── Upload.vue
├── pages/                  # Nuxt pages (if any)
├── stores/                 # Pinia stores
├── dist/                   # Built frontend (generated)
├── i18n/                   # Internationalization
│   └── locales/
│       ├── zh-CN.ts
│       └── en-US.ts
└── i18n.config.ts         # Vue I18n config
```

## Backend (`webserver/`)

```
webserver/
├── main.py                 # Application entry point
├── loader.py                # Settings loader
├── settings.py             # Static settings
├── models.py               # SQLAlchemy models
├── utils.py                # Utility functions
├── constants.py            # Constants
├── version.py              # Version info
├── social_routes.py        # OAuth routes
├── handlers/               # Request handlers
│   ├── __init__.py
│   ├── base.py             # Base handler
│   ├── admin.py            # Admin operations
│   ├── book.py             # Book operations
│   ├── captcha.py          # Captcha handling
│   ├── files.py            # File operations
│   ├── meta.py             # Metadata operations
│   ├── opds.py             # OPDS feed
│   ├── scan.py             # Library scan
│   └── user.py             # User operations
├── services/               # Business logic
│   ├── __init__.py
│   ├── async_service.py    # Async task service
│   ├── autofill.py         # Metadata autofill
│   ├── convert.py          # Book format conversion
│   ├── extract.py          # Archive extraction
│   ├── mail.py             # Email sending
│   ├── opds_import.py      # OPDS import
│   └── scan.py             # Library scanning
├── plugins/                # Metadata plugins
│   ├── captcha/            # Captcha implementations
│   │   ├── base.py
│   │   ├── geetest.py
│   │   └── image_captcha.py
│   ├── meta/               # Metadata providers
│   │   ├── baike/          # Baidu Baike
│   │   ├── douban.py       # Douban
│   │   ├── tomato/         # Tonghuashu
│   │   └── youshu.py       # Youshu
│   └── parser/             # Book parsers
│       └── txt.py
└── resources/              # Static resources
    ├── book/               # Book readers
    │   ├── creader.html
    │   ├── epubjs.html
    │   └── readium.html
    └── calibre/            # Calibre resources
        └── default_cover.jpg
```

## Tests (`tests/`)

```
tests/
├── __init__.py
├── cases/                  # Test data
│   ├── *.db               # SQLite databases
│   ├── *.epub, *.mobi     # Test book files
│   └── *.txt, *.pdf
├── library/               # Test book library
├── run.py                 # Test runner
└── test_*.py              # Test modules
    ├── test_admin.py
    ├── test_baike.py
    ├── test_captcha.py
    ├── test_douban.py
    ├── test_main.py
    ├── test_models.py
    ├── test_scan.py
    ├── test_service.py
    ├── test_ssl_crt.py
    ├── test_tomato_novel.py
    ├── test_txt.py
    ├── test_upload.py
    ├── test_utils.py
    └── test_youshu.py
```

## Key Files

| File | Purpose |
|------|---------|
| `server.py` | Backend entry point |
| `webserver/main.py` | Tornado app factory |
| `webserver/handlers/` | HTTP endpoints |
| `webserver/services/` | Business logic |
| `webserver/models.py` | DB models |
| `app/nuxt.config.ts` | Frontend config |
| `pyproject.toml` | Python project metadata |
