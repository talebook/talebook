<template>
    <div>
        <RoutePageToolbar :description="t('pluginManagement.personalPageDescription')" />
        <PluginPersonalSettings embedded />
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import PluginPersonalSettings from '@/components/PluginPersonalSettings.vue';
import RoutePageToolbar from '@/components/RoutePageToolbar.vue';

const { t } = useI18n();

useHead(() => ({ title: t('pluginManagement.personalPluginSettings') }));
</script>
