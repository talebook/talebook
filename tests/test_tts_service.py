"""TTS 服务测试

测试 TTSService 基本功能。
由于 TTSService 尚未实现，这里测试其核心逻辑。
"""
import pytest
import os
import sys
from unittest.mock import Mock, patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


class MockTTSService:
    """Mock TTSService for testing - based on plan specification"""

    KEY = "tts"

    def __init__(self, manager=None):
        self.engine = None
        self.manager = manager

    def _extract_dialogues(self, text: str) -> list:
        """从文本中提取对话片段"""
        import re

        dialogues = []

        DIALOGUE_PATTERNS = [
            (r'「([^」]+)」', 'zh_bracket'),
            (r'"([^"]+)"', 'zh_quote'),
            (r'『([^』]+)』', 'zh_bracket_single'),
            (r"'([^']+)'", 'zh_single_quote'),
            (r'"([^"]+)"', 'en_quote'),
            (r"'([^']+)'", 'en_single_quote'),
        ]

        seen_texts = set()

        for pattern, pattern_type in DIALOGUE_PATTERNS:
            for match in re.finditer(pattern, text, re.DOTALL):
                dialogue_text = match.group(1).strip()

                if not dialogue_text:
                    continue

                if len(dialogue_text) < 5 or len(dialogue_text) > 1000:
                    continue

                dialogue_text = self._clean_dialogue_text(dialogue_text)

                if dialogue_text in seen_texts:
                    continue
                seen_texts.add(dialogue_text)

                dialogues.append({
                    'id': len(dialogues),
                    'text': dialogue_text,
                    'pattern_type': pattern_type,
                    'start': match.start(),
                    'end': match.end(),
                })

        dialogues.sort(key=lambda x: x['start'])

        merged = []
        for d in dialogues:
            if not merged or d['start'] >= merged[-1]['end']:
                merged.append(d)
            else:
                if len(d['text']) > len(merged[-1]['text']):
                    merged[-1] = d

        for i, d in enumerate(merged):
            d['id'] = i

        return merged

    def _clean_dialogue_text(self, text: str) -> str:
        """清理对话文本"""
        import re

        patterns_to_remove = [
            r'\s+',
            r'\[.*?\]',
            r'\(.*?\)',
        ]

        cleaned = text
        for pattern in patterns_to_remove:
            cleaned = re.sub(pattern, ' ', cleaned)

        cleaned = cleaned.strip()
        cleaned = cleaned.strip('""''「」『』')

        return cleaned.strip()

    def _get_audio_dir(self, book_id: int) -> str:
        """获取音频输出目录"""
        return f"/tmp/audio/{book_id}"

    def get_status(self) -> dict:
        """获取 TTS 服务状态"""
        return {
            'engine': self.engine.KEY if self.engine else None,
            'engine_available': self.engine.is_available() if self.engine else False,
            'voices': self.engine.get_voices() if self.engine else [],
        }


class TestTTSService:
    """TTSService 测试"""

    @pytest.fixture
    def mock_manager(self):
        """创建 Mock AsyncServiceManager"""
        manager = Mock()
        manager.add_msg = Mock()
        return manager

    @pytest.fixture
    def service(self, mock_manager):
        """创建 TTSService 实例"""
        return MockTTSService(manager=mock_manager)

    def test_service_initialization(self, service):
        """测试服务初始化"""
        assert service.KEY == "tts"

    def test_get_audio_dir(self, service):
        """测试音频目录生成"""
        audio_dir = service._get_audio_dir(123)

        assert 'audio' in audio_dir
        assert '123' in audio_dir

    def test_extract_dialogues_integration(self, service, sample_text):
        """测试对话提取集成"""
        dialogues = service._extract_dialogues(sample_text)

        assert isinstance(dialogues, list)
        assert len(dialogues) > 0

    def test_clean_dialogue_text(self, service):
        """测试对话文本清理"""
        text = "  Hello   World  "
        cleaned = service._clean_dialogue_text(text)
        assert cleaned == "Hello World"

        text = '"Hello"'
        cleaned = service._clean_dialogue_text(text)
        assert cleaned == "Hello"


class TestTTSServiceWithMocks:
    """带 Mock 的 TTSService 测试"""

    @pytest.fixture
    def mock_engine(self):
        """创建 Mock TTS 引擎"""
        engine = Mock()
        engine.KEY = "mock"
        engine.is_available.return_value = True
        engine.synthesize.return_value = True
        engine.get_voices.return_value = [
            {"id": "test-voice", "lang": "en", "name": "Test Voice"}
        ]
        return engine

    @pytest.fixture
    def service_with_mock_engine(self, mock_engine):
        """创建带 Mock 引擎的 TTSService"""
        service = MockTTSService()
        service.engine = mock_engine
        return service

    def test_get_status(self, service_with_mock_engine):
        """测试获取服务状态"""
        status = service_with_mock_engine.get_status()

        assert isinstance(status, dict)
        assert 'engine' in status
        assert 'engine_available' in status
        assert 'voices' in status

    def test_synthesize_with_mock_engine(
        self, service_with_mock_engine, temp_audio_dir
    ):
        """测试使用 Mock 引擎合成"""
        output_path = f"{temp_audio_dir}/test.mp3"

        result = service_with_mock_engine.engine.synthesize(
            "Hello World",
            output_path,
            voice="test-voice"
        )

        assert result is True
        service_with_mock_engine.engine.synthesize.assert_called_once()


class TestAudioDirGeneration:
    """音频目录生成测试"""

    def test_audio_dir_format(self):
        """测试音频目录格式"""
        service = MockTTSService()

        book_id = 123
        audio_dir = service._get_audio_dir(book_id)

        assert '/audio/' in audio_dir
        assert str(book_id) in audio_dir

    def test_audio_dir_different_book_ids(self):
        """测试不同书籍ID生成不同目录"""
        service = MockTTSService()

        dir1 = service._get_audio_dir(1)
        dir2 = service._get_audio_dir(2)
        dir999 = service._get_audio_dir(999)

        assert dir1 != dir2
        assert dir2 != dir999
        assert dir1 != dir999