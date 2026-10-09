import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import BookCardText from '@/components/BookCardText.vue';

function render(book: Record<string, unknown>, showSummary = true) {
    return mount(BookCardText, {
        props: { book, showSummary },
        global: { mocks: { $t: () => '暂无简介' } },
    });
}

describe('BookCardText', () => {
    it('shows the full title and a safe plain-text introduction', () => {
        const wrapper = render({ title: '三体', comments: '<p>科幻 &amp; 文学</p><script>danger()</script>' });
        expect(wrapper.get('[data-testid="book-card-title"]').text()).toBe('三体');
        expect(wrapper.get('[data-testid="book-card-title"]').attributes('title')).toBe('三体');
        expect(wrapper.get('[data-testid="book-card-summary"]').text()).toBe('科幻 & 文学');
        expect(wrapper.find('p').exists()).toBe(false);
        expect(wrapper.find('script').exists()).toBe(false);
    });
    it('updates the title and introduction with the book', async () => {
        const wrapper = render({ title: '第一本', comments: '简介一' });
        await wrapper.setProps({ book: { title: '第二本', comments: '<div>简介二</div>' } });
        expect(wrapper.get('[data-testid="book-card-title"]').text()).toBe('第二本');
        expect(wrapper.get('[data-testid="book-card-summary"]').text()).toBe('简介二');
    });
    it('shows the existing localized empty introduction and supports title-only consumers', () => {
        const wrapper = render({ title: '无简介', comments: '<p>&nbsp;</p>' });
        expect(wrapper.get('[data-testid="book-card-summary"]').text()).toBe('暂无简介');
        expect(render({ title: '书架', comments: '不显示简介' }, false).find('[data-testid="book-card-summary"]').exists()).toBe(false);
    });
});
