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

import SerializeStatusBadge from '@/components/SerializeStatusBadge.vue';

describe('SerializeStatusBadge.vue', () => {
    it('renders finished status label', () => {
        const wrapper = mount(SerializeStatusBadge, {
            global: { plugins: [vuetify] },
            props: { status: 'finished' },
        });
        expect(wrapper.text()).toContain('network.status.finished');
    });

    it('renders serial status label', () => {
        const wrapper = mount(SerializeStatusBadge, {
            global: { plugins: [vuetify] },
            props: { status: 'serial' },
        });
        expect(wrapper.text()).toContain('network.status.serial');
    });

    it('defaults to unknown', () => {
        const wrapper = mount(SerializeStatusBadge, {
            global: { plugins: [vuetify] },
        });
        expect(wrapper.text()).toContain('network.status.unknown');
    });

    it('shows edit affordance when editable', () => {
        const wrapper = mount(SerializeStatusBadge, {
            global: { plugins: [vuetify] },
            props: { status: 'serial', editable: true, bookId: 1 },
        });
        expect(wrapper.find('.mdi-pencil').exists()).toBe(true);
    });
});
