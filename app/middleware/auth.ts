import { useMainStore } from '@/stores/main';

export default defineNuxtRouteMiddleware(async (to) => {
    const store = useMainStore();
    if (!store.user.is_login) {
        try {
            await store.loadUserInfo();
        } catch {
            // The login screen is the safe fallback when the session check fails.
        }
    }
    if (!store.user.is_login) {
        return navigateTo({ path: '/login', query: { next: to.fullPath } });
    }
});
