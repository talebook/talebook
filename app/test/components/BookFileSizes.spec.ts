import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BookFileSizes from '@/components/BookFileSizes.vue';
import { formatFileSize } from '@/utils/file-size';

describe('BookFileSizes', () => {
    it('shows every format with readable binary units', () => {
        const wrapper = mount(BookFileSizes, { props: { sizes: { MOBI: 1572864, EPUB: 1024, TXT: 0 } } });
        expect(wrapper.text()).toContain('EPUB · 1.0 KiB');
        expect(wrapper.text()).toContain('MOBI · 1.5 MiB');
        expect(wrapper.text()).toContain('TXT · 0 B');
    });
    it('omits unknown sizes rather than claiming zero bytes', () => {
        expect(mount(BookFileSizes).find('[data-testid="book-file-sizes"]').exists()).toBe(false);
        expect(formatFileSize(NaN)).toBe('—');
        expect(formatFileSize(-1)).toBe('—');
        expect(formatFileSize(1024 ** 3)).toBe('1.0 GiB');
    });
});
