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
        const savedConnection = { id: 88, secret: { configured: true, mask: '••••1234' } };
        const backend = vi.fn()
            .mockResolvedValueOnce({ err: 'ok', connections: [savedConnection], runs: [] })
            .mockResolvedValueOnce({
                err: 'ok', run: { id: 1, status: 'succeeded', counts: { fetched: 1 } },
            })
            .mockResolvedValueOnce({
                err: 'ok',
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

        expect(backend.mock.calls[0][0]).toBe('/plugins/talebook.combo.weread');
        expect(backend.mock.calls[1][0]).toBe('/plugins/connections/88/preview');
        expect(JSON.parse(backend.mock.calls[1][1].body)).toEqual({ input_data: {} });
        expect(backend.mock.calls[2][0]).toBe('/plugins/runs/1');
        expect(wrapper.text()).toContain('wereadImport.openConnected');
        wrapper.unmount();
    });

    it('previews and imports through generic connection, action, and run endpoints', async () => {
        const savedConnection = { id: 88, secret: { configured: true, mask: '••••1234' } };
        const backend = vi.fn()
            .mockResolvedValueOnce({ err: 'ok', connections: [], runs: [] })
            .mockResolvedValueOnce({ err: 'ok', connection: savedConnection })
            .mockResolvedValueOnce({
                err: 'ok', run: { id: 1, status: 'queued', counts: {} },
            })
            .mockResolvedValueOnce({
                err: 'ok',
                run: { id: 1, status: 'succeeded', counts: { fetched: 2 } },
                items: [{ data: { match_status: 'auto', source_book_id: 'book-1' } }],
            })
            .mockResolvedValueOnce({
                err: 'ok', run: { id: 2, status: 'queued', counts: {} },
            })
            .mockResolvedValueOnce({
                err: 'ok',
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

        expect(backend.mock.calls[1][0]).toBe('/plugins/connections');
        expect(JSON.parse(backend.mock.calls[1][1].body)).toEqual({
            plugin_key: 'talebook.combo.weread', credentials: { api_key: 'wrk-secret-1234' },
        });
        expect(backend.mock.calls[2][0]).toBe('/plugins/connections/88/preview');
        expect(JSON.parse(backend.mock.calls[2][1].body)).toEqual({ input_data: {} });
        expect(backend.mock.calls[3][0]).toBe('/plugins/runs/1');
        expect(JSON.stringify(backend.mock.results)).not.toContain('wrk-secret-1234');

        await vm.runImport();
        await flushPromises();
        expect(backend.mock.calls[4][0]).toBe('/plugins/connections/88/run');
        const runBody = JSON.parse(backend.mock.calls[4][1].body);
        expect(runBody).toEqual({ input_data: { matches: {} } });
        expect(backend.mock.calls[5][0]).toBe('/plugins/runs/2');
        expect(wrapper.emitted('imported')).toHaveLength(1);
        wrapper.unmount();
    });

    it('stops queued-run polling when the component is unmounted', async () => {
        vi.useFakeTimers();
        try {
            const savedConnection = { id: 88, secret: { configured: true, mask: '••••1234' } };
            const backend = vi.fn()
                .mockResolvedValueOnce({ err: 'ok', connections: [savedConnection], runs: [] })
                .mockResolvedValueOnce({ err: 'ok', run: { id: 1, status: 'queued', counts: {} } })
                .mockResolvedValueOnce({ err: 'ok', run: { id: 1, status: 'queued', counts: {} }, items: [] });
            const wrapper = mount(WeReadImportDialog, {
                props: { backend, savedConnection },
                global: { plugins: [vuetify], stubs: { teleport: true } },
            });
            await flushPromises();

            const vm = wrapper.vm as unknown as { preview: () => Promise<void> };
            const preview = vm.preview();
            await flushPromises();
            expect(backend).toHaveBeenCalledTimes(3);

            const pollingOptions = backend.mock.calls[2][1];
            wrapper.unmount();
            await vi.advanceTimersByTimeAsync(5000);
            await preview;

            expect(backend).toHaveBeenCalledTimes(3);
            expect(pollingOptions.signal.aborted).toBe(true);
        } finally {
            vi.useRealTimers();
        }
    });
});
