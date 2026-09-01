// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key: string) => key }),
}));

const backendMock = vi.fn();

const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');

import BrsAccountSettings from '@/components/BrsAccountSettings.vue';

type BrsVm = {
    mode: 'login' | 'signup' | 'reset';
    endpoint: string;
    email: string;
    password: string;
    nickname: string;
    notice: { type: string; message: string };
    setMode: (mode: 'login' | 'signup' | 'reset') => void;
    submit: () => Promise<void>;
};

function mountSettings() {
    return mount(BrsAccountSettings, {
        attachTo: document.body,
        props: { backend: backendMock },
        global: { plugins: [vuetify] },
    });
}

function remoteResponse(data: Record<string, unknown>) {
    return Promise.resolve({ json: () => Promise.resolve(data) });
}

describe('BrsAccountSettings.vue', () => {
    beforeEach(() => {
        backendMock.mockReset();
        backendMock.mockResolvedValueOnce({
            err: 'ok',
            installation: { enabled: true, status: 'active' },
            connections: [],
            plugin: {
                config_schema: {
                    properties: { endpoint: { default: 'https://brs.talebook.org' } },
                },
            },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('uses the manifest endpoint as the default for a new connection', async () => {
        const wrapper = mountSettings();
        await flushPromises();

        expect((wrapper.vm as unknown as BrsVm).endpoint).toBe('https://brs.talebook.org');
        wrapper.unmount();
    });

    it('signs in directly against BRS and saves the connection only after success', async () => {
        const fetchMock = vi.fn().mockImplementation(() => remoteResponse({ err: 'ok', data: { id: 7 } }));
        vi.stubGlobal('fetch', fetchMock);
        backendMock.mockResolvedValueOnce({ err: 'ok', connection: { secret: { configured: true } } });
        const wrapper = mountSettings();
        await flushPromises();
        const vm = wrapper.vm as unknown as BrsVm;
        vm.endpoint = 'https://brs.example/';
        vm.email = 'reader@example.com';
        vm.password = 'private-password';

        await vm.submit();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toBe('https://brs.example/api/user/sign_in');
        const request = fetchMock.mock.calls[0][1];
        expect(request.credentials).toBe('include');
        expect(request.body.get('email')).toBe('reader@example.com');
        expect(request.body.get('password')).toBe('private-password');
        expect(backendMock).toHaveBeenLastCalledWith('/plugins/connections', expect.objectContaining({ method: 'POST' }));
        const saved = JSON.parse(backendMock.mock.calls.at(-1)?.[1].body);
        expect(saved).toMatchObject({
            plugin_key: 'talebook.annotation.brs',
            config: { endpoint: 'https://brs.example' },
            credentials: { email: 'reader@example.com', password: 'private-password' },
        });
        expect(vm.notice).toMatchObject({ type: 'success', message: 'brs.loginSuccess' });
        wrapper.unmount();
    });

    it('does not save credentials when BRS rejects the login', async () => {
        vi.stubGlobal('fetch', vi.fn().mockImplementation(() => remoteResponse({ err: 'params.invalid', msg: '密码错误' })));
        const wrapper = mountSettings();
        await flushPromises();
        const vm = wrapper.vm as unknown as BrsVm;
        vm.endpoint = 'https://brs.example';
        vm.email = 'reader@example.com';
        vm.password = 'wrong-password';

        await vm.submit();

        expect(backendMock).toHaveBeenCalledTimes(1);
        expect(vm.notice).toMatchObject({ type: 'error', message: '密码错误' });
        wrapper.unmount();
    });

    it('shows inline validation and focuses the first invalid field', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const wrapper = mountSettings();
        await flushPromises();
        const vm = wrapper.vm as unknown as BrsVm;
        vm.endpoint = 'not-a-url';

        await vm.submit();
        await flushPromises();

        const endpointInput = wrapper.get('input[name="brs-endpoint"]');
        expect(endpointInput.attributes('aria-invalid')).toBe('true');
        expect(wrapper.text()).toContain('brs.endpointInvalid');
        expect(wrapper.text()).toContain('brs.emailInvalid');
        expect(wrapper.text()).toContain('brs.passwordRequired');
        expect(document.activeElement).toBe(endpointInput.element);
        expect(fetchMock).not.toHaveBeenCalled();
        wrapper.unmount();
    });

    it('sends registration and reset directly to BRS without storing credentials', async () => {
        const fetchMock = vi.fn().mockImplementation(() => remoteResponse({ err: 'ok' }));
        vi.stubGlobal('fetch', fetchMock);
        const wrapper = mountSettings();
        await flushPromises();
        const vm = wrapper.vm as unknown as BrsVm;
        vm.endpoint = 'https://brs.example';
        vm.email = 'reader@example.com';
        vm.setMode('signup');
        vm.nickname = '读者';

        await vm.submit();
        expect(fetchMock.mock.calls[0][0]).toBe('https://brs.example/api/user/sign_up');
        expect(fetchMock.mock.calls[0][1].body.get('nickname')).toBe('读者');
        expect(vm.mode).toBe('login');

        vm.setMode('reset');
        await vm.submit();
        expect(fetchMock.mock.calls[1][0]).toBe('https://brs.example/api/user/reset');
        expect(backendMock).toHaveBeenCalledTimes(1);
        wrapper.unmount();
    });
});
