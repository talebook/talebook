#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""
TTS 服务主类
负责文本提取、对话识别、音频生成
"""

import os
import logging
from typing import Optional, List
from .async_service import AsyncService, AsyncServiceManager


class TTSService(AsyncService):
    """TTS 服务主类

    负责：
    1. 文本提取（txt/epub）
    2. 对话识别（引号/标签）
    3. 音频生成（调用引擎）
    4. 数据库记录
    """

    KEY = "tts"

    def __init__(self, manager: AsyncServiceManager = None):
        super().__init__(manager)
        self.engine = None  # 延迟加载
        self._load_engine()

    def _load_engine(self):
        """加载默认 TTS 引擎"""
        from .tts_engine import TTSEngineRegistry

        self.engine = TTSEngineRegistry.get_default()
        if not self.engine:
            logging.warning("No TTS engine available")
        elif not self.engine.is_available():
            logging.warning(f"TTS engine {self.engine.KEY} is not available")

    @AsyncService.register_service
    def generate_audio(
        self,
        book_id: int,
        chapter_id: int = None,
        voice: str = None,
        rate: float = 1.0,
        pitch: float = 1.0,
        **kwargs
    ):
        """生成书籍音频（异步）

        Args:
            book_id: 书籍 ID
            chapter_id: 章节 ID（None 表示整书）
            voice: 音色 ID
            rate: 语速 (0.5 - 2.0)
            pitch: 音调 (0.5 - 2.0)

        Returns:
            bool: 生成是否成功
        """
        try:
            self.add_msg(None, "start", f"开始生成音频: book_id={book_id}")

            # 1. 提取文本
            text = self._extract_text(book_id, chapter_id)
            if not text:
                self.add_msg(None, "error", "文本提取失败")
                return False

            self.add_msg(None, "progress", f"文本提取完成: {len(text)} 字符")

            # 2. 对话识别
            dialogues = self._extract_dialogues(text)
            self.add_msg(None, "progress", f"识别到 {len(dialogues)} 个对话片段")

            if not dialogues:
                self.add_msg(None, "progress", "未识别到对话，使用整段文本")
                dialogues = [{'id': 0, 'text': text}]

            # 3. 获取输出目录
            output_dir = self._get_audio_dir(book_id)
            os.makedirs(output_dir, exist_ok=True)

            # 4. TTS 合成
            success_count = 0
            for dialogue in dialogues:
                audio_path = os.path.join(
                    output_dir,
                    f"dialogue_{dialogue['id']:04d}.mp3"
                )

                result = self.engine.synthesize(
                    dialogue['text'],
                    audio_path,
                    voice=voice,
                    rate=rate,
                    pitch=pitch,
                    **kwargs
                )

                if result:
                    success_count += 1
                    self.add_msg(None, "progress", f"完成: {audio_path}")
                else:
                    self.add_msg(None, "error", f"失败: {dialogue['text'][:50]}...")

            # 5. 更新数据库
            if success_count > 0:
                self._save_audio_records(book_id, dialogues, output_dir)
                self.add_msg(None, "complete", f"音频生成完成: {success_count}/{len(dialogues)}")
                return True

            return False

        except Exception as e:
            logging.error(f"TTS generation error: {e}", exc_info=True)
            self.add_msg(None, "error", f"错误: {str(e)}")
            return False

    def _extract_text_from_txt(self, book_path: str) -> str:
    """从 TXT 文件提取文本内容

    复用 TxtParser 进行编码检测和章节位置解析
    """
    import re
    from webserver.plugins.parser.txt import TxtParser

    try:
        parser = TxtParser()
        result = parser.parse(book_path)

        if not result:
            return None

        encoding = result.get('encoding', 'utf-8')
        toc = result.get('toc', [])

        # 读取文件内容
        with open(book_path, 'r', encoding=encoding, errors='ignore', newline='\n') as f:
            content = f.read()

        # 如果有章节信息，按章节位置提取内容
        if toc and len(toc) > 1:
            texts = []
            for chapter in toc:
                start = chapter.get('start', 0)
                end = chapter.get('end', -1)
                if end == -1:
                    # 最后一章，读取到文件末尾
                    chapter_content = content[start:]
                else:
                    chapter_content = content[start:end]
                if chapter_content.strip():
                    texts.append(chapter_content.strip())

            if texts:
                content = '\n\n'.join(texts)

        return content if content.strip() else None

    except Exception as e:
        logging.error(f"TXT extraction error: {e}", exc_info=True)
        return None

    def _extract_text(self, book_id: int, chapter_id: int = None) -> str:
        """提取书籍文本内容

        Args:
            book_id: 书籍 ID
            chapter_id: 章节 ID（None 表示整书）

        Returns:
            str: 提取的文本内容
        """
        from .convert import ConvertService

        # 获取书籍信息
        book = self._get_book(book_id)
        if not book:
            return None

        book_path = book.get('path')
        if not book_path:
            return None

        ext = os.path.splitext(book_path)[1].lower()

        if ext == '.txt':
            # TXT 文件通过 TxtParser 提取
            content = self._extract_text_from_txt(book_path)
            return content

        elif ext == '.epub':
            # epub 需要先转换
            content = self._extract_text_from_epub(book_path)
            return content

        return None

    def _extract_text_from_epub(self, book_path: str) -> str:
        """从 epub 文件提取文本内容

        通过 calibre convert 将 epub 转为 txt，再提取内容
        """
        import subprocess
        import tempfile

        try:
            # 创建临时文件用于存储转换后的 txt
            with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as tmp:
                txt_path = tmp.name

            # 创建临时日志文件
            log_path = txt_path + '.log'

            # 调用 ebook-convert
            args = ["ebook-convert", book_path, txt_path]
            logging.info("Converting epub: %s", " ".join("'%s'" % v for v in args))

            result = subprocess.run(
                args,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=300
            )

            if result.returncode != 0:
                logging.error("ebook-convert failed: %s", result.stderr.decode('utf-8', errors='ignore'))
                # 清理临时文件
                if os.path.exists(txt_path):
                    os.remove(txt_path)
                if os.path.exists(log_path):
                    os.remove(log_path)
                return None

            if not os.path.exists(txt_path):
                logging.error("Conversion produced no output file")
                return None

            # 读取转换后的 txt 内容
            content = None
            for encoding in ['utf-8', 'gbk', 'gb2312', 'latin-1']:
                try:
                    with open(txt_path, 'r', encoding=encoding) as f:
                        content = f.read()
                    break
                except UnicodeDecodeError:
                    continue

            # 清理临时文件
            try:
                os.remove(txt_path)
            except Exception:
                pass
            try:
                os.remove(log_path)
            except Exception:
                pass

            if content:
                return content.strip() if content.strip() else None
            return None

        except subprocess.TimeoutExpired:
            logging.error("ebook-convert timeout for: %s", book_path)
            return None
        except Exception as e:
            logging.error(f"epub extraction error: {e}", exc_info=True)
            return None

    def _extract_dialogues(self, text: str) -> list:
        """从文本中提取对话片段

        Phase 1 仅使用正则匹配引号/标签，不区分说话人
        """
        import re

        dialogues = []

        # 对话正则模式
        DIALOGUE_PATTERNS = [
            # 中文双引号
            (r'"([^""]+)"', 'zh_quote'),
            # 中文单引号
            (r"'([^'']+)'", 'zh_single_quote'),
            # 英文双引号
            (r'"([^""]+)"', 'en_quote'),
            # 英文单引号
            (r"'([^'']+)'", 'en_single_quote'),
            # HTML/XML 标签内的对话
            (r'<(?:p|span|div)[^>]*>([^<]+)</(?:p|span|div)>', 'tag'),
        ]

        for pattern, pattern_type in DIALOGUE_PATTERNS:
            for match in re.finditer(pattern, text, re.DOTALL):
                dialogue_text = match.group(1).strip()
                # 过滤太短或太长的文本
                if 5 <= len(dialogue_text) <= 1000:
                    dialogues.append({
                        'id': len(dialogues),
                        'text': dialogue_text,
                        'pattern_type': pattern_type,
                        'start': match.start(),
                        'end': match.end(),
                    })

        # 按位置排序并去重
        dialogues.sort(key=lambda x: x['start'])

        # 合并重叠的对话（同一位置可能被多个模式匹配）
        merged = []
        for d in dialogues:
            if not merged or d['start'] >= merged[-1]['end']:
                merged.append(d)

        # 重新编号
        for i, d in enumerate(merged):
            d['id'] = i

        return merged

    def _get_audio_dir(self, book_id: int) -> str:
        """获取音频输出目录

        目录结构: {data_path}/audio/{book_id}/
        """
        try:
            from webserver import CONFIG
            data_path = getattr(CONFIG, 'data_path', '/data')
        except ImportError:
            data_path = '/data'

        audio_dir = os.path.join(data_path, 'audio', str(book_id))

        return audio_dir

    def _get_book(self, book_id: int) -> dict:
        """获取书籍信息"""
        try:
            from webserver.models import Book

            book = Book.query.get(book_id)
            if book:
                return {
                    'id': book.id,
                    'path': book.path,
                    'title': book.title,
                }
        except Exception as e:
            logging.error(f"Failed to get book {book_id}: {e}")

        return None

    def _save_audio_records(
        self,
        book_id: int,
        dialogues: list,
        audio_dir: str
    ):
        """保存音频记录到数据库"""
        try:
            from webserver.models import db
            # Audio model will be created in a future phase
            # For now, log the records
            for dialogue in dialogues:
                audio_path = os.path.join(
                    audio_dir,
                    f"dialogue_{dialogue['id']:04d}.mp3"
                )

                if not os.path.exists(audio_path):
                    continue

                # 计算音频时长（秒）
                duration = self._get_audio_duration(audio_path)

                logging.info(
                    f"Audio record: book_id={book_id}, dialogue_id={dialogue['id']}, "
                    f"path={audio_path}, duration={duration}s, text_len={len(dialogue['text'])}"
                )

            logging.info(f"Saved {len(dialogues)} audio records for book {book_id}")

        except Exception as e:
            logging.error(f"Failed to save audio records: {e}")

    def _get_audio_duration(self, audio_path: str) -> float:
        """获取音频时长（秒）"""
        try:
            import subprocess

            result = subprocess.run(
                [
                    'ffprobe',
                    '-v', 'error',
                    '-show_entries', 'format=duration',
                    '-of', 'default=noprint_wrappers=1:nokey=1',
                    audio_path
                ],
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                return float(result.stdout.strip())

        except Exception as e:
            logging.warning(f"Failed to get audio duration: {e}")

        return 0.0

    def get_status(self, book_id: int = None) -> dict:
        """获取 TTS 服务状态"""
        return {
            'engine': self.engine.KEY if self.engine else None,
            'engine_available': self.engine.is_available() if self.engine else False,
            'voices': self.engine.get_voices() if self.engine else [],
            'config': self.engine.get_config() if self.engine else {},
        }