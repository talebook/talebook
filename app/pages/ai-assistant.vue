<template>
    <AIAssistantHub />
</template>

<script setup lang="ts">
import AIAssistantHub from '@/components/AIAssistantHub.vue';
import { useI18n } from '#i18n';

const { t } = useI18n();
useHead({ title: () => t('aiAssistant.title') });
</script>
