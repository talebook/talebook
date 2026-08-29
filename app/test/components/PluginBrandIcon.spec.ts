import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import PluginBrandIcon from '../../components/PluginBrandIcon.vue';

describe('PluginBrandIcon', () => {
    it('renders the provider-declared local brand asset', () => {
        const wrapper = mount(PluginBrandIcon, {
            props: {
                brandIcon: '/images/plugin-icons/weread.png',
                icon: 'mdi-book-open-page-variant',
            },
            global: {
                stubs: {
                    VImg: { template: '<img :src="src" :alt="alt">', props: ['src', 'alt'] },
                    VIcon: { template: '<i><slot /></i>' },
                },
            },
        });

        expect(wrapper.get('img').attributes('src')).toBe('/images/plugin-icons/weread.png');
        expect(wrapper.find('i').exists()).toBe(false);
    });

    it('keeps the MDI icon as a resilient fallback', async () => {
        const wrapper = mount(PluginBrandIcon, {
            props: {
                brandIcon: '/images/plugin-icons/missing.png',
                icon: 'mdi-bookshelf',
            },
            global: {
                stubs: {
                    VImg: { template: '<img @error="$emit(\'error\')">' },
                    VIcon: { template: '<i><slot /></i>' },
                },
            },
        });

        await wrapper.get('img').trigger('error');

        expect(wrapper.get('i').text()).toContain('mdi-bookshelf');
    });
});
