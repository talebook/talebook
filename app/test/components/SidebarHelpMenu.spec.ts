// @vitest-environment nuxt
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { describe, expect, it, vi } from 'vitest';

vi.mock('#i18n', () => ({
    useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('@/stores/main', () => ({
    useMainStore: () => ({
        sys: {
            title: 'Talebook',
            version: '1.2.3',
            users: 7,
            allow: { FEEDBACK: true },
            FEEDBACK_URL: 'https://example.com/feedback',
            sidebar_extra_html: '<img alt="Talebook Logo" src="/logo.png">',
        },
    }),
}));

const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');

import SidebarHelpMenu from '@/components/SidebarHelpMenu.vue';

describe('SidebarHelpMenu', () => {
    it('keeps documentation out and presents the logo before compact metadata items', async () => {
        const wrapper = mount(SidebarHelpMenu, {
            attachTo: document.body,
            global: {
                plugins: [vuetify],
                stubs: {
                    VMenu: {
                        template: '<div><slot name="activator" :props="{}" /><slot /></div>',
                    },
                },
            },
        });

        const card = wrapper.element.querySelector('.sidebar-help__card');

        expect(card?.textContent).toContain('navigationHelp.changelog');
        expect(card?.textContent).toContain('navigationHelp.github');
        expect(card?.textContent).not.toContain('文档');
        expect(card?.textContent).not.toContain('Documentation');
        const logo = card?.querySelector('[data-testid="sidebar-help-logo"]');
        const version = card?.querySelector('[data-testid="sidebar-help-version"]');
        const users = card?.querySelector('[data-testid="sidebar-help-users"]');
        expect(logo).not.toBeNull();
        expect(version?.textContent).toContain('1.2.3');
        expect(users?.textContent).toContain('7');
        expect(logo?.compareDocumentPosition(version as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(version?.classList).toContain('v-list-item');
        expect(users?.classList).toContain('v-list-item');

        wrapper.unmount();
    });
});
