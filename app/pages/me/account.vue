<template>
    <div>
        <RoutePageToolbar :description="t('navigationSections.meAccountDescription')" />
        <AccountContent section="profile" />
    </div>
</template>

<script setup>
import AccountContent from '@/pages/user/detail.vue';
import RoutePageToolbar from '@/components/RoutePageToolbar.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>
