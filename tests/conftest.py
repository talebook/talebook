"""Pytest 配置和共享 fixtures"""
import pytest
import os
import sys
import tempfile

# 确保 webserver 在 path 中
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


@pytest.fixture
def mock_tts_engine():
    """Mock TTS 引擎用于测试"""
    from abc import ABC, abstractmethod

    class BaseTTSEngine(ABC):
        KEY = "mock"

        @abstractmethod
        def synthesize(self, text: str, output_path: str, **kwargs):
            pass

        @abstractmethod
        def get_voices(self):
            pass

        def is_available(self):
            return True

    class MockTTSEngine(BaseTTSEngine):
        def __init__(self):
            self.synthesize_calls = []
            self.voices_return = [
                {"id": "mock-voice-1", "lang": "en", "name": "Mock Voice 1"},
                {"id": "mock-voice-2", "lang": "zh", "name": "Mock Voice 2"},
            ]

        def synthesize(self, text: str, output_path: str, **kwargs):
            self.synthesize_calls.append({
                'text': text,
                'output_path': output_path,
                'kwargs': kwargs
            })

            # 创建空文件模拟输出
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'w') as f:
                f.write(f"MOCK_AUDIO:{text[:50]}")

            return True

        def get_voices(self):
            return self.voices_return

        def is_available(self):
            return True

    return MockTTSEngine()


@pytest.fixture
def temp_audio_dir():
    """临时音频目录"""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def sample_text():
    """测试用文本"""
    return """This is a sample text for testing.

He said: "Hello, World!"
She replied: 'Goodbye, Cruel World!'

「你好，世界！」

"First quote" and "Second quote" are both valid.
"""


@pytest.fixture
def sample_book_path(temp_audio_dir):
    """创建测试用书籍文件"""
    book_dir = os.path.join(temp_audio_dir, 'books', '1')
    os.makedirs(book_dir, exist_ok=True)

    txt_path = os.path.join(book_dir, 'test.txt')
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write("""第一章：开始

这是第一章的内容。

他说：「你好，世界！」
她说："再见，朋友们！"

"第一句对白" 和 "第二句对白"。

第二章：结束

这是第二章的内容。
""")
    return txt_path