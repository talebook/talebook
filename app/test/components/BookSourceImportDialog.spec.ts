import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (k: string) => k, locale: { value: 'zh-CN' } }),
}));

const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');
(globalThis as Record<string, unknown>).visualViewport = {
    addEventListener: () => {}, removeEventListener: () => {},
    width: 1024, height: 768, scale: 1, offsetLeft: 0, offsetTop: 0,
};

import BookSourceImportDialog from '@/components/BookSourceImportDialog.vue';

describe('BookSourceImportDialog.vue', () => {
    it('opens and renders the three import tabs', async () => {
        const wrapper = mount(BookSourceImportDialog, {
            global: { plugins: [vuetify], mocks: { $t: (k: string) => k } },
            attachTo: document.body,
        });
        (wrapper.vm as unknown as { open: () => void }).open();
        await wrapper.vm.$nextTick();
        expect(document.body.textContent).toContain('booksource.importJson');
        expect(document.body.textContent).toContain('booksource.importUrl');
        expect(document.body.textContent).toContain('booksource.importSeed');
        wrapper.unmount();
    });
});
