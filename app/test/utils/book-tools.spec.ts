import { describe, expect, it, vi } from 'vitest';
import { confirmDestructiveBookWrite } from '@/utils/book-tools';

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
