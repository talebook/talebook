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
Object.defineProperty(global, 'visualViewport', {
    value: {
        width: 1024,
        height: 768,
        offsetLeft: 0,
        offsetTop: 0,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    },
});

import AuthorAliasPanel from '@/components/AuthorAliasPanel.vue';

function mountPanel() {
    return mount(
        { components: { AuthorAliasPanel }, template: '<v-app><AuthorAliasPanel name="安徒生" /></v-app>' },
        { attachTo: document.body, global: { plugins: [vuetify] } },
    );
}

function mockAuthorLoad(overrides = {}) {
    const author = {
        id: 3,
        canonical: 'Hans Christian Andersen',
        aliases: ['安徒生'],
        names: ['Hans Christian Andersen', '安徒生'],
        book_count: 3,
        can_edit: true,
        ...overrides,
    };
    backendMock
        .mockResolvedValueOnce({ err: 'ok', author: { id: author.id, name: author.canonical } })
        .mockResolvedValueOnce({ err: 'ok', author });
    return author;
}

async function clickButton(label) {
    const button = [...document.body.querySelectorAll('button')].find(item => item.textContent?.trim() === label);
    if (!button) throw new Error(`Button not found: ${label}`);
    button.click();
    await flushPromises();
}

describe('AuthorAliasPanel.vue', () => {
    beforeEach(() => {
        alertMock.mockReset();
        backendMock.mockReset();
    });

    it('resolves the author id and loads the nested alias resource', async () => {
        mockAuthorLoad();
        const wrapper = mountPanel();
        await flushPromises();

        expect(wrapper.text()).toContain('Hans Christian Andersen');
        expect(wrapper.text()).toContain('安徒生');
        expect(wrapper.text()).toContain('authorAliases.manage');
        expect(backendMock).toHaveBeenNthCalledWith(1, '/authors?name=%E5%AE%89%E5%BE%92%E7%94%9F');
        expect(backendMock).toHaveBeenNthCalledWith(2, '/authors/3/aliases');
        wrapper.unmount();
    });

    it('keeps global management hidden for read-only visitors', async () => {
        mockAuthorLoad({
            canonical: '安徒生',
            aliases: [],
            names: ['安徒生'],
            can_edit: false,
        });
        const wrapper = mountPanel();
        await flushPromises();

        expect(wrapper.text()).toContain('authorAliases.empty');
        expect(wrapper.text()).not.toContain('authorAliases.manage');
        wrapper.unmount();
    });

    it('replaces the nested alias collection with PUT', async () => {
        const author = mockAuthorLoad();
        backendMock.mockResolvedValueOnce({ err: 'ok', author });
        const wrapper = mountPanel();
        await flushPromises();

        await clickButton('authorAliases.manage');
        await clickButton('common.save');

        expect(backendMock).toHaveBeenNthCalledWith(3, '/authors/3/aliases', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                canonical: 'Hans Christian Andersen',
                aliases: ['安徒生'],
            }),
        });
        wrapper.unmount();
    });

    it('creates an explicit nested merge resource with POST', async () => {
        const author = mockAuthorLoad();
        backendMock.mockResolvedValueOnce({ err: 'ok', author, merge: { updated: 1, failed: [] } });
        const wrapper = mountPanel();
        await flushPromises();

        await clickButton('authorAliases.manage');
        await clickButton('authorAliases.merge');
        await clickButton('authorAliases.confirmMerge');

        expect(backendMock).toHaveBeenNthCalledWith(3, '/authors/3/merges', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                canonical: 'Hans Christian Andersen',
                aliases: ['安徒生'],
            }),
        });
        wrapper.unmount();
    });

    it('shows a recoverable error state when author resolution fails', async () => {
        backendMock.mockRejectedValueOnce(new Error('offline'));
        const wrapper = mountPanel();
        await flushPromises();

        expect(wrapper.text()).toContain('authorAliases.loadFailed');
        expect(wrapper.text()).toContain('common.retry');
        wrapper.unmount();
    });
});
