<template>
    <div>
        <RoutePageToolbar :description="t('navigationSections.libraryNetworkDescription')" />
        <NetworkLibraryContent />
    </div>
</template>

<script setup>
import RoutePageToolbar from '@/components/RoutePageToolbar.vue';
import NetworkLibraryContent from '@/pages/network/index.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>
