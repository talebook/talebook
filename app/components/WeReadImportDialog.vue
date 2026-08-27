<template>
    <v-dialog
        v-model="dialog"
        max-width="760"
        scrollable
        eager
        aria-labelledby="weread-import-dialog-title"
    >
        <template #activator="{ props: activatorProps }">
            <v-btn
                v-bind="activatorProps"
                color="primary"
                prepend-icon="mdi-import"
            >
                {{ connection?.secret?.configured ? t('wereadImport.openConnected') : t('wereadImport.open') }}
            </v-btn>
        </template>
        <v-card>
            <v-card-title class="d-flex align-center">
                <span id="weread-import-dialog-title">{{ t('wereadImport.title') }}</span>
                <v-spacer />
                <v-btn
                    icon="mdi-close"
                    variant="text"
                    :aria-label="t('common.close')"
                    @click="dialog = false"
                />
            </v-card-title>
            <v-divider />
            <v-card-text>
                <v-alert
                    type="info"
                    variant="tonal"
                    density="compact"
                    class="mb-4"
                >
                    {{ t('wereadImport.bookmarkNotice') }}
                </v-alert>
                <v-alert
                    v-if="connection?.secret?.configured"
                    type="success"
                    variant="tonal"
                    density="compact"
                    class="mb-4"
                >
                    {{ t('wereadImport.connectedHint', { mask: connection.secret.mask }) }}
                </v-alert>
                <v-file-input
                    v-model="file"
                    accept="application/json,.json"
                    prepend-icon="mdi-file-upload-outline"
                    :label="t('wereadImport.exportFile')"
                    :hint="t('wereadImport.exportHint')"
                    persistent-hint
                    show-size
                    @update:model-value="resetPreview"
                />
                <div
                    class="d-flex align-center ga-3 my-4"
                    aria-hidden="true"
                >
                    <v-divider />
                    <span class="text-caption text-medium-emphasis">{{ t('wereadImport.or') }}</span>
                    <v-divider />
                </div>
                <v-text-field
                    v-model="apiKey"
                    type="password"
                    autocomplete="off"
                    prepend-inner-icon="mdi-key"
                    :label="t('wereadImport.apiKey')"
                    :hint="connection?.secret?.configured ? t('wereadImport.savedKeyHint', { mask: connection.secret.mask }) : t('wereadImport.apiKeyHint')"
                    persistent-hint
                    @update:model-value="resetPreview"
                />

                <v-alert
                    v-if="error"
                    type="error"
                    variant="tonal"
                    class="mt-4"
                >
                    {{ error }}
                </v-alert>

                <template v-if="previewRun">
                    <v-divider class="my-5" />
                    <div class="d-flex flex-wrap ga-2 mb-4">
                        <v-chip
                            color="primary"
                            variant="tonal"
                        >
                            {{ t('wereadImport.fetched', { count: previewRun.counts?.fetched || 0 }) }}
                        </v-chip>
                        <v-chip
                            :color="unresolvedBooks.length ? 'warning' : 'success'"
                            variant="tonal"
                        >
                            {{ unresolvedBooks.length ? t('wereadImport.needsConfirmation', { count: unresolvedBooks.length }) : t('wereadImport.ready') }}
                        </v-chip>
                    </div>

                    <div
                        v-if="unresolvedBooks.length"
                        class="match-list"
                    >
                        <h3 class="text-subtitle-1 mb-2">
                            {{ t('wereadImport.matchTitle') }}
                        </h3>
                        <v-card
                            v-for="group in unresolvedBooks"
                            :key="group.sourceBookId"
                            variant="outlined"
                            class="mb-3"
                        >
                            <v-card-text>
                                <div class="font-weight-medium">
                                    {{ group.book.title || t('wereadImport.unknownBook') }}
                                </div>
                                <div class="text-caption text-medium-emphasis mb-3">
                                    {{ group.book.author }} · {{ group.sourceBookId }}
                                </div>
                                <v-select
                                    v-model="matches[group.sourceBookId]"
                                    :items="group.candidates"
                                    item-title="label"
                                    item-value="book_id"
                                    :label="t('wereadImport.selectMatch')"
                                    variant="outlined"
                                    density="compact"
                                    hide-details
                                />
                            </v-card-text>
                        </v-card>
                    </div>
                </template>

                <v-alert
                    v-if="resultRun"
                    :type="resultRun.status === 'succeeded' ? 'success' : 'warning'"
                    variant="tonal"
                    class="mt-4"
                >
                    {{ t('wereadImport.result', {
                        written: (resultRun.counts?.written || 0) + (resultRun.counts?.updated || 0),
                        skipped: resultRun.counts?.skipped || 0,
                        failed: (resultRun.counts?.failed || 0) + (resultRun.counts?.conflicts || 0),
                    }) }}
                </v-alert>
            </v-card-text>
            <v-divider />
            <v-card-actions>
                <v-btn
                    variant="text"
                    :disabled="busy"
                    @click="testConnection"
                >
                    {{ t('wereadImport.test') }}
                </v-btn>
                <v-spacer />
                <v-btn
                    variant="text"
                    :disabled="busy"
                    @click="dialog = false"
                >
                    {{ t('common.cancel') }}
                </v-btn>
                <v-btn
                    color="primary"
                    variant="tonal"
                    :loading="busy && action === 'preview'"
                    :disabled="busy"
                    @click="preview"
                >
                    {{ t('wereadImport.preview') }}
                </v-btn>
                <v-btn
                    color="primary"
                    :loading="busy && action === 'run'"
                    :disabled="busy || !previewRun || !allMatchesSelected"
                    @click="runImport"
                >
                    {{ t('wereadImport.import') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
    backend: { type: Function, default: null },
    savedConnection: { type: Object, default: null },
});
const emit = defineEmits(['imported']);
const { t } = useI18n();
const backend = props.backend || useNuxtApp().$backend;
const dialog = ref(false);
const file = ref(null);
const apiKey = ref('');
const parsedExport = ref(null);
const connection = ref(props.savedConnection);
const previewRun = ref(null);
const previewItems = ref([]);
const resultRun = ref(null);
const matches = reactive({});
const busy = ref(false);
const action = ref('');
const error = ref('');
const PLUGIN_KEY = 'talebook.weread';
const TERMINAL_RUN_STATUSES = new Set(['succeeded', 'partial', 'failed', 'rolled_back']);
const RUN_POLL_INTERVAL_MS = 1000;
const RUN_POLL_ATTEMPTS = 300;
const activeRequests = new Set();
const pendingDelays = new Map();
let disposed = false;

