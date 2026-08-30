<template>
    <div>
        <RoutePageToolbar :description="t('navigationSections.mePrivateDescription')" />
        <PrivateBooksContent />
    </div>
</template>

<script setup>
import PrivateBooksContent from '@/pages/scopedbooks.vue';
import RoutePageToolbar from '@/components/RoutePageToolbar.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>
