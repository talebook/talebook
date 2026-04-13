# Phase 1: TTS 基础框架 - Research

**Researched:** 2026-04-09
**Domain:** Text-to-Speech (TTS) 服务抽象层 + 文本提取 + 对话识别
**Confidence:** MEDIUM

## Summary

Phase 1 目标是建立 TTS 服务的基础框架，包括：TTS 抽象层（支持引擎切换）、文本提取（epub/txt）、对话识别（引号/标签）。关键约束：使用 Piper TTS 作为默认引擎（MIT 许可证、跨平台、无需 GPU），通过 calibre convert 复用 epub 转换，复用 AsyncService 异步模式。

**Primary recommendation:** 建立 `webserver/services/tts.py` 作为 TTS 服务抽象层，`webserver/plugins/tts/piper/` 作为首个引擎插件，文本提取复用 `TxtParser` + calibre convert，对话识别仅做引号/标签识别。

---

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 免费引擎选择 **Piper TTS**（跨平台、无需 GPU、MIT 许可证）
- **D-02:** 抽象层为接口 + 单引擎实现，引擎可切换
- **D-03:** TXT 提取：复用现有 `TxtParser`（正则章节识别）
- **D-04:** epub 提取：**复用 calibre convert** 将 epub 转 txt/HTML，再复用现有 parser
- **D-05:** Phase 1 对话识别粒度：**仅引号/标签识别**（不区分说话人，Phase 2 才做角色检测）
- **D-06:** 音频存储：**本地文件 + 数据库记录**（按 book_id/ 目录组织）
- **D-07:** 音频格式：**MP3**（体积小、兼容性好，Piper 配合 piper-phonemizer + ffmpeg 输出 MP3）
- **D-08:** 异步生成：后台线程处理，复用现有 `AsyncService` 模式

### Claude's Discretion
- Piper TTS 详细配置（voice selection、语速、音调）由实现时决定
- epub 转 txt 的临时文件清理策略由实现时决定
- 数据库记录字段结构由实现时设计

### Deferred Ideas (OUT OF SCOPE)
- 角色检测（Phase 2 才做）
- 说话人区分（Phase 2 才做）
- 多角色声音分配（Phase 2）

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TTS-01a | TTS 服务抽象层，支持多种引擎插件 | 抽象层设计：BaseTTSEngine 接口 + 插件注册模式 |
| TTS-01b | 支持至少一种免费 TTS 引擎（Piper TTS） | Piper TTS 安装、配置、MP3 输出方案 |
| TTS-02a | 从 epub/txt 提取文本内容 | TxtParser 复用 + calibre convert 集成 |
| TTS-02b | 对话识别（识别引号/标签内的对白） | 正则表达式识别方案 |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Piper TTS | 1.2.0+ [VERIFIED: pip registry 2026-04] | 本地 TTS 引擎 | MIT 许可证，跨平台，无需 GPU |
| piper-phonemizer | latest | 音素转换 | Piper 推荐，配合 espeak-ng |
| ffmpeg | 7.0.2 [VERIFIED: installed] | WAV → MP3 转码 | 系统已有，Calibre 也用 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| calibre (ebook-convert) | system installed | epub → txt 转换 | epub 提取时 |
| TxtParser | existing | TXT 章节解析 | TXT 文本提取 |

### Installation
```bash
# Piper TTS 安装
pip install piper-tts piper-phonemizer

# 英文模型 (示例)
piper --download en_US-lessac-medium

# 中文模型 (Piper 内置支持，espeak-ng)
# 需要 espeak-ng 作为音素后端
brew install espeak-ng  # macOS
# apt install espeak-ng  # Linux

# 验证安装
which piper
ffmpeg -version | head -1
```

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Piper TTS | Coqui XTTS | XTTS 需要 GPU， Piper 更轻量 |
| MP3 格式 | OGG | MP3 兼容性更好，浏览器原生支持 |

---

## Architecture Patterns

