import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key: string, values?: Record<string, unknown>) => `${key}${values ? JSON.stringify(values) : ''}` }),
}));
const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');
(globalThis as Record<string, unknown>).visualViewport = {
    addEventListener: () => {},
    removeEventListener: () => {},
    width: 1024,
    height: 768,
    scale: 1,
    offsetLeft: 0,
    offsetTop: 0,
};

import AIMetadataReviewDialog from '@/components/AIMetadataReviewDialog.vue';

const task = {
    id: 'task-1',
    status: 'succeeded',
    progress_message: '分析完成',
    editable: true,
    counts: { total: 1, succeeded: 1, failed: 0, cancelled: 0 },
    items: [{
        book_id: 1,
        status: 'succeeded',
        original: { title: '旧书名' },
        suggestions: [{
            field: 'title',
            old_value: '旧书名',
            value: '新书名',
            confidence: 0.92,
            reason: '来源明确',
            evidence: [{ source_id: 'library:comments', source_label: '书库现有简介', quote: '新书名' }],
            has_evidence: true,
            conflict: true,
            default_selected: true,
        }, {
            field: 'publisher',
            old_value: '',
            value: '推断出版社',
            confidence: 0.99,
            reason: '仅模型推断',
            evidence: [{ source_id: 'model_inference', source_label: '模型推断', quote: '' }],
            has_evidence: false,
            conflict: false,
            default_selected: false,
        }],
    }],
};

const mountDialog = () => mount(AIMetadataReviewDialog, {
    global: { plugins: [vuetify] },
    props: { modelValue: true, bookIds: [1], initialTask: task, requester: vi.fn() },
    attachTo: document.body,
});

describe('AIMetadataReviewDialog.vue', () => {
    it('shows old/new values, evidence, confidence and conflicts', async () => {
        const wrapper = mountDialog();
        await wrapper.vm.$nextTick();
        const text = document.body.textContent || '';
        expect(text).toContain('旧书名');
        expect(text).toContain('新书名');
        expect(text).toContain('92%');
        expect(text).toContain('aiMetadata.librarySource');
        expect(text).not.toContain('library:comments');
        expect(text).toContain('aiMetadata.conflict');
        expect(document.body.querySelector('[role="status"]')?.textContent).toContain('分析完成');
        expect(document.body.querySelector('input[type="checkbox"]')?.getAttribute('aria-label')).toContain('旧书名');
        wrapper.unmount();
    });

    it('selects only evidenced high-confidence suggestions by default', async () => {
        const wrapper = mountDialog();
        await wrapper.vm.$nextTick();
        const checkboxes = Array.from(document.body.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
        expect(checkboxes).toHaveLength(2);
        expect(checkboxes[0].checked).toBe(true);
        expect(checkboxes[1].checked).toBe(false);
        expect(document.body.textContent).toContain('aiMetadata.noVerifiableEvidence');
        wrapper.unmount();
    });
});
