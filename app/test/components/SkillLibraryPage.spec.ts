// @vitest-environment nuxt
import { flushPromises, mount } from '@vue/test-utils';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string, params?: Record<string, unknown>) => params ? `${key}:${JSON.stringify(params)}` : key,
    }),
}));

const { backendMock } = vi.hoisted(() => ({ backendMock: vi.fn() }));

mockNuxtImport('useNuxtApp', () => {
    return () => ({ $backend: backendMock });
});

global.ResizeObserver = require('resize-observer-polyfill');
(globalThis as Record<string, unknown>).visualViewport = {
    addEventListener: () => {}, removeEventListener: () => {},
    width: 1024, height: 768, scale: 1, offsetLeft: 0, offsetTop: 0,
};
const vuetify = createVuetify({ components, directives });

import SkillLibraryPage from '@/components/SkillLibraryPage.vue';

const version = {
    id: 11,
    version: 1,
    content_hash: 'abcdef0123456789',
    source: { kind: 'blank' },
    created_at: '2026-08-16T08:00:00',
    markdown: '# 摘要整理\n\n只处理提供的内容。',
    manifest: {
        name: '摘要整理',
        description: '把输入整理成固定格式。',
        scope: '阅读内容',
        prerequisites: [],
        trigger: '手动运行',
        input_schema: {
            type: 'object',
            properties: { content: { type: 'string' } },
            required: ['content'],
            additionalProperties: false,
        },
        steps: ['理解输入', '返回结果'],
        terms_examples: [],
        failure_conditions: ['输入无效时停止'],
        output_schema: {
            type: 'object',
            properties: { result: { type: 'string' } },
            required: ['result'],
            additionalProperties: false,
        },
        sources: [],
        self_tests: [],
    },
};

const skill = {
    id: '11111111-1111-1111-1111-111111111111',
    name: '摘要整理',
    description: '把输入整理成固定格式。',
    status: 'enabled',
    current_version: 1,
    version,
};

const succeededRun = {
    id: '22222222-2222-2222-2222-222222222222',
    mode: 'trial',
    version: 1,
    status: 'succeeded',
    progress_message: '运行完成',
    input_summary: { fields: [{ name: 'content', type: 'str', size: 12 }] },
    authorization_context: { book_ids: [], verified_for_user: 1 },
    result: { result: '结构化结果' },
    error: null,
};

function installBackend() {
    backendMock.mockImplementation(async (url: string, options?: { method?: string }) => {
        if (url.startsWith('/ai/skills?')) return { err: 'ok', skills: [skill] };
        if (url === '/ai/skills' && options?.method === 'POST') return { err: 'ok', skill };
        if (url === `/ai/skills/${skill.id}`) return { err: 'ok', skill };
        if (url.endsWith('/versions')) return { err: 'ok', versions: [version] };
        if (url.endsWith('/runs')) return { err: 'ok', runs: [succeededRun] };
        throw new Error(`unexpected request ${url}`);
    });
}

function mountPage() {
    return mount(
        { components: { SkillLibraryPage }, template: '<v-app><SkillLibraryPage /></v-app>' },
        { global: { plugins: [vuetify] }, attachTo: document.body },
    );
}

describe('SkillLibraryPage.vue', () => {
    beforeEach(() => {
        backendMock.mockReset();
        installBackend();
    });

    it('loads the private list and exposes structured editing plus a safe preview', async () => {
        const wrapper = mountPage();
        await flushPromises();
        expect(wrapper.text()).toContain('摘要整理');

        await wrapper.find('button.skill-list-item').trigger('click');
        await flushPromises();
        const schemaPanel = wrapper.findAll('button').find(button => button.text() === 'skills.schemas');
        await schemaPanel?.trigger('click');
        await flushPromises();
        expect(wrapper.text()).toContain('skills.inputSchema');
        expect(wrapper.text()).toContain('skills.markdownBody');

        const previewTab = wrapper.findAll('button').find(button => button.text() === 'skills.preview');
        await previewTab?.trigger('click');
        await flushPromises();
        expect(wrapper.find('[data-testid="skill-preview"]').text()).toContain('只处理提供的内容');
        wrapper.unmount();
    });

    it('creates a blank draft through the authenticated backend helper', async () => {
        const wrapper = mountPage();
        await flushPromises();
        await wrapper.find('[data-testid="create-blank-skill"]').trigger('click');
        await flushPromises();

        expect(backendMock).toHaveBeenCalledWith(
            '/ai/skills',
            expect.objectContaining({ method: 'POST', body: '{}' }),
        );
        wrapper.unmount();
    });

    it('shows version, input summary, authorization context, and one terminal state for each run', async () => {
        const wrapper = mountPage();
        await flushPromises();
        await wrapper.find('button.skill-list-item').trigger('click');
        await flushPromises();

        const runsTab = wrapper.findAll('button').find(button => button.text() === 'skills.runs');
        await runsTab?.trigger('click');
        await flushPromises();
        const card = wrapper.find('[data-testid="skill-run-succeeded"]');
        expect(card.text()).toContain('v1');
        expect(card.text()).toContain('content:str(12)');
        expect(card.text()).toContain('skills.noResourceAuthorization');
        expect(card.text()).toContain('运行完成');
        expect(card.text()).toContain('结构化结果');
        expect(card.findAll('.v-chip')).toHaveLength(1);
        wrapper.unmount();
    });

    it('asks before replacing unsaved editor changes', async () => {
        const wrapper = mountPage();
        await flushPromises();
        await wrapper.find('button.skill-list-item').trigger('click');
        await flushPromises();

        const nameInput = wrapper.findAll('input').find(input => input.element.value === '摘要整理');
        await nameInput?.setValue('尚未保存的名称');
        const enableButton = wrapper.findAll('button').find(button => button.text() === 'skills.enable');
        expect(enableButton?.attributes('disabled')).toBeDefined();
        const runsTab = wrapper.findAll('button').find(button => button.text() === 'skills.runs');
        await runsTab?.trigger('click');
        await flushPromises();
        expect(wrapper.text()).toContain('skills.syncBeforeRun');
        const trialButton = wrapper.findAll('button').find(button => button.text() === 'skills.trialRun');
        expect(trialButton?.attributes('disabled')).toBeDefined();
        const versionsTab = wrapper.findAll('button').find(button => button.text() === 'skills.versions');
        await versionsTab?.trigger('click');
        await flushPromises();
        const inspectButton = wrapper.findAll('button').find(button => button.text() === 'skills.inspectVersion');
        await inspectButton?.trigger('click');
        await flushPromises();

        expect(document.body.textContent).toContain('skills.unsavedTitle');
        expect(nameInput?.element.value).toBe('尚未保存的名称');
        const discardButton = Array.from(document.body.querySelectorAll('button'))
            .find(button => button.textContent?.trim() === 'skills.discardChanges');
        discardButton?.click();
        await flushPromises();
        expect(nameInput?.element.value).toBe('摘要整理');
        wrapper.unmount();
    });
});
