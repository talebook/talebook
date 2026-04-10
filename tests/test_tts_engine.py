"""TTS 引擎抽象层测试

测试 BaseTTSEngine 抽象基类和 TTSEngineRegistry 注册表功能。
"""
import pytest
import os
import sys

# 确保 webserver 在 path 中
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from abc import ABC, abstractmethod


class BaseTTSEngine(ABC):
    """TTS 引擎抽象接口 - 测试用副本"""

    KEY: str = None

    @abstractmethod
    def synthesize(self, text: str, output_path: str, **kwargs) -> bool:
        pass

    @abstractmethod
    def get_voices(self) -> list:
        pass

    def is_available(self) -> bool:
        return True

    def validate_text(self, text: str) -> bool:
        if not text or not text.strip():
            return False
        if len(text) > 50000:
            return False
        return True


class TTSEngineRegistry:
    """引擎注册表，单例模式 - 测试用副本"""

    _engines = {}

    @classmethod
    def register(cls, engine_class):
        if hasattr(engine_class, 'KEY') and engine_class.KEY:
            cls._engines[engine_class.KEY] = engine_class
        return engine_class

    @classmethod
    def get(cls, key: str):
        engine_class = cls._engines.get(key)
        if engine_class:
            return engine_class()
        return None

    @classmethod
    def get_default(cls):
        for key in ['piper', 'coqui', 'azure']:
            if key in cls._engines:
                return cls._engines[key]()
        return None

    @classmethod
    def list_engines(cls) -> list:
        return list(cls._engines.keys())


class TestBaseTTSEngine:
    """BaseTTSEngine 抽象基类测试"""

    def test_base_is_abstract(self):
        """验证 BaseTTSEngine 是抽象类"""
        with pytest.raises(TypeError):
            BaseTTSEngine()


class MockEngine(BaseTTSEngine):
    """测试用 Mock 引擎"""
    KEY = "test_mock"

    def synthesize(self, text, output_path, **kwargs):
        return True

    def get_voices(self):
        return [{"id": "test", "lang": "en", "name": "Test"}]


class TestTTSEngineRegistry:
    """TTS 引擎注册表测试"""

    def setup_method(self):
        """每个测试前清空注册表"""
        TTSEngineRegistry._engines = {}

    def test_register_engine(self):
        """测试引擎注册"""
        engine = MockEngine()
        TTSEngineRegistry.register(engine)

        assert "test_mock" in TTSEngineRegistry.list_engines()

    def test_get_registered_engine(self):
        """测试获取已注册引擎"""
        engine = MockEngine()
        TTSEngineRegistry.register(engine)

        retrieved = TTSEngineRegistry.get("test_mock")
        assert retrieved is not None
        assert retrieved.KEY == "test_mock"

    def test_get_unregistered_engine(self):
        """测试获取未注册引擎返回 None"""
        retrieved = TTSEngineRegistry.get("nonexistent")
        assert retrieved is None

    def test_get_default_no_engines(self):
        """测试无引擎时 get_default 返回 None"""
        default = TTSEngineRegistry.get_default()
        assert default is None

    def test_get_default_with_engines(self):
        """测试有引擎时 get_default 返回第一个可用引擎"""
        engine1 = MockEngine()
        engine1.KEY = "first"
        engine2 = MockEngine()
        engine2.KEY = "second"

        TTSEngineRegistry.register(engine1)
        TTSEngineRegistry.register(engine2)

        default = TTSEngineRegistry.get_default()
        assert default is not None

    def test_list_engines_empty(self):
        """测试空注册表"""
        engines = TTSEngineRegistry.list_engines()
        assert engines == []

    def test_list_engines_multiple(self):
        """测试多引擎注册"""
        for key in ["engine1", "engine2", "engine3"]:
            e = MockEngine()
            e.KEY = key
            TTSEngineRegistry.register(e)

        engines = TTSEngineRegistry.list_engines()
        assert len(engines) == 3
        assert "engine1" in engines
        assert "engine2" in engines
        assert "engine3" in engines


class TestMockEngine:
    """Mock 引擎功能测试"""

    def test_synthesize_creates_file(self, mock_tts_engine, temp_audio_dir):
        """测试 synthesize 创建输出文件"""
        output_path = os.path.join(temp_audio_dir, "output.mp3")

        result = mock_tts_engine.synthesize("Hello World", output_path)

        assert result is True
        assert os.path.exists(output_path)

    def test_get_voices_returns_list(self, mock_tts_engine):
        """测试 get_voices 返回音色列表"""
        voices = mock_tts_engine.get_voices()

        assert isinstance(voices, list)
        assert len(voices) > 0
        assert "id" in voices[0]
        assert "lang" in voices[0]
        assert "name" in voices[0]

    def test_is_available(self, mock_tts_engine):
        """测试引擎可用性检查"""
        assert mock_tts_engine.is_available() is True


class TestValidateText:
    """文本验证测试"""

    def test_validate_empty_text(self):
        """测试空文本验证失败"""
        engine = MockEngine()
        assert engine.validate_text("") is False
        assert engine.validate_text("   ") is False

    def test_validate_long_text(self):
        """测试超长文本验证失败"""
        engine = MockEngine()
        long_text = "a" * 50001
        assert engine.validate_text(long_text) is False

    def test_validate_valid_text(self):
        """测试有效文本验证通过"""
        engine = MockEngine()
        assert engine.validate_text("Hello, World!") is True
        assert engine.validate_text("中文文本") is True