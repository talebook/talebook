import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import RecommendationBookCard from '@/components/RecommendationBookCard.vue';

const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');

function render(book: Record<string, unknown>) {
    return mount(RecommendationBookCard, {
        props: { book },
        global: {
            plugins: [vuetify],
            mocks: { $t: (key: string) => key },
        },
    });
}

describe('RecommendationBookCard.vue', () => {
    it('names the whole card with the full book title and links to its details', () => {
        const title = '三体：地球往事';
        const wrapper = render({ id: 3, title, img: '/get/cover/3.jpg' });

        expect(wrapper.get('[data-testid="recommendation-title"]').text()).toBe(title);
        expect(wrapper.attributes('aria-label')).toBe(title);
        expect(wrapper.get('[data-testid="recommendation-title"]').attributes('title')).toBe(title);
        expect(wrapper.text()).toBe(title);
        expect(wrapper.getComponent({ name: 'VCard' }).props('to')).toBe('/book/3');
        expect(wrapper.getComponent({ name: 'VImg' }).props('src')).toBe('/get/cover/3.jpg');
        expect(wrapper.getComponent({ name: 'VImg' }).attributes('aria-hidden')).toBe('true');
    });

    it('honors a supplied details URL', () => {
        const wrapper = render({ id: 3, title: '三体', href: '/custom/book/3' });
        expect(wrapper.getComponent({ name: 'VCard' }).props('to')).toBe('/custom/book/3');
    });

    it('updates the displayed and accessible title with the recommended book', async () => {
        const wrapper = render({ id: 1, title: '最初的书' });
        const title = '返回首页后更新的长书名：读者仍能获取完整内容';
        await wrapper.setProps({ book: { id: 2, title } });

        expect(wrapper.get('[data-testid="recommendation-title"]').text()).toBe(title);
        expect(wrapper.attributes('aria-label')).toBe(title);
        expect(wrapper.get('[data-testid="recommendation-title"]').attributes('title')).toBe(title);
        expect(wrapper.getComponent({ name: 'VCard' }).props('to')).toBe('/book/2');
    });

    it('renders metadata as plain text and keeps the read badge on the cover', () => {
        const title = '<em>书名 & 原始文本</em>';
        const wrapper = render({ id: 1, title, state: { read_state: 2 } });

        expect(wrapper.get('[data-testid="recommendation-title"]').text()).toBe(title);
        expect(wrapper.find('em').exists()).toBe(false);
        expect(wrapper.get('.recommendation-cover .book-read-badge').exists()).toBe(true);
        expect(wrapper.find('.recommendation-title-area .book-read-badge').exists()).toBe(false);
    });
});
