// @vitest-environment nuxt
import { flushPromises, mount } from '@vue/test-utils';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadBuiltinThemeComponent, mainStoreState, routeState, themeStoreState, warmRedTheme } = vi.hoisted(() => {
    const warmRed = {
        id: 'builtin-warm-red',
        name: 'warm-red',
        version: '1.0.0',
        author: 'Talebook',
        description: '暖红主题',
        active: true,
        installed_at: null,
        builtin: true,
        components: {
            AppHeader: 'builtin:warm-red/AppHeader',
            AppFooter: 'builtin:warm-red/AppFooter',
        },
    };
    return {
        warmRedTheme: warmRed,
        loadBuiltinThemeComponent: vi.fn(async (_themeName: string, componentName: string) => ({
            name: componentName,
            template: '<div />',
        })),
        mainStoreState: { theme: 'light' },
        routeState: { meta: {} },
        themeStoreState: {
            activeTheme: warmRed,
            hydrateCachedTheme: vi.fn(() => warmRed),
            fetchActiveTheme: vi.fn().mockResolvedValue({ err: 'ok', theme: warmRed }),
        },
    };
});

vi.mock('@/stores/main', () => ({
    useMainStore: () => mainStoreState,
}));

vi.mock('@/stores/theme', () => ({
    useThemeStore: () => themeStoreState,
}));

vi.mock('@/components/AppHeader.vue', () => ({
    default: { name: 'DefaultHeader', template: '<div />' },
}));

vi.mock('@/components/AppFooter.vue', () => ({
    default: { name: 'DefaultFooter', template: '<div />' },
}));

vi.mock('@/utils/builtin-themes', () => ({
    isBuiltinTheme: (theme: typeof warmRedTheme | null) => Boolean(theme?.builtin),
    loadBuiltinThemeComponent,
}));

mockNuxtImport('useRoute', () => () => routeState);

import ThemeRuntimeProvider from '@/components/ThemeRuntimeProvider.vue';
import { useThemeRuntime } from '@/composables/useThemeRuntime';

const RuntimeConsumer = defineComponent({
    setup() {
        return useThemeRuntime();
    },
    template: '<span data-testid="runtime-ready">{{ ready ? "ready" : "pending" }}</span>',
});

describe('ThemeRuntimeProvider', () => {
    beforeEach(() => {
        document.body.className = '';
        document.querySelectorAll('style[data-talebook-theme-runtime]').forEach(node => node.remove());
        mainStoreState.theme = 'light';
        routeState.meta = {};
        themeStoreState.activeTheme = warmRedTheme;
        themeStoreState.hydrateCachedTheme.mockClear();
        themeStoreState.fetchActiveTheme.mockClear();
        themeStoreState.fetchActiveTheme.mockResolvedValue({ err: 'ok', theme: warmRedTheme });
        loadBuiltinThemeComponent.mockReset();
        loadBuiltinThemeComponent.mockImplementation(async (_themeName: string, componentName: string) => ({
            name: componentName,
            template: '<div />',
        }));
    });

    it('applies the active theme without rendering a header', async () => {
        const wrapper = mount(ThemeRuntimeProvider, {
            slots: { default: RuntimeConsumer },
        });
        await flushPromises();

        expect(wrapper.get('[data-testid="runtime-ready"]').text()).toBe('ready');
        expect(document.body.classList.contains('tb-current-builtin-theme-warm-red')).toBe(true);
        expect(document.body.classList.contains('tb-current-builtin-theme-mode-light')).toBe(true);
        expect(document.querySelector('style[data-talebook-theme-runtime]')?.textContent)
            .toContain('--v-theme-primary: 143,58,52;');

        wrapper.unmount();
        expect(document.body.classList.contains('tb-current-builtin-theme-warm-red')).toBe(false);
    });

    it('keeps the runtime pending until the API confirms a theme when there is no cache', async () => {
        let resolveFetch: (() => void) | undefined;
        themeStoreState.activeTheme = null;
        themeStoreState.hydrateCachedTheme.mockReturnValueOnce(null);
        themeStoreState.fetchActiveTheme.mockImplementationOnce(() => new Promise((resolve) => {
            resolveFetch = () => {
                themeStoreState.activeTheme = warmRedTheme;
                resolve({ err: 'ok', theme: warmRedTheme });
            };
        }));

        const wrapper = mount(ThemeRuntimeProvider, {
            slots: { default: RuntimeConsumer },
        });
        await Promise.resolve();
        expect(wrapper.get('[data-testid="runtime-ready"]').text()).toBe('pending');

        resolveFetch?.();
        await flushPromises();
        expect(wrapper.get('[data-testid="runtime-ready"]').text()).toBe('ready');
        expect(document.body.classList.contains('tb-current-builtin-theme-warm-red')).toBe(true);
        wrapper.unmount();
    });

    it('falls back atomically when a required built-in component fails to load', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        loadBuiltinThemeComponent.mockRejectedValue(new Error('broken component'));

        const wrapper = mount(ThemeRuntimeProvider, {
            slots: { default: RuntimeConsumer },
        });
        await flushPromises();

        expect(wrapper.get('[data-testid="runtime-ready"]').text()).toBe('ready');
        expect(document.body.classList.contains('tb-current-builtin-theme-warm-red')).toBe(false);
        expect(document.querySelector('style[data-talebook-theme-runtime]')).toBeNull();
        expect(warn).toHaveBeenCalledWith(
            '主题运行时加载失败，已完整回退到默认主题',
            expect.any(Error),
        );
        warn.mockRestore();
        wrapper.unmount();
    });

    it('opts reader routes out of the site theme runtime', async () => {
        routeState.meta = { themeRuntime: false };
        const wrapper = mount(ThemeRuntimeProvider, {
            slots: { default: RuntimeConsumer },
        });
        await flushPromises();

        expect(wrapper.get('[data-testid="runtime-ready"]').text()).toBe('ready');
        expect(document.querySelector('style[data-talebook-theme-runtime]')).toBeNull();
        expect(document.body.classList.contains('tb-current-builtin-theme-warm-red')).toBe(false);
        wrapper.unmount();
    });
});
