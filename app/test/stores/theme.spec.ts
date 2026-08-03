import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useThemeStore } from '~/stores/theme';

const activeThemeCacheKey = 'talebook.activeTheme';

const cachedTheme = {
    id: 'builtin-minimal',
    name: 'minimal',
    version: '1.0.0',
    author: 'Talebook',
    description: '极简紧凑风格',
    active: true,
    installed_at: null,
    builtin: true,
    components: {
        AppHeader: 'builtin:minimal/AppHeader',
        AppFooter: 'builtin:minimal/AppFooter',
    },
};

describe('theme store', () => {
    beforeEach(() => {
        window.localStorage.clear();
        setActivePinia(createPinia());
    });

    it('hydrates active theme synchronously from localStorage', () => {
        window.localStorage.setItem(activeThemeCacheKey, JSON.stringify(cachedTheme));

        const store = useThemeStore();

        expect(store.activeTheme).toEqual(cachedTheme);
    });

    it('ignores invalid cached theme JSON', () => {
        window.localStorage.setItem(activeThemeCacheKey, '{invalid');

        const store = useThemeStore();

        expect(store.activeTheme).toBeNull();
    });

    it('rehydrates the cached theme after the client store already exists', () => {
        const store = useThemeStore();
        window.localStorage.setItem(activeThemeCacheKey, JSON.stringify(cachedTheme));

        store.hydrateCachedTheme();

        expect(store.activeTheme).toEqual(cachedTheme);
    });
});
