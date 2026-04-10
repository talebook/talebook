---
phase: "01"
plan: "01"
subsystem: "tts"
tags:
  - "tts"
  - "piper"
  - "audio"
  - "foundation"
dependency_graph:
  requires: []
  provides:
    - "TTS-01a"
    - "TTS-01b"
  affects: []
tech_stack:
  added:
    - "Piper TTS"
    - "ffmpeg"
  patterns:
    - "AsyncService @register_service decorator"
    - "Plugin registration via KEY constant"
    - "Abstract base class + registry pattern"
key_files:
  created:
    - "webserver/services/tts_engine.py"
    - "webserver/services/tts.py"
    - "webserver/plugins/tts/__init__.py"
    - "webserver/plugins/tts/piper/__init__.py"
    - "webserver/plugins/tts/piper/api.py"
  modified:
    - "webserver/services/__init__.py"
decisions:
  - "BaseTTSEngine abstract class with KEY, synthesize(), get_voices(), is_available()"
  - "TTSEngineRegistry singleton with register(), get(), get_default(), list_engines(), load_plugins()"
  - "Piper TTS uses subprocess + ffmpeg for WAV to MP3 conversion"
  - "Dialogue extraction via regex matching Chinese/English quotes and HTML tags"
  - "Audio storage in {data_path}/audio/{book_id}/ directory structure"
metrics:
  duration: "~3 minutes"
  completed: "2026-04-10T06:59:00Z"
---

# Phase 01 Plan 01: TTS Engine Abstraction Layer Summary

## One-liner

TTS 抽象层和 Piper TTS 引擎插件实现，支持引擎注册和切换。

## Objective

建立 TTS 引擎抽象层和 Piper TTS 引擎插件实现，支持引擎注册和切换。

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Create TTS engine abstraction layer (BaseTTSEngine, TTSEngineRegistry) | `1b910c0` | ✅ |
| 2 | Create Piper TTS engine plugin | `453ad4b` | ✅ |
| 3 | Create TTSService main class | `842a4da` | ✅ |

## Commits

```
1b910c0 feat(01-tts): add TTS engine abstraction layer
453ad4b feat(01-tts): add Piper TTS engine plugin
842a4da feat(01-tts): add TTSService main class
```

## Files Created

| File | Purpose |
|------|---------|
| `webserver/services/tts_engine.py` | BaseTTSEngine ABC + TTSEngineRegistry |
| `webserver/services/tts.py` | TTSService async service class |
| `webserver/plugins/tts/__init__.py` | TTS plugin namespace package |
| `webserver/plugins/tts/piper/__init__.py` | Piper plugin exports |
| `webserver/plugins/tts/piper/api.py` | PiperTTSEngine implementation |

## Files Modified

| File | Change |
|------|--------|
| `webserver/services/__init__.py` | Added TTSEngine and TTSService exports |

## Architecture

### BaseTTSEngine Abstract Class
- `KEY`: Engine identifier (must be defined by subclass)
- `synthesize(text, output_path, **kwargs) -> bool`: Synthesize text to audio file
- `get_voices() -> list[dict]`: Return available voices
- `is_available() -> bool`: Check if engine dependencies are installed
- `validate_text(text) -> bool`: Validate text before synthesis

### TTSEngineRegistry
- `register(engine_class)`: Register a TTS engine class
- `get(key) -> BaseTTSEngine`: Get engine instance by key
- `get_default() -> BaseTTSEngine`: Get default engine (piper > coqui > azure)
- `list_engines() -> list[str]`: List all registered engine keys
- `load_plugins()`: Auto-load all TTS plugins from `webserver/plugins/tts/`

### PiperTTSEngine
- Uses `piper` CLI for synthesis
- Converts WAV to MP3 using `ffmpeg`
- Supports voice, rate, pitch parameters
- Auto-registers on module import via `TTSEngineRegistry.register(PiperTTSEngine)`

### TTSService
- Inherits `AsyncService` with `@register_service` decorator
- `generate_audio(book_id, chapter_id, voice, rate, pitch)`: Main async workflow
- `_extract_text(book_id, chapter_id)`: Extract text from txt or epub
- `_extract_dialogues(text)`: Regex-based dialogue extraction
- `_get_audio_dir(book_id)`: Returns `{data_path}/audio/{book_id}/`

## Verification

### File Structure
```bash
ls -la webserver/services/tts_engine.py webserver/services/tts.py
ls -la webserver/plugins/tts/ webserver/plugins/tts/piper/
```

### Import Test
```bash
cd webserver && python3 -c "from services.tts_engine import BaseTTSEngine, TTSEngineRegistry; print('OK')"
```

### Engine Registration
```bash
cd webserver && python3 -c "
from services.tts_engine import TTSEngineRegistry
from plugins.tts.piper import PiperTTSEngine
TTSEngineRegistry.register(PiperTTSEngine)
print('Engines:', TTSEngineRegistry.list_engines())
"
```

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| `webserver/services/tts.py` | `_save_audio_records()` | Audio record saving logs instead of DB insert | Audio model not yet created (future phase) |

## Success Criteria

- ✅ TTS 抽象层定义清晰，引擎可通过 `TTSEngineRegistry` 注册和获取
- ✅ Piper TTS 引擎实现完整，包含 `synthesize()` 和 `get_voices()` 方法
- ✅ TTSService 可通过 `@AsyncService.register_service` 注册为异步任务
- ✅ 对话识别正则可匹配中英文引号和 HTML 标签内对话
- ✅ 引擎注册表在服务启动时可自动加载所有插件

## Self-Check

- [x] `webserver/services/tts_engine.py` exists
- [x] `webserver/services/tts.py` exists
- [x] `webserver/plugins/tts/__init__.py` exists
- [x] `webserver/plugins/tts/piper/__init__.py` exists
- [x] `webserver/plugins/tts/piper/api.py` exists
- [x] Commit `1b910c0` exists
- [x] Commit `453ad4b` exists
- [x] Commit `842a4da` exists

## Self-Check: PASSED