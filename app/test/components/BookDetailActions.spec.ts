import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key: string) => key }),
}));

const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');
(globalThis as Record<string, unknown>).visualViewport = {
    addEventListener: () => {},
    removeEventListener: () => {},
    width: 1024,
    height: 768,
    scale: 1,
    offsetLeft: 0,
    offsetTop: 0,
};

import BookDetailActions from '@/components/BookDetailActions.vue';

const ownerBook = {
    id: 1,
    title: 'Test Book',
    files: [
        { format: 'EPUB', size: 1024 },
        { format: 'TXT', size: 2048 },
    ],
    is_owner: true,
    media_type: 'ebook',
    scope: 'public',
};

const mounted: VueWrapper[] = [];

const mountActions = (props = {}) => {
    const wrapper = mount(BookDetailActions, {
        attachTo: document.body,
        global: {
            plugins: [vuetify],
            stubs: {
                RouterLink: {
                    props: ['to'],
                    template: '<a><slot /></a>',
                },
            },
        },
        props: {
            book: ownerBook,
            readerPath: '/read/1',
            hasCompatibleFormats: true,
            canSaveMetadata: true,
            isLoggedIn: true,
            isInShelf: false,
            readingState: 0,
            readingStateText: {
                label: 'book.setAsReading',
                icon: 'mdi-book-open-outline',
                color: 'primary',
            },
            ...props,
        },
    });
    mounted.push(wrapper);
    return wrapper;
};

afterEach(() => {
    while (mounted.length) mounted.pop()?.unmount();
    document.body.innerHTML = '';
});

describe('BookDetailActions.vue', () => {
    it('renders one canonical reader control per task and emits its actions', async () => {
        const wrapper = mountActions();

        expect(wrapper.get('[data-testid="book-action-section"]').element.tagName).toBe('SECTION');
        expect(wrapper.find('[data-testid="book-action-section"].v-card').exists()).toBe(false);
        expect(wrapper.findAll('[data-testid="open-online-reader"]')).toHaveLength(1);
        expect(wrapper.findAll('[data-testid="book-action-download"]')).toHaveLength(1);
        expect(wrapper.findAll('[data-testid="book-action-send"]')).toHaveLength(1);
        expect(wrapper.findAll('[data-testid="book-action-shelf"]')).toHaveLength(1);
        expect(wrapper.findAll('[data-testid="book-action-reading-state"]')).toHaveLength(1);
        expect(wrapper.findAll('[data-testid="open-audiobook"]')).toHaveLength(1);

        await wrapper.get('[data-testid="book-action-download"]').trigger('click');
        await wrapper.get('[data-testid="book-action-send"]').trigger('click');
        await wrapper.get('[data-testid="book-action-shelf"]').trigger('click');
        await wrapper.get('[data-testid="book-action-reading-state"]').trigger('click');

        expect(wrapper.emitted('download')).toHaveLength(1);
        expect(wrapper.emitted('send-to-device')).toHaveLength(1);
        expect(wrapper.emitted('toggle-shelf')).toHaveLength(1);
        expect(wrapper.emitted('change-reading-state')).toHaveLength(1);
    });

    it('groups owner menus without hiding the primary reader controls', async () => {
        const wrapper = mountActions();

        expect(wrapper.get('[data-testid="book-action-process"]').text()).toContain('book.process');
        expect(wrapper.get('[data-testid="book-action-manage"]').text()).toContain('common.manage');
        expect(wrapper.get('[data-testid="open-online-reader"]').exists()).toBe(true);

        await wrapper.get('[data-testid="book-action-process"]').trigger('click');
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(document.body.textContent).toContain('book.convert');
        expect(document.body.textContent).toContain('book.uploadNewFormat');
    });

    it('hides owner and account actions when the visitor lacks those capabilities', () => {
        const wrapper = mountActions({
            book: { ...ownerBook, is_owner: false },
            isLoggedIn: false,
        });

        expect(wrapper.find('[data-testid="book-action-process"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="book-action-manage"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="book-action-shelf"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="book-action-reading-state"]').exists()).toBe(false);
        expect(wrapper.get('[data-testid="book-action-download"]').exists()).toBe(true);
        expect(wrapper.get('[data-testid="book-action-send"]').exists()).toBe(true);
    });

    it('shows the unsupported state without exposing ebook-only actions for an unreadable comic', () => {
        const wrapper = mountActions({
            book: { ...ownerBook, media_type: 'comic' },
            hasCompatibleFormats: false,
        });

        expect(wrapper.find('[data-testid="open-online-reader"]').exists()).toBe(false);
        expect(wrapper.get('[data-testid="online-reading-unsupported"]').attributes('disabled')).toBeDefined();
        expect(wrapper.find('[data-testid="open-audiobook"]').exists()).toBe(false);
        expect(wrapper.get('[data-testid="book-action-download"]').exists()).toBe(true);
    });
});
