import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import CaptchaWidget from '@/components/CaptchaWidget.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
const { backend } = vi.hoisted(() => ({ backend: vi.fn() }));
vi.mock('nuxt/app', () => ({ useNuxtApp: () => ({ $backend: backend }) }));
const turnstile = { render: vi.fn(() => 'widget-id'), reset: vi.fn(), remove: vi.fn() };
const config = { enabled: true, provider: 'turnstile', siteKey: 'test-site' };
const vuetify = createVuetify({ components, directives });
let wrapper: ReturnType<typeof mount>;

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('useNuxtApp', () => ({ $backend: backend }));
    vi.stubGlobal('turnstile', turnstile);
    backend.mockResolvedValue({ err: 'ok', config });
});
afterEach(() => { wrapper?.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });
const render = async () => {
    wrapper = mount(CaptchaWidget, { props: { scene: 'read' }, attachTo: document.body, global: { plugins: [vuetify] } });
    await flushPromises();
    return turnstile.render.mock.calls[0] as unknown as [string, Record<string, any>];
};

describe('CaptchaWidget Turnstile', () => {
    it('renders in a mounted container and emits the token for the correct action', async () => {
        const [selector, options] = await render();
        expect(document.querySelector(selector)).not.toBeNull();
        expect(options).toMatchObject({ sitekey: 'test-site', action: 'read', size: 'compact' });
        options.callback('token');
        expect(wrapper.emitted('verify')?.[0]).toEqual([{ provider: 'turnstile', turnstile_token: 'token' }]);
        options['expired-callback']();
        expect(wrapper.emitted('error')?.at(-1)).toEqual(['captcha.expired']);
        options['error-callback']();
        expect(wrapper.emitted('error')?.at(-1)).toEqual(['captcha.verifyFailed']);
    });

    it('resets after rejected verification and cleans up on unmount', async () => {
        await render();
        (wrapper.vm as unknown as { reset: () => void }).reset();
        expect(turnstile.reset).toHaveBeenCalledWith('widget-id');
        wrapper.unmount();
        expect(turnstile.remove).toHaveBeenCalledWith('widget-id');
    });

    it('does not render when a pending configuration resolves after unmount', async () => {
        let resolve: (value: unknown) => void = () => {};
        backend.mockReturnValue(new Promise((done) => { resolve = done; }));
        wrapper = mount(CaptchaWidget, { props: { scene: 'download' }, global: { plugins: [vuetify] } });
        wrapper.unmount();
        resolve({ err: 'ok', config });
        await flushPromises();
        expect(turnstile.render).not.toHaveBeenCalled();
    });

    it('shows a retry control when loading configuration fails', async () => {
        backend.mockRejectedValueOnce(new Error('offline'));
        wrapper = mount(CaptchaWidget, { props: { scene: 'read' }, global: { plugins: [vuetify] } });
        await flushPromises();
        expect(wrapper.text()).toContain('captcha.loadFailed');
        await wrapper.get('button').trigger('click');
        await flushPromises();
        expect(turnstile.render).toHaveBeenCalled();
    });
});
