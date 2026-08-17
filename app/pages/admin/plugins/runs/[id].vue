<template>
    <v-card>
        <v-card-title class="d-flex align-center flex-wrap ga-2 px-4 pt-4">
            <div>
                <h1 class="text-h6">
                    {{ t('pluginManagement.runDetail', { id: route.params.id }) }}
                </h1>
                <div
                    v-if="run"
                    class="text-body-2 text-medium-emphasis font-weight-regular mt-1"
                >
                    {{ actionLabel(run.action) }} · {{ formatDate(run.created_at) }}
                </div>
            </div>
            <v-spacer />
            <v-btn
                to="/admin/plugins/runs"
                variant="text"
                prepend-icon="mdi-arrow-left"
            >
                {{ t('pluginManagement.backToRuns') }}
            </v-btn>
        </v-card-title>
        <v-card-text>
            <v-skeleton-loader
                v-if="loading"
                type="article, table"
            />
            <v-alert
                v-else-if="error"
                type="error"
                variant="tonal"
            >
                {{ error }}
            </v-alert>
            <template v-else-if="run">
                <v-row>
                    <v-col
                        v-for="metric in metrics"
                        :key="metric.label"
                        cols="6"
                        md="3"
                    >
                        <v-card variant="outlined">
                            <v-card-text>
                                <div class="text-caption text-medium-emphasis">
                                    {{ metric.label }}
                                </div>
                                <div class="text-h6 metric-value">
                                    {{ metric.value }}
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
                <v-alert
                    v-if="run.error_code"
                    type="error"
                    variant="tonal"
                    class="my-4"
                >
                    <div class="font-weight-medium">
                        {{ run.error_code }}
                    </div>
                    <div>{{ run.error_message }}</div>
                </v-alert>
                <div class="d-flex flex-wrap ga-2 my-4">
                    <v-btn
                        v-if="['failed', 'partial'].includes(run.status)"
                        color="warning"
                        variant="tonal"
                        :loading="acting"
                        @click="act('retry')"
                    >
                        {{ t('pluginManagement.retryFailed') }}
                    </v-btn>
                    <v-btn
                        v-if="['run', 'retry'].includes(run.action) && ['succeeded', 'partial'].includes(run.status)"
                        color="error"
                        variant="outlined"
                        :loading="acting"
                        @click="rollback"
                    >
                        {{ t('pluginManagement.rollback') }}
                    </v-btn>
                </div>
                <v-data-table
                    :headers="headers"
                    :items="items"
                    density="compact"
                    :items-per-page="25"
                >
                    <template #item.status="{ item }">
                        <v-chip
                            size="small"
                            variant="tonal"
                            :color="item.status === 'failed' || item.status === 'conflict' ? 'error' : 'success'"
                        >
                            {{ itemStatusLabel(item.status) }}
                        </v-chip>
                    </template>
                    <template #item.data="{ item }">
                        <PluginRunItemPreview :data="item.data" />
                    </template>
                    <template #no-data>
                        <div class="text-medium-emphasis pa-6">
                            {{ t('pluginManagement.noRunItems') }}
                        </div>
                    </template>
                </v-data-table>
            </template>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';

const { t } = useI18n();
const { $backend, $alert } = useNuxtApp();
const route = useRoute();
useMainStore().setNavbar(true);
const loading = ref(true);
const acting = ref(false);
const error = ref('');
const run = ref(null);
const items = ref([]);
const headers = computed(() => [
    { title: t('pluginManagement.externalId'), key: 'external_id' },
    { title: t('pluginManagement.entityType'), key: 'entity_type' },
    { title: t('pluginManagement.status'), key: 'status' },
    { title: t('pluginManagement.operation'), key: 'operation' },
    { title: t('pluginManagement.previewData'), key: 'data', sortable: false },
    { title: t('pluginManagement.errorCode'), key: 'error_code' },
]);
const metrics = computed(() => [
    { label: t('pluginManagement.status'), value: runStatusLabel(run.value.status) },
    { label: t('pluginManagement.successCount'), value: (run.value.counts?.written || 0) + (run.value.counts?.updated || 0) + (run.value.counts?.skipped || 0) },
    { label: t('pluginManagement.failedCount'), value: (run.value.counts?.failed || 0) + (run.value.counts?.conflicts || 0) },
    { label: t('pluginManagement.duration'), value: `${run.value.duration_ms || 0} ms` },
]);
function runStatusLabel(value) { return t(`pluginManagement.run_${value}`); }
function actionLabel(value) { return t(`pluginManagement.action_${value}`); }
function itemStatusLabel(value) { return t(`pluginManagement.item_${value}`); }
function formatDate(value) { return value ? new Date(value).toLocaleString() : '—'; }
async function act(action) {
    acting.value = true;
    try {
        const rsp = await $backend(`/admin/plugins/connections/${run.value.connection_id}/${action}`, {
            method: 'POST', body: JSON.stringify({ parent_run_id: run.value.id, trigger: 'manual' }),
        });
        if (rsp.err === 'ok') {
            $alert?.('success', t('pluginManagement.actionStarted'));
            navigateTo(`/admin/plugins/runs/${rsp.run.id}`);
        } else $alert?.('error', rsp.msg || rsp.err);
    } finally {
        acting.value = false;
    }
}
function rollback() {
    if (confirm(t('pluginManagement.rollbackConfirm'))) act('rollback');
}
async function load() {
    const rsp = await $backend(`/admin/plugins/runs/${route.params.id}`);
    if (rsp.err === 'ok') {
        run.value = rsp.run;
        items.value = rsp.items || [];
    } else error.value = rsp.msg || rsp.err;
    loading.value = false;
}
onMounted(load);
useHead(() => ({ title: t('pluginManagement.runDetail', { id: route.params.id }) }));
</script>

<style scoped>
.metric-value { font-variant-numeric: tabular-nums; }
</style>
