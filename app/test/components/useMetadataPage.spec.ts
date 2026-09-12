import { effectScope, nextTick, ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { useMetadataPage } from '@/composables/useMetadataPage';

describe('metadata request state', () => {
    it('ignores late responses after search, category changes and disposal', async () => {
        const pending: Array<(value: unknown) => void> = [];
        const fetchPage = vi.fn(() => new Promise(resolve => pending.push(resolve)));
        const key = ref('tag');
        const scope = effectScope();
        const state = scope.run(() => useMetadataPage(fetchPage, { key }))!;
        state.query.value = 'new';
        await nextTick();
        pending[1]({ items: [{ name: 'new' }], total: 1, pages: 1 });
        await flushPromises();
        pending[0]({ items: [{ name: 'old' }], total: 99, pages: 1 });
        await flushPromises();
        expect(state.items.value).toEqual([{ name: 'new' }]);
        key.value = 'author';
        await nextTick();
        scope.stop();
        pending[2]({ items: [{ name: 'disposed' }], total: 1, pages: 1 });
        await flushPromises();
        expect(state.items.value).toEqual([]);
    });

    it('recovers when deletion leaves an out-of-range page and handles an empty list', async () => {
        const fetchPage = vi.fn().mockResolvedValue({ items: [], total: 1001, pages: 11 });
        const scope = effectScope();
        const state = scope.run(() => useMetadataPage(fetchPage))!;
        await flushPromises();
        fetchPage.mockResolvedValueOnce({ items: [], total: 0, pages: 1 })
            .mockResolvedValueOnce({ items: [], total: 0, pages: 1 });
        state.page.value = 11;
        await flushPromises();
        expect(fetchPage).toHaveBeenLastCalledWith(1, '', 100);
        expect(state.page.value).toBe(1);
        expect(state.total.value).toBe(0);
        expect(state.items.value).toEqual([]);
        expect(state.failed.value).toBe(false);
        scope.stop();
    });
});
