import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key: string) => key }),
}));

import RecommendationCard from '@/components/RecommendationCard.vue';

const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');

const book = {
    id: 7,
    title: '芳华',
    author: '严歌苓',
    img: '/get/cover/7.jpg',
    state: { wants: 0 },
    recommendation: {
        reason: '延续你选择的文学主题，不涉及情节剧透。',
        evidence: ['topic:文学', 'library_rating'],
        confidence: 'medium' as const,
    },
};

const mountCard = (value = book) => mount(RecommendationCard, {
    props: { book: value },
    global: {
        plugins: [vuetify],
        stubs: { NuxtLink: { template: '<a><slot /></a>' } },
    },
});

describe('RecommendationCard.vue', () => {
    it('renders a grounded reason, evidence, confidence, and reading actions', () => {
        const wrapper = mountCard();
        expect(wrapper.text()).toContain('芳华');
        expect(wrapper.text()).toContain('延续你选择的文学主题');
        expect(wrapper.text()).toContain('recommendations.evidenceTypes.topic');
        expect(wrapper.text()).toContain('recommendations.evidenceTypes.library_rating');
        expect(wrapper.text()).toContain('recommendations.confidence.medium');
        expect(wrapper.text()).toContain('recommendations.startReading');
        expect(wrapper.text()).toContain('recommendations.addShelf');
        expect(wrapper.get('.recommendation-card__author').classes()).toContain('text-medium-emphasis');
    });

    it('emits shelf action and disables it once the book is on the shelf', async () => {
        const wrapper = mountCard();
        const shelf = wrapper.findAllComponents({ name: 'VBtn' }).find(button => button.text() === 'recommendations.addShelf');
        expect(shelf).toBeDefined();
        await shelf!.trigger('click');
        expect(wrapper.emitted('add-shelf')?.[0]?.[0]).toMatchObject({ id: 7 });

        const onShelf = mountCard({ ...book, state: { wants: 1 } });
        const disabled = onShelf.findAllComponents({ name: 'VBtn' }).find(button => button.text() === 'recommendations.onShelf');
        expect(disabled?.props('disabled')).toBe(true);
    });

    it('uses the canonical read and detail destinations', () => {
        const wrapper = mountCard();
        const readButton = wrapper.findAllComponents({ name: 'VBtn' }).find(button => button.text() === 'recommendations.startReading');
        const detailButton = wrapper.findAllComponents({ name: 'VBtn' }).find(button => button.text() === 'recommendations.details');
        expect(readButton?.attributes('href')).toBe('/read/7');
        expect(detailButton?.props('to')).toBe('/book/7');
    });
});
