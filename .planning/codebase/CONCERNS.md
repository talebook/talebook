# Concerns

## Technical Debt

### Monolithic Backend
- All handlers in `webserver/handlers/` share similar patterns
- No clear separation between thin handlers and service logic
- Some business logic embedded directly in handlers

### Frontend-backend Integration
- Nuxt proxies API calls to Tornado backend
- Two separate configuration systems (Python settings + Vue env)
- `settings.py` contains hardcoded paths that may need adjustment

### Database Complexity
- Uses Calibre's legacy `LibraryDatabase` directly
- Monkey patches for UTF-8 book names (`utf8_construct_path_name`, `utf8_construct_file_name`)
- Separate auth DB (SQLAlchemy) + book metadata DB (Calibre APSW)

## Known Issues

### Chinese Filenames
- Tornado 6.5 introduced strict RFC 9110 validation
- Requires monkey patch in `main.py:patch_tornado_header_validation()` to support UTF-8 filenames
- Workaround patches `HTTPHeaders.add` method

### Path Handling
- Book library path is hardcoded in settings
- `BOOK_NAMES_FORMAT` affects directory structure
- May have issues with very long filenames (Calibre's `DB.PATH_LIMIT`)

### Calibre Integration
- Relies on system Calibre installation
- `sys.path` manipulation to import Calibre modules
- Monkey patching Calibre's database methods

## Security Considerations

### OAuth Secrets
- Social auth keys stored in `settings.py`
- Empty by default, must be configured by deployer
- Not environment-variable driven

### File Uploads
- Guest upload disabled by default (`ALLOW_GUEST_UPLOAD: False`)
- Max upload size: 100MB
- No built-in virus scanning

### SSL/TLS
- Self-signed certificates for dev
- Production needs proper cert configuration

## Performance Considerations

### Database
- SQLite with default pool settings
- Calibre database accessed via APSW (read-heavy)
- No query caching implemented

### Frontend
- Nuxt SSR for initial page loads
- Static assets served via Nginx
- No CDN configuration

## Fragile Areas

### Metadata Plugins
- Each external API (Douban, Baike, etc.) has different error handling
- API keys hardcoded in some places
- Rate limiting not implemented

### Book Conversion
- External binary dependencies (Calibre)
- Timeout configured but not monitored
- No retry mechanism for failed conversions

### OPDS
- Display rules parsed from settings string
- Complex categorization (`BOOK_NAV` setting)
- XML generation could have encoding issues
