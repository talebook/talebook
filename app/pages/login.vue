<template>
    <div class="login-container">
        <v-row
            justify="center"
            class="mt-8"
        >
            <v-col
                cols="12"
                sm="8"
                md="4"
            >
                <LoginForm @success="onLoginSuccess" />
            </v-col>
        </v-row>
    </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMainStore } from '@/stores/main';
import { useI18n } from 'vue-i18n';
import LoginForm from '~/components/LoginForm.vue';

const router = useRouter();
const route = useRoute();
const store = useMainStore();
const { t } = useI18n();
const { $backend } = useNuxtApp();

const postLoginPath = computed(() => {
    const next = route.query.next;
    return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/';
});

// 控制是否显示导航栏（可作为开关使用）
const showNavbar = true; // 后期可通过配置或环境变量控制
store.setNavbar(showNavbar);

// 独立登录页仍可直接访问：已登录时直接回到目标页面。
onMounted(async () => {
    try {
        const rsp = await $backend('/user/info');
        store.login(rsp);
        if (rsp.user && rsp.user.is_login) {
            router.replace(postLoginPath.value);
        }
    } catch (e) {
        // ignore error
    }
});

const onLoginSuccess = () => {
    store.setNavbar(true);
    router.push(postLoginPath.value);
};

useHead(() => ({
    title: t('auth.signIn')
}));
</script>

<style scoped>
.login-container {
    min-height: calc(100vh - 120px);
}
</style>
