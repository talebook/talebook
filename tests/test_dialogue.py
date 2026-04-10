"""对话识别测试

测试各种引号类型的对话提取功能。
由于 TTSService 尚未实现，这里直接测试对话提取逻辑。
"""
import pytest
import re
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


class DialogueExtractor:
    """对话提取器 - Phase 1 仅识别引号/标签对白"""

    DIALOGUE_PATTERNS = [
        # 中文双引号「」
        (r'「([^」]+)」', 'zh_bracket'),
        # 中文双引号""
        (r'"([^"]+)"', 'zh_quote'),
        # 中文单引号『』
        (r'『([^』]+)』', 'zh_bracket_single'),
        # 中文单引号''
        (r"'([^']+)'", 'zh_single_quote'),
        # 英文双引号 ""
        (r'"([^"]+)"', 'en_quote'),
        # 英文单引号 ''
        (r"'([^']+)'", 'en_single_quote'),
    ]

    def extract_dialogues(self, text: str) -> list:
        """从文本中提取对话片段"""
        dialogues = []
        seen_texts = set()

        for pattern, pattern_type in self.DIALOGUE_PATTERNS:
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
        """清理对话文本中的格式标记"""
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


class TestDialogueExtractor:
    """对话提取器测试"""

    @pytest.fixture
    def extractor(self):
        """创建对话提取器实例"""
        return DialogueExtractor()

    def test_extract_chinese_bracket(self, extractor):
        """测试中文双引号「」提取"""
        text = '他说：「你好，世界！」'
        dialogues = extractor.extract_dialogues(text)

        assert len(dialogues) >= 1
        texts = [d['text'] for d in dialogues]
        assert any("你好" in t and "世界" in t for t in texts)

    def test_extract_english_double_quotes(self, extractor):
        """测试英文双引号提取"""
        text = 'He said: "Hello, World!"'
        dialogues = extractor.extract_dialogues(text)

        assert len(dialogues) >= 1
        texts = [d['text'] for d in dialogues]
        assert "Hello, World!" in texts

    def test_extract_english_single_quotes(self, extractor):
        """测试英文单引号提取"""
        text = "She said: 'Goodbye, Friend!'"
        dialogues = extractor.extract_dialogues(text)

        texts = [d['text'] for d in dialogues]
        assert "Goodbye, Friend!" in texts

    def test_extract_chinese_single_bracket(self, extractor):
        """测试中文单引号『』提取"""
        text = "『你好』"
        dialogues = extractor.extract_dialogues(text)

        assert len(dialogues) >= 1

    def test_extract_multiple_dialogues(self, extractor):
        """测试多对话提取"""
        text = '"First" and "Second" and "Third"'
        dialogues = extractor.extract_dialogues(text)

        assert len(dialogues) >= 3
        texts = [d['text'] for d in dialogues]
        assert "First" in texts
        assert "Second" in texts
        assert "Third" in texts

    def test_extract_dialogues_sorted_by_position(self, extractor):
        """测试对话按位置排序"""
        text = '"A" xxx "B" yyy "C"'
        dialogues = extractor.extract_dialogues(text)

        positions = [d['start'] for d in dialogues]
        assert positions == sorted(positions), "Dialogues should be sorted by position"

    def test_filter_too_short(self, extractor):
        """测试过滤太短的文本"""
        text = '""'
        dialogues = extractor.extract_dialogues(text)

        for d in dialogues:
            assert len(d['text']) >= 5

    def test_filter_too_long(self, extractor):
        """测试过滤太长的文本"""
        text = '"' + "a" * 2000 + '"'
        dialogues = extractor.extract_dialogues(text)

        for d in dialogues:
            assert len(d['text']) <= 1000

    def test_clean_dialogue_text(self, extractor):
        """测试对话文本清理"""
        text = "  Hello World  "
        cleaned = extractor._clean_dialogue_text(text)
        assert cleaned == "Hello World"

    def test_dialogue_id_sequential(self, extractor):
        """测试对话 ID 连续性"""
        text = '"A" "B" "C" "D"'
        dialogues = extractor.extract_dialogues(text)

        ids = [d['id'] for d in dialogues]
        expected = list(range(len(dialogues)))
        assert ids == expected, f"IDs should be sequential: expected {expected}, got {ids}"

    def test_no_dialogues(self, extractor):
        """测试无对话的情况"""
        text = "This is plain text without any quotes."
        dialogues = extractor.extract_dialogues(text)

        assert isinstance(dialogues, list)

    def test_mixed_quotes(self, extractor):
        """测试混合引号"""
        text = '''"English" and 「中文」 and 'single' '''
        dialogues = extractor.extract_dialogues(text)

        assert len(dialogues) >= 3


class TestDialoguePatterns:
    """对话模式测试"""

    @pytest.fixture
    def extractor(self):
        return DialogueExtractor()

    def test_pattern_types_recorded(self, extractor):
        """测试匹配的模式类型被记录"""
        text = '"English quote"'
        dialogues = extractor.extract_dialogues(text)

        for d in dialogues:
            assert 'pattern_type' in d
            assert d['pattern_type'] is not None

    def test_positions_recorded(self, extractor):
        """测试位置信息被记录"""
        text = '"Hello" world "Goodbye"'
        dialogues = extractor.extract_dialogues(text)

        for d in dialogues:
            assert 'start' in d
            assert 'end' in d
            assert d['end'] > d['start']

    def test_text_field_recorded(self, extractor):
        """测试文本内容被记录"""
        text = '"Hello World"'
        dialogues = extractor.extract_dialogues(text)

        assert len(dialogues) >= 1
        assert 'text' in dialogues[0]
        assert len(dialogues[0]['text']) > 0

    def test_id_field_recorded(self, extractor):
        """测试 ID 字段被记录"""
        text = '"A" "B"'
        dialogues = extractor.extract_dialogues(text)

        for d in dialogues:
            assert 'id' in d