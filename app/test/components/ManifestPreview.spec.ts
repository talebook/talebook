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
    thinking_patterns: ['克制', '重视承诺', '先观察后行动'],
    decision_principles: ['先保护同伴', '证据不足时先试验'],
    problem_solving_steps: ['明确冲突', '识别不可逆代价', '选择最小行动'],
    blind_spots: ['可能为了关系而延迟退出'],
    sources: [{ href: 'OPS/chapter-1.xhtml', title: '第一章' }],
};

describe('ManifestPreview', () => {
    it('separates thinking patterns, problem-solving steps, blind spots, and sources', () => {
        const wrapper = mount(ManifestPreview, {
            props: { manifest },
            global: {
                plugins: [vuetify],
                mocks: { $t: (key: string) => key },
            },
        });
        expect(wrapper.text()).toContain('基于有限证据');
        expect(wrapper.text()).toContain('克制');
        expect(wrapper.text()).toContain('选择最小行动');
        expect(wrapper.text()).toContain('延迟退出');
        expect(wrapper.text()).toContain('第一章');
        expect(wrapper.findAll('section')).toHaveLength(4);
    });
});
