# Conventions

## Python

### Style

- **Formatter**: Black (line-length: 120)
- **Linter**: flake8
- **Encoding**: UTF-8 (`# -*- coding: UTF-8 -*-`)
- **Python**: 3.11+

### Code Patterns

#### Handler Pattern
```python
class BookHandler(BaseHandler):
    def get(self):
        # Get current user from base handler
        user = self.current_user
        # Use ScopedSession for DB access
        session = self.settings["ScopedSession"]
        ...
```

#### Base Handler (`webserver/handlers/base.py`)
- Provides `current_user` property
- Provides `ScopedSession` from settings
- Session management for database access

#### Async Service
- `AsyncService` singleton manages async tasks
- Initialized via `AsyncService().setup(book_db, ScopedSession)` in `main.py`

### Error Handling
- Use logging for errors
- Return appropriate HTTP status codes
- Graceful degradation where possible

### Imports
- Standard library imports first
- Third-party imports second
- Local imports third
- Use `# noqa: F401` for intentional unused imports

## Vue / TypeScript

### Components
- Vue 3 Composition API with `<script setup>`
- TypeScript for type safety

### File Naming
- PascalCase for components: `BookList.vue`
- camelCase for utilities: `useBookStore.ts`

## Git

### Commit Messages
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`
- Example: `feat(book): add new search feature`

## Configuration

### Settings (`webserver/settings.py`)
- Static dictionary `settings`
- Path-based config for volumes (`/data/books/`)
- Feature flags as boolean settings

### Environment Variables
- Frontend: `app/.env` (Nuxt runtime config)
- Backend: Python settings object
