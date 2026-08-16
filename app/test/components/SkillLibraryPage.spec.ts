import { flushPromises, mount } from '@vue/test-utils';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
        package_name: 'reading-summary',
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

const packageInfo = {
    name: 'reading-summary',
    folder: 'reading-summary',
    filename: 'reading-summary-v1.zip',
    version: 1,
    format: 'agent-skills.v1',
    download_url: `/api/ai/skills/${skill.id}/download?version=1`,
    files: [
        {
            path: 'SKILL.md',
            content_type: 'text/markdown',
            size: 132,
            content: '---\nname: reading-summary\ndescription: "整理摘要。 Use when: 手动运行"\n---\n\n# 摘要整理',
        },
        {
            path: 'references/contract.json',
            content_type: 'application/json',
            size: 52,
            content: '{\n  "input_schema": { "type": "object" }\n}',
        },
    ],
};

function installBackend() {
    backendMock.mockImplementation(async (url: string, options?: { method?: string }) => {
        if (url.startsWith('/ai/skills?')) return { err: 'ok', skills: [skill] };
        if (url === '/ai/skills' && options?.method === 'POST') return { err: 'ok', skill };
        if (url === `/ai/skills/${skill.id}` && options?.method === 'DELETE') return { err: 'ok' };
        if (url === `/ai/skills/${skill.id}`) return { err: 'ok', skill };
        if (url.startsWith(`/ai/skills/${skill.id}/package?`)) return { err: 'ok', package: packageInfo };
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

    it('keeps package copy in the skills locale namespace', () => {
        for (const locale of ['zh-CN', 'en-US']) {
            const messages = JSON.parse(readFileSync(resolve(`i18n/locales/${locale}.json`), 'utf8'));
            expect(messages.skills.packageName).toBeTruthy();
            expect(messages.skills.packageNameHint).toBeTruthy();
        }
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

    it('shows a compliant package, exposes ZIP download, and confirms deletion', async () => {
        const wrapper = mountPage();
        await flushPromises();
        await wrapper.find('button.skill-list-item').trigger('click');
        await flushPromises();

        const packageTab = wrapper.findAll('button').find(button => button.text() === 'skills.packageFiles');
        await packageTab?.trigger('click');
        await flushPromises();
        const browser = wrapper.find('[data-testid="skill-package-browser"]');
        expect(browser.text()).toContain('reading-summary-v1.zip');
        expect(browser.text()).toContain('SKILL.md');
        expect(browser.text()).toContain('name: reading-summary');
        expect(wrapper.find('[data-testid="download-skill-package"]').attributes('href')).toBe(packageInfo.download_url);

        await wrapper.find('[data-testid="delete-skill"]').trigger('click');
        await flushPromises();
        const confirm = document.body.querySelector('[data-testid="confirm-delete-skill"]') as HTMLButtonElement;
        confirm.click();
        await flushPromises();
        expect(backendMock).toHaveBeenCalledWith(
            `/ai/skills/${skill.id}`,
            expect.objectContaining({ method: 'DELETE' }),
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
