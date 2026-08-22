<template>
    <v-card class="metadata-settings-page">
        <v-card-title class="d-flex align-center flex-wrap ga-2 px-4 pt-4">
            <div>
                <h1 class="text-h6">
                    {{ t('metadataSettings.title') }}
                </h1>
                <p class="text-body-2 text-medium-emphasis font-weight-regular mt-1 mb-0">
                    {{ t('metadataSettings.description') }}
                </p>
            </div>
            <v-spacer />
            <v-btn
                variant="text"
                prepend-icon="mdi-arrow-left"
                to="/admin/plugins?tab=metadata"
            >
                {{ t('pluginManagement.backToPlugins') }}
            </v-btn>
            <v-btn
                color="primary"
                :loading="saving"
                @click="save"
            >
                {{ t('common.save') }}
            </v-btn>
        </v-card-title>
        <v-card-text>
            <v-skeleton-loader
                v-if="loading"
                type="article, article"
            />
            <v-alert
                v-else-if="loadError"
                type="error"
                variant="tonal"
            >
                {{ t('metadataSettings.loadError') }}
            </v-alert>
            <v-row v-else>
                <v-col
                    cols="12"
                    lg="7"
                >
                    <section class="settings-panel">
                        <h2 class="text-subtitle-1 mb-2">
                            {{ t('metadataSettings.sourceTitle') }}
                        </h2>
                        <p class="text-body-2 text-medium-emphasis mb-4">
                            {{ t('metadataSettings.sourceDescription') }}
                        </p>
                        <v-select
                            v-model="form.META_SELECTED_SOURCES"
                            :items="sourceItems"
                            item-title="title"
                            item-value="value"
                            :label="t('admin.settings.label.metaSelectedSource')"
                            prepend-inner-icon="mdi-source-branch"
                            multiple
                            chips
                            closable-chips
                            variant="outlined"
                        />
                        <v-checkbox
                            v-model="form.auto_fill_meta"
                            :label="t('admin.settings.label.autoFillMeta')"
                            color="primary"
                            hide-details
                        />
                        <v-checkbox
                            v-model="form.auto_fill_keep_cover"
                            :label="t('admin.settings.label.autoFillKeepCover')"
                            color="primary"
                            hide-details
                        />
                    </section>
                    <section class="settings-panel mt-4">
                        <h2 class="text-subtitle-1 mb-2">
                            {{ t('metadataSettings.doubanTitle') }}
                        </h2>
                        <v-text-field
                            v-model="form.douban_baseurl"
                            :label="t('admin.settings.label.doubanBaseurl')"
                            variant="outlined"
                        />
                        <v-text-field
                            v-model="form.douban_apikey"
                            :label="t('admin.settings.label.doubanApiKey')"
                            type="password"
                            autocomplete="new-password"
                            variant="outlined"
                        />
                        <v-text-field
                            v-model.number="form.douban_max_count"
                            :label="t('admin.settings.label.doubanMaxCount')"
                            type="number"
                            variant="outlined"
                        />
                    </section>
                    <section class="settings-panel mt-4">
                        <h2 class="text-subtitle-1 mb-2">
                            {{ t('metadataSettings.aiTitle') }}
                        </h2>
                        <v-text-field
                            v-model="form.ai_api_url"
                            :label="t('metadataSettings.aiApiUrl')"
                            type="url"
                            variant="outlined"
                        />
                        <v-text-field
                            v-model="form.ai_api_key"
                            :label="t('metadataSettings.aiApiKey')"
                            type="password"
                            autocomplete="new-password"
                            variant="outlined"
                        />
                        <v-text-field
                            v-model="form.ai_model"
                            :label="t('metadataSettings.aiModel')"
                            variant="outlined"
                        />
                        <v-checkbox
                            v-model="form.ai_use_thinking"
                            :label="t('metadataSettings.aiThinking')"
                            color="primary"
                            hide-details
                        />
                    </section>
                </v-col>
                <v-col
                    cols="12"
                    lg="5"
                >
                    <v-alert
                        type="info"
                        variant="tonal"
                        class="mb-4"
                    >
                        <div class="font-weight-medium">
                            {{ t('metadataSettings.systemCapabilitiesTitle') }}
                        </div>
                        <p class="text-body-2 mt-2 mb-2">
                            {{ t('metadataSettings.embeddedDescription') }}
                        </p>
                        <p class="text-body-2 mb-0">
                            {{ t('metadataSettings.calibreBridgeDescription') }}
                        </p>
                    </v-alert>
                    <v-alert
                        type="warning"
                        variant="tonal"
                    >
                        <div class="font-weight-medium">
                            {{ t('metadataSettings.priorityTitle') }}
                        </div>
                        <p class="text-body-2 mt-2 mb-0">
                            {{ t('metadataSettings.priorityDescription') }}
                        </p>
                    </v-alert>
                </v-col>
            </v-row>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';

const { t } = useI18n();
const { $backend, $alert } = useNuxtApp();
useMainStore().setNavbar(true);

const META_KEYS = [
    'META_SELECTED_SOURCES', 'auto_fill_meta', 'auto_fill_keep_cover',
    'douban_baseurl', 'douban_apikey', 'douban_max_count',
    'ai_api_url', 'ai_api_key', 'ai_model', 'ai_use_thinking',
];
const form = ref({ META_SELECTED_SOURCES: [] });
const allSources = ref([]);
const loading = ref(true);
const loadError = ref(false);
const saving = ref(false);

const sourceItems = computed(() => allSources.value.map(source => ({
    title: source === 'ai' ? 'AI' : t(`admin.settings.meta_source.${source}`),
    value: source,
})));

async function load() {
    loading.value = true;
    loadError.value = false;
    try {
        const rsp = await $backend('/admin/settings');
        if (rsp.err !== 'ok') throw new Error(rsp.msg || rsp.err);
        allSources.value = rsp.settings.META_ALL_SOURCES || [];
        form.value = Object.fromEntries(META_KEYS.map(key => [key, rsp.settings[key]]));
        form.value.META_SELECTED_SOURCES ||= [];
    } catch {
        loadError.value = true;
    } finally {
        loading.value = false;
    }
}

async function save() {
    saving.value = true;
    try {
        const rsp = await $backend('/admin/settings', {
            method: 'POST',
            body: JSON.stringify(form.value),
        });
        if (rsp.err === 'ok') $alert?.('success', t('admin.settings.message.saveSuccess'));
        else $alert?.('error', rsp.msg || rsp.err);
    } finally {
        saving.value = false;
    }
}

onMounted(load);
useHead(() => ({ title: t('metadataSettings.title') }));
</script>

<style scoped>
.metadata-settings-page :deep(.v-card-title) { white-space: normal; }
.settings-panel { padding: 18px; border: 1px solid rgb(var(--v-theme-outline-variant)); border-radius: 12px; }
</style>
