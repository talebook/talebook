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

import SaveOnlineDialog from '@/components/SaveOnlineDialog.vue';

describe('SaveOnlineDialog.vue', () => {
    it('exposes open() and shows the dialog content', async () => {
        const wrapper = mount(SaveOnlineDialog, {
            global: { plugins: [vuetify], mocks: { $t: (k: string) => k } },
            props: { sourceId: 1, bookUrl: '/book/1' },
            attachTo: document.body,
        });
        expect(document.body.textContent).not.toContain('network.save.title');
        (wrapper.vm as unknown as { open: () => void }).open();
        await wrapper.vm.$nextTick();
        expect(document.body.textContent).toContain('network.save.title');
        expect(document.body.textContent).toContain('network.save.format');
        wrapper.unmount();
    });
});
