<template>
    <div>
        <RoutePageToolbar :description="t('navigationSections.meHistoryDescription')" />
        <HistoryContent />
    </div>
</template>

<script setup>
import HistoryContent from '@/pages/user/history.vue';
import RoutePageToolbar from '@/components/RoutePageToolbar.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>