### Recommended Project Structure
```
webserver/
├── services/
│   ├── __init__.py          # 已有的 AsyncService 导出
│   ├── tts.py               # [NEW] TTS 抽象服务层
│   ├── tts_engine.py        # [NEW] 引擎基类和注册表
│   └── extract.py           # [EXISTING] 复用
├── plugins/
│   ├── __init__.py
│   ├── tts/                 # [NEW] TTS 引擎插件目录
│   │   ├── __init__.py     # 插件注册，导出 KEY
│   │   └── piper/          # [NEW] Piper 引擎实现
│   │       ├── __init__.py
│   │       └── api.py
│   └── parser/
│       └── txt.py          # [EXISTING] 复用
```

### Pattern 1: TTS 抽象引擎接口

**What:** 定义 `BaseTTSEngine` 抽象基类，所有 TTS 引擎插件实现此接口

**When to use:** 需要支持多种 TTS 引擎切换时

**Example:**
```python
# Source: webserver/services/tts_engine.py (NEW)
from abc import ABC, abstractmethod
import logging

class BaseTTSEngine(ABC):
    """TTS 引擎抽象接口"""

    KEY = None  # 引擎标识符，子类必须定义

    @abstractmethod
    def synthesize(self, text: str, output_path: str, **kwargs) -> bool:
        """将文本合成为音频文件"""
        pass

    @abstractmethod
    def get_voices(self) -> list[dict]:
        """获取可用音色列表"""
        pass

    def is_available(self) -> bool:
        """检查引擎是否可用（依赖是否安装等）"""
        return True


class TTSEngineRegistry:
    """引擎注册表，单例模式"""

    _engines = {}

    @classmethod
    def register(cls, engine_class):
        if hasattr(engine_class, 'KEY') and engine_class.KEY:
            cls._engines[engine_class.KEY] = engine_class
            logging.info(f"TTS engine registered: {engine_class.KEY}")
        return engine_class

    @classmethod
    def get(cls, key: str) -> BaseTTSEngine:
        return cls._engines.get(key)

    @classmethod
    def get_default(cls) -> BaseTTSEngine:
        """返回默认引擎（按优先级：piper > coqui > azure）"""
        for key in ['piper', 'coqui', 'azure']:
            if key in cls._engines:
                return cls._engines[key]()
        return None

    @classmethod
    def list_engines(cls):
        return list(cls._engines.keys())
```

### Pattern 2: AsyncService 异步任务模式

**What:** 使用 `@AsyncService.register_service` 装饰器将同步任务变为后台异步执行

**When to use:** TTS 生成等耗时操作需要后台执行时

**Example:**
```python
# Source: webserver/services/tts.py (NEW)
class TTSService(AsyncService):
    @AsyncService.register_service
    def generate_audio(self, book_id: int, chapter_id: int = None):
        """生成书籍音频（异步）"""
        # 1. 提取文本
        text = self._extract_text(book_id, chapter_id)
        if not text:
            return False

        # 2. 对话识别
        dialogues = self._extract_dialogues(text)

        # 3. TTS 合成
        output_dir = self._get_audio_dir(book_id)
        engine = TTSEngineRegistry.get_default()

        for dialogue in dialogues:
            audio_path = os.path.join(output_dir, f"{dialogue['id']}.mp3")
            engine.synthesize(dialogue['text'], audio_path)

        # 4. 更新数据库
        self._save_audio_records(book_id, dialogues)
        return True
```

### Pattern 3: 插件注册模式（Meta 插件参考）

**What:** `__init__.py` 导出 `KEY` + Api class，引擎通过装饰器注册

**When to use:** 引擎插件需要被主服务发现和加载时

**Source参考:** `webserver/plugins/meta/tomato/api.py` + `webserver/plugins/meta/__init__.py`

