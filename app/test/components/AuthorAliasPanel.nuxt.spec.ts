import { flushPromises, mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key: string) => key }),
}));

const { alertMock, backendMock } = vi.hoisted(() => ({
    alertMock: vi.fn(),
    backendMock: vi.fn(),
}));

vi.mock('nuxt/app', () => ({
    useNuxtApp: () => ({ $backend: backendMock, $alert: alertMock }),
}));

const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');

import AuthorAliasPanel from '@/components/AuthorAliasPanel.vue';

function mountPanel() {
    return mount(
        { components: { AuthorAliasPanel }, template: '<v-app><AuthorAliasPanel name="安徒生" /></v-app>' },
        { global: { plugins: [vuetify] } },
    );
}

describe('AuthorAliasPanel.vue', () => {
    beforeEach(() => {
        alertMock.mockReset();
        backendMock.mockReset();
    });

    it('shows the canonical name, aliases, and management action to administrators', async () => {
        backendMock.mockResolvedValue({
            err: 'ok',
            author: {
                canonical: 'Hans Christian Andersen',
                aliases: ['安徒生'],
                names: ['Hans Christian Andersen', '安徒生'],
                book_count: 3,
                can_edit: true,
            },
        });
        const wrapper = mountPanel();
        await flushPromises();

        expect(wrapper.text()).toContain('Hans Christian Andersen');
        expect(wrapper.text()).toContain('安徒生');
        expect(wrapper.text()).toContain('authorAliases.manage');
        expect(backendMock).toHaveBeenCalledWith('/author-aliases/%E5%AE%89%E5%BE%92%E7%94%9F');
        wrapper.unmount();
    });

    it('keeps global management hidden for read-only visitors', async () => {
        backendMock.mockResolvedValue({
            err: 'ok',
            author: {
                canonical: '安徒生',
                aliases: [],
                names: ['安徒生'],
                book_count: 3,
                can_edit: false,
            },
        });
        const wrapper = mountPanel();
        await flushPromises();

        expect(wrapper.text()).toContain('authorAliases.empty');
        expect(wrapper.text()).not.toContain('authorAliases.manage');
        wrapper.unmount();
    });

    it('shows a recoverable error state when aliases cannot be loaded', async () => {
        backendMock.mockRejectedValue(new Error('offline'));
        const wrapper = mountPanel();
        await flushPromises();

        expect(wrapper.text()).toContain('authorAliases.loadFailed');
        expect(wrapper.text()).toContain('common.retry');
        wrapper.unmount();
    });
});
