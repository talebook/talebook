#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""Audio 模型定义

存储 TTS 生成的音频文件信息
"""

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Float

from . import Base


class Audio(Base):
    """音频记录表

    存储 TTS 生成的音频文件信息
    """
    __tablename__ = 'audio'

    id = Column(Integer, primary_key=True)
    book_id = Column(Integer, ForeignKey('books.id'), nullable=False, index=True)

    # 章节信息（可选）
    chapter_id = Column(Integer, nullable=True)

    # 文件信息
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer, nullable=True)  # bytes

    # 音频信息
    duration = Column(Float, nullable=True)  # 秒
    text_length = Column(Integer, nullable=True)  # 原始文本长度

    # 对话信息
    pattern_type = Column(String(32), nullable=True)  # 匹配的模式类型

    # 时间戳
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f'<Audio {self.id}: book_id={self.book_id}>'

    def to_dict(self):
        return {
            'id': self.id,
            'book_id': self.book_id,
            'chapter_id': self.chapter_id,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'duration': self.duration,
            'text_length': self.text_length,
            'pattern_type': self.pattern_type,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }