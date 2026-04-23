# Stack

## Languages & Runtimes

- **Python 3.11+** — Backend server (Tornado web framework)
- **TypeScript** — Frontend (Nuxt 3)
- **JavaScript** — Frontend (legacy components)

## Backend

- **Tornado 6.5** — Async web framework
- **SQLAlchemy** — ORM for user database (SQLite)
- **APSW** — SQLite wrapper for Calibre database
- **Social Auth (Tornado)** — OAuth authentication (QQ, Weibo, GitHub, Amazon)
- **Jinja2 3.1.6** — Template rendering
- **Calibre** — Book database backend (legacy LibraryDatabase)
- **python-dateutil** — Date handling
- **msgpack** — Serialization
- **pymysql** — MySQL support (build-in, not used by default)

## Frontend (Nuxt 3)

- **Nuxt 3** — Vue 3 SSR framework
- **Vuetify 3** — UI component library (via vuetify-nuxt-module)
- **Pinia** — State management
- **@nuxtjs/i18n** — Internationalization
- **@mdi/font** — Material Design Icons

## Data Storage

- **SQLite** — User/auth database (`calibre-webserver.db`)
- **Calibre SQLite DB** — Book metadata database

## External Integrations

- **Douban API** — Book metadata autofill
- **Wikipedia Baike** — Encyclopedia entries
- **Tonghuashu (书伴)** — Book metadata
- **Kindle** — Email push delivery
- **Cravatar** — User avatars
- **Google Analytics** — Usage tracking

## Development & Testing

- **pytest 7.4.4** — Test framework
- **pytest-cov** — Coverage reporting
- **flake8** — Linting
- **black** — Code formatting (line-length: 120)
- **Docker / Docker Compose** — Containerization
- **Nuxt** — SSR for frontend

## Key Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| tornado | 6.5 | Async web server |
| sqlalchemy | (latest) | ORM |
| calibre | (system) | Book database |
| nuxt | 3.x | Vue SSR framework |
| vuetify | 3.x | UI components |
| pytest | 7.4.4 | Testing |

## Environment

- **Runtime Config**: Nuxt handles frontend env vars; Python handles backend settings
- **API Proxy**: Nuxt proxies `/api/**`, `/get/**`, `/read/**` to backend (default `http://127.0.0.1:8000`)
- **Book Storage**: `/data/books/library/`
- **Upload Path**: `/data/books/upload/`
- **Settings Path**: `/data/books/settings/`
