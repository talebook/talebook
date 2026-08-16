<template>
    <v-dialog
        :model-value="modelValue"
        fullscreen
        scrollable
        @update:model-value="emit('update:modelValue', $event)"
    >
        <v-card class="metadata-review">
            <v-toolbar
                color="primary"
                density="comfortable"
            >
                <v-btn
                    icon="mdi-close"
                    :aria-label="t('common.close')"
                    @click="close"
                />
                <v-toolbar-title>{{ t('aiMetadata.title') }}</v-toolbar-title>
                <v-chip
                    v-if="task"
                    class="mr-3"
                    variant="tonal"
                >
                    {{ statusLabel }}
                </v-chip>
            </v-toolbar>

            <v-progress-linear
                v-if="busy || running"
                :indeterminate="!task?.counts?.total"
                :model-value="progressPercent"
                :aria-label="t('aiMetadata.progressLabel')"
                color="primary"
            />

            <v-card-text class="review-body">
                <v-alert
                    v-if="errorMessage"
                    type="error"
                    variant="tonal"
                    class="mb-4"
                >
                    {{ errorMessage }}
                </v-alert>

                <v-alert
                    v-if="task && !task.editable"
                    type="info"
                    variant="tonal"
                    class="mb-4"
                >
                    {{ t('aiMetadata.viewOnly') }}
                </v-alert>

                <div
                    v-if="task"
                    class="summary-bar mb-5"
                >
                    <div>
                        <div class="text-h6">
                            {{ t('aiMetadata.reviewHeading') }}
                        </div>
                        <div
                            class="text-body-2 text-medium-emphasis"
                            role="status"
                            aria-live="polite"
                            aria-atomic="true"
                        >
                            {{ task.progress_message }}
                        </div>
                    </div>
                    <div class="d-flex ga-2 flex-wrap">
                        <v-chip
                            color="success"
                            variant="tonal"
                        >
                            {{ t('aiMetadata.succeededCount', { count: task.counts?.succeeded || 0 }) }}
                        </v-chip>
                        <v-chip
                            v-if="task.counts?.failed"
                            color="error"
                            variant="tonal"
                        >
                            {{ t('aiMetadata.failedCount', { count: task.counts.failed }) }}
                        </v-chip>
                        <v-btn
                            v-if="ready"
                            variant="outlined"
                            color="primary"
                            prepend-icon="mdi-check-decagram-outline"
                            @click="selectHighConfidence"
                        >
                            {{ t('aiMetadata.acceptHighConfidence') }}
                        </v-btn>
                    </div>
                </div>

                <v-alert
                    v-if="!task && !busy"
                    type="info"
                    variant="tonal"
                >
                    {{ t('aiMetadata.empty') }}
                </v-alert>

                <v-expansion-panels
                    v-if="task"
                    v-model="expandedBooks"
                    multiple
                    variant="accordion"
                >
                    <v-expansion-panel
                        v-for="item in task.items"
                        :key="item.book_id"
                        :value="item.book_id"
                        class="mb-2"
                    >
                        <v-expansion-panel-title>
                            <div class="book-heading">
                                <strong>{{ item.original?.title || t('aiMetadata.bookFallback', { id: item.book_id }) }}</strong>
                                <span class="text-medium-emphasis">#{{ item.book_id }}</span>
                                <v-chip
                                    :color="itemColor(item)"
                                    size="small"
                                    variant="tonal"
                                >
                                    {{ itemStatus(item) }}
                                </v-chip>
                            </div>
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                            <v-alert
                                v-if="item.error"
                                type="error"
                                variant="tonal"
                                class="mb-3"
                            >
                                {{ item.error.message }}
                            </v-alert>
                            <div
                                v-if="item.suggestions?.length"
                                class="suggestion-list"
                            >
                                <article
                                    v-for="suggestion in item.suggestions"
                                    :key="suggestion.field"
                                    class="suggestion-row"
                                    :class="{ conflict: suggestion.conflict }"
                                >
                                    <v-checkbox-btn
                                        :model-value="isSelected(item.book_id, suggestion.field)"
                                        :disabled="!task.editable || applied"
                                        :aria-label="selectionLabel(item, suggestion.field)"
                                        @update:model-value="setSelected(item.book_id, suggestion.field, $event)"
                                    />
                                    <div class="field-name">
                                        <strong>{{ fieldLabel(suggestion.field) }}</strong>
                                        <v-chip
                                            :color="confidenceColor(suggestion.confidence)"
                                            size="x-small"
                                            variant="tonal"
                                        >
                                            {{ Math.round(suggestion.confidence * 100) }}%
                                        </v-chip>
                                        <v-chip
                                            v-if="suggestion.conflict"
                                            size="x-small"
                                            color="warning"
                                            variant="tonal"
                                        >
                                            {{ t('aiMetadata.conflict') }}
                                        </v-chip>
                                    </div>
                                    <div class="value-diff">
                                        <div>
                                            <span>{{ t('aiMetadata.currentValue') }}</span>
                                            <p>{{ displayValue(suggestion.old_value) }}</p>
                                        </div>
                                        <v-icon color="primary">
                                            mdi-arrow-right
                                        </v-icon>
                                        <div>
                                            <span>{{ t('aiMetadata.suggestedValue') }}</span>
                                            <p>{{ displayValue(suggestion.value) }}</p>
                                        </div>
                                    </div>
                                    <div class="reason text-body-2">
                                        {{ suggestion.reason }}
                                    </div>
                                    <div class="evidence-list">
                                        <div
                                            v-for="(evidence, index) in suggestion.evidence"
                                            :key="`${evidence.source_id}-${index}`"
                                            class="evidence-item"
                                        >
                                            <strong>{{ sourceLabel(evidence) }}</strong>
                                            <blockquote v-if="evidence.quote">
                                                {{ evidence.quote }}
                                            </blockquote>
                                        </div>
                                        <v-chip
                                            v-if="!suggestion.has_evidence"
                                            size="small"
                                            color="warning"
                                            variant="tonal"
                                        >
                                            {{ t('aiMetadata.noVerifiableEvidence') }}
                                        </v-chip>
                                    </div>
                                </article>
                            </div>
                            <v-alert
                                v-else-if="item.status === 'succeeded'"
                                type="info"
                                variant="tonal"
                            >
                                {{ t('aiMetadata.noSuggestion') }}
                            </v-alert>
                        </v-expansion-panel-text>
                    </v-expansion-panel>
                </v-expansion-panels>

                <v-alert
                    v-if="application"
                    class="mt-5"
                    :type="applicationType"
                    variant="tonal"
                >
                    {{ applicationLabel }}
                    <ul
                        v-if="application.items?.some(item => item.status === 'failed')"
                        class="mt-2"
                    >
                        <li
                            v-for="item in application.items.filter(item => item.status === 'failed')"
                            :key="`apply-${item.book_id}`"
                        >
                            {{ t('aiMetadata.applyItemFailed', {
                                book: bookName(item.book_id),
                                message: item.error?.message || t('aiMetadata.unknownError'),
                            }) }}
                        </li>
                    </ul>
                    <ul
                        v-if="application.undo_items?.some(item => item.conflicts?.length)"
                        class="mt-2"
                    >
                        <li
                            v-for="item in application.undo_items"
                            :key="item.book_id"
                        >
                            <span v-if="item.conflicts?.length">
                                #{{ item.book_id }}：{{ t('aiMetadata.undoConflictFields', { fields: item.conflicts.join(', ') }) }}
                            </span>
                        </li>
                    </ul>
                </v-alert>
            </v-card-text>

            <v-card-actions class="px-5 py-3 border-t">
                <v-btn
                    v-if="running"
                    color="warning"
                    variant="text"
                    @click="cancelTask"
                >
                    {{ t('aiMetadata.cancelAnalysis') }}
                </v-btn>
                <v-btn
                    v-if="ready && task?.counts?.failed"
                    color="warning"
                    variant="text"
                    @click="retryFailed"
                >
                    {{ t('aiMetadata.retryFailed') }}
                </v-btn>
                <v-btn
                    v-if="canUndo"
                    color="warning"
                    variant="outlined"
                    @click="undoConfirmOpen = true"
                >
                    {{ t('aiMetadata.undo') }}
                </v-btn>
                <v-spacer />
                <span
                    v-if="ready && !applied"
                    class="text-body-2 text-medium-emphasis mr-3"
                >
                    {{ t('aiMetadata.selectedCount', { count: selectedCount }) }}
                </span>
                <v-btn
                    variant="text"
                    @click="close"
                >
                    {{ t('common.close') }}
                </v-btn>
                <v-btn
                    v-if="ready && !applied"
                    color="primary"
                    variant="flat"
                    :disabled="!task?.editable || selectedCount === 0 || busy"
                    @click="prepareConfirmation"
                >
                    {{ t('aiMetadata.reviewWrite') }}
                </v-btn>
            </v-card-actions>
        </v-card>

        <v-dialog
            v-model="confirmOpen"
            max-width="620"
            persistent
        >
            <v-card>
                <v-card-title>{{ t('aiMetadata.confirmTitle') }}</v-card-title>
                <v-card-text>
                    <v-alert
                        type="warning"
                        variant="tonal"
                        class="mb-4"
                    >
                        {{ t('aiMetadata.confirmWarning') }}
                    </v-alert>
                    <p>
                        {{ t('aiMetadata.confirmSummary', {
                            books: confirmation?.book_count || 0,
                            fields: confirmation?.field_count || 0,
                        }) }}
                    </p>
                </v-card-text>
                <v-card-actions>
                    <v-btn @click="confirmOpen = false">
                        {{ t('common.back') }}
                    </v-btn>
                    <v-spacer />
                    <v-btn
                        color="primary"
                        variant="flat"
                        :loading="busy"
                        @click="apply"
                    >
                        {{ t('aiMetadata.confirmApply') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog
            v-model="undoConfirmOpen"
            max-width="520"
        >
            <v-card>
                <v-card-title>{{ t('aiMetadata.undoConfirmTitle') }}</v-card-title>
                <v-card-text>{{ t('aiMetadata.undoConfirmWarning') }}</v-card-text>
                <v-card-actions>
                    <v-btn @click="undoConfirmOpen = false">
                        {{ t('common.back') }}
                    </v-btn>
                    <v-spacer />
                    <v-btn
                        color="warning"
                        variant="flat"
                        :loading="busy"
                        @click="undo"
                    >
                        {{ t('aiMetadata.undoConfirmAction') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

type MetadataTask = Record<string, any>;

const props = defineProps<{
    modelValue: boolean;
    bookIds: number[];
    initialTask?: MetadataTask | null;
    requester?: (path: string, options?: Record<string, any>) => Promise<any>;
    notifier?: (type: string, message: string) => void;
}>();
const emit = defineEmits(['update:modelValue', 'applied']);
const { t } = useI18n();
const nuxtApp = tryUseNuxtApp();
const backend = props.requester || nuxtApp?.$backend;
const alert = props.notifier || nuxtApp?.$alert;

const task = ref<MetadataTask | null>(props.initialTask || null);
const busy = ref(false);
const errorMessage = ref('');
const selected = ref<Record<string, boolean>>({});
const initializedTaskId = ref('');
const confirmOpen = ref(false);
const undoConfirmOpen = ref(false);
const confirmation = ref<Record<string, any> | null>(null);
const expandedBooks = ref<number[]>([]);
let pollTimer: ReturnType<typeof setTimeout> | null = null;

const running = computed(() => ['queued', 'running'].includes(task.value?.status));
const ready = computed(() => task.value?.status === 'succeeded');
const application = computed(() => task.value?.application || null);
const applied = computed(() => ['applied', 'partially_applied', 'undone', 'partially_undone'].includes(application.value?.state));
const canUndo = computed(() => ['applied', 'partially_applied'].includes(application.value?.state) && task.value?.editable);
const selectedCount = computed(() => Object.values(selected.value).filter(Boolean).length);
const progressPercent = computed(() => {
    const counts = task.value?.counts;
    if (!counts?.total) return 0;
    return ((counts.succeeded + counts.failed + counts.cancelled) / counts.total) * 100;
});
const statusLabel = computed(() => t(`aiMetadata.status.${task.value?.status || 'queued'}`));
const applicationType = computed(() => application.value?.state === 'applied' || application.value?.state === 'undone' ? 'success' : 'warning');
const applicationLabel = computed(() => t(`aiMetadata.application.${application.value?.state || 'applied'}`));

const keyFor = (bookId: number, field: string) => `${bookId}:${field}`;
const isSelected = (bookId: number, field: string) => Boolean(selected.value[keyFor(bookId, field)]);
const setSelected = (bookId: number, field: string, value: boolean | null) => {
    selected.value[keyFor(bookId, field)] = Boolean(value);
};
const displayValue = (value: unknown) => Array.isArray(value) ? value.join(' / ') : String(value || '—');
const fieldLabel = (field: string) => t(`aiMetadata.fields.${field}`);
const bookName = (bookId: number) => {
    const item = task.value?.items?.find((entry: MetadataTask) => entry.book_id === bookId);
    return item?.original?.title || t('aiMetadata.bookFallback', { id: bookId });
};
const selectionLabel = (item: MetadataTask, field: string) => t('aiMetadata.selectFieldLabel', {
    field: fieldLabel(field),
    book: item.original?.title || t('aiMetadata.bookFallback', { id: item.book_id }),
    id: item.book_id,
});
const sourceLabel = (evidence: MetadataTask) => {
    if (evidence.source_id === 'model_inference') return t('aiMetadata.modelInference');
    if (evidence.source_id?.startsWith('library:')) {
        const field = evidence.source_id.slice('library:'.length);
        return t('aiMetadata.librarySource', { field: fieldLabel(field) });
    }
    return evidence.source_label || t('aiMetadata.sourceFallback');
};
const confidenceColor = (confidence: number) => confidence >= 0.85 ? 'success' : confidence >= 0.65 ? 'warning' : 'grey';
const itemColor = (item: MetadataTask) => item.status === 'succeeded' ? 'success' : item.status === 'failed' ? 'error' : 'info';
const itemStatus = (item: MetadataTask) => t(`aiMetadata.itemStatus.${item.status}`);

const initializeSelection = () => {
    if (!task.value || initializedTaskId.value === task.value.id) return;
    const values: Record<string, boolean> = {};
    for (const item of task.value.items || []) {
        for (const suggestion of item.suggestions || []) {
            values[keyFor(item.book_id, suggestion.field)] = Boolean(suggestion.default_selected);
        }
    }
    selected.value = values;
    expandedBooks.value = task.value.items?.length ? [task.value.items[0].book_id] : [];
    initializedTaskId.value = task.value.id;
};

const request = async (path: string, options: Record<string, any> = {}) => {
    errorMessage.value = '';
    if (!backend) throw new Error(t('aiMetadata.requestFailed'));
    const response = await backend(path, options);
    if (response.err !== 'ok') throw new Error(response.msg || t('aiMetadata.requestFailed'));
    return response;
};

const schedulePoll = () => {
    if (pollTimer) clearTimeout(pollTimer);
    if (!running.value || !props.modelValue) return;
    pollTimer = setTimeout(() => void refreshTask(), 1200);
};

const refreshTask = async () => {
    if (!task.value) return;
    try {
        const response = await request(`/api/ai/metadata/tasks/${task.value.id}`);
        task.value = response.task;
        initializeSelection();
    } catch (error: any) {
        errorMessage.value = error.message;
    } finally {
        schedulePoll();
    }
};

const start = async () => {
    if (props.initialTask) {
        task.value = props.initialTask;
        initializeSelection();
        schedulePoll();
        return;
    }
    if (!props.bookIds.length) return;
    busy.value = true;
    try {
        const response = await request('/api/ai/metadata/tasks', {
            method: 'POST',
            body: JSON.stringify({ book_ids: props.bookIds }),
        });
        task.value = response.task;
        initializeSelection();
        schedulePoll();
    } catch (error: any) {
        errorMessage.value = error.message;
    } finally {
        busy.value = false;
    }
};

const selectHighConfidence = () => {
    for (const item of task.value?.items || []) {
        for (const suggestion of item.suggestions || []) {
            setSelected(item.book_id, suggestion.field, suggestion.has_evidence && suggestion.confidence >= 0.85);
        }
    }
};

const selectedPayload = () => (task.value?.items || []).map((item: MetadataTask) => ({
    book_id: item.book_id,
    fields: (item.suggestions || []).filter((entry: MetadataTask) => isSelected(item.book_id, entry.field)).map((entry: MetadataTask) => entry.field),
})).filter((item: MetadataTask) => item.fields.length);

const prepareConfirmation = async () => {
    busy.value = true;
    try {
        const response = await request(`/api/ai/metadata/tasks/${task.value?.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ items: selectedPayload() }),
        });
        task.value = response.task;
        confirmation.value = response.confirmation;
        confirmOpen.value = true;
    } catch (error: any) {
        errorMessage.value = error.message;
    } finally {
        busy.value = false;
    }
};

const apply = async () => {
    busy.value = true;
    try {
        const response = await request(`/api/ai/metadata/tasks/${task.value?.id}/apply`, {
            method: 'POST',
            body: JSON.stringify({
                selection_revision: confirmation.value?.selection_revision,
                idempotency_key: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${task.value?.id}`,
            }),
        });
        task.value = response.task;
        confirmOpen.value = false;
        emit('applied', response.task);
        alert?.('success', t('aiMetadata.applyComplete'));
    } catch (error: any) {
        errorMessage.value = error.message;
    } finally {
        busy.value = false;
    }
};

const postAction = async (action: string) => {
    busy.value = true;
    try {
        const response = await request(`/api/ai/metadata/tasks/${task.value?.id}/${action}`, {
            method: 'POST',
            body: '{}',
        });
        task.value = response.task;
        schedulePoll();
    } catch (error: any) {
        errorMessage.value = error.message;
    } finally {
        busy.value = false;
    }
};
const retryFailed = () => postAction('retry');
const undo = async () => {
    await postAction('undo');
    if (!errorMessage.value) undoConfirmOpen.value = false;
};
const cancelTask = async () => {
    busy.value = true;
    try {
        const response = await request(`/api/ai/metadata/tasks/${task.value?.id}/cancel`, { method: 'POST', body: '{}' });
        task.value = response.task;
        schedulePoll();
    } catch (error: any) {
        errorMessage.value = error.message;
    } finally {
        busy.value = false;
    }
};
const close = () => emit('update:modelValue', false);

watch(() => props.modelValue, (open) => {
    if (open) void start();
    else if (pollTimer) clearTimeout(pollTimer);
}, { immediate: true });
onBeforeUnmount(() => { if (pollTimer) clearTimeout(pollTimer); });
</script>

<style scoped>
.metadata-review { background: rgb(var(--v-theme-background)); }
.review-body { max-width: 1280px; width: 100%; margin: 0 auto; }
.summary-bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.book-heading { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
.suggestion-list { display: grid; gap: .85rem; }
.suggestion-row { display: grid; grid-template-columns: 44px 145px minmax(340px, 1fr); gap: .7rem 1rem; padding: 1rem; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 12px; }
.suggestion-row.conflict { border-left: 4px solid rgb(var(--v-theme-warning)); }
.field-name { display: flex; align-items: center; align-content: flex-start; gap: .35rem; flex-wrap: wrap; }
.value-diff { display: grid; grid-template-columns: 1fr auto 1fr; gap: 1rem; align-items: center; }
.value-diff span { color: rgba(var(--v-theme-on-surface), .62); font-size: .78rem; }
.value-diff p { margin: .2rem 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.reason, .evidence-list { grid-column: 3; }
.evidence-list { display: grid; gap: .5rem; }
.evidence-item { padding: .6rem .75rem; border-left: 3px solid rgb(var(--v-theme-info)); border-radius: 4px; background: rgba(var(--v-theme-info), .08); overflow-wrap: anywhere; }
.evidence-item blockquote { margin: .25rem 0 0; white-space: pre-wrap; }
@media (max-width: 800px) {
    .summary-bar { align-items: flex-start; flex-direction: column; }
    .suggestion-row { grid-template-columns: 40px 1fr; }
    .value-diff, .reason, .evidence-list { grid-column: 1 / -1; }
    .value-diff { grid-template-columns: 1fr; }
    .value-diff > .v-icon { transform: rotate(90deg); justify-self: center; }
}
</style>
