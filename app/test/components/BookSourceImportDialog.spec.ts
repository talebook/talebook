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
    fileInput: HTMLInputElement | null;
    onFileSelected: (event: Event) => void;
    triggerFileSelect: () => void;
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

    it('prefills the url tab with the default booksource URL', async () => {
        const wrapper = mountDialog();
        const vm = wrapper.vm as unknown as DialogVm;
        expect(vm.url).toBe('https://cdn.jsdmirror.com/gh/XIU2/Yuedu/shuyuan');
        wrapper.unmount();
    });

    it('rejects an empty URL on the url tab without calling the backend', async () => {
        const wrapper = mountDialog();
        const vm = wrapper.vm as unknown as DialogVm;
        // default tab is already 'url'; clear the prefilled URL to test the empty path
        vm.url = '';
        await vm.doImport();
        expect(backendMock).not.toHaveBeenCalled();
        expect(alertMock).toHaveBeenCalledWith('error', 'booksource.urlRequired');
        wrapper.unmount();
    });

    it('renders a button to load a local JSON file on the json tab', async () => {
        const wrapper = mountDialog();
        const vm = wrapper.vm as unknown as DialogVm;
        vm.tab = 'json';
        vm.open();
        await wrapper.vm.$nextTick();
        expect(document.body.textContent).toContain('booksource.loadFromFile');
        wrapper.unmount();
    });

    it('loads the content of a selected local file into the json textarea', async () => {
        const wrapper = mountDialog();
        const vm = wrapper.vm as unknown as DialogVm;
        vm.tab = 'json';
        await wrapper.vm.$nextTick();

        const content = '[{"bookSourceName":"test"}]';
        const file = new File([content], 'source.json', { type: 'application/json' });
        const input = { files: [file], value: 'source.json' };
        vm.onFileSelected({ target: input } as unknown as Event);

        await vi.waitFor(() => expect(vm.jsonText).toBe(content));
        expect(input.value).toBe('');
        wrapper.unmount();
    });

    it('shows an alert when the selected file fails to read', async () => {
        const wrapper = mountDialog();
        const vm = wrapper.vm as unknown as DialogVm;
        vm.tab = 'json';
        await wrapper.vm.$nextTick();

        const OriginalFileReader = globalThis.FileReader;
        class FailingFileReader {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            readAsText() {
                setTimeout(() => this.onerror && this.onerror(), 0);
            }
        }
        // @ts-expect-error stub the reader to exercise the error path
        globalThis.FileReader = FailingFileReader;

        const file = new File(['irrelevant'], 'source.json', { type: 'application/json' });
        vm.onFileSelected({ target: { files: [file], value: 'source.json' } } as unknown as Event);

        await vi.waitFor(() => expect(alertMock).toHaveBeenCalledWith('error', 'booksource.fileReadError'));
        globalThis.FileReader = OriginalFileReader;
        wrapper.unmount();
    });

    it('does nothing when the file input change fires without a selected file', async () => {
        const wrapper = mountDialog();
        const vm = wrapper.vm as unknown as DialogVm;
        vm.tab = 'json';
        vm.jsonText = 'unchanged';
        await wrapper.vm.$nextTick();

        vm.onFileSelected({ target: { files: [], value: '' } } as unknown as Event);
        await wrapper.vm.$nextTick();

        expect(vm.jsonText).toBe('unchanged');
        wrapper.unmount();
    });
});
