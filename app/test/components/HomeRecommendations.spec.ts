import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const { backendMock } = vi.hoisted(() => ({ backendMock: vi.fn() }));

vi.mock('nuxt/app', () => ({
    useNuxtApp: () => ({ $backend: backendMock }),
}));

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key: string) => key }),
}));

import HomeRecommendations from '@/components/HomeRecommendations.vue';
import { localMdiPaths } from '@/utils/local-mdi-icons';

const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');

const books = Array.from({ length: 12 }, (_, index) => ({
    id: index + 1,
    title: `Book ${index + 1}`,
    author: `Author ${index + 1}`,
    img: `/get/cover/${index + 1}.jpg`,
    recommendation: {
        reason: 'A grounded reason.',
        evidence: ['library_rating'],
        confidence: 'medium',
    },
}));

const response = {
    err: 'ok',
    books,
    source: 'agent',
    fallback: false,
    preferences: {
        personalization_enabled: true,
        popular_enabled: true,
        topics: [],
        length: '',
        difficulty: '',
        seed_book_ids: [],
    },
};

const mountModule = () => {
    backendMock.mockReset();
    backendMock.mockResolvedValue(response);
    return mount(HomeRecommendations, {
        global: {
            plugins: [vuetify],
            stubs: { RouterLink: { template: '<a><slot /></a>' } },
        },
    });
};

afterEach(() => {
    document.body.innerHTML = '';
});

describe('HomeRecommendations.vue', () => {
    it('registers every icon used by the homepage module', () => {
        expect(localMdiPaths['mdi-refresh']).toBeTruthy();
        expect(localMdiPaths['mdi-tune']).toBeTruthy();
        expect(localMdiPaths['mdi-information-outline']).toBeTruthy();
        expect(localMdiPaths['mdi-note-text-outline']).toBeTruthy();
        expect(localMdiPaths['mdi-arrow-right']).toBeTruthy();
    });

    it('loads and renders a 12-book homepage shortlist', async () => {
        const wrapper = mountModule();
        await flushPromises();

        expect(backendMock).toHaveBeenCalledWith('/ai/recommendations?limit=12&refresh=0');
        expect(wrapper.findAll('[data-testid="home-recommendation-card"]')).toHaveLength(12);
        expect(wrapper.text()).toContain('A grounded reason.');
    });

    it('keeps recommendation controls behind a low-emphasis options button', async () => {
        const wrapper = mountModule();
        await flushPromises();

        const options = wrapper.get('[data-testid="recommendation-options"]');
        expect(options.attributes('aria-label')).toBe('recommendations.optionsTitle');
        expect(wrapper.text()).not.toContain('recommendations.notesUnavailable');
    });

    it('refreshes the homepage shortlist on demand', async () => {
        const wrapper = mountModule();
        await flushPromises();
        await wrapper.get('[aria-label="recommendations.refresh"]').trigger('click');
        await flushPromises();

        expect(backendMock).toHaveBeenLastCalledWith('/ai/recommendations?limit=12&refresh=1');
    });
});
