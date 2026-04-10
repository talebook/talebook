#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""
Piper TTS 引擎插件
基于 Piper TTS (MIT 许可证) 的实现
"""

import subprocess
import os
import logging
from pathlib import Path
from webserver.services.tts_engine import BaseTTSEngine, TTSEngineRegistry

KEY = "piper"


class PiperTTSEngine(BaseTTSEngine):
    """Piper TTS 引擎实现

    Piper TTS 特性：
    - MIT 许可证，跨平台，无需 GPU
    - 输出 WAV 格式，需配合 ffmpeg 转 MP3
    - 支持英文和多语言（通过 espeak-ng）
    """

    KEY = KEY

    # 默认配置
    DEFAULT_VOICE = "en_US-lessac-medium"
    DEFAULT_RATE = 1.0
    DEFAULT_PITCH = 1.0

    # 超时配置（秒）
    DEFAULT_TIMEOUT = 300  # Piper 合成超时
    DEFAULT_FFMPEG_TIMEOUT = 60  # ffmpeg 转换超时

    def __init__(
        self,
        voice: str = None,
        rate: float = None,
        pitch: float = None,
        model_dir: str = None
    ):
        self.voice = voice or self.DEFAULT_VOICE
        self.rate = rate or self.DEFAULT_RATE
        self.pitch = pitch or self.DEFAULT_PITCH
        self.model_dir = model_dir or self._get_default_model_dir()

    def _get_default_model_dir(self) -> str:
        """获取默认模型目录"""
        # 优先使用用户配置的路径，否则用 ~/.piper
        try:
            from webserver import CONFIG
            if CONFIG and hasattr(CONFIG, 'tts_piper_model_dir'):
                return CONFIG.tts_piper_model_dir
        except ImportError:
            pass
        return os.path.expanduser("~/.piper")

    def synthesize(self, text: str, output_path: str, **kwargs) -> bool:
        """使用 Piper 合成音频

        Args:
            text: 要合成的文本
            output_path: 输出 MP3 文件路径
            **kwargs: voice, rate, pitch 可覆盖初始化值

        Returns:
            bool: 合成是否成功
        """
        voice = kwargs.get('voice', self.voice)
        rate = kwargs.get('rate', self.rate)
        pitch = kwargs.get('pitch', self.pitch)

        if not self.validate_text(text):
            logging.error(f"Invalid text for synthesis: empty or too long")
            return False

        # 确保输出目录存在
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # 临时 WAV 文件路径
        wav_path = output_path.replace('.mp3', '.wav')

        try:
            # Step 1: Piper 合成 WAV
            piper_cmd = self._build_piper_command(text, wav_path, voice, rate, pitch)
            result = subprocess.run(
                piper_cmd,
                capture_output=True,
                text=True,
                timeout=self.DEFAULT_TIMEOUT
            )

            if result.returncode != 0:
                logging.error(f"Piper synthesis failed: {result.stderr}")
                return False

            # Step 2: WAV → MP3 (ffmpeg)
            if not self._convert_to_mp3(wav_path, output_path):
                return False

            # 清理临时文件
            if os.path.exists(wav_path):
                os.remove(wav_path)

            logging.info(f"Piper synthesis complete: {output_path}")
            return True

        except subprocess.TimeoutExpired:
            logging.error(f"Piper synthesis timed out for text length {len(text)}")
            if os.path.exists(wav_path):
                os.remove(wav_path)
            return False
        except Exception as e:
            logging.error(f"Piper synthesis error: {e}")
            if os.path.exists(wav_path):
                os.remove(wav_path)
            return False

    def _build_piper_command(
        self,
        text: str,
        output_path: str,
        voice: str,
        rate: float,
        pitch: float
    ) -> list:
        """构建 Piper CLI 命令"""
        model_path = os.path.join(self.model_dir, f"{voice}.onnx")

        cmd = ['piper']

        # 音色模型
        if os.path.exists(model_path):
            cmd.extend(['--model', model_path])
        else:
            # 如果本地模型不存在，尝试直接使用音色名
            cmd.extend(['--model', voice])

        # 输出路径
        cmd.extend(['--output', output_path])

        # 语速 (length_scale = 1.0 / rate)
        if rate != 1.0:
            cmd.extend(['--length-scale', str(1.0 / rate)])

        # 音调 (pitch_scale, piper 使用半音偏移)
        if pitch != 1.0:
            # 转换为半音: (pitch - 1.0) * 12
            pitch_scale = (pitch - 1.0) * 12
            cmd.extend(['--pitch-scale', str(pitch_scale)])

        return cmd

    def _convert_to_mp3(self, wav_path: str, mp3_path: str) -> bool:
        """使用 ffmpeg 将 WAV 转换为 MP3"""
        try:
            # 检查 ffmpeg 是否可用
            import shutil
            if not shutil.which('ffmpeg'):
                logging.error("ffmpeg not found in PATH")
                return False

            # MP3 编码: libmp3lame, quality 2 (约 190kbps)
            ffmpeg_cmd = [
                'ffmpeg',
                '-i', wav_path,
                '-codec:a', 'libmp3lame',
                '-q:a', '2',
                mp3_path,
                '-y'  # 覆盖已存在的文件
            ]

            result = subprocess.run(
                ffmpeg_cmd,
                capture_output=True,
                text=True,
                timeout=self.DEFAULT_FFMPEG_TIMEOUT
            )

            if result.returncode != 0:
                logging.error(f"ffmpeg conversion failed: {result.stderr}")
                return False

            return True

        except Exception as e:
            logging.error(f"MP3 conversion error: {e}")
            return False

    def get_voices(self) -> list[dict]:
        """获取可用音色列表

        Phase 1 硬编码默认音色，实际音色列表应从 ~/.piper 目录扫描
        """
        voices = []

        # 扫描本地模型目录
        if os.path.exists(self.model_dir):
            for model_file in os.listdir(self.model_dir):
                if model_file.endswith('.onnx'):
                    voice_id = model_file.replace('.onnx', '')
                    voices.append({
                        'id': voice_id,
                        'lang': self._detect_lang(voice_id),
                        'name': voice_id,
                        'path': os.path.join(self.model_dir, model_file)
                    })

        # 如果没有找到本地模型，返回默认音色
        if not voices:
            voices.append({
                'id': self.DEFAULT_VOICE,
                'lang': 'en',
                'name': 'English (US) - Medium',
                'path': None
            })

        return voices

    def _detect_lang(self, voice_id: str) -> str:
        """从音色 ID 检测语言"""
        lang_map = {
            'en': 'en',
            'zh': 'zh',
            'de': 'de',
            'fr': 'fr',
            'es': 'es',
        }
        for lang, code in lang_map.items():
            if voice_id.startswith(f"{lang}_"):
                return code
        return 'en'  # 默认为英文

    def is_available(self) -> bool:
        """检查 Piper 和 ffmpeg 是否可用"""
        import shutil

        piper_ok = shutil.which('piper') is not None
        ffmpeg_ok = shutil.which('ffmpeg') is not None

        if not piper_ok:
            logging.warning("Piper TTS not found in PATH")

        if not ffmpeg_ok:
            logging.warning("ffmpeg not found in PATH (required for MP3 conversion)")

        return piper_ok and ffmpeg_ok

    def get_config(self) -> dict:
        """获取当前引擎配置"""
        return {
            'voice': self.voice,
            'rate': self.rate,
            'pitch': self.pitch,
            'model_dir': self.model_dir,
            'available': self.is_available()
        }


# 注册到引擎注册表
TTSEngineRegistry.register(PiperTTSEngine)