import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BookReadBadge from '@/components/BookReadBadge.vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const vuetify = createVuetify({
    components,
    directives,
});

global.ResizeObserver = require('resize-observer-polyfill');

const mountBadge = (readState?: number) => mount(BookReadBadge, {
    global: {
        plugins: [vuetify],
        mocks: {
            $t: (key: string) => ({
                'readingState.done': '已读',
            }[key] || key),
        },
    },
    props: {
        readState,
    },
});

describe('BookReadBadge.vue', () => {
    it('renders nothing when the book is not finished', () => {
        const wrapper = mountBadge(0);
        expect(wrapper.find('.book-read-badge').exists()).toBe(false);
    });

    it('renders nothing when the book is currently reading', () => {
        const wrapper = mountBadge(1);
        expect(wrapper.find('.book-read-badge').exists()).toBe(false);
    });

    it('renders the checkmark badge when the book is finished', () => {
        const wrapper = mountBadge(2);
        expect(wrapper.find('.book-read-badge').exists()).toBe(true);
        expect(wrapper.find('.mdi-check').exists()).toBe(true);
    });

    it('defaults to hidden when no read state is provided', () => {
        const wrapper = mountBadge();
        expect(wrapper.find('.book-read-badge').exists()).toBe(false);
    });
});
