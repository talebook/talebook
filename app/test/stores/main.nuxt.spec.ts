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
