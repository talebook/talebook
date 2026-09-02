// @vitest-environment nuxt
import { flushPromises, mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { asyncDataState, backendMock, pushMock, setNavbarMock } = vi.hoisted(() => ({
    asyncDataState: {
        value: null as null | {
            err: string;
            title: string;
            total: number;
            books: Array<Record<string, unknown>>;
        },
    },
    backendMock: vi.fn(),
    pushMock: vi.fn(),
    setNavbarMock: vi.fn(),
}));

vi.mock('nuxt/app', () => ({
    useAsyncData: vi.fn(() => ({ data: asyncDataState })),
    useNuxtApp: () => ({ $backend: backendMock }),
}));

vi.mock('vue-router', () => ({
    useRoute: () => ({
        fullPath: '/author/Jane%20Austen',
        query: {},
    }),
    useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/stores/main', () => ({
    useMainStore: () => ({ setNavbar: setNavbarMock }),
}));

const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');

import BookList from '@/components/BookList.vue';

describe('BookList.vue', () => {
    beforeEach(() => {
        backendMock.mockReset();
        pushMock.mockReset();
        setNavbarMock.mockReset();
        asyncDataState.value = {
            err: 'ok',
            title: '"Jane Austen"编著的书籍',
            total: 2,
            books: [
                { id: 1, title: 'Pride and Prejudice', img: '/get/cover/1.jpg', comments: 'English edition' },
                { id: 2, title: '傲慢与偏见（示例译本）', img: '/get/cover/2.jpg', comments: 'Chinese edition' },
            ],
        };
    });

    it('renders author books restored from the SSR payload without repeating the request', async () => {
        const wrapper = mount(
            { components: { BookList }, template: '<v-app><BookList /></v-app>' },
            { global: { plugins: [vuetify] } },
        );
        await flushPromises();

        expect(wrapper.text()).toContain('"Jane Austen"编著的书籍');
        expect(wrapper.findAll('[data-testid="book-card"]')).toHaveLength(2);
        expect(wrapper.text()).toContain('Pride and Prejudice');
        expect(wrapper.text()).toContain('傲慢与偏见（示例译本）');
        expect(backendMock).not.toHaveBeenCalled();
        wrapper.unmount();
    });
});
