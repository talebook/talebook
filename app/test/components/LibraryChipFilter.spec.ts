import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string, params?: Record<string, string | number>) => ({
            'messages.all': '全部',
            'messages.colon': '：',
            'messages.more': '显示更多',
            'library.selectFilter': `选择${params?.label}`,
            'library.filterPickerSummary': `共 ${params?.count} 项 · 第 ${params?.page} / ${params?.pages} 页`,
            'library.filterPickerSearchSummary': `找到 ${params?.count} / ${params?.total} 项 · 第 ${params?.page} / ${params?.pages} 页`,
            'library.filterPickerPageSize': `每页 ${params?.count} 项`,
            'library.closeFilterPicker': `关闭${params?.label}选择`,
            'library.searchFilter': `搜索${params?.label}`,
            'library.searchFilterHint': '输入关键词筛选',
            'library.noMatchingFilter': `没有匹配的${params?.label}`,
            'library.clearFilterSearch': '清除搜索',
        }[key] || key),
    }),
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

import LibraryChipFilter from '@/components/LibraryChipFilter.vue';

const items = Array.from({ length: 120 }, (_, index) => ({
    id: index + 1,
    name: `测试标签${index + 1}`,
    count: 120 - index,
}));

const mountFilter = (props = {}) => mount(LibraryChipFilter, {
    attachTo: document.body,
    global: {
        plugins: [vuetify],
    },
    props: {
        label: '标签',
        filterKey: 'tag',
        items,
        ...props,
    },
});

const setSearch = async (value: string) => {
    const input = document.querySelector<HTMLInputElement>('[data-testid="library-filter-tag-search"] input');
    expect(input).not.toBeNull();
    input!.value = value;
    input!.dispatchEvent(new Event('input', { bubbles: true }));
    await flushPromises();
};

afterEach(() => {
    document.body.innerHTML = '';
});

describe('LibraryChipFilter.vue', () => {
    it('opens a bounded picker and paginates a large option list', async () => {
        const wrapper = mountFilter();

        expect(wrapper.findAll('.library-filter-option')).toHaveLength(10);
        expect(wrapper.text()).toContain('显示更多（110）');
        expect(wrapper.text()).not.toContain('测试标签11');

        await wrapper.get('[data-testid="library-filter-tag-more"]').trigger('click');
        await flushPromises();

        expect(document.querySelector('[data-testid="library-filter-tag-picker"]')).not.toBeNull();
        expect(document.querySelectorAll('.library-filter-picker__option')).toHaveLength(100);
        expect(document.body.textContent).toContain('共 120 项 · 第 1 / 2 页');
        expect(document.body.textContent).toContain('测试标签100');
        expect(document.body.textContent).not.toContain('测试标签101');

        wrapper.getComponent({ name: 'VPagination' }).vm.$emit('update:modelValue', 2);
        await wrapper.vm.$nextTick();

        expect(document.querySelectorAll('.library-filter-picker__option')).toHaveLength(20);
        expect(document.body.textContent).toContain('共 120 项 · 第 2 / 2 页');
        expect(document.body.textContent).toContain('测试标签101');
        expect(document.body.textContent).toContain('测试标签120');
        wrapper.unmount();
    });

    it('filters the picker, resets pagination, and recovers from an empty result', async () => {
        const wrapper = mountFilter();

        await wrapper.get('[data-testid="library-filter-tag-more"]').trigger('click');
        await flushPromises();
        wrapper.getComponent({ name: 'VPagination' }).vm.$emit('update:modelValue', 2);
        await wrapper.vm.$nextTick();

        await setSearch('  标签11  ');
        expect(document.querySelectorAll('.library-filter-picker__option')).toHaveLength(11);
        expect(document.body.textContent).toContain('找到 11 / 120 项 · 第 1 / 1 页');
        expect(document.body.textContent).toContain('测试标签11');
        expect(document.body.textContent).toContain('测试标签119');
        expect(document.body.textContent).not.toContain('测试标签120');

        await setSearch('没有这个标签');
        expect(document.querySelectorAll('.library-filter-picker__option')).toHaveLength(0);
        expect(document.body.textContent).toContain('没有匹配的标签');
        expect(document.body.textContent).toContain('找到 0 / 120 项 · 第 1 / 1 页');

        const clearButton = document.querySelector<HTMLElement>('[data-testid="library-filter-tag-clear-search"]');
        expect(clearButton).not.toBeNull();
        clearButton!.click();
        await flushPromises();
        expect(document.querySelectorAll('.library-filter-picker__option')).toHaveLength(100);
        expect(document.body.textContent).toContain('共 120 项 · 第 1 / 2 页');
        wrapper.unmount();
    });

    it('opens on the selected page, emits a choice, and closes the picker', async () => {
        const wrapper = mountFilter({ modelValue: '测试标签117' });

        const selected = wrapper.findAll('.library-filter-option')
            .find(chip => chip.text() === '测试标签117');
        expect(wrapper.findAll('.library-filter-option')).toHaveLength(11);
        expect(selected?.attributes('aria-pressed')).toBe('true');
        expect(wrapper.text()).toContain('显示更多（109）');

        await wrapper.get('[data-testid="library-filter-tag-more"]').trigger('click');
        await flushPromises();
        expect(document.body.textContent).toContain('共 120 项 · 第 2 / 2 页');

        await setSearch('标签117');
        expect(document.querySelectorAll('.library-filter-picker__option')).toHaveLength(1);

        const pickerChoice = Array.from(document.querySelectorAll<HTMLElement>('.library-filter-picker__option'))
            .find(chip => chip.textContent === '测试标签117');
        pickerChoice?.click();
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted('update:modelValue')).toEqual([['测试标签117']]);
        expect(wrapper.getComponent({ name: 'VDialog' }).props('modelValue')).toBe(false);

        await wrapper.get('[data-testid="library-filter-tag-more"]').trigger('click');
        await flushPromises();
        const reopenedSearch = document.querySelector<HTMLInputElement>('[data-testid="library-filter-tag-search"] input');
        expect(reopenedSearch?.value).toBe('');
        expect(document.body.textContent).toContain('共 120 项 · 第 2 / 2 页');

        await wrapper.findAll('.library-filter-chip')[0].trigger('click');
        expect(wrapper.emitted('update:modelValue')).toEqual([
            ['测试标签117'],
            [null],
        ]);
        wrapper.unmount();
    });
});
