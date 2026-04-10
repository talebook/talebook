---
phase: 01-tts
reviewed: 2026-04-10T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - webserver/models/audio.py
  - webserver/plugins/tts/__init__.py
  - webserver/plugins/tts/piper/__init__.py
  - webserver/plugins/tts/piper/api.py
  - webserver/services/__init__.py
  - webserver/services/tts.py
  - webserver/services/tts_engine.py
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-10
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

审查了 TTS 相关的 7 个源文件，发现 4 个警告级别问题和 3 个信息级别问题。未发现安全漏洞或严重 bug。

主要问题包括：
1. Python 3.12+ 已弃用 `datetime.utcnow`
2. 多处硬编码超时时间，无法灵活配置
3. `BaseTTSEngine.is_available()` 硬编码了 'piper' 二进制检查，与基类设计矛盾
4. 存在代码重复和模块导入位置不规范

## Warnings

### WR-01: datetime.utcnow 已废弃

**File:** `webserver/models/audio.py:41-42`
**Issue:** `datetime.utcnow` 在 Python 3.12+ 中已废弃，会产生 DeprecationWarning。建议使用 `datetime.now(datetime.timezone.utc)` 代替。
**Fix:**
```python
from datetime import datetime, timezone

created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
```

### WR-02: 硬编码超时时间无法配置

**File:** `webserver/plugins/tts/piper/api.py:89`
**Issue:** Piper 合成超时硬编码为 300 秒，无法根据实际需求调整。
**Fix:** 建议将超时时间提取为配置参数或类属性：
```python
DEFAULT_TIMEOUT = 300

result = subprocess.run(
    piper_cmd,
    capture_output=True,
    text=True,
    timeout=self.DEFAULT_TIMEOUT
)
```

**File:** `webserver/plugins/tts/piper/api.py:176`
**Issue:** ffmpeg 转换超时硬编码为 60 秒，长文本可能会失败。
**Fix:** 同样建议提取为可配置参数。

**File:** `webserver/services/tts.py:227`
**Issue:** ebook-convert 超时硬编码为 300 秒（5分钟），大型 epub 文件可能需要更长时间。
**Fix:** 建议提取为类属性或全局配置。

**File:** `webserver/services/tts.py:461`
**Issue:** ffprobe 超时硬编码为 10 秒。

### WR-03: BaseTTSEngine.is_available() 硬编码 piper

**File:** `webserver/services/tts_engine.py:46`
**Issue:** `BaseTTSEngine.is_available()` 方法硬编码检查 'piper' 二进制文件，这违反了基类的抽象设计原则。不同的 TTS 引擎（如 coqui、azure）需要检查不同的依赖。此方法应设为抽象方法，由子类实现。
**Fix:**
```python
@abstractmethod
def is_available(self) -> bool:
    """检查引擎是否可用（依赖是否安装等）"""
    pass
```

并在 PiperTTSEngine 中保留具体实现（当前在 api.py:233-246）。

### WR-04: import 语句位置不规范

**File:** `webserver/plugins/tts/piper/api.py:157`
**Issue:** `import shutil` 在函数 `_convert_to_mp3` 内部导入，应移动到模块顶部以提高可读性和性能。
**Fix:**
```python
import subprocess
import os
import logging
import shutil  # 移到顶部
from pathlib import Path
from webserver.services.tts_engine import BaseTTSEngine, TTSEngineRegistry
```

## Info

### IN-01: 代码重复 - is_available() 实现

**File:** `webserver/plugins/tts/piper/api.py:233-246`
**Issue:** `PiperTTSEngine.is_available()` 的实现（检查 piper 和 ffmpeg）与 `BaseTTSEngine.is_available()` 的实现（检查 piper）有重叠。虽然子类覆盖了父类方法，但逻辑上有冗余——BaseTTSEngine 只检查 piper，而 PiperTTSEngine 检查 piper 和 ffmpeg。这说明 BaseTTSEngine 的设计不够通用。

### IN-02: 技术债务注释

**File:** `webserver/plugins/tts/piper/api.py:192`
**Issue:** 注释 `# Phase 1 硬编码默认音色，实际音色列表应从 ~/.piper 目录扫描` 表明当前实现是临时方案，后续需要改进 `get_voices()` 方法从模型目录动态扫描。

### IN-03: validate_text 限制为 Piper 特定

**File:** `webserver/services/tts_engine.py:52`
**Issue:** `validate_text` 方法中的 50000 字符限制是 Piper 的特定限制，不同引擎可能有不同的限制。此验证逻辑应下放到具体引擎类中。

### IN-04: subprocess.run 使用 list 而非 shell=True

**File:** `webserver/plugins/tts/piper/api.py:85-90`, `webserver/services/tts.py:223-228`
**Issue:** 当前使用 `subprocess.run(cmd, ...)` 传入列表形式，这是正确的安全做法。但需确保后续维护时不要改为 `shell=True` 以避免命令注入风险。

---

_Reviewed: 2026-04-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
