<template>
    <ThemeRuntimeProvider>
        <NuxtLayout>
            <NuxtPage />
        </NuxtLayout>
    </ThemeRuntimeProvider>
</template>

<script setup>
import ThemeRuntimeProvider from '@/components/ThemeRuntimeProvider.vue';
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
