import { describe, expect, it, vi } from 'vitest';
import { bookToolUrl, confirmDestructiveBookWrite, pluginExecUrl } from '@/utils/book-tools';

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
    it('routes every tool through the plugin exec endpoint', () => {
        expect(bookToolUrl('talebook.tool.epub-beautify', 'describe')).toBe('/plugins/talebook.tool.epub-beautify/exec/tool.describe');
        expect(bookToolUrl('talebook.tool.text-replace', 'preview')).toBe('/plugins/talebook.tool.text-replace/exec/tool.preview');
        expect(bookToolUrl('talebook.tool.zh-converter', 'run')).toBe('/plugins/talebook.tool.zh-converter/exec/tool.run');
    });
});

describe('pluginExecUrl', () => {
    it('builds the single capability endpoint for any plugin and action', () => {
        expect(pluginExecUrl('talebook.meta.douban', 'metadata.search')).toBe('/plugins/talebook.meta.douban/exec/metadata.search');
        expect(pluginExecUrl('talebook.combo.weread', 'search')).toBe('/plugins/talebook.combo.weread/exec/search');
    });
});
