import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        locale: { value: 'zh-CN' },
        t: (key: string, params?: Record<string, unknown>) => {
            if (key === 'annotations.sources.talebook') return 'Talebook 原生';
            if (key === 'annotations.sources.weread') return '微信读书';
            if (key === 'annotations.chapterOnly') return '仅章节定位';
            if (key === 'annotations.rollbackPartial') return `部分 ${params?.deleted}/${params?.total}`;
            return key;
        },
    }),
}));

const { backendMock } = vi.hoisted(() => ({ backendMock: vi.fn() }));

const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');
(globalThis as Record<string, unknown>).visualViewport = {
    addEventListener: () => {}, removeEventListener: () => {},
    width: 1024, height: 768, scale: 1, offsetLeft: 0, offsetTop: 0,
};

import AnnotationPanel from '@/components/AnnotationPanel.vue';

const sample = [
    {
        id: 1,
        annotation_type: 'highlight',
        chapter: '第一章',
        cfi: null,
        quote_text: '原文引用',
        content: '微信读书笔记',
        can_edit: true,
        created_at: '2026-08-14T10:00:00',
        updated_at: '2026-08-14T10:00:00',
        sources: [{ source_name: 'weread', source_connection_id: 'conn', source_run_id: 'run-1' }],
    },
    {
        id: 2,
        annotation_type: 'note',
        chapter: '第二章',
        cfi: 'epubcfi(/6/4)',
        quote_text: '',
        content: 'Talebook 笔记',
        can_edit: false,
        created_at: '2026-08-14T10:00:00',
        updated_at: '2026-08-14T10:00:00',
        sources: [],
    },
];

async function mountPanel(response = { err: 'ok', annotations: sample }, props = {}) {
    backendMock.mockReset();
    backendMock.mockResolvedValue(response);
    const wrapper = mount(AnnotationPanel, {
        props: { bookId: 1, backend: backendMock, ...props },
        global: { plugins: [vuetify] },
        attachTo: document.body,
    });
    await vi.waitFor(() => expect(backendMock).toHaveBeenCalledWith('/book/1/annotations'));
    await wrapper.vm.$nextTick();
    return wrapper;
}

describe('AnnotationPanel', () => {
    it('renders native and external sources without losing chapter-only records', async () => {
        const wrapper = await mountPanel();
        expect(wrapper.text()).toContain('微信读书');
        expect(wrapper.text()).toContain('Talebook 原生');
        expect(wrapper.text()).toContain('原文引用');
        expect(wrapper.text()).toContain('仅章节定位');
        expect(wrapper.findAll('.annotation-card')).toHaveLength(2);
        expect(wrapper.findAll('.annotation-card__topline .annotation-card__chapter')).toHaveLength(2);
        expect(wrapper.findAll('.annotation-card__footer button')).toHaveLength(1);
        expect(wrapper.findAll('button[aria-label="annotations.actionsFor"]')).toHaveLength(1);
        expect(wrapper.get('a').text()).toContain('weread.open');
        wrapper.unmount();
    });

    it('offers chapter navigation only when the host can perform it', async () => {
        const wrapper = await mountPanel(undefined, { chapterNavigation: true });
        expect(wrapper.findAll('.annotation-card__footer button')).toHaveLength(2);
        wrapper.unmount();
    });

    it('filters locally by source', async () => {
        const wrapper = await mountPanel();
        (wrapper.vm as unknown as { sourceFilter: string }).sourceFilter = 'weread';
        await wrapper.vm.$nextTick();
        expect(wrapper.findAll('.annotation-card')).toHaveLength(1);
        expect(wrapper.text()).toContain('微信读书笔记');
        expect(wrapper.text()).not.toContain('Talebook 笔记');
        wrapper.unmount();
    });

    it('treats an already-deleted record as a refreshed state', async () => {
        const wrapper = await mountPanel();
        const vm = wrapper.vm as unknown as {
            requestDelete: (item: unknown) => void;
            deleteAnnotation: () => Promise<void>;
            annotations: unknown[];
        };
        backendMock.mockResolvedValueOnce({ err: 'annotation.not_found' });
        vm.requestDelete(sample[0]);
        await vm.deleteAnnotation();
        expect(vm.annotations).toHaveLength(1);
        expect(wrapper.text()).toContain('annotations.alreadyDeleted');
        wrapper.unmount();
    });

    it('shows permission errors with a retry action', async () => {
        const wrapper = await mountPanel({ err: 'params.book.invalid' });
        expect(wrapper.text()).toContain('annotations.permissionDenied');
        expect(wrapper.text()).toContain('common.retry');
        wrapper.unmount();
    });
});
