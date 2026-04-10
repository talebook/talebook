# Research Summary

## Key Findings

### Stack
- Existing: Python/Tornado + Nuxt 3 + SQLite
- New: Plugin-based TTS services, REST API clients for metadata
- No major framework changes needed

### Table Stakes
- Single-voice TTS playback
- Basic metadata fetch from new sources
- Audio download from center service

### Differentiators
- Multi-character voice assignment
- Center service sharing (npm-style publish)
- Multiple TTS engine support

### Watch Out For
- Amazon API rate limits and credentials
- Goodreads API access restrictions
- Multi-character detection accuracy
- Audio storage size management

## Decisions Needed

| Area | Decision | Status |
|------|----------|--------|
| TTS Engine | Plugin-based architecture | Pending |
| Role Detection | AI + user review | Pending |
| Audio Format | MP3/OGG standardization | Pending |
| Center Service | REST API integration | Pending |

## Phase Structure

1. **Metadata Sources** — Amazon + Goodreads plugins
2. **TTS Service Layer** — Abstract engine interface
3. **Basic TTS** — Single-voice generation
4. **Multi-Voice** — Role detection + voice mapping
5. **Center Service** — Publish/download integration
