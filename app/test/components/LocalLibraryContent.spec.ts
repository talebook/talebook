import { flushPromises, mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { expect, it, vi } from 'vitest';

const { backend, stream } = vi.hoisted(() => ({ backend: vi.fn(), stream: vi.fn() }));
vi.mock('nuxt/app', () => ({
    useNuxtApp: () => ({ $backend: backend, $backend_stream: stream }),
    useRoute: () => ({ query: {} }), useHead: vi.fn()
}));
vi.mock('@/stores/main', () => ({ useMainStore: () => ({ setNavbar: vi.fn(), sys: {} }) }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('@/components/BookCards.vue', () => ({ default: { template: '<div />' } }));

import LocalLibraryContent from '@/components/library/LocalLibraryContent.vue';
const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');
(globalThis as Record<string, unknown>).visualViewport = {
    addEventListener: () => {}, removeEventListener: () => {}, width: 1024, height: 768,
    scale: 1, offsetLeft: 0, offsetTop: 0
};

it('loads only ten options per filter and applies a remotely selected author to the first book page', async () => {
    backend.mockImplementation(async (path: string) => {
        const url = new URL(path, 'http://test');
        const size = Number(url.searchParams.get('page_size'));
        return {
            err: 'ok', total: 1001, pages: Math.ceil(1001 / size),
            items: Array.from({ length: size }, (_, i) => ({ id: i, name: `Author${i}`, count: 1 }))
        };
    });
    stream.mockImplementation(async function* () { yield { total: 0 }; });
    const wrapper = mount(LocalLibraryContent, {
        attachTo: document.body,
        global: { plugins: [vuetify], mocks: { $t: (key: string) => key }, stubs: { BookCards: true } }
    });
    await flushPromises();
    expect(backend.mock.calls.map(call => call[0]).sort()).toEqual(
        ['author', 'format', 'publisher', 'tag'].map(type => `/${type}?page=1&page_size=10`)
    );
    await wrapper.get('[data-testid="library-filter-author-more"]').trigger('click');
    await flushPromises();
    expect(backend).toHaveBeenLastCalledWith('/author?page=1&page_size=100');
    const option = document.querySelector<HTMLElement>('.library-filter-picker__option');
    option!.click();
    await flushPromises();
    expect(stream).toHaveBeenLastCalledWith('/library?start=0&size=60&author=Author0&stream=1');
    expect(backend).toHaveBeenCalledTimes(5);
    wrapper.unmount();
    document.body.replaceChildren();
});
