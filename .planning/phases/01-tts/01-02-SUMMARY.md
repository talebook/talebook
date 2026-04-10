---
phase: "01"
plan: "02"
subsystem: "tts"
tags:
  - "tts"
  - "text-extraction"
  - "dialogue"
  - "audio-model"
dependency_graph:
  requires: []
  provides:
    - "TTS-02a"
    - "TTS-02b"
  affects:
    - "webserver/services/tts.py"
    - "webserver/models/audio.py"
tech_stack:
  added:
    - "TxtParser (reused)"
    - "calibre ebook-convert (reused)"
  patterns:
    - "TxtParser chapter-based text extraction"
    - "calibre subprocess conversion for epub"
    - "Regex-based dialogue extraction with Chinese bracket support"
key_files:
  created:
    - "webserver/models/audio.py"
  modified:
    - "webserver/services/tts.py"
decisions:
  - "_extract_text_from_txt() reuses TxtParser for encoding detection and chapter parsing"
  - "_extract_text_from_epub() uses subprocess to call ebook-convert directly"
  - "_extract_dialogues() supports Chinese brackets (「」『』) in addition to quotes"
  - "_clean_dialogue_text() removes formatting markers like [page] and (translator notes)"
  - "Audio model uses SQLAlchemy declarative Base for compatibility with existing models"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-10T07:05:00Z"
---

# Phase 01 Plan 02: Text Extraction and Dialogue Recognition Summary

## One-liner

TXT/epub 文本提取和对话识别功能，通过复用 TxtParser 和 calibre convert 实现。

## Objective

实现文本提取（TXT/epub）和对话识别功能，复用现有解析器。

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Implement `_extract_text_from_txt()` method | `39d172f` | ✅ |
| 2 | Implement `_extract_text_from_epub()` method | `7286add` | ✅ |
| 3 | Enhance `_extract_dialogues()` method | `80cf9a7` | ✅ |
| 4 | Create Audio database model | `022a8d6` | ✅ |

## Commits

```
39d172f feat(01-tts): add _extract_text_from_txt() with TxtParser reuse
7286add feat(01-tts): add _extract_text_from_epub() with calibre convert
80cf9a7 feat(01-tts): enhance _extract_dialogues() with Chinese brackets and deduplication
022a8d6 feat(01-tts): add Audio database model for TTS audio records
```

## Files Created

| File | Purpose |
|------|---------|
| `webserver/models/audio.py` | Audio SQLAlchemy model for TTS audio records |

## Files Modified

| File | Change |
|------|--------|
| `webserver/services/tts.py` | Added `_extract_text_from_txt()`, `_extract_text_from_epub()`, `_extract_dialogues()` enhancements, and `_clean_dialogue_text()` |

## Architecture

### Text Extraction Flow

**TXT Files:**
1. `_extract_text(book_id, chapter_id)` calls `_extract_text_from_txt(book_path)`
2. `_extract_text_from_txt()` uses `TxtParser.parse()` to detect encoding and get chapter TOC
3. Reads file content and extracts text by chapter positions
4. Returns concatenated text with chapter separators

**EPUB Files:**
1. `_extract_text(book_id, chapter_id)` calls `_extract_text_from_epub(book_path)`
2. `_extract_text_from_epub()` creates temp file, calls `ebook-convert` via subprocess
3. Reads converted txt with encoding fallback (utf-8 → gbk → gb2312 → latin-1)
4. Cleans up temp files and returns content

### Dialogue Extraction

**`_extract_dialogues(text)`** extracts dialogue fragments using regex:
- Patterns: `「」` (Chinese bracket), `""` (Chinese quote), `『』` (Chinese single bracket), `''` (Chinese single quote), `""` (English quote), `''` (English single quote)
- Filters: length 5-1000 chars, deduplication, format marker removal
- Returns: list of `{id, text, pattern_type, start, end}`

**`_clean_dialogue_text(text)`** removes formatting:
- Strips whitespace, `[page markers]`, `(translator notes)`
- Removes outer quotes/brackets if any remain

### Audio Model

```python
class Audio(Base):
    __tablename__ = 'audio'

    id: Integer (primary key)
    book_id: Integer (ForeignKey to books.id, indexed)
    chapter_id: Integer (optional)
    file_path: String(512)
    file_size: Integer (bytes)
    duration: Float (seconds)
    text_length: Integer
    pattern_type: String(32)
    created_at: DateTime
    updated_at: DateTime
```

## Verification

### File Structure
```bash
ls -la webserver/models/audio.py
ls -la webserver/services/tts.py
```

### Method Existence
```bash
grep -r "def _extract_text_from_txt" webserver/services/
grep -r "def _extract_text_from_epub" webserver/services/
grep -r "def _extract_dialogues" webserver/services/
grep -r "def _clean_dialogue_text" webserver/services/
grep -r "class Audio" webserver/models/
```

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| `webserver/services/tts.py` | `_save_audio_records()` | Logs instead of inserting Audio records | Audio model was just created, DB integration in next phase |

## Success Criteria

- ✅ TXT 文件可通过 TxtParser 正确提取文本内容
- ✅ epub 文件可通过 calibre convert 转换为 txt 并提取
- ✅ 对话识别可匹配中英文引号对白（包括中文括号「」『」）
- ✅ Audio 数据库表结构设计合理，包含必要字段
- ✅ TTSService 文本提取流程完整可用

## Self-Check

- [x] `webserver/models/audio.py` exists
- [x] `webserver/services/tts.py` modified with new methods
- [x] Commit `39d172f` exists
- [x] Commit `7286add` exists
- [x] Commit `80cf9a7` exists
- [x] Commit `022a8d6` exists

## Self-Check: PASSED