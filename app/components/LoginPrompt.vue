<template>
    <v-dialog
        :model-value="visible"
        persistent
        max-width="440"
        scrim="background"
        class="login-prompt"
        data-testid="login-prompt"
        @keydown.esc="onCancel"
        @after-leave="restoreFocus"
    >
        <LoginForm
            :key="store.authEpoch"
            cancellable
            :hint="store.loginPrompt.hint"
            @success="onSuccess"
            @cancel="onCancel"
        />
    </v-dialog>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMainStore } from '@/stores/main';
import LoginForm from '~/components/LoginForm.vue';

const store = useMainStore();
const route = useRoute();
const router = useRouter();

// 独立登录页自身就是登录表单，不再叠加浮窗。
const visible = computed(() => store.loginPrompt.show && route.path !== '/login');

// 浮窗不是由 Vuetify activator 打开的，关闭后手动把焦点还给打开它的控件。
let returnFocusTo = null;
watch(visible, (shown) => {
    if (shown && import.meta.client) {
        const active = document.activeElement;
        returnFocusTo = active instanceof HTMLElement && active !== document.body ? active : null;
    }
});
const restoreFocus = () => {
    if (returnFocusTo?.isConnected) {
        returnFocusTo.focus();
    }
    returnFocusTo = null;
};

// 登录成功后留在当前页面：丢弃以游客身份取到的页面数据，并让页面重新挂载、以登录身份重新加载。
const onSuccess = () => {
    store.setNavbar(true);
    clearNuxtData();
    store.completeLogin();
};

// 当前页面本身需要登录时，取消即离开该页面；登录浮窗随路由切换自动关闭。
const onCancel = () => {
    if (store.loginPrompt.requiredPath !== route.path) {
        store.closeLoginPrompt();
        return;
    }
    if (window.history.state?.back) {
        router.back();
    } else {
        router.replace('/');
    }
};
</script>

<style>
/* 用页面背景色（亮色主题为白色）几乎完全遮住背景内容，只突出登录浮窗。 */
.login-prompt > .v-overlay__scrim {
    opacity: 0.94;
    backdrop-filter: blur(6px);
}
</style>
