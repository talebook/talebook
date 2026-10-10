import { describe, expect, it, vi } from 'vitest';
import { bookToolUrl, confirmDestructiveBookWrite } from '@/utils/book-tools';

describe('confirmDestructiveBookWrite', () => {
    it('does not interrupt save-as-new operations', () => {
        const confirmAction = vi.fn();

        expect(confirmDestructiveBookWrite(false, 'unused', confirmAction)).toBe(true);
        expect(confirmAction).not.toHaveBeenCalled();
    });

    it('requires explicit confirmation before overwriting', () => {
        const confirmAction = vi.fn().mockReturnValue(false);

        expect(confirmDestructiveBookWrite(true, 'overwrite?', confirmAction)).toBe(false);
        expect(confirmAction).toHaveBeenCalledWith('overwrite?');
    });
});

describe('bookToolUrl', () => {
    it('routes every tool through the unified plugin tool endpoint', () => {
        expect(bookToolUrl('talebook.tool.epub-beautify')).toBe('/plugins/talebook.tool.epub-beautify/tool');
        expect(bookToolUrl('talebook.tool.text-replace', 'preview')).toBe('/plugins/talebook.tool.text-replace/tool/preview');
        expect(bookToolUrl('talebook.tool.zh-converter', 'run')).toBe('/plugins/talebook.tool.zh-converter/tool/run');
    });
});
