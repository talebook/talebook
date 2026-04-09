# Integrations

## Authentication (OAuth)

Supports multiple OAuth providers via `social-auth`:
- **QQ OAuth2** — `SOCIAL_AUTH_QQ_KEY`, `SOCIAL_AUTH_QQ_SECRET`
- **Weibo OAuth2** — `SOCIAL_AUTH_WEIBO_KEY`, `SOCIAL_AUTH_WEIBO_SECRET`
- **GitHub OAuth2** — `SOCIAL_AUTH_GITHUB_KEY`, `SOCIAL_AUTH_GITHUB_SECRET`
- **Amazon OAuth2** — Uses default Amazon OAuth

## Book Metadata APIs

### Douban (豆瓣)
- **API Key**: `douban_apikey` (default: `0df993c66c0c636e29ecbb5344252a4a`)
- **Base URL**: `https://api.douban.com`
- **Max Count**: `douban_max_count` (default: 2)
- **Purpose**: Autofill book metadata (title, author, cover, description)

### Wikipedia Baike (百度百科)
- **Module**: `webserver/plugins/meta/baike/`
- **Purpose**: Encyclopedia entries for books

### Tonghuashu (书伴)
- **Module**: `webserver/plugins/meta/tomato/`
- **Purpose**: Additional book metadata source

### Youshu (雅书)
- **Module**: `webserver/plugins/meta/youshu/`
- **Purpose**: Book metadata and ratings

## Email (Kindle Push)

- **SMTP Server**: `smtp_server` (e.g., `smtp.talebook.org`)
- **Encryption**: `smtp_encryption` (TLS)
- **Username**: `smtp_username`
- **Password**: `smtp_password`
- **Purpose**: Send books to Kindle devices via email

## External Services

### Cravatar
- **URL**: `https://cravatar.cn`
- **Purpose**: User avatar images

### Google Analytics
- **Tracking ID**: `google_analytics_id` (e.g., `G-LLF01B5ZZ8`)
- **Purpose**: Usage analytics

### Candle Reader (阅读器)
- **Server**: `CANDLE_READER_SERVER` (`https://brs.talebook.org`)
- **Purpose**: EPUB reader service

## Data Storage

- **User DB**: `sqlite:////data/books/calibre-webserver.db`
- **Book Library**: `/data/books/library/`
- **Settings**: `/data/books/settings/`
- **Uploads**: `/data/books/upload/`
- **Imports**: `/data/books/imports/`
- **Extracted**: `/data/books/extract/`
- **Converted**: `/data/books/convert/`
- **Progress**: `/data/books/progress/`

## OPDS (Open Publication Distribution System)

- **Enabled**: `OPDS_ENABLED`
- **Display Rules**: `opds_will_display`, `opds_wont_display`
- **Max Tags**: `opds_max_tags_shown`
- **Max Items**: `opds_max_items`
- **URL Prefix**: `opds_url_prefix`

## Captcha Verification

- **Provider**: `CAPTCHA_PROVIDER` (currently supports Geetest)
- **Config**: `CAPTCHA_ENABLE_FOR_*` flags
- **Geetest IDs**: `GEETEST_CAPTCHA_ID`, `GEETEST_CAPTCHA_KEY`
