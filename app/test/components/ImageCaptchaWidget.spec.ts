import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import ImageCaptchaWidget from '@/components/ImageCaptchaWidget.vue';

const { backend } = vi.hoisted(() => ({ backend: vi.fn() }));
vi.mock('nuxt/app', () => ({ useNuxtApp: () => ({ $backend: backend }) }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
const vuetify = createVuetify({ components });
let wrapper: ReturnType<typeof mount>;

beforeEach(() => {
    vi.clearAllMocks();
    backend.mockImplementation(async (path: string) => path === '/captcha/image'
        ? { err: 'ok', image: 'data:image/png;base64,test', captcha_id: 'image-id' }
        : { err: 'ok' });
});
afterEach(() => wrapper?.unmount());

describe('image verification lifecycle', () => {
    it('provides a named native button for refreshing the challenge', async () => {
        wrapper = mount(ImageCaptchaWidget, { global: { plugins: [vuetify] } });
        await flushPromises();
        const refresh = wrapper.get('button[aria-label="captcha.refresh"]');
        expect(refresh.attributes('type')).toBe('button');
        await refresh.trigger('click');
        await flushPromises();
        expect(backend.mock.calls.filter(([path]) => path === '/captcha/image')).toHaveLength(2);
    });

    it('invalidates a verified answer when the input changes or the image refreshes', async () => {
        wrapper = mount(ImageCaptchaWidget, { global: { plugins: [vuetify] } });
        await flushPromises();
        await wrapper.get('input').setValue('ABCD');
        await wrapper.get('.captcha-actions button').trigger('click');
        await flushPromises();
        expect(wrapper.emitted('verify')?.at(-1)).toEqual([{ provider: 'image', captcha_code: 'ABCD' }]);
        await wrapper.get('input').setValue('EFGH');
        expect(wrapper.emitted('error')?.at(-1)).toEqual(['']);
        await wrapper.get('button[aria-label="captcha.refresh"]').trigger('click');
        expect(wrapper.emitted('error')?.at(-1)).toEqual(['']);
    });
});
