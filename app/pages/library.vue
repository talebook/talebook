<template>
    <RouteTabShell
        :title="t('navigation.libraryBrowse')"
        :description="t('navigationSections.libraryDescription')"
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
    { label: t('navigation.localLibrary'), to: '/library/local', icon: 'mdi-bookshelf' },
    { label: t('navigation.networkLibrary'), to: '/library/network', icon: 'mdi-cloud-search-outline' },
    { label: t('navigationSections.appAccess'), to: '/library/apps', icon: 'mdi-cellphone-link' },
]);

useHead(() => ({ title: t('navigation.libraryBrowse') }));
</script>
