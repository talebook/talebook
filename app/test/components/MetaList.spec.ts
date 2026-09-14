import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const { backend } = vi.hoisted(() => ({ backend: vi.fn() }));
vi.mock('nuxt/app', () => ({ useNuxtApp: () => ({ $backend: backend }), useHead: vi.fn() }));
vi.mock('vue-router', () => ({ useRoute: () => ({ path: '/tag' }) }));
vi.mock('@/stores/main', () => ({ useMainStore: () => ({ setNavbar: vi.fn() }) }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

import MetaList from '@/components/MetaList.vue';

const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');

function result(page = 1, total = 1001) {
    return {
        err: 'ok', total, unfiltered_total: 1001, pages: Math.max(1, Math.ceil(total / 100)),
        items: Array.from({ length: Math.min(100, total - (page - 1) * 100) }, (_, i) => ({
            id: (page - 1) * 100 + i, name: `Tag${(page - 1) * 100 + i}`, count: 1
        }))
    };
}

describe('MetaList server pagination', () => {
    beforeEach(() => { backend.mockReset(); });

    it('requests only the selected page, searches on the server and resets category/search pages', async () => {
        backend.mockImplementation(async (path: string) => {
            const url = new URL(path, 'http://test');
            return result(Number(url.searchParams.get('page')), url.searchParams.get('q') ? 1 : 1001);
        });
        const wrapper = mount(MetaList, { global: { plugins: [vuetify] } });
        await flushPromises();
        expect(backend).toHaveBeenCalledTimes(1);
        expect(backend).toHaveBeenLastCalledWith('/tag?page=1&page_size=100');
        expect(wrapper.findAll('.v-chip')).toHaveLength(100);
        wrapper.getComponent({ name: 'VPagination' }).vm.$emit('update:modelValue', 11);
        await flushPromises();
        expect(backend).toHaveBeenLastCalledWith('/tag?page=11&page_size=100');
        expect(wrapper.findAll('.v-chip')).toHaveLength(1);
        expect(wrapper.text()).toContain('Tag1000');
        await wrapper.get('input').setValue('  Last  ');
        await flushPromises();
        expect(backend).toHaveBeenLastCalledWith('/tag?page=1&page_size=100&q=Last');
        expect(wrapper.findComponent({ name: 'VPagination' }).exists()).toBe(false);
        await wrapper.setProps({ metaType: 'author' });
        await flushPromises();
        expect(backend).toHaveBeenLastCalledWith('/author?page=1&page_size=100');
        expect(backend).toHaveBeenCalledTimes(4);
        wrapper.unmount();
    });

    it('shows request failures with retry and never displays previous-page results as current', async () => {
        backend.mockResolvedValueOnce(result()).mockRejectedValueOnce(new Error('offline'));
        const wrapper = mount(MetaList, { global: { plugins: [vuetify] } });
        await flushPromises();
        wrapper.getComponent({ name: 'VPagination' }).vm.$emit('update:modelValue', 2);
        await flushPromises();
        expect(wrapper.get('[role="alert"]').text()).toContain('errors.networkError');
        expect(wrapper.findAll('.v-chip')).toHaveLength(0);
        backend.mockResolvedValueOnce(result(2));
        await wrapper.get('[role="alert"] button').trigger('click');
        await flushPromises();
        expect(backend).toHaveBeenLastCalledWith('/tag?page=2&page_size=100');
        expect(wrapper.text()).toContain('Tag100');
        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
        wrapper.unmount();
    });
});
