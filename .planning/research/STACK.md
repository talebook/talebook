# Stack

## Current Stack

- **Python 3.11+** — Backend (Tornado 6.5)
- **TypeScript/Vue 3** — Frontend (Nuxt 3)
- **SQLite** — Databases (Calibre + Auth)
- **pytest** — Testing

## Enhancements Needed

### Metadata Sources

**New integrations:**
- Amazon Product Advertising API — book metadata
- Goodreads API — book ratings, reviews, metadata

**Implementation approach:**
- Add new plugin modules under `webserver/plugins/meta/`
- Follow existing pattern: `douban.py`, `baike/`, `tomato/`, `yousu/`
- Each plugin: fetch → parse → normalize → return metadata dict

### TTS Services

**Local TTS engines to support:**
- Coqui XTTS — open source, multi-voice, local
- Piper TTS — lightweight, fast, multi-language
- Azure TTS — cloud, high quality, multi-voice
- Google Cloud TTS — cloud, WaveNet voices

**Architecture:**
- `webserver/services/tts/` — TTS service layer
- Plugin-based: each engine is a plugin
- Configurable default engine

**Multi-character handling:**
- Role detection: regex patterns, AI classification
- Voice assignment: map roles to TTS voice profiles
- Audio generation: chapter/segment based

## Technology Decisions

| Component | Choice | Rationale |
|-----------|--------|-----------|
| TTS Framework | Plugin-based | Support multiple engines |
| Role Detection | Local AI + rules | Flexibility |
| Audio Format | MP3/OGG | Browser compatibility |

## Dependencies to Add

- `requests` — HTTP client for APIs
- `boto3` — AWS SDK (for S3 if storing audio)
- TTS engine libraries (Coqui, Piper, etc.)
