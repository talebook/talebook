# Architecture

## Current Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Nuxt 3 FE    │────▶│  Tornado API    │
└─────────────────┘     └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │  Calibre DB     │
                        │  (APSW)         │
                        └─────────────────┘
                                 │
                        ┌────────▼────────┐
                        │  Auth DB        │
                        │  (SQLAlchemy)   │
                        └─────────────────┘
```

## Enhanced Architecture

### Metadata Sources
```
┌──────────────────────────────────────────────┐
│           Metadata Plugin Layer               │
├──────────┬───────────┬───────────┬───────────┤
│ Douban   │ Amazon   │ Goodreads│ ...       │
│ (exist)  │ (new)    │ (new)    │           │
└──────────┴──────────┴──────────┴───────────┘
```

### TTS Architecture
```
┌──────────────────────────────────────────────────────┐
│                   TTS Service Layer                   │
├────────────┬────────────┬────────────┬───────────────┤
│ Coqui     │ Piper      │ Azure      │ Google        │
│ XTTS      │ TTS        │ TTS        │ Cloud TTS     │
└────────────┴────────────┴────────────┴───────────────┘
                          │
┌─────────────────────────▼─────────────────────────────┐
│              Role Assignment Engine                   │
│  - Text extraction (Calibre content)                 │
│  - Role detection (dialogue attribution)             │
│  - Voice profile mapping                             │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼─────────────────────────────┐
│              Audio Storage                           │
│  - Local: /data/books/audio/                         │
│  - Remote: tingshu.ai (center service)               │
└─────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility |
|-----------|----------------|
| `webserver/plugins/meta/amazon.py` | Amazon API integration |
| `webserver/plugins/meta/goodreads.py` | Goodreads API integration |
| `webserver/services/tts/` | TTS service abstraction |
| `webserver/services/tts/engines/` | Individual TTS engine implementations |
| `webserver/services/tts/role_detector.py` | Character role detection |
| `webserver/services/audio_store.py` | Local audio storage |
| `webserver/services/center_service.py` | tingshu.ai integration |

## Data Flow

### Metadata Fetch
```
User → API /book/{id}/refresh → Douban/Amazon/Goodreads → Normalize → Store
```

### TTS Generation
```
User → API /book/{id}/generate_tts →
  1. Check center service (tingshu.ai)
  2. If exists: download
  3. If not: extract text → detect roles → generate audio → store locally
  4. Offer to share to center service
```

## Build Order

1. **Metadata plugins first** — simpler, existing pattern to follow
2. **TTS service layer** — abstract engine interface
3. **Local TTS generation** — basic single-voice first
4. **Multi-voice support** — role detection + voice mapping
5. **Center service integration** — publish/subscribe
