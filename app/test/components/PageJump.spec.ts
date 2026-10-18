import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import ResizeObserver from 'resize-observer-polyfill';
import PageJump from '@/components/PageJump.vue';

const zh = { pagination: { pageNumber: '页码', go: '跳转', totalPages: '共 {count} 页', invalidPage: '请输入正整数页码。', invalidRange: '请输入 1 到 {count} 之间的整数页码。' } };

globalThis.ResizeObserver = ResizeObserver;
let wrapper: VueWrapper;
function render(props = {}) {
    wrapper = mount(PageJump, {
        props: { modelValue: 2, length: 20, ...props },
        global: { plugins: [createVuetify({ components, directives }), createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': zh } })] },
    });
    return wrapper;
}
afterEach(() => wrapper?.unmount());
describe('PageJump', () => {
    it('submits one valid page and normalizes whitespace', async () => {
        render();
        await wrapper.get('input').setValue(' 12 ');
        await wrapper.get('form').trigger('submit');
        expect(wrapper.emitted('update:modelValue')).toEqual([[12]]);
    });
    it.each(['', '0', '-1', '21', '1.5', '1e1', 'abc', '9007199254740992'])('rejects invalid input %s without navigating', async value => {
        render();
        await wrapper.get('input').setValue(value);
        await wrapper.get('form').trigger('submit');
        expect(wrapper.emitted('update:modelValue')).toBeUndefined();
        expect(wrapper.text()).toContain('请输入 1 到 20');
    });
    it('does not reload the current page', async () => {
        render();
        await wrapper.get('form').trigger('submit');
        expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });
    it('synchronizes external pagination and a shrinking total', async () => {
        render();
        await wrapper.get('input').setValue('999');
        await wrapper.get('form').trigger('submit');
        await wrapper.setProps({ modelValue: 1, length: 3 });
        expect(wrapper.get('input').element.value).toBe('1');
        expect(wrapper.text()).not.toContain('请输入');
    });
    it('allows unknown totals without inventing a last page', async () => {
        render({ length: undefined });
        await wrapper.get('input').setValue('1234');
        await wrapper.get('form').trigger('submit');
        expect(wrapper.emitted('update:modelValue')).toEqual([[1234]]);
        expect(wrapper.text()).not.toContain('共');
    });
    it('keeps an unfinished entry when the import queue changes the total', async () => {
        render();
        await wrapper.get('input').setValue('12');
        await wrapper.setProps({ length: 15 });
        expect(wrapper.get('input').element.value).toBe('12');
    });
    it('blocks submission while loading', async () => {
        render({ disabled: true });
        await wrapper.get('form').trigger('submit');
        expect(wrapper.get('input').element.disabled).toBe(true);
        expect(wrapper.get('button').element.disabled).toBe(true);
        expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });
});
