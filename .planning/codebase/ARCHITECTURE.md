# Architecture

## Overview

talebook is a book management web application built on a split architecture:
- **Frontend**: Nuxt 3 (Vue 3) SSR application
- **Backend**: Tornado async Python web server
- **Database**: Calibre's legacy SQLite database + separate auth database

## Architecture Pattern

### Backend (Tornado)

**Pattern**: Request-Handler with Service Layer

```
Request → Handler → Service → External Service/Database
```

- `webserver/handlers/` — HTTP request handlers (book, user, admin, etc.)
- `webserver/services/` — Business logic services (AsyncService, scan, convert, etc.)
- `webserver/plugins/` — Metadata parsers (douban, baike, tomato, youshu)
- `webserver/models.py` — SQLAlchemy ORM models

### Frontend (Nuxt 3)

**Pattern**: Vue 3 Composition API with SSR

```
Page → Components → Pinia Stores → API Proxies
```

- `app/components/` — Vue components
- `app/pages/` — Nuxt pages (SSR routes)
- `app/stores/` — Pinia state management
- API calls proxied through Nuxt to backend

## Data Flow

### Book Reading Flow
1. User requests book → Nuxt SSR renders page
2. Frontend calls `/api/book/...` → proxied to Tornado
3. Tornado handler processes request
4. Calibre database queried via APSW
5. Book file returned or stream generated

### Authentication Flow
1. OAuth redirect → Social auth handler
2. `social-auth-tornado` processes callback
3. User created/updated in auth DB (SQLAlchemy)
4. Session cookie set

## Key Abstractions

### AsyncService (`webserver/services/async_service.py`)
- Singleton service managing async tasks
- Setup called during app initialization

### Book Cache (`calibre.db.legacy.LibraryDatabase`)
- Calibre's database abstraction
- Monkey-patched for UTF-8 book names

### Session Management
- SQLAlchemy scoped sessions
- Social auth integration for OAuth

## Entry Points

### Backend
- `server.py` → `webserver/main.py:main()`
- Starts Tornado HTTPServer on configured port
- Loads Calibre database and auth database

### Frontend
- `app/nuxt.config.ts` — Nuxt configuration
- Dev server: `npm run dev` (port 9000)
- Production: `app/dist/` served by Nginx

## Configuration

- Backend: `webserver/settings.py` — Static settings object
- Frontend: `app/.env` — Runtime config vars
- Both integrated via `nuxt_env_path` pointing to `app/.env`