```python
# Source: webserver/plugins/tts/piper/api.py (NEW)
KEY = "piper"

class PiperTTSEngine(BaseTTSEngine):
    """Piper TTS 引擎实现"""

    KEY = KEY

    def __init__(self, voice: str = None, rate: float = 1.0, pitch: float = 1.0):
        self.voice = voice or "en_US-lessac-medium"
        self.rate = rate
        self.pitch = pitch

    def synthesize(self, text: str, output_path: str, **kwargs) -> bool:
        # Piper 输出 WAV，再用 ffmpeg 转 MP3
        import subprocess
        wav_path = output_path.replace('.mp3', '.wav')

        cmd = [
            'piper',
            '--model', f'{self.voice}.onnx',
            '--output', wav_path,
            '--length-scale', str(1.0 / self.rate),
            '--pitch-scale', str(self.pitch - 1.0),
        ]

        try:
            subprocess.run(cmd, input=text, text=True, check=True)
            # WAV → MP3
            subprocess.run([
                'ffmpeg', '-i', wav_path,
                '-codec:a', 'libmp3lame', '-q:a', '2',
                output_path, '-y'
            ], check=True, capture_output=True)
            os.remove(wav_path)
            return True
        except subprocess.CalledProcessError as e:
            logging.error(f"Piper synthesis failed: {e}")
            return False

    def get_voices(self) -> list[dict]:
        # 返回可用音色列表
        return [{"id": "en_US-lessac-medium", "lang": "en", "name": "English (US)"}]

    def is_available(self) -> bool:
        import shutil
        return shutil.which('piper') is not None


# 注册到全局引擎表
from webserver.services.tts_engine import TTSEngineRegistry
TTSEngineRegistry.register(PiperTTSEngine)
```

```python
# Source: webserver/plugins/tts/piper/__init__.py (NEW)
from .api import PiperTTSEngine, KEY

__all__ = ['PiperTTSEngine', 'KEY']
```

```python
# Source: webserver/plugins/tts/__init__.py (NEW)
# TTS 引擎插件统一导出
from .piper import PiperTTSEngine, KEY as PIPER_KEY
```

### Pattern 4: 文本提取 + 对话识别流程

**What:** TXT/epub → 章节解析 → 对话识别（引号/标签）

**When to use:** 从书籍提取可朗读文本时

```python
# Source: webserver/services/tts.py (NEW)
class DialogueExtractor:
    """对话提取器 - Phase 1 仅识别引号/标签对白"""

    DIALOGUE_PATTERNS = [
        # 中文引号对白
        r'"([^""]+)"',
        r'"([^""]+)"',
        # 英文引号对白
        r"'([^'']+)'",
        r'"([^""]+)"',
        # 标签内对白（<p>对话</p>等）
        r'<(?:p|span|div)[^>]*>([^<]+)</(?:p|span|div)>',
    ]

    def extract(self, text: str) -> list[dict]:
        """从文本中提取对话片段"""
        dialogues = []
        for i, pattern in enumerate(self.DIALOGUE_PATTERNS):
            for match in re.finditer(pattern, text):
                dialogues.append({
                    'id': len(dialogues),
                    'text': match.group(1).strip(),
                    'pattern_id': i,
                    'start': match.start(),
                    'end': match.end(),
                })
        # 按位置排序
        dialogues.sort(key=lambda x: x['start'])
        return dialogues
```

### Anti-Patterns to Avoid

- **不要在主线程同步执行 TTS 合成：** Piper 合成可能有延迟，必须通过 `@AsyncService.register_service` 异步执行
- **不要直接存储 WAV 文件：** WAV 体积大（1MB/分钟），必须用 ffmpeg 转 MP3
- **不要在插件内处理数据库：** 插件只负责引擎调用，数据库操作放在 service 层
- **不要假设引擎已安装：** 必须在调用前检查 `is_available()`，并向用户报告缺失依赖

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 引擎管理 | 自己实现引擎加载/切换 | 抽象基类 + 注册表模式 | 标准化的插件机制 |
| epub 解析 | 从头解析 epub 结构 | calibre convert | epub 格式复杂，已有成熟方案 |
| 异步队列 | 自己实现线程池 | `@AsyncService.register_service` | 已有基础设施 |
| 进度跟踪 | 自己写日志文件 | 复用 `progress_path` 机制 | 与现有转换进度一致 |

**Key insight:** Piper TTS 本身提供 CLI 和 Python API，直接调用即可，不需要封装复杂的调用逻辑。

