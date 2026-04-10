# Pitfalls

## Metadata Integration

### Amazon API
- **Rate limiting** — Amazon has strict API limits; implement caching
- **AWS credentials** — Require secure storage, not in code
- **Locale differences** — Amazon.com vs regional sites

### Goodreads
- **API access** — Goodreads API is limited; may need scraping
- **Authentication** — OAuth may be required for full access

**Prevention:** Start with one new source, validate before adding second

## TTS Integration

### Multi-Character Detection
- **Accuracy** — Automatic role detection can be wrong; need review step
- **Book formats** — epub/txt extraction differs; mobi/azw3 may need conversion

**Prevention:** User review before final generation

### Audio Processing
- **Long books** — Generation time; consider chunked processing
- **Storage** — Audio files can be large; compression may be needed

**Prevention:** Chunked generation with progress tracking

### Center Service
- **Network dependency** — Offline mode must work
- **Audio format mismatch** — Ensure compatibility between instances

**Prevention:** Standardize audio format; graceful offline fallback

## General

### Scope Creep
- **Risk** — Multiple features can expand mid-implementation
- **Prevention:** Stick to phase boundaries; defer to backlog

### Testing
- **Risk** — TTS is hard to test automatically
- **Prevention:** Focus on unit tests for role detection logic; manual testing for audio quality
