import { useMainStore } from '@/stores/main';

// 登录浮窗只属于打开它的页面：离开该页面时一并关闭，需要登录的新页面会由 auth 中间件重新打开。
// 导航完成后由 plugins/talebook.js 解除旧页面的登录要求。
export default defineNuxtRouteMiddleware((to, from) => {
    const store = useMainStore();
    if (store.loginPrompt.show && to.path !== from.path) {
        store.closeLoginPrompt();
    }
});
