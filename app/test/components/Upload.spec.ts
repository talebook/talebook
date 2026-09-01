// @vitest-environment nuxt
import { flushPromises, mount } from '@vue/test-utils';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { describe, expect, it, vi } from 'vitest';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key: string) => key }),
}));

const { alertMock, backendMock, pushMock, storeState } = vi.hoisted(() => ({
    alertMock: vi.fn(),
    backendMock: vi.fn(),
    pushMock: vi.fn(),
    storeState: {
        sys: {
            upload: {
                chunk_enabled: true,
                chunk_threshold: 8 * 1024 * 1024,
                chunk_size: 4 * 1024 * 1024,
            },
        },
    },
}));

mockNuxtImport('useNuxtApp', () => {
    return () => ({ $backend: backendMock, $alert: alertMock });
});

mockNuxtImport('useRouter', () => {
    return () => ({ push: pushMock });
});

vi.mock('@/stores/main', () => ({
    useMainStore: () => storeState,
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

import Upload from '@/components/Upload.vue';

type UploadVm = {
    do_upload: () => void;
    ebooks: File | null;
    stage: string | null;
    progress: number;
    dialog: boolean;
};

function makeFakeFile(name: string, size: number): File {
    const file = new File([new Blob([''])], name);
    Object.defineProperty(file, 'size', { value: size });
    // avoid allocating `size` real bytes in tests; chunk contents are irrelevant since $backend is mocked
    file.slice = () => new Blob(['x']);
    return file;
}

function mountUpload() {
    alertMock.mockReset();
    backendMock.mockReset();
    pushMock.mockReset();
    storeState.sys.upload = {
        chunk_enabled: true,
        chunk_threshold: 8 * 1024 * 1024,
        chunk_size: 4 * 1024 * 1024,
    };
    return mount(Upload, {
        global: {
            plugins: [vuetify],
            mocks: { $t: (key: string) => key },
            stubs: { VDialog: { template: '<div><slot /></div>' } },
        },
    });
}

describe('Upload.vue', () => {
    it('advertises and accepts comic container formats', () => {
        const wrapper = mountUpload();
        const input = wrapper.find('input[type="file"]');

        expect(wrapper.text()).toContain('book.supportedFormatsUpload');
        expect(wrapper.get('button').attributes('aria-label')).toBe('messages.uploadBooks');
        expect(input.attributes('accept')).toContain('.cbz');
        expect(input.attributes('accept')).toContain('.cbr');
        wrapper.unmount();
    });

    it('does not post an empty upload when no ebook is selected', () => {
        const wrapper = mountUpload();

        (wrapper.vm as unknown as UploadVm).do_upload();

        expect(backendMock).not.toHaveBeenCalled();
        expect(alertMock).toHaveBeenCalledWith('error', 'messages.selectFileToUpload');
        wrapper.unmount();
    });

    it('uploads small files directly without chunking', async () => {
        const wrapper = mountUpload();
        backendMock.mockResolvedValue({ err: 'ok', book_id: 42 });

        (wrapper.vm as unknown as UploadVm).ebooks = makeFakeFile('small.epub', 1024);
        (wrapper.vm as unknown as UploadVm).do_upload();
        await flushPromises();

        expect(backendMock).toHaveBeenCalledTimes(1);
        expect(backendMock).toHaveBeenCalledWith('/book/upload', expect.objectContaining({ method: 'POST' }));
        expect(pushMock).toHaveBeenCalledWith('/book/42');
        wrapper.unmount();
    });

    it('uploads large files in chunks and completes the upload', async () => {
        const wrapper = mountUpload();
        backendMock.mockImplementation((url: string) => {
            if (url === '/book/upload/chunk') {
                return Promise.resolve({ err: 'ok' });
            }
            if (url === '/book/upload/complete') {
                return Promise.resolve({ err: 'ok', book_id: 77 });
            }
            return Promise.reject(new Error('unexpected url: ' + url));
        });

        // 9MB file with a 4MB chunk size should be split into 3 chunks
        (wrapper.vm as unknown as UploadVm).ebooks = makeFakeFile('big.epub', 9 * 1024 * 1024);
        (wrapper.vm as unknown as UploadVm).do_upload();
        await flushPromises();

        const chunkCalls = backendMock.mock.calls.filter(([url]) => url === '/book/upload/chunk');
        const completeCalls = backendMock.mock.calls.filter(([url]) => url === '/book/upload/complete');
        expect(chunkCalls.length).toBe(3);
        expect(completeCalls.length).toBe(1);
        expect(pushMock).toHaveBeenCalledWith('/book/77');
        wrapper.unmount();
    });

    it('surfaces the backend error when a chunk upload fails', async () => {
        const wrapper = mountUpload();
        backendMock.mockResolvedValue({ err: 'params.chunk', msg: 'chunk too large' });

        (wrapper.vm as unknown as UploadVm).ebooks = makeFakeFile('big.epub', 9 * 1024 * 1024);
        (wrapper.vm as unknown as UploadVm).do_upload();
        await flushPromises();

        expect(alertMock).toHaveBeenCalledWith('error', 'chunk too large');
        wrapper.unmount();
    });

    it('uploads large files as a single request when chunking is disabled in settings', async () => {
        const wrapper = mountUpload();
        storeState.sys.upload.chunk_enabled = false;
        backendMock.mockResolvedValue({ err: 'ok', book_id: 55 });

        (wrapper.vm as unknown as UploadVm).ebooks = makeFakeFile('big.epub', 9 * 1024 * 1024);
        (wrapper.vm as unknown as UploadVm).do_upload();
        await flushPromises();

        expect(backendMock).toHaveBeenCalledTimes(1);
        expect(backendMock).toHaveBeenCalledWith('/book/upload', expect.objectContaining({ method: 'POST' }));
        expect(pushMock).toHaveBeenCalledWith('/book/55');
        wrapper.unmount();
    });

    it('respects a custom chunk threshold and chunk size from settings', async () => {
        const wrapper = mountUpload();
        // 自定义为 2MB 阈值 / 1MB 分片，3MB 文件应被切成 3 片
        storeState.sys.upload.chunk_threshold = 2 * 1024 * 1024;
        storeState.sys.upload.chunk_size = 1 * 1024 * 1024;
        backendMock.mockImplementation((url: string) => {
            if (url === '/book/upload/chunk') {
                return Promise.resolve({ err: 'ok' });
            }
            if (url === '/book/upload/complete') {
                return Promise.resolve({ err: 'ok', book_id: 88 });
            }
            return Promise.reject(new Error('unexpected url: ' + url));
        });

        (wrapper.vm as unknown as UploadVm).ebooks = makeFakeFile('medium.epub', 3 * 1024 * 1024);
        (wrapper.vm as unknown as UploadVm).do_upload();
        await flushPromises();

        const chunkCalls = backendMock.mock.calls.filter(([url]) => url === '/book/upload/chunk');
        expect(chunkCalls.length).toBe(3);
        expect(pushMock).toHaveBeenCalledWith('/book/88');
        wrapper.unmount();
    });

    it('switches to merging stage before calling /complete and resets after', async () => {
        const wrapper = mountUpload();
        // capture stage/progress at the moment /complete is invoked
        const seen: { stage: unknown; progress: number }[] = [];
        backendMock.mockImplementation((url: string) => {
            if (url === '/book/upload/chunk') {
                return Promise.resolve({ err: 'ok' });
            }
            if (url === '/book/upload/complete') {
                const vm = wrapper.vm as unknown as UploadVm;
                seen.push({ stage: vm.stage, progress: vm.progress });
                return Promise.resolve({ err: 'ok', book_id: 99 });
            }
            return Promise.reject(new Error('unexpected url: ' + url));
        });

        const vm = wrapper.vm as unknown as UploadVm;
        (vm).ebooks = makeFakeFile('big.epub', 9 * 1024 * 1024);
        (vm).do_upload();
        // 在分片循环进行中，stage 应为 uploading
        expect(vm.stage).toBe('uploading');
        await flushPromises();

        // 进入合并阶段时 stage 为 merging 且进度已满
        expect(seen.length).toBe(1);
        expect(seen[0].stage).toBe('merging');
        expect(seen[0].progress).toBe(100);
        // 流程结束后 stage 复位
        expect(vm.stage).toBeNull();
        expect(pushMock).toHaveBeenCalledWith('/book/99');
        wrapper.unmount();
    });
});
