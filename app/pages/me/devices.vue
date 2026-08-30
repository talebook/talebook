<template>
    <div>
        <RoutePageToolbar :description="t('navigationSections.meDevicesDescription')" />
        <AccountContent section="devices" />
    </div>
</template>

<script setup>
import AccountContent from '@/pages/user/detail.vue';
import RoutePageToolbar from '@/components/RoutePageToolbar.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>
