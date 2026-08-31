<template>
    <div>
        <RoutePageToolbar :description="t('navigationSections.libraryLocalDescription')" />
        <LocalLibraryContent />
    </div>
</template>

<script setup>
import LocalLibraryContent from '@/components/library/LocalLibraryContent.vue';
import RoutePageToolbar from '@/components/RoutePageToolbar.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>
