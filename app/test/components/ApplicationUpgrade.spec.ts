// @vitest-environment happy-dom
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ApplicationUpgrade from '@/components/admin/ApplicationUpgrade.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key, te: () => true }) }));
const backend = vi.fn();
const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');
const available = { phase: 'available', candidate: { version: 'v2', sequence: 2, size: 1024, commit: 'a'.repeat(40), notes: '<img src=x onerror=alert(1)>' }, current: { version: 'v1', sequence: 1 } };
const mounted: ReturnType<typeof mount>[] = [];
function render() {
    const wrapper = mount(ApplicationUpgrade, { attachTo: document.body, props: { backend }, global: { plugins: [vuetify] } });
    mounted.push(wrapper);
    return wrapper;
}
async function openHistory(wrapper: ReturnType<typeof mount>) {
    expect(wrapper.find('.upgrade-items').exists()).toBe(false);
    await wrapper.findAll('button').find(b => b.text() === 'upgrade.history')!.trigger('click');
    await flushPromises();
    return new DOMWrapper(document.querySelector('[aria-labelledby="upgrade-history-title"]')!);
}
describe('application upgrade', () => {
    beforeEach(() => {
        vi.stubGlobal('visualViewport', { addEventListener: vi.fn(), removeEventListener: vi.fn(), width: 1024, height: 768 });
        backend.mockReset().mockResolvedValue({ err: 'ok', status: available });
        vi.stubGlobal('useNuxtApp', () => ({ $backend: backend }));
    });
    afterEach(() => {
        mounted.splice(0).forEach(wrapper => wrapper.unmount());
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });
    it('shows safe release notes and requires confirmation before installation', async () => {
        let complete!: (value: unknown) => void;
        backend.mockReturnValueOnce(new Promise(resolve => { complete = resolve; }));
        const wrapper = render();
        await flushPromises();
        complete({ err: 'ok', status: available });
        await flushPromises();
        expect(wrapper.find('pre').text()).toContain('<img');
        expect(wrapper.find('pre img').exists()).toBe(false);
        const button = wrapper.findAll('button').find(b => b.text() === 'upgrade.install')!;
        await button.trigger('click');
        await flushPromises();
        expect(backend).toHaveBeenCalledTimes(1);
        expect(document.body.textContent).toContain('upgrade.confirmBody');
        const confirm = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'upgrade.confirm')!;
        backend.mockResolvedValue({ err: 'ok', status: { ...available, phase: 'downloading' } });
        confirm.click();
        await flushPromises();
        expect(backend.mock.calls[1][1].headers['X-Talebook-Upgrade']).toBe('1');
        expect(JSON.parse(backend.mock.calls[1][1].body)).toEqual({ action: 'install', release: 'a'.repeat(40) });
    });
    it('explains unavailable loader and disables actions', async () => {
        backend.mockResolvedValue({ err: 'loader', status: { phase: 'idle', disabled: 'loader' } });
        const wrapper = render();
        await flushPromises();
        expect(wrapper.text()).toContain('upgrade.error.loader');
        expect(wrapper.find('button').attributes('disabled')).toBeDefined();
    });
    it('blocks incompatible candidates', async () => {
        backend.mockResolvedValue({ err: 'ok', status: { ...available, incompatible: 'runtime' } });
        const wrapper = render();
        await flushPromises();
        expect(wrapper.text()).toContain('upgrade.error.runtime');
        expect(wrapper.findAll('button').some(b => b.text() === 'upgrade.install')).toBe(false);
    });
    it('lists versions and protects the running release and incompatible rollback', async () => {
        backend.mockResolvedValue({ err: 'ok', status: { ...available, keep: 3, releases: [
            { id: 'image', version: 'v1', builtin: true, current: true },
            { id: 'b'.repeat(40), version: 'v0', protected: true, can_delete: false, can_activate: false, incompatible: 'database' },
        ], backups: [] } });
        const root = render();
        await flushPromises();
        const wrapper = await openHistory(root);
        expect(wrapper.text()).toContain('upgrade.error.database');
        expect(wrapper.find('[aria-label="upgrade.useVersion"]').attributes('disabled')).toBeDefined();
        expect(wrapper.find('[aria-label="upgrade.deleteVersion"]').attributes('disabled')).toBeDefined();
        expect(wrapper.text()).toContain('upgrade.noBackups');
    });
    it.each(['activate', 'delete', 'delete_backup'])('confirms %s and forwards the selected identifier', async action => {
        const id = 'b'.repeat(40);
        backend.mockResolvedValue({ err: 'ok', status: { ...available, keep: 3, releases: [
            { id, version: 'v0', can_delete: true, can_activate: true },
        ], backups: [{ id, source: { version: 'v0' }, target: { version: 'v1' }, created_at: 1 }] } });
        const root = render();
        await flushPromises();
        const wrapper = await openHistory(root);
        const label = action === 'activate' ? 'useVersion' : action === 'delete' ? 'deleteVersion' : 'deleteSnapshot';
        await wrapper.find(`[aria-label="upgrade.${label}"]`).trigger('click');
        await flushPromises();
        expect(backend).toHaveBeenCalledTimes(1);
        expect(document.body.textContent).toContain(`upgrade.manageBody.${action}`);
        const confirm = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === `upgrade.manageConfirm.${action}`)!;
        confirm.click();
        await flushPromises();
        expect(JSON.parse(backend.mock.calls[1][1].body)).toEqual({ action, release: id });
    });
    it('keeps invalid retention in the dialog and sends a valid count', async () => {
        backend.mockResolvedValue({ err: 'ok', status: { ...available, keep: 3, releases: [], backups: [] } });
        const root = render();
        await flushPromises();
        const wrapper = await openHistory(root);
        await wrapper.findAll('button').find(b => b.text() === 'upgrade.keep')!.trigger('click');
        await flushPromises();
        const cancel = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'upgrade.cancel')!;
        cancel.click();
        await flushPromises();
        await wrapper.findAll('button').find(b => b.text() === 'upgrade.keep')!.trigger('click');
        await flushPromises();
        const input = document.querySelector('input[type="number"]') as HTMLInputElement;
        const confirm = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'upgrade.manageConfirm.retention')!;
        input.value = '1';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await flushPromises();
        confirm.click();
        await flushPromises();
        expect(backend).toHaveBeenCalledTimes(1);
        expect(document.body.textContent).toContain('upgrade.error.retention');
        input.value = '4';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await flushPromises();
        confirm.click();
        await flushPromises();
        expect(JSON.parse(backend.mock.calls[1][1].body)).toEqual({ action: 'retention', keep: 4 });
        expect(wrapper.text()).toContain('upgrade.managed.retention');
    });
    it('keeps reconnecting after a lost response and recovers persistent result', async () => {
        vi.useFakeTimers();
        backend.mockRejectedValueOnce(new Error('503')).mockResolvedValueOnce({ err: 'ok', status: { ...available, phase: 'succeeded' } });
        const wrapper = render();
        await flushPromises();
        expect(wrapper.text()).toContain('upgrade.reconnecting');
        await vi.advanceTimersByTimeAsync(3000);
        await flushPromises();
        expect(wrapper.text()).toContain('upgrade.phase.succeeded');
    });
});
