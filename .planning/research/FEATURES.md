# Features

## Current Features

### Book Management
- Upload epub, mobi, azw3, pdf, txt
- Automatic metadata autofill
- Library scanning
- OPDS feed

### User Management
- OAuth authentication (QQ, Weibo, GitHub, Amazon)
- Guest access control
- Role-based permissions

### Metadata Sources
- Douban (豆瓣) — primary Chinese source
- Baidu Baike — encyclopedia
- Tonghuashu (书伴) — metadata
- Youshu (雅书) — ratings

## New Features

### Enhanced Metadata (META-01, META-02)

**Amazon Product Advertising API**
- Book title, author, cover, description
- Requires: AWS access key
- Rate limits apply

**Goodreads API**
- Book ratings, reviews, similar books
- Requires: API key (developer.h Goodreads)
- More comprehensive English metadata

### AI Multi-Character Reading (TTS-01 to TTS-04)

**TTS Generation**
- User selects book → initiates TTS generation
- System extracts text content
- Role detection: identify speakers
- Audio generation per chapter/segment
- Stored locally or downloaded from center service

**Center Service Integration**
- Query: check if audio exists on tingshu.ai
- Download: fetch existing audio
- Publish: upload locally generated audio
- Search: find shared audio by book/character

**Table Stakes (must have)**
- Single voice TTS playback
- Basic play/pause controls

**Differentiators (competitive edge)**
- Multi-character voice assignment
- Center service sharing
- Multiple TTS engine support

**Anti-features (deliberately not building)**
- Automatic role detection without user review
- Audio streaming (only download)
- Real-time voice cloning
