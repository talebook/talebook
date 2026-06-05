// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (k: string) => k, locale: { value: 'zh-CN' } }),
}));

const { backendMock, alertMock } = vi.hoisted(() => ({
    backendMock: vi.fn(),
    alertMock: vi.fn(),
}));

mockNuxtImport('useNuxtApp', () => {
    return () => ({ $backend: backendMock, $alert: alertMock });
});

const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');
(globalThis as Record<string, unknown>).visualViewport = {
    addEventListener: () => {}, removeEventListener: () => {},
    width: 1024, height: 768, scale: 1, offsetLeft: 0, offsetTop: 0,
};

import BookSourceImportDialog from '@/components/BookSourceImportDialog.vue';

type DialogVm = {
    open: () => void;
    doImport: () => Promise<void>;
    tab: string;
    jsonText: string;
    url: string;
};

function mountDialog() {
    backendMock.mockReset();
    alertMock.mockReset();
    return mount(BookSourceImportDialog, {
        global: { plugins: [vuetify], mocks: { $t: (k: string) => k } },
        attachTo: document.body,
    });
}

describe('BookSourceImportDialog.vue', () => {
    it('opens and renders the three import tabs', async () => {
        const wrapper = mountDialog();
        (wrapper.vm as unknown as DialogVm).open();
        await wrapper.vm.$nextTick();
        expect(document.body.textContent).toContain('booksource.importJson');
        expect(document.body.textContent).toContain('booksource.importUrl');
        expect(document.body.textContent).toContain('booksource.importSeed');
        wrapper.unmount();
    });

    it('defaults to the URL tab and renders it leftmost', async () => {
        const wrapper = mountDialog();
        expect((wrapper.vm as unknown as DialogVm).tab).toBe('url');
        (wrapper.vm as unknown as DialogVm).open();
        await wrapper.vm.$nextTick();
        // URL tab must appear before the JSON tab in the rendered order
        const html = document.body.innerHTML;
        expect(html.indexOf('booksource.importUrl')).toBeLessThan(html.indexOf('booksource.importJson'));
        wrapper.unmount();
    });

    it('rejects invalid JSON on the json tab without calling the backend', async () => {
        const wrapper = mountDialog();
        const vm = wrapper.vm as unknown as DialogVm;
        vm.tab = 'json';
        vm.jsonText = 'not-json';
        await vm.doImport();
        expect(backendMock).not.toHaveBeenCalled();
        expect(alertMock).toHaveBeenCalledWith('error', 'booksource.jsonInvalid');
        wrapper.unmount();
    });

    it('rejects an empty URL on the url tab without calling the backend', async () => {
        const wrapper = mountDialog();
        const vm = wrapper.vm as unknown as DialogVm;
        // default tab is already 'url'
        await vm.doImport();
        expect(backendMock).not.toHaveBeenCalled();
        expect(alertMock).toHaveBeenCalledWith('error', 'booksource.urlRequired');
        wrapper.unmount();
    });
});
