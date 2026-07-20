import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BookCards from '@/components/BookCards.vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const vuetify = createVuetify({
    components,
    directives,
});

global.ResizeObserver = require('resize-observer-polyfill');

describe('BookCards.vue', () => {
    it('does not render empty state by default', () => {
        const wrapper = mount(BookCards, {
            global: {
                plugins: [vuetify],
                mocks: {
                    $t: (key: string) => ({
                        'messages.noBooks': '本书库暂无藏书',
                        'messages.addBooksFirst': '请先添加书籍到书库',
                    }[key] || key),
                },
            },
            props: {
                books: []
            }
        });

        expect(wrapper.text()).not.toContain('本书库暂无藏书');
        expect(wrapper.find('.mdi-book-open-variant').exists()).toBe(false);
    });

    it('renders empty state when explicitly enabled (User Experience: Empty State)', () => {
        const wrapper = mount(BookCards, {
            global: {
                plugins: [vuetify],
                mocks: {
                    $t: (key: string) => ({
                        'messages.noBooks': '本书库暂无藏书',
                        'messages.addBooksFirst': '请先添加书籍到书库',
                    }[key] || key),
                },
            },
            props: {
                books: [],
                showEmptyState: true,
            }
        });
    
        // 验证空状态提示文字
        expect(wrapper.text()).toContain('本书库暂无藏书');
        expect(wrapper.text()).toContain('请先添加书籍到书库');
        // 验证视觉元素存在 (Icon)
        expect(wrapper.find('.mdi-book-open-variant').exists()).toBe(true);
    });

    it('renders books correctly (User Experience: List View)', () => {
        const books = [
            { id: 1, title: 'Book 1', img: 'img1.jpg', comments: 'comment 1' },
            { id: 2, title: 'Book 2', img: 'img2.jpg', comments: 'comment 2' }
        ];
        const wrapper = mount(BookCards, {
            global: {
                plugins: [vuetify]
            },
            props: {
                books
            }
        });

        const cards = wrapper.findAll('.book-list-card');
        expect(cards.length).toBe(2);
        expect(wrapper.text()).toContain('Book 1');
        expect(wrapper.text()).toContain('Book 2');
    
        // 验证交互体验：链接是否正确生成
        // 检查 v-card 的 to 属性
        const vCards = wrapper.findAllComponents({ name: 'VCard' });
        expect(vCards.length).toBeGreaterThan(0);
        expect(vCards[0].props('to')).toBe('/book/1');
    });

    it('marks read-done books with a badge and chip, leaves others untouched (User Experience: Read Status Badge)', () => {
        const books = [
            { id: 1, title: 'Book 1', img: 'img1.jpg', comments: 'comment 1', state: { read_state: 2 } },
            { id: 2, title: 'Book 2', img: 'img2.jpg', comments: 'comment 2', state: { read_state: 0 } },
            { id: 3, title: 'Book 3', img: 'img3.jpg', comments: 'comment 3' },
        ];
        const wrapper = mount(BookCards, {
            global: {
                plugins: [vuetify],
                mocks: {
                    $t: (key: string) => ({
                        'readingState.done': '已读',
                    }[key] || key),
                },
            },
            props: {
                books
            }
        });

        expect(wrapper.findAll('.book-read-badge').length).toBe(1);
        expect(wrapper.findAll('.read-chip').length).toBe(1);
        expect(wrapper.text()).toContain('已读');
    });
});
