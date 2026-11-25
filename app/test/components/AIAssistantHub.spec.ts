// @vitest-environment nuxt
import { flushPromises, mount } from '@vue/test-utils';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#i18n', () => ({
    useI18n: () => ({
        locale: { value: 'zh-CN' },
        t: (key: string, params?: Record<string, string>) => params?.title ? `${key}:${params.title}` : key,
    }),
}));

const { backendMock, alertMock } = vi.hoisted(() => ({
    backendMock: vi.fn(),
    alertMock: vi.fn(),
}));

mockNuxtImport('useNuxtApp', () => {
    return () => ({ $backend: backendMock, $alert: alertMock });
});

const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');
(globalThis as Record<string, unknown>).visualViewport = {
    addEventListener: () => {}, removeEventListener: () => {},
    width: 1024, height: 768, scale: 1, offsetLeft: 0, offsetTop: 0,
};

import AIAssistantHub from '@/components/AIAssistantHub.vue';

const capabilityResponse = {
    err: 'ok',
    capabilities: [{
        id: 'summary_duck', name: '总结鸭 TOP5', description: '五组问答', icon: 'mdi-duck',
        scope: 'chapter', entry: '/library', available: true, reason: '',
    }],
    partial_errors: [],
};
const taskResponse = {
    err: 'ok',
    tasks: [{
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', feature: 'summary_duck', category: 'running', status: 'queued',
        progress: null, progress_message: '等待生成', updated_at: '2026-08-16T10:00:00', detail_url: '/read/1?ai_task=a',
        object: { library: 'local', book_id: 1, book_title: '百年孤独', chapter_title: '第一章' },
        allowed_actions: { cancel: true, retry: false }, safe_error: null,
    }],
    category_counts: { running: 1, pending_confirmation: 0, failed: 0, completed: 0 },
    libraries: [{ id: 'local', name: '本地书库' }],
    pagination: { page: 1, page_size: 12, total: 1, pages: 1 },
    partial_errors: [],
};

function installBackend(options: { capability?: Record<string, unknown>; tasks?: Record<string, unknown> } = {}) {
    backendMock.mockImplementation(async (url: string) => {
        if (url === '/ai/hub/capabilities') return options.capability || capabilityResponse;
        if (url.startsWith('/ai/hub/tasks?')) return options.tasks || taskResponse;
        if (url === '/ai/hub/events') return { err: 'ok' };
        if (url.endsWith('/cancel')) return { err: 'ok' };
        return { err: 'ok' };
    });
}

async function mountHub() {
    const wrapper = mount({
        components: { AIAssistantHub },
        template: '<v-app><AIAssistantHub /></v-app>',
    }, { global: { plugins: [vuetify] }, attachTo: document.body });
    await flushPromises();
    return wrapper;
}

describe('AIAssistantHub.vue', () => {
    beforeEach(() => {
        backendMock.mockReset();
        alertMock.mockReset();
        document.body.innerHTML = '';
        installBackend();
    });

    it('renders registered capabilities and minimal task summaries', async () => {
        const wrapper = await mountHub();

        expect(wrapper.text()).toContain('总结鸭 TOP5');
        expect(wrapper.text()).toContain('百年孤独');
        expect(wrapper.text()).toContain('第一章');
        expect(wrapper.text()).toContain('aiAssistant.statusRunning');
        expect(wrapper.find('a[href="/read/1?ai_task=a"]').exists()).toBe(true);
        expect(backendMock).toHaveBeenCalledWith('/ai/hub/events', expect.objectContaining({ method: 'POST' }));
        wrapper.unmount();
    });

    it('keeps capability and task failures local', async () => {
        installBackend({
            capability: { err: 'exception', msg: '能力接口失败' },
            tasks: { ...taskResponse, tasks: [], partial_errors: [{ feature: 'future', code: 'task_projection_failed' }] },
        });
        const wrapper = await mountHub();

        expect(wrapper.get('[data-testid="capabilities-error"]').text()).toContain('能力接口失败');
        expect(wrapper.get('[data-testid="tasks-partial-error"]').text()).toContain('aiAssistant.partialError');
        expect(wrapper.get('[data-testid="tasks-empty"]').exists()).toBe(true);
        wrapper.unmount();
    });

    it('refetches by status and confirms cancellation before posting the action', async () => {
        const wrapper = await mountHub();
        const failedFilter = wrapper.findAll('button').find(button => button.text().includes('aiAssistant.statusFailed'));
        await failedFilter?.trigger('click');
        await flushPromises();
        expect(backendMock).toHaveBeenCalledWith(expect.stringContaining('category=failed'));

        const cancelButton = wrapper.findAll('button').find(button => button.text().trim() === 'common.cancel');
        await cancelButton?.trigger('click');
        await flushPromises();
        expect(document.body.textContent).toContain('aiAssistant.cancelTitle');
        const confirm = Array.from(document.body.querySelectorAll('button'))
            .find(button => button.textContent?.includes('aiAssistant.confirmCancel')) as HTMLButtonElement;
        confirm.click();
        await flushPromises();
        expect(backendMock).toHaveBeenCalledWith(
            '/ai/hub/tasks/summary_duck/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/cancel',
            { method: 'POST' },
        );
        wrapper.unmount();
    });
});
