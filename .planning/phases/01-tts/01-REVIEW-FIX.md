---
phase: 01-tts
fixed_at: 2026-04-10T00:00:00Z
review_path: .planning/phases/01-tts/01-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-04-10
**Source review:** .planning/phases/01-tts/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (CR: 0, WR: 4, IN: 0 per fix_scope=critical_warning)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: datetime.utcnow 已废弃

**Files modified:** `webserver/models/audio.py`
**Commit:** 500388d
**Applied fix:** Replaced `datetime.utcnow` with `datetime.now(timezone.utc)` using lambda defaults for SQLAlchemy Column defaults.

### WR-02: 硬编码超时时间无法配置

**Files modified:** `webserver/plugins/tts/piper/api.py`, `webserver/services/tts.py`
**Commit:** f3b5a4a
**Applied fix:**
- Added `DEFAULT_TIMEOUT = 300` and `DEFAULT_FFMPEG_TIMEOUT = 60` class constants to `PiperTTSEngine`
- Extracted `CONVERT_TIMEOUT = 300` for ebook-convert in `tts.py`
- Extracted `FFPROBE_TIMEOUT = 10` for ffprobe in `tts.py`

### WR-03: BaseTTSEngine.is_available() 硬编码 piper

**Files modified:** `webserver/services/tts_engine.py`
**Commit:** 4065c4f
**Applied fix:** Added `@abstractmethod` decorator to `is_available()` method in `BaseTTSEngine`, making it an abstract method that subclasses must implement.

### WR-04: import 语句位置不规范

**Files modified:** `webserver/plugins/tts/piper/api.py`
**Commit:** 64c6075
**Applied fix:** Moved `import shutil` from inside `_convert_to_mp3()` and `is_available()` functions to module top-level imports.

---

_Fixed: 2026-04-10_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
