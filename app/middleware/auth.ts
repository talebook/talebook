import { useMainStore } from '@/stores/main';

export default defineNuxtRouteMiddleware(async (to) => {
    const store = useMainStore();
    if (!store.user.is_login) {
        try {
            await store.loadUserInfo();
        } catch {
            // The login prompt is the safe fallback when the session check fails.
        }
    }
    if (!store.user.is_login) {
        // 留在目标页面，用全页蒙版和登录浮窗代替跳转登录页；页面内容在登录后才渲染。
        store.openLoginPrompt({ requiredPath: to.path });
    }
});
