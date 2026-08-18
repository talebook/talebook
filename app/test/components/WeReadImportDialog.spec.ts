import { flushPromises, mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { describe, expect, it, vi } from 'vitest';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string, params?: Record<string, unknown>) => params ? `${key}:${JSON.stringify(params)}` : key,
    }),
}));

import WeReadImportDialog from '@/components/WeReadImportDialog.vue';

const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');
(globalThis as Record<string, unknown>).visualViewport = {
    addEventListener: () => {}, removeEventListener: () => {},
    width: 1024, height: 768, scale: 1, offsetLeft: 0, offsetTop: 0,
};

describe('WeReadImportDialog', () => {
    it('uses the saved connection for preview without asking for the API key again', async () => {
        const savedConnection = { secret: { configured: true, mask: '••••1234' } };
        const backend = vi.fn()
            .mockResolvedValueOnce({ err: 'ok', connection: savedConnection, runs: [] })
            .mockResolvedValueOnce({
                err: 'ok',
                connection: savedConnection,
                run: { id: 1, status: 'succeeded', counts: { fetched: 1 } },
                items: [{ data: { match_status: 'auto', source_book_id: 'book-1' } }],
            });
        const wrapper = mount(WeReadImportDialog, {
            props: { backend, savedConnection },
            global: { plugins: [vuetify], stubs: { teleport: true } },
        });
        await flushPromises();

        const vm = wrapper.vm as unknown as { preview: () => Promise<void> };
        await vm.preview();
        await flushPromises();

        expect(JSON.parse(backend.mock.calls[1][1].body)).toEqual({ action: 'preview' });
        expect(wrapper.text()).toContain('wereadImport.openConnected');
        wrapper.unmount();
    });

    it('previews and imports through the private endpoint without echoing the API key', async () => {
        const backend = vi.fn()
            .mockResolvedValueOnce({ err: 'ok', connection: null, runs: [] })
            .mockResolvedValueOnce({
                err: 'ok',
                connection: { secret: { configured: true, mask: '••••1234' } },
                run: { id: 1, status: 'succeeded', counts: { fetched: 2 } },
                items: [{ data: { match_status: 'auto', source_book_id: 'book-1' } }],
            })
            .mockResolvedValueOnce({
                err: 'ok',
                connection: { secret: { configured: true, mask: '••••1234' } },
                run: { id: 2, status: 'succeeded', counts: { written: 2, skipped: 0, failed: 0, conflicts: 0 } },
                items: [],
            });
        const wrapper = mount(WeReadImportDialog, {
            props: { backend },
            global: { plugins: [vuetify], stubs: { teleport: true } },
        });
        await flushPromises();

        const vm = wrapper.vm as unknown as {
            setApiKey: (value: string) => void;
            preview: () => Promise<void>;
            runImport: () => Promise<void>;
        };
        vm.setApiKey('wrk-secret-1234');
        await vm.preview();
        await flushPromises();

        const previewBody = JSON.parse(backend.mock.calls[1][1].body);
        expect(previewBody).toEqual({ action: 'preview', api_key: 'wrk-secret-1234' });
        expect(JSON.stringify(backend.mock.results)).not.toContain('wrk-secret-1234');

        await vm.runImport();
        await flushPromises();
        const runBody = JSON.parse(backend.mock.calls[2][1].body);
        expect(runBody).toEqual({ action: 'run', matches: {} });
        expect(wrapper.emitted('imported')).toHaveLength(1);
        wrapper.unmount();
    });
});
