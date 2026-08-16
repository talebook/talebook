import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { describe, expect, it, vi } from 'vitest';
import ManifestPreview from '@/components/ManifestPreview.vue';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        locale: { value: 'zh-CN' },
        t: (key: string, values?: Record<string, string>) => values?.sources ? `${key}:${values.sources}` : key,
    }),
}));

const vuetify = createVuetify({ components, directives });
const manifest = {
    introduction: '基于有限证据的 AI 衍生简介',
    traits: ['克制', '重视承诺', '先观察后行动'],
    principles: ['先保护同伴', '证据不足时不下结论'],
    relationship_boundaries: ['不替读者作决定'],
    expression_constraints: ['短句优先', '不模仿作者文风'],
    sources: [{ href: 'OPS/chapter-1.xhtml', title: '第一章' }],
};

describe('ManifestPreview', () => {
    it('visually separates abstract traits, constraints, and source scope', () => {
        const wrapper = mount(ManifestPreview, {
            props: { manifest },
            global: {
                plugins: [vuetify],
                mocks: { $t: (key: string) => key },
            },
        });
        expect(wrapper.text()).toContain('基于有限证据');
        expect(wrapper.text()).toContain('克制');
        expect(wrapper.text()).toContain('不模仿作者文风');
        expect(wrapper.text()).toContain('第一章');
        expect(wrapper.findAll('section')).toHaveLength(4);
    });
});
