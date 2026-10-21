import { describe, expect, it } from 'vitest';
import { bookSummary } from '../../utils/book-summary';

describe('bookSummary', () => {
    it('keeps plain text and normalizes whitespace', () => {
        expect(bookSummary('  科幻\n 阅读\t简介  ')).toBe('科幻 阅读 简介');
    });
    it('separates paragraphs and line breaks while retaining inline text', () => {
        expect(bookSummary('<p>科幻<em>经典</em></p><p>第二段<br>下一行</p>结语'))
            .toBe('科幻经典 第二段 下一行 结语');
    });
    it('decodes named and numeric entities without rendering escaped markup', () => {
        expect(bookSummary('<p>A&nbsp;&amp;&nbsp;B &#x1f680; &lt;em&gt;书名&lt;/em&gt;</p>'))
            .toBe('A & B 🚀 <em>书名</em>');
    });
    it('omits scripts, styles, templates, comments and images', () => {
        expect(bookSummary('<p>正文</p><script>danger()</script><style>body{}</style><template>隐藏</template><!--注释--><img src="x" onerror="danger()">'))
            .toBe('正文');
    });
    it.each([null, undefined, '', '  ', '<p>&nbsp;</p>', {}])('handles missing or empty descriptions: %s', value => {
        expect(bookSummary(value)).toBe('');
    });
});
