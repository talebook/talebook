import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import BookCoverGrid from '@/components/BookCoverGrid.vue';

const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');
const book = { id: 1, title: '书名', comments: '<p>当前简介</p>' };
function render(props: Record<string, unknown>) {
    return mount(BookCoverGrid, {
        props: { emptyText: '暂无记录', ...props },
        global: { plugins: [vuetify], mocks: { $t: () => '暂无简介' } },
    });
}

describe('BookCoverGrid', () => {
    it('keeps a named details link in cover-only mode', () => {
        const wrapper = render({ books: [book] });
        expect(wrapper.getComponent({ name: 'VCard' }).props('to')).toBe('/book/1');
        expect(wrapper.get('[data-testid="book-cover-card"]').attributes('aria-label')).toBe(book.title);
        expect(wrapper.find('[data-testid="book-card-text"]').exists()).toBe(false);
    });
    it('keeps the shelf title-only while enabling reading-record introductions explicitly', () => {
        const shelf = render({ books: [book], showTitle: true });
        expect(shelf.get('[data-testid="book-card-title"]').text()).toBe(book.title);
        expect(shelf.find('[data-testid="book-card-summary"]').exists()).toBe(false);
        const history = render({ books: [book], showTitle: true, showSummary: true });
        expect(history.get('[data-testid="book-card-summary"]').text()).toBe('当前简介');
    });
    it('keeps the empty-state message without rendering a card', () => {
        const wrapper = render({ books: [] });
        expect(wrapper.text()).toBe('暂无记录');
        expect(wrapper.find('[data-testid="book-cover-card"]').exists()).toBe(false);
    });
});
