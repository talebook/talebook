// @vitest-environment nuxt
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { describe, expect, it } from 'vitest';

import RoutePageToolbar from '@/components/RoutePageToolbar.vue';

const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');

describe('RoutePageToolbar', () => {
    it('keeps the page description beside optional actions', () => {
        const wrapper = mount(RoutePageToolbar, {
            props: { description: '管理当前页面的设置。' },
            slots: {
                actions: '<button type="button">保存设置</button>',
            },
            global: { plugins: [vuetify] },
        });

        expect(wrapper.get('p').text()).toBe('管理当前页面的设置。');
        expect(wrapper.get('.route-page-toolbar__actions').text()).toBe('保存设置');
    });

    it('does not reserve an actions container without actions', () => {
        const wrapper = mount(RoutePageToolbar, {
            props: { description: '浏览当前书库。' },
            global: { plugins: [vuetify] },
        });

        expect(wrapper.find('.route-page-toolbar__actions').exists()).toBe(false);
    });
});