---

## Runtime State Inventory

> This section is not applicable for Phase 1 — this is a greenfield implementation creating new functionality, not a rename/refactor/migration of existing named items.

---

## Common Pitfalls

### Pitfall 1: Piper 模型缺失
**What goes wrong:** 安装了 piper 但没有下载模型，导致合成失败
**Why it happens:** Piper 需要单独下载 .onnx 模型文件
**How to avoid:** 在服务启动时或首次使用时检查模型是否存在，提供友好的错误提示和下载指引
**Warning signs:** `FileNotFoundError: model.onnx not found`

### Pitfall 2: ffmpeg 未安装或不在 PATH
**What goes wrong:** WAV 转 MP3 失败，音频生成中断
**Why it happens:** 依赖外部工具 ffmpeg
**How to avoid:** 在 TTSService 初始化时检查 `shutil.which('ffmpeg')`，缺失时给出明确提示
**Warning signs:** `FileNotFoundError: ffmpeg not found`

### Pitfall 3: 中文语音支持不足
**What goes wrong:** 默认 Piper 英文模型无法正确朗读中文
**Why it happens:** Piper 内置英文模型，中文需要额外配置
**How to avoid:** Phase 1 聚焦英文内容，或选择支持中文的 Piper 模型（如 zh_CN 相关模型）
**Warning signs:** 合成的中文音频完全无法辨认

### Pitfall 4: 长时间运行任务超时
**What goes wrong:** TTS 生成章节较多时，任务在后台线程中"静默失败"
**Why it happens:** 异常被捕获但日志不明确
**How to avoid:** 使用 `self.add_msg()` 向用户报告进度/错误，复用 ConvertService 的 progress 文件机制
**Warning signs:** 用户收到"生成完成"但文件不存在

### Pitfall 5: 临时文件未清理
**What goes wrong:** epub 转换产生的临时 txt/HTML 文件堆积
**Why it happens:** convert 后的中间文件没有清理策略
**How to avoid:** 在异步任务完成后立即清理，参考 `ConvertService.convert_and_save` 的 `os.remove()` 模式
**Warning signs:** `extract_path` 目录不断增大

---

## Code Examples

### Common Operation 1: 调用 Piper TTS 合成音频
```python
# Source: Piper official docs + ffmpeg integration
import subprocess
import os

def synthesize_to_mp3(text: str, output_path: str, voice: str = "en_US-lessac-medium"):
    """Piper TTS → WAV → MP3"""
    wav_path = output_path.replace('.mp3', '.wav')

    # Step 1: Piper synthesize (WAV)
    piper_cmd = [
        'piper',
        '--model', voice,
        '--output', wav_path,
    ]
    with open(wav_path, 'wb') as f:
        subprocess.run(piper_cmd, input=text, text=True, stdout=f, check=True)

    # Step 2: WAV → MP3 (ffmpeg)
    ffmpeg_cmd = [
        'ffmpeg', '-i', wav_path,
        '-codec:a', 'libmp3lame', '-q:a', '2',
        output_path, '-y'
    ]
    subprocess.run(ffmpeg_cmd, check=True, capture_output=True)

    # Cleanup
    os.remove(wav_path)
    return output_path
```

### Common Operation 2: 复用 calibre convert 转换 epub
```python
# Source: webserver/services/convert.py
def convert_epub_to_txt(epub_path: str, log_path: str) -> str:
    """将 epub 转换为 txt，返回 txt 文件路径"""
    txt_path = epub_path.replace('.epub', '.txt')
    args = ["ebook-convert", epub_path, txt_path]

    with open(log_path, "w") as log:
        subprocess.run(args, stdout=log, stderr=subprocess.PIPE, timeout=300)

    return txt_path
```

### Common Operation 3: 使用 TxtParser 提取章节
```python
# Source: webserver/services/extract.py + webserver/plugins/parser/txt.py
from webserver.plugins.parser.txt import TxtParser

def extract_chapters(txt_path: str) -> dict:
    """提取 TXT 章节结构"""
    parser = TxtParser()
    result = parser.parse(txt_path)
    # result = {"encoding": "utf-8", "toc": [{"id": 1, "title": "第一章", "start": 0, "end": -1}]}
    return result
```

