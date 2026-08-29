<template>
    <main class="personal-plugin-page">
        <header class="personal-plugin-page__header">
            <h1>{{ t('pluginManagement.title') }}</h1>
            <p>{{ t('pluginManagement.personalPageDescription') }}</p>
        </header>
        <v-tabs
            model-value="personal"
            density="compact"
            class="personal-plugin-page__tabs"
        >
            <v-tab value="personal">
                {{ t('pluginManagement.personalConfiguration') }}
            </v-tab>
        </v-tabs>
        <v-divider />
        <PluginPersonalSettings
            class="personal-plugin-page__content"
            embedded
        />
    </main>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import PluginPersonalSettings from '~/components/PluginPersonalSettings.vue';
import { useMainStore } from '@/stores/main';

const { t } = useI18n();
useMainStore().setNavbar(true);
useHead(() => ({ title: t('pluginManagement.personalConfiguration') }));
</script>

<style scoped>
.personal-plugin-page { max-width:1180px; margin:0 auto; padding:28px 24px 56px; }
.personal-plugin-page__header h1 { margin:0; font-size:28px; line-height:1.2; letter-spacing:-.02em; }
.personal-plugin-page__header p { margin:7px 0 0; color:rgba(var(--v-theme-on-surface),.64); font-size:14px; }
.personal-plugin-page__tabs { margin-top:20px; }
.personal-plugin-page__content { padding-top:24px; }
@media (max-width:700px) { .personal-plugin-page { padding:20px 14px 44px; } }
</style>