function open() {
    dialog.value = true;
}

function setApiKey(value) {
    apiKey.value = String(value || '');
}

const unresolvedBooks = computed(() => {
    const groups = new Map();
    for (const item of previewItems.value) {
        if (item.data?.match_status !== 'confirmation_required' && item.data?.match_status !== 'unmatched') continue;
        const sourceBookId = String(item.data?.source_book_id || item.data?.book?.provider_id || '');
        if (!sourceBookId || groups.has(sourceBookId)) continue;
        groups.set(sourceBookId, {
            sourceBookId,
            book: item.data?.book || {},
            candidates: (item.data?.candidates || []).map(candidate => ({
                ...candidate,
                label: `${candidate.title} · ${candidate.author} (#${candidate.book_id})`,
            })),
        });
    }
    return [...groups.values()];
});
const allMatchesSelected = computed(() => unresolvedBooks.value.every(group => Boolean(matches[group.sourceBookId])));

function resetPreview() {
    previewRun.value = null;
    previewItems.value = [];
    resultRun.value = null;
    error.value = '';
    for (const key of Object.keys(matches)) delete matches[key];
}

async function readExport() {
    const selected = Array.isArray(file.value) ? file.value[0] : file.value;
    if (!selected) return null;
    try {
        const text = await selected.text();
        return JSON.parse(text);
    } catch {
        throw new Error(t('wereadImport.invalidFile'));
    }
}