### Common Operation 4: 数据库模型扩展（待设计）
```python
# Source: webserver/models.py 参考
# Phase 1 需要创建 Audio 表，关联 book_id
# 建议字段：id, book_id, chapter_id, file_path, duration, created_at
# 使用 SQLAlchemy declarative_base() 模式
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 纯本地 TTS | Piper TTS (MIT, 无 GPU) | 2024 | 零成本离线运行 |
| 服务器端合成 | 异步后台线程 | — | 不阻塞 Web 请求 |
| 人工录音 | 自动化 TTS | — | 大幅降低成本 |

**Deprecated/outdated:**
- Coqui XTTS v1: 需要 GPU，已被 Piper 轻量方案取代
- 早期 TTS 服务: 需要云端 API 密钥

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Piper TTS 可通过 `pip install piper-tts` 安装 | Standard Stack | 安装方式可能有差异 |
| A2 | ffmpeg 可将 WAV 转 MP3 (libmp3lame) | Standard Stack | 某些环境可能缺少 MP3 编码器 |
| A3 | calibre convert 可正确处理 epub → txt | Architecture | 某些特殊格式 epub 可能转换失败 |
| A4 | AsyncService 可处理 TTS 长时间任务 | Architecture | 需要验证超时机制 |

**If this table is empty:** All claims were verified or cited — no user confirmation needed.

---

## Open Questions

1. **Piper 中文模型选择**
   - What we know: Piper 主要支持英文，部分模型支持多语言
   - What's unclear: 是否有高质量中文模型可用，还是 Phase 1 只支持英文书
   - Recommendation: Phase 1 先支持英文，中文后续 Phase 2 或单独调研

2. **音频文件存储目录结构**
   - What we know: 按 book_id/ 目录组织 (D-06)
   - What's unclear: 具体路径是 `{audio_path}/{book_id}/` 还是 `{audio_path}/{book_id}/chapters/`
   - Recommendation: 参考 `extract_path` 结构：`/data/books/audio/{book_id}/`

3. **数据库 Audio 表字段设计**
   - What we know: 需要关联 book_id，存储文件路径
   - What's unclear: 需要记录哪些元数据（时长、章节、角色？）
   - Recommendation: Phase 1 最小字段：id, book_id, chapter_id, file_path, duration, created_at

4. **Piper voice 配置持久化**
   - What we know: 可以在初始化时指定 voice/rate/pitch
   - What's unclear: 用户是否需要可配置的 voice selection UI
   - Recommendation: Phase 1 硬编码默认 voice，UI 配置留 Phase 2

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python | Piper TTS | ✓ | 3.11+ | — |
| ffmpeg | WAV→MP3 转码 | ✓ | 7.0.2 | — |
| calibre (ebook-convert) | epub→txt | ✗ | — | docker: `docker run -v $(pwd):/data linuxserver/calibre` |
| piper-tts | TTS 引擎 | ✗ | — | `pip install piper-tts piper-phonemizer` |
| espeak-ng | Piper 音素后端 | ✗ | — | `brew install espeak-ng` 或 `apt install espeak-ng` |

**Missing dependencies with no fallback:**
- calibre: 需要安装才能处理 epub 转换，建议添加安装指引到文档

**Missing dependencies with fallback:**
- piper-tts: 缺失时 TTS 功能不可用，但其他功能正常
- espeak-ng: Piper 音素后端，必须安装

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (已有) |
| Config file | `pytest.ini` 或 `pyproject.toml` |
| Quick run command | `pytest tests/test_tts.py -x -v` |
| Full suite command | `pytest tests/ -v` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TTS-01a | TTS 抽象层可切换引擎 | unit | `pytest tests/test_tts_engine.py -x` | ❌ Wave 0 |
| TTS-01b | Piper 引擎合成音频 | integration | `pytest tests/test_piper_engine.py -x` | ❌ Wave 0 |
| TTS-02a | TXT/epub 文本提取 | unit | `pytest tests/test_extract.py -x` | ❌ Wave 0 |
| TTS-02b | 对话识别（引号/标签） | unit | `pytest tests/test_dialogue.py -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pytest tests/test_tts_engine.py -x -q`
- **Per wave merge:** `pytest tests/ -v --tb=short`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/test_tts_engine.py` — TTS 抽象层测试（引擎注册、切换）
- [ ] `tests/test_piper_engine.py` — Piper 引擎集成测试（合成、MP3 输出）
- [ ] `tests/test_extract.py` — 文本提取测试（TXT/epub）
- [ ] `tests/test_dialogue.py` — 对话识别测试（引号/标签正则）
- [ ] `tests/conftest.py` — 共享 fixtures（mock TTS 引擎、测试数据）

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | 音频文件权限控制（用户只能访问自己有权限的书籍音频） |
| V5 Input Validation | yes | 文本输入验证（防命令注入 Piper CLI） |
| V6 Cryptography | no | — |

