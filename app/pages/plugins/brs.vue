<template>
    <section class="brs-page">
        <header class="brs-page__header">
            <v-btn
                icon="mdi-arrow-left"
                variant="text"
                :aria-label="t('common.back')"
                @click="router.back()"
            />
            <div>
                <h1>{{ t('brs.title') }}</h1>
                <p>{{ t('brs.description') }}</p>
            </div>
        </header>
        <BrsAccountSettings :backend="$backend" />
    </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import BrsAccountSettings from '~/components/BrsAccountSettings.vue';
import { useMainStore } from '@/stores/main';

const { t } = useI18n();
const { $backend } = useNuxtApp();
const router = useRouter();
useMainStore().setNavbar(true);
useHead(() => ({ title: t('brs.title') }));
</script>

<style scoped>
.brs-page { max-width:1180px; margin:0 auto; padding:28px 24px 56px; }
.brs-page__header { display:flex; align-items:flex-start; gap:8px; margin-bottom:24px; }
.brs-page__header h1 { margin:3px 0 0; font-size:28px; line-height:1.2; letter-spacing:-.02em; }
.brs-page__header p { margin:7px 0 0; color:rgba(var(--v-theme-on-surface),.64); font-size:14px; }
@media (max-width:700px) { .brs-page { padding:20px 14px 44px; } }
</style>
