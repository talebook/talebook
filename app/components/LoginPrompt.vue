<template>
    <v-dialog
        :model-value="store.loginPrompt.show"
        persistent
        max-width="440"
        class="login-prompt"
        data-testid="login-prompt"
        @keydown.esc="onCancel"
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
import { useRouter } from 'vue-router';
import { useMainStore } from '@/stores/main';
import LoginForm from '~/components/LoginForm.vue';

const store = useMainStore();
const router = useRouter();

// 登录成功后留在当前页面：丢弃以游客身份取到的页面数据，并让页面重新挂载、以登录身份重新加载。
const onSuccess = () => {
    store.setNavbar(true);
    clearNuxtData();
    store.completeLogin();
};

// 当前页面本身需要登录时，取消即离开该页面；登录浮窗随路由切换自动关闭。
const onCancel = () => {
    if (!store.loginPrompt.requiredPath) {
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
.login-prompt > .v-overlay__scrim {
    opacity: 0.6;
    backdrop-filter: blur(4px);
}
</style>
