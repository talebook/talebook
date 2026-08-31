<template>
    <RouteTabShell
        :title="t('navigation.settings')"
        :tabs="tabs"
    >
        <NuxtPage />
    </RouteTabShell>
</template>

<script setup>
import RouteTabShell from '@/components/RouteTabShell.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const tabs = computed(() => [
    { label: t('navigationSections.generalSettings'), to: '/admin/settings/general', icon: 'mdi-tune-variant' },
    { label: t('navigation.plugins'), to: '/admin/settings/plugins', icon: 'mdi-power-plug-outline' },
    { label: t('navigation.themes'), to: '/admin/settings/themes', icon: 'mdi-palette-outline' },
]);

useHead(() => ({ title: t('navigation.settings') }));
</script>
