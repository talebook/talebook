<template>
    <div>
        <RoutePageToolbar :description="t('navigationSections.meShelfDescription')" />
        <ShelfContent />
    </div>
</template>

<script setup>
import RoutePageToolbar from '@/components/RoutePageToolbar.vue';
import ShelfContent from '@/pages/user/shelf.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>
