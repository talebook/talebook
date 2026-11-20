import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import LanDiscoverySettings from '@/components/admin/LanDiscoverySettings.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
const { backend } = vi.hoisted(() => ({ backend: vi.fn() }));
const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');
const mounted: ReturnType<typeof mount>[] = [];
const response = {
    err: 'ok', enabled: false, name: '<img src=x>', endpoints: [], overridden: [], interfaces: { eth0: {} },
    status: { state: 'disabled', error: null, instance_id: null },
};
const render = (settings = {}) => {
    const wrapper = mount(LanDiscoverySettings, {
        attachTo: document.body,
        props: { backend, modelValue: { site_title: '<img src=x>', LAN_DISCOVERY_ENABLED: false, LAN_DISCOVERY_ENDPOINTS: [], ...settings } },
        global: { plugins: [vuetify] },
    });
    mounted.push(wrapper);
    return wrapper;
};
describe('LAN discovery settings', () => {
    beforeEach(() => {
        backend.mockReset().mockResolvedValue(response);
        vi.stubGlobal('useNuxtApp', () => ({ $backend: backend }));
        vi.stubGlobal('visualViewport', { addEventListener: vi.fn(), removeEventListener: vi.fn(), width: 1024, height: 768 });
    });
    afterEach(() => {
        mounted.splice(0).forEach(w => w.unmount());
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });
    it('renders public names as text and keeps editing separate from saving', async () => {
        const wrapper = render();
        await flushPromises();
        expect(wrapper.text()).toContain('<img src=x>');
        expect(wrapper.find('img').exists()).toBe(false);
        await wrapper.find('input[type=checkbox]').setValue(true);
        expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toMatchObject({ LAN_DISCOVERY_ENABLED: true });
        expect(backend.mock.calls).toEqual([['/admin/discovery']]);
        expect(wrapper.text()).toContain('admin.discovery.state.disabled');
    });
    it('locks manual overrides and distinguishes saved intent from publishing errors', async () => {
        backend.mockResolvedValue({ ...response, enabled: true, overridden: ['LAN_DISCOVERY_ENABLED', 'LAN_DISCOVERY_ENDPOINTS'],
            status: { state: 'error', error: 'UDP 5353 unavailable', instance_id: 'public-id' } });
        const wrapper = render();
        await flushPromises();
        expect(wrapper.find('input[type=checkbox]').attributes('disabled')).toBeDefined();
        expect(wrapper.findAll('button').find(b => b.text() === 'admin.discovery.add')?.attributes('disabled')).toBeDefined();
        expect(wrapper.text()).toContain('admin.discovery.on');
        expect(wrapper.text()).toContain('UDP 5353 unavailable');
    });
    it('adds editable endpoints and preserves the full base URL', async () => {
        const endpoint = { url: 'https://books.home.arpa:8443/team/books', addresses: ['192.168.50.10'], interfaces: ['eth0'] };
        const wrapper = render({ LAN_DISCOVERY_ENDPOINTS: [endpoint] });
        await flushPromises();
        const field = wrapper.findAllComponents(components.VTextField)[0];
        expect(field.props('modelValue')).toBe(endpoint.url);
        await field.vm.$emit('update:modelValue', 'https://books.home.arpa:8443/team/other');
        expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toMatchObject({
            LAN_DISCOVERY_ENDPOINTS: [{ ...endpoint, url: 'https://books.home.arpa:8443/team/other' }],
        });
    });
    it('reports status failures and cancels polling on unmount', async () => {
        vi.useFakeTimers();
        backend.mockRejectedValue(new Error('offline'));
        const wrapper = render();
        await flushPromises();
        expect(wrapper.text()).toContain('admin.discovery.loadError');
        wrapper.unmount();
        mounted.pop();
        await vi.advanceTimersByTimeAsync(6000);
        expect(backend).toHaveBeenCalledTimes(1);
    });
});
