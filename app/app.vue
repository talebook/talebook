<template>
    <ThemeRuntimeProvider>
        <NuxtLayout>
            <NuxtPage
                v-if="!loginBlocksPage"
                :key="store.authEpoch"
            />
        </NuxtLayout>
    </ThemeRuntimeProvider>
</template>

<script setup>
import ThemeRuntimeProvider from '@/components/ThemeRuntimeProvider.vue';
import { useMainStore } from '@/stores/main';

// 需要登录的页面在登录前不渲染；登录成功后 authEpoch 递增，当前页面重新挂载并加载内容。
const store = useMainStore();
const route = useRoute();
const loginBlocksPage = computed(() => store.loginPrompt.requiredPath === route.path);
</script>

<style>
/* 全局样式：为所有卡片标题添加顶部空隙 */
.v-card-title {
  padding-top: 16px !important;
}

/* 公告内容链接样式 */
.press-content a,
a.press-content {
  color: rgb(var(--v-theme-primary)) !important;
}
</style>
