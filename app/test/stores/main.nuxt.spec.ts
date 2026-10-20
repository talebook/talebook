// @vitest-environment nuxt
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMainStore } from '~/stores/main';

describe('main store bootstrap state', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    it.each(['not_installed', 'not_invited'])(
        'preserves safe defaults when user info returns %s',
        (err) => {
            const store = useMainStore();

            store.login({ err });

            expect(store.sys).toMatchObject({
                footer_extra_html: '',
                friends: [],
                show_network_library: true,
            });
            expect(store.user).toMatchObject({
                is_admin: false,
                is_login: false,
            });
        },
    );

    it('still accepts a complete user info response', () => {
        const store = useMainStore();
        const sys = { title: 'My TaleBook', friends: [] };
        const user = { is_admin: true, is_login: true };

        store.login({ err: 'ok', sys, user });

        expect(store.sys).toEqual(sys);
        expect(store.user).toEqual(user);
    });
});

describe('main store login prompt', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    it('opens over the current page and hides page alerts while it is shown', () => {
        const store = useMainStore();
        store.setAlert({ type: 'error', msg: 'earlier', to: null });

        store.openLoginPrompt({ hint: '登录后即可将书籍加入书架并设置阅读状态。' });
        store.setAlert({ type: 'error', msg: '请先登录', to: null });

        expect(store.loginPrompt).toEqual({
            show: true,
            requiredPath: '',
            hint: '登录后即可将书籍加入书架并设置阅读状态。',
        });
        expect(store.alert.show).toBe(false);
    });

    it('keeps a route requirement when another caller reopens the prompt', () => {
        const store = useMainStore();

        store.openLoginPrompt({ requiredPath: '/me/shelf' });
        store.openLoginPrompt();

        expect(store.loginPrompt.requiredPath).toBe('/me/shelf');
    });

    it('keeps the login-only page hidden until navigation leaves it', () => {
        const store = useMainStore();
        store.openLoginPrompt({ requiredPath: '/me/shelf' });

        store.closeLoginPrompt();
        expect(store.loginPrompt).toEqual({ show: false, requiredPath: '/me/shelf', hint: '' });

        store.releaseLoginRequirement('/me/shelf');
        expect(store.loginPrompt.requiredPath).toBe('/me/shelf');
        store.releaseLoginRequirement('/');
        expect(store.loginPrompt.requiredPath).toBe('');
    });

    it('closes the prompt and advances the auth epoch after signing in', () => {
        const store = useMainStore();
        store.openLoginPrompt({ requiredPath: '/me/shelf', hint: 'hint' });

        store.completeLogin();

        expect(store.loginPrompt).toEqual({ show: false, requiredPath: '', hint: '' });
        expect(store.authEpoch).toBe(1);
        store.setAlert({ type: 'error', msg: 'after login', to: null });
        expect(store.alert.show).toBe(true);
    });
});
