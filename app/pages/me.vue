<template>
    <RouteTabShell
        :title="t('navigation.myReading')"
        :tabs="tabs"
    >
        <NuxtPage />
    </RouteTabShell>
</template>

<script setup>
import RouteTabShell from '@/components/RouteTabShell.vue';
import { useI18n } from 'vue-i18n';

definePageMeta({ middleware: 'auth' });

const { t } = useI18n();
const tabs = computed(() => [
    { label: t('navigation.myShelf'), to: '/me/shelf', icon: 'mdi-bookshelf' },
    { label: t('messages.readingHistory'), to: '/me/history', icon: 'mdi-history' },
    { label: t('user.basicInfo'), to: '/me/account', icon: 'mdi-account-outline' },
    { label: t('user.deviceMgt'), to: '/me/devices', icon: 'mdi-devices' },
    { label: t('navigation.scopedBooks'), to: '/me/private', icon: 'mdi-shield-account-outline' },
    { label: t('pluginManagement.personalPluginSettings'), to: '/me/plugins', icon: 'mdi-power-plug-outline' },
]);

useHead(() => ({ title: t('navigation.myReading') }));
</script>
