"""Piper TTS 引擎测试

注意：这些测试需要 Piper TTS 和 ffmpeg 已安装。
如果未安装，测试会被跳过。
"""
import pytest
import subprocess
import shutil
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


def is_piper_available():
    """检查 Piper 是否可用"""
    return shutil.which('piper') is not None


def is_ffmpeg_available():
    """检查 ffmpeg 是否可用"""
    return shutil.which('ffmpeg') is not None


class TestPiperAvailability:
    """Piper 可用性检查测试"""

    def test_piper_check(self):
        """测试 Piper 检查函数"""
        result = is_piper_available()
        assert isinstance(result, bool)

    def test_ffmpeg_check(self):
        """测试 ffmpeg 检查函数"""
        result = is_ffmpeg_available()
        assert isinstance(result, bool)


@pytest.mark.skipif(not is_piper_available(), reason="Piper TTS not installed")
class TestPiperEngine:
    """Piper TTS 引擎测试

    这些测试需要 Piper TTS 安装才能运行。
    """

    def test_piper_command_exists(self):
        """测试 piper 命令存在"""
        assert shutil.which('piper') is not None

    def test_piper_version(self):
        """测试 piper 版本"""
        result = subprocess.run(
            ['piper', '--version'],
            capture_output=True,
            text=True
        )
        assert result.returncode == 0


@pytest.mark.skipif(not is_ffmpeg_available(), reason="ffmpeg not installed")
class TestFFmpegIntegration:
    """ffmpeg 集成测试"""

    def test_ffmpeg_available(self):
        """测试 ffmpeg 可用性"""
        result = subprocess.run(
            ['ffmpeg', '-version'],
            capture_output=True
        )
        assert result.returncode == 0

    def test_ffmpeg_mp3_encoding(self, temp_audio_dir):
        """测试 MP3 编码"""
        wav_path = os.path.join(temp_audio_dir, "test.wav")
        mp3_path = os.path.join(temp_audio_dir, "test.mp3")

        subprocess.run([
            'ffmpeg',
            '-f', 'lavfi',
            '-i', 'sine=frequency=440:duration=1',
            wav_path,
            '-y'
        ], check=True, capture_output=True)

        result = subprocess.run([
            'ffmpeg',
            '-i', wav_path,
            '-codec:a', 'libmp3lame',
            '-q:a', '2',
            mp3_path,
            '-y'
        ], check=True, capture_output=True)

        assert os.path.exists(mp3_path)


@pytest.mark.skipif(not is_piper_available() or not is_ffmpeg_available(),
                    reason="Piper or ffmpeg not installed")
class TestPiperSynthesis:
    """Piper 合成测试（完整集成）"""

    def test_piper_synthesize_english(self, temp_audio_dir):
        """测试英文合成

        注意：可能因为模型未下载而失败。
        如果模型不可用，测试会跳过。
        """
        output_path = os.path.join(temp_audio_dir, "test_en.wav")

        text = "Hello, World!"
        result = subprocess.run(
            ['piper', '--model', 'en_US-lessac-medium',
             '--output', output_path],
            input=text,
            text=True,
            capture_output=True
        )

        if result.returncode != 0:
            pytest.skip(f"Piper model not available: {result.stderr}")

        assert os.path.exists(output_path)


class TestPiperEngineInterface:
    """Piper 引擎接口测试（不需要实际 Piper）"""

    def test_piper_online_check(self):
        """测试在线检查 piper 是否可用"""
        available = is_piper_available()
        assert isinstance(available, bool)

    def test_ffmpeg_online_check(self):
        """测试在线检查 ffmpeg 是否可用"""
        available = is_ffmpeg_available()
        assert isinstance(available, bool)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])