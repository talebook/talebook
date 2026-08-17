import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key: string) => key }),
}));

import PluginRunItemPreview from '@/components/PluginRunItemPreview.vue';

describe('PluginRunItemPreview', () => {
    it('shows per-field decisions without treating locked fields as applied', () => {
        const wrapper = mount(PluginRunItemPreview, {
            props: {
                data: {
                    fields: [
                        { field: 'title', current: '人工标题', candidate: '来源标题', decision: 'locked' },
                        { field: 'publisher', current: '', candidate: 'Open Library', decision: 'fill_empty' },
                    ],
                },
            },
        });
        expect(wrapper.text()).toContain('人工标题');
        expect(wrapper.text()).toContain('pluginManagement.preview_locked');
        expect(wrapper.text()).toContain('pluginManagement.preview_fill_empty');
        expect(wrapper.find('[data-decision="locked"]').exists()).toBe(true);
    });

    it('keeps source-specific rating scale, sample count, time and link visible', () => {
        const wrapper = mount(PluginRunItemPreview, {
            props: {
                data: {
                    source: 'bangumi',
                    rating: { value: 8.2, scale: 10, sample_count: 4321 },
                    source_time: '2026-08-17',
                    source_url: 'https://bgm.tv/subject/1',
                },
            },
        });
        expect(wrapper.text()).toContain('8.2 / 10');
        expect(wrapper.text()).toContain('4321');
        expect(wrapper.get('a').attributes()).toMatchObject({
            href: 'https://bgm.tv/subject/1',
            rel: 'noopener noreferrer',
        });
    });

    it('does not render a non-HTTP source URL as a link', () => {
        const wrapper = mount(PluginRunItemPreview, {
            props: { data: { source: 'file', rating: { value: 4, scale: 5 }, source_url: 'javascript:alert(1)' } },
        });
        expect(wrapper.find('a').exists()).toBe(false);
    });
});