function sleep(milliseconds) {
    if (disposed) return Promise.resolve(false);
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            pendingDelays.delete(timer);
            resolve(!disposed);
        }, milliseconds);
        pendingDelays.set(timer, resolve);
    });
}

async function ensureConnection(signal) {
    const credential = apiKey.value.trim();
    if (connection.value && !credential) return connection.value;
    const response = await backend('/plugins/connections', {
        method: 'POST',
        signal,
        body: JSON.stringify({
            plugin_key: PLUGIN_KEY,
            credentials: credential ? { api_key: credential } : {},
        }),
    });
    if (disposed) return null;
    if (response.err !== 'ok') throw new Error(response.msg || response.err);
    connection.value = response.connection;
    apiKey.value = '';
    return connection.value;
}

async function waitForRun(run, signal) {
    for (let attempt = 0; attempt < RUN_POLL_ATTEMPTS; attempt += 1) {
        const response = await backend(`/plugins/runs/${run.id}`, { signal });
        if (disposed || signal.aborted) return null;
        if (response.err !== 'ok') throw new Error(response.msg || response.err);
        if (TERMINAL_RUN_STATUSES.has(response.run.status)) return response;
        if (!await sleep(RUN_POLL_INTERVAL_MS)) return null;
    }
    throw new Error(t('wereadImport.failed'));
}

async function request(runAction, includeMatches = false) {
    if (disposed) return null;
    const controller = new AbortController();
    activeRequests.add(controller);
    action.value = runAction;
    busy.value = true;
    error.value = '';
    try {
        if (file.value) parsedExport.value = await readExport();
        if (disposed) return null;
        const activeConnection = await ensureConnection(controller.signal);
        if (!activeConnection || disposed) return null;
        const inputData = {};
        if (parsedExport.value !== null) inputData.export = parsedExport.value;
        if (includeMatches) inputData.matches = { ...matches };
        const response = await backend(`/plugins/connections/${activeConnection.id}/${runAction}`, {
            method: 'POST', signal: controller.signal, body: JSON.stringify({ input_data: inputData }),
        });
        if (disposed) return null;
        if (response.err !== 'ok') throw new Error(response.msg || response.err);
        return await waitForRun(response.run, controller.signal);
    } catch (reason) {
        if (!disposed && !controller.signal.aborted) error.value = reason?.message || t('wereadImport.failed');
        return null;
    } finally {
        activeRequests.delete(controller);
        if (!disposed) busy.value = false;
    }
}

async function preview() {
    const response = await request('preview');
    if (!response) return;
    previewRun.value = response.run;
    previewItems.value = response.items || [];
    resultRun.value = null;
}

async function runImport() {
    const response = await request('run', true);
    if (!response) return;
    resultRun.value = response.run;
    if (response.run.status === 'succeeded') emit('imported', response.run);
}

async function testConnection() {
    if (file.value) return preview();
    const response = await request('test');
    if (response) resultRun.value = response.run;
}

onMounted(async () => {
    const controller = new AbortController();
    activeRequests.add(controller);
    try {
        const response = await backend(`/plugins/${PLUGIN_KEY}`, { signal: controller.signal });
        if (!disposed && response.err === 'ok') {
            connection.value = (response.connections || []).find(item => item.role === 'default') || connection.value;
        }
    } catch {
        // Setup remains available; a load failure is reported on the first action.
    } finally {
        activeRequests.delete(controller);
    }
});

onBeforeUnmount(() => {
    disposed = true;
    for (const controller of activeRequests) controller.abort();
    activeRequests.clear();
    for (const [timer, resolve] of pendingDelays) {
        clearTimeout(timer);
        resolve(false);
    }
    pendingDelays.clear();
});

watch(() => props.savedConnection, value => {
    if (value) connection.value = value;
});

defineExpose({ open, preview, runImport, setApiKey });
</script>

<style scoped>
.match-list { max-height:320px; overflow:auto; padding-inline-end:2px; }
</style>