### Known Threat Patterns for TTS Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 命令注入 | Tampering | 使用 `subprocess.run` 时避免 shell=True，输入验证 |
| 路径遍历 | Tampering | 音频路径基于 book_id 生成，不允许用户控制路径 |
| 资源耗尽 | Denial | TTS 任务队列大小限制，生成超时机制 |

---

## Sources

### Primary (HIGH confidence)
- `webserver/services/async_service.py` — 异步服务模式，@register_service 装饰器
- `webserver/services/extract.py` — TXT 提取服务参考
- `webserver/plugins/parser/txt.py` — TxtParser 正则章节识别
- `webserver/services/convert.py` — calibre ebook-convert 调用方式
- `webserver/plugins/meta/tomato/api.py` — 插件模式（KEY + API class）
- `webserver/plugins/meta/__init__.py` — 插件注册导出模式
- `webserver/models.py` — SQLAlchemy 模型基类

### Secondary (MEDIUM confidence)
- Piper TTS GitHub (read-only): https://github.com/rhasspy/piper
- Piper 文档: https://rhasspy.github.io/piper-docs/ (需验证 URL)
- ffmpeg MP3 编码: https://trac.ffmpeg.org/wiki/Encode/MP3

### Tertiary (LOW confidence)
- Piper 安装方式: WebSearch "pip install piper-tts" (需验证实际可用版本)
- Piper 中文模型: WebSearch "piper tts chinese model" (待验证)

---

## Metadata

**Confidence breakdown:**
- Standard Stack: MEDIUM — Piper 依赖需安装验证，其他已确认
- Architecture: HIGH — 复用现有模式（AsyncService、插件注册）
- Pitfalls: MEDIUM — 基于常见 TTS 集成经验，需实际验证

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (30 days for stable topics)

---

## RESEARCH COMPLETE

**Phase:** 1 - TTS 基础框架
**Confidence:** MEDIUM

### Key Findings
1. **Piper TTS** 是轻量级选择（MIT、无 GPU），需通过 `pip install piper-tts` 安装，配合 ffmpeg 输出 MP3
2. **抽象层设计**：定义 `BaseTTSEngine` 基类 + `TTSEngineRegistry` 注册表，支持插件式引擎切换
3. **文本提取**：复用 `TxtParser`（TXT）和 `calibre convert`（epub → TXT），再统一处理
4. **对话识别**：Phase 1 仅用正则匹配引号/标签内容，不做角色区分
5. **异步执行**：通过 `@AsyncService.register_service` 装饰器，复用现有基础设施

### File Created
`.planning/phases/01-tts/01-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | MEDIUM | Piper 需实际安装验证，其他已确认 |
| Architecture | HIGH | 复用已验证模式（AsyncService、插件） |
| Pitfalls | MEDIUM | 基于常见 TTS 经验，需实际验证 |

### Open Questions
- Piper 中文模型可用性待验证
- 音频目录结构需确认（建议 `{audio_path}/{book_id}/`）
- Audio 数据库表结构需设计

### Ready for Planning
Research complete. Planner can now create PLAN.md files.
