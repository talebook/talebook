<template>
    <v-card>
        <v-card-title class="d-flex align-center flex-wrap ga-2 px-4 pt-4">
            <div>
                <h1 class="text-h6">
                    {{ t('pluginManagement.runs') }}
                </h1>
                <div class="text-body-2 text-medium-emphasis font-weight-regular mt-1">
                    {{ t('pluginManagement.runsDescription') }}
                </div>
            </div>
            <v-spacer />
            <v-btn
                to="/admin/plugins"
                variant="text"
                prepend-icon="mdi-arrow-left"
            >
                {{ t('pluginManagement.backToPlugins') }}
            </v-btn>
        </v-card-title>
        <v-card-text>
            <div class="d-flex flex-wrap ga-3 mb-4">
                <v-select
                    v-model="status"
                    :items="statusOptions"
                    item-title="title"
                    item-value="value"
                    :label="t('pluginManagement.statusFilter')"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="run-filter"
                />
                <v-select
                    v-model="connectionId"
                    :items="connectionOptions"
                    item-title="title"
                    item-value="value"
                    :label="t('pluginManagement.connection')"
                    density="compact"
                    variant="outlined"
                    clearable
                    hide-details
                    class="run-filter"
                />
            </div>
            <v-alert
                v-if="error"
                type="error"
                variant="tonal"
                class="mb-3"
            >
                {{ t('pluginManagement.loadError') }}
            </v-alert>
            <v-data-table
                :headers="headers"
                :items="filteredRuns"
                :loading="loading"
                :items-per-page="25"
                density="compact"
            >
                <template #item.status="{ item }">
                    <v-chip
                        size="small"
                        :color="runColor(item.status)"
                        variant="tonal"
                    >
                        {{ runStatusLabel(item.status) }}
                    </v-chip>
                </template>
                <template #item.plugin="{ item }">
                    <div>{{ connectionName(item.connection_id) }}</div>
                    <div class="text-caption text-medium-emphasis">
                        {{ connectionScope(item.connection_id) }}
                    </div>
                </template>
                <template #item.action="{ item }">
                    {{ actionLabel(item.action) }}
                </template>
                <template #item.counts="{ item }">
                    {{ countSummary(item.counts) }}
                </template>
                <template #item.created_at="{ item }">
                    {{ formatDate(item.created_at) }}
                </template>
                <template #item.actions="{ item }">
                    <v-btn
                        :to="`/admin/plugins/runs/${item.id}`"
                        size="small"
                        variant="text"
                    >
                        {{ t('pluginManagement.view') }}
                    </v-btn>
                    <v-btn
                        v-if="['failed', 'partial'].includes(item.status)"
                        size="small"
                        variant="text"
                        color="warning"
                        :loading="retrying === item.id"
                        @click="retry(item)"
                    >
                        {{ t('pluginManagement.retryFailed') }}
                    </v-btn>
                </template>
                <template #no-data>
                    <div class="text-medium-emphasis pa-6">
                        {{ t('pluginManagement.noRuns') }}
                    </div>
                </template>
            </v-data-table>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';

const { t } = useI18n();
const { $backend, $alert } = useNuxtApp();
const store = useMainStore();
store.setNavbar(true);
const loading = ref(true);
const error = ref(false);
const runs = ref([]);
const connections = ref([]);
const installations = ref([]);
const status = ref('all');
const connectionId = ref(null);
const retrying = ref(null);
const headers = computed(() => [
    { title: t('pluginManagement.status'), key: 'status', sortable: false },
    { title: t('pluginManagement.pluginAndConnection'), key: 'plugin', sortable: false },
    { title: t('pluginManagement.action'), key: 'action', sortable: false },
    { title: t('pluginManagement.resultCounts'), key: 'counts', sortable: false },
    { title: t('pluginManagement.startedAt'), key: 'created_at' },
    { title: t('pluginManagement.actions'), key: 'actions', sortable: false },
]);
const statusOptions = computed(() => [
    { title: t('pluginManagement.statusAll'), value: 'all' },
    ...['queued', 'running', 'succeeded', 'partial', 'failed', 'rolled_back']
        .map(value => ({ title: runStatusLabel(value), value })),
]);
const connectionOptions = computed(() => connections.value.map(connection => ({
    title: connectionName(connection.id), value: connection.id,
})));
const filteredRuns = computed(() => runs.value.filter(run => (
    (status.value === 'all' || run.status === status.value)
    && (!connectionId.value || run.connection_id === connectionId.value)
)));

function installationForConnection(id) {
    const connection = connections.value.find(item => item.id === id);
    return installations.value.find(item => item.id === connection?.installation_id);
}
function connectionName(id) {
    const connection = connections.value.find(item => item.id === id);
    const installation = installationForConnection(id);
    return `${installation?.definition?.name || installation?.plugin_key || '—'} · ${connection?.name || '—'}`;
}
function connectionScope(id) {
    const connection = connections.value.find(item => item.id === id);
    return connection?.owner_type === 'instance' ? t('pluginManagement.publicConnection') : t('pluginManagement.personalConnection');
}
function runStatusLabel(value) { return t(`pluginManagement.run_${value}`); }
function actionLabel(value) { return t(`pluginManagement.action_${value}`); }
function formatDate(value) { return value ? new Date(value).toLocaleString() : '—'; }
function countSummary(counts = {}) {
    return t('pluginManagement.countSummary', {
        success: (counts.written || 0) + (counts.updated || 0) + (counts.skipped || 0),
        failed: (counts.failed || 0) + (counts.conflicts || 0),
    });
}
function runColor(value) {
    if (['succeeded', 'rolled_back'].includes(value)) return 'success';
    if (['partial', 'queued', 'running'].includes(value)) return 'warning';
    return 'error';
}
async function retry(run) {
    retrying.value = run.id;
    try {
        const rsp = await $backend(`/admin/plugins/connections/${run.connection_id}/retry`, {
            method: 'POST', body: JSON.stringify({ parent_run_id: run.id, trigger: 'manual' }),
        });
        if (rsp.err === 'ok') {
            $alert?.('success', t('pluginManagement.actionStarted'));
            await load();
        } else $alert?.('error', rsp.msg || rsp.err);
    } finally {
        retrying.value = null;
    }
}
async function load() {
    loading.value = true;
    try {
        const [catalogRsp, connectionRsp, runRsp] = await Promise.all([
            $backend('/admin/plugins'), $backend('/admin/plugins/connections'), $backend('/admin/plugins/runs'),
        ]);
        if ([catalogRsp, connectionRsp, runRsp].some(rsp => rsp.err !== 'ok')) throw new Error('load failed');
        installations.value = catalogRsp.installations || [];
        connections.value = connectionRsp.connections || [];
        runs.value = runRsp.runs || [];
    } catch {
        error.value = true;
    } finally {
        loading.value = false;
    }
}
onMounted(load);
useHead(() => ({ title: t('pluginManagement.runs') }));
</script>

<style scoped>
.run-filter { flex: 1 1 220px; max-width: 320px; }
</style>
