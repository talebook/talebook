import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { readFileSync } from 'node:fs';

global.ResizeObserver = require('resize-observer-polyfill');

// 用 fs 读取原始 JSON：直接 import 会被 @nuxtjs/i18n 插件预编译成 AST，拿不到字符串
const loadLocale = (name: string) =>
    JSON.parse(readFileSync(`${process.cwd()}/i18n/locales/${name}.json`, 'utf-8'));

// issue #791：dataFooter.pageText 的占位符是 {0}=起始条目、{1}=结束条目、{2}=总条数，
// 误写成"第 {0} 页，共 {1} 页"会把条目序号当成页码展示
const items = Array.from({ length: 12 }, (_, i) => ({ name: `book-${i + 1}` }));

function mountTable(localeName: string) {
    const vuetify = createVuetify({
        components,
        directives,
        locale: { locale: localeName, messages: { [localeName]: loadLocale(localeName).$vuetify } },
    });
    return mount(components.VDataTableServer, {
        global: { plugins: [vuetify] },
        props: {
            headers: [{ title: 'Name', key: 'name' }],
            items,
            itemsLength: 12,
            itemsPerPage: 100,
        },
    });
}

describe('dataFooter pageText', () => {
    it('zh-CN 页脚显示条目范围与总条数', () => {
        const wrapper = mountTable('zh-CN');
        expect(wrapper.text()).toContain('第 1-12 条，共 12 条');
        expect(wrapper.text()).not.toContain('共 12 页');
    });

    it('en-US footer shows item range and total count', () => {
        const wrapper = mountTable('en-US');
        expect(wrapper.text()).toContain('1-12 of 12');
    });
});
