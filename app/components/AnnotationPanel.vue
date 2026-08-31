<template>
    <section
        v-if="!hideWhenEmpty || loadError || annotations.length || feedback"
        class="annotation-panel"
        :class="{ 'annotation-panel--compact': compact }"
        :aria-labelledby="headingId"
    >
        <header class="annotation-panel__header">
            <h2 :id="headingId" class="annotation-panel__title">
                {{ t('annotations.title') }}
                <span v-if="!loading" class="annotation-panel__count">{{ filteredAnnotations.length }}</span>
            </h2>
            <div class="d-flex align-center ga-1">
                <v-btn
                    icon="mdi-refresh"
                    size="small"
                    variant="text"
                    :aria-label="t('annotations.refresh')"
                    :loading="loading"
                    @click="loadAnnotations"
                />
            </div>
        </header>

        <v-tabs
            v-if="!loading && annotations.length"
            v-model="viewMode"
            class="annotation-panel__tabs"
            density="compact"
            color="primary"
        >
            <v-tab value="public">
                {{ t('annotations.publicActivity') }}
                <span class="annotation-panel__tab-count">{{ publicAnnotations.length }}</span>
            </v-tab>
            <v-tab value="mine">
                {{ t('annotations.myNotes') }}
                <span class="annotation-panel__tab-count">{{ myAnnotations.length }}</span>
            </v-tab>
        </v-tabs>

        <div v-if="!loading && annotations.length" class="annotation-panel__controls">
            <v-select
                v-model="sourceFilter"
                class="annotation-panel__filter"
                :items="sourceOptions"
                item-title="title"
                item-value="value"
                :label="t('annotations.sourceFilter')"
                density="compact"
                variant="outlined"
                hide-details
            />
            <div v-if="viewMode === 'mine' && rollbackTargets.length" class="annotation-panel__rollback">
                <v-select
                    v-model="rollbackKey"
                    class="annotation-panel__rollback-select"
                    :items="rollbackTargets"
                    item-title="title"
                    item-value="key"
                    :label="t('annotations.rollbackTarget')"
                    density="compact"
                    variant="outlined"
                    hide-details
                />
                <v-btn
                    color="warning"
                    variant="tonal"
                    :loading="rollingBack"
                    :disabled="!rollbackKey"
                    @click="rollbackDialog = true"
                >
                    {{ t('annotations.rollback') }}
                </v-btn>
            </div>
        </div>

        <v-alert
            v-if="feedback"
            ref="feedbackAlert"
            class="mb-2"
            :type="feedback.type"
            variant="tonal"
            closable
            tabindex="-1"
            @click:close="feedback = null"
        >
            {{ feedback.message }}
        </v-alert>

        <div v-if="loading" class="annotation-panel__state" role="status" aria-live="polite">
            <v-progress-circular indeterminate color="primary" size="28" />
            <span>{{ t('annotations.loading') }}</span>
        </div>

        <v-alert v-else-if="loadError" type="error" variant="tonal">
            <div class="d-flex flex-wrap align-center ga-2">
                <span>{{ loadError }}</span>
                <v-btn size="small" variant="text" @click="loadAnnotations">
                    {{ t('common.retry') }}
                </v-btn>
            </div>
        </v-alert>

        <div v-else-if="!filteredAnnotations.length" class="annotation-panel__state annotation-panel__state--empty">
            <v-icon size="38" color="medium-emphasis">mdi-bookmark-outline</v-icon>
            <strong>{{ annotations.length ? t('annotations.filterEmptyTitle') : t('annotations.emptyTitle') }}</strong>
            <span>{{ annotations.length ? t('annotations.filterEmptyBody') : t('annotations.emptyBody') }}</span>
        </div>

        <ol v-else class="annotation-list" :aria-label="t('annotations.listLabel')">
            <li
                v-for="annotation in filteredAnnotations"
                :key="annotation.id"
                class="annotation-card"
                :class="{ 'annotation-card--external': annotation.sources.length > 0 }"
            >
                <div class="annotation-card__topline">
                    <div class="annotation-card__meta">
                        <v-chip size="small" variant="tonal" :prepend-icon="typeIcon(annotation.annotation_type)">
                            {{ typeLabel(annotation.annotation_type) }}
                        </v-chip>
                        <v-chip
                            v-for="source in displaySources(annotation)"
                            :key="source.key"
                            size="small"
                            :color="source.external ? 'indigo' : 'blue-grey'"
                            :variant="source.external ? 'flat' : 'outlined'"
                        >
                            {{ source.label }}
                        </v-chip>
                        <span class="annotation-card__chapter">
                            <v-icon size="14">mdi-book-open-variant</v-icon>
                            <span>{{ annotation.chapter || t('annotations.unknownChapter') }}</span>
                        </span>
                        <span v-if="!annotation.cfi" class="annotation-card__fallback">
                            {{ t('annotations.chapterOnly') }}
                        </span>
                    </div>
                    <v-menu v-if="annotation.can_edit">
                        <template #activator="{ props: menuProps }">
                            <v-btn
                                v-bind="menuProps"
                                icon="mdi-dots-horizontal"
                                size="x-small"
                                variant="text"
                                :aria-label="t('annotations.actionsFor', { chapter: annotation.chapter || t('annotations.unknownChapter') })"
                            />
                        </template>
                        <v-list density="compact">
                            <v-list-item
                                prepend-icon="mdi-delete-outline"
                                :title="t('annotations.delete')"
                                @click="requestDelete(annotation)"
                            />
                        </v-list>
                    </v-menu>
                </div>

                <blockquote v-if="annotation.quote_text" class="annotation-card__quote">
                    {{ annotation.quote_text }}
                </blockquote>
                <p v-if="annotation.content" class="annotation-card__content">
                    {{ annotation.content }}
                </p>

                <footer class="annotation-card__footer">
                    <span v-if="annotation.author_name" class="annotation-card__author">
                        <v-icon size="14">mdi-account-circle-outline</v-icon>
                        {{ annotation.author_name }}
                    </span>
                    <span>{{ timestampLabel(annotation) }}</span>
                    <v-btn
                        v-if="annotation.cfi || chapterNavigation"
                        size="small"
                        variant="text"
                        :prepend-icon="annotation.cfi ? 'mdi-crosshairs-gps' : 'mdi-book-open-page-variant-outline'"
                        @click="$emit('locate', annotation)"
                    >
                        {{ annotation.cfi ? t('annotations.locate') : t('annotations.openChapter') }}
                    </v-btn>
                </footer>
            </li>
        </ol>

        <v-dialog
            v-model="deleteDialog"
            max-width="460"
            :aria-labelledby="`${headingId}-delete-title`"
        >
            <v-card>
                <v-card-title :id="`${headingId}-delete-title`">
                    {{ t('annotations.deleteTitle') }}
                </v-card-title>
                <v-card-text>{{ t('annotations.deleteConfirm') }}</v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="deleteDialog = false">{{ t('common.cancel') }}</v-btn>
                    <v-btn color="error" :loading="deleting" @click="deleteAnnotation">{{ t('common.delete') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog
            v-model="rollbackDialog"
            max-width="520"
            :aria-labelledby="`${headingId}-rollback-title`"
        >
            <v-card>
                <v-card-title :id="`${headingId}-rollback-title`">
                    {{ t('annotations.rollbackTitle') }}
                </v-card-title>
                <v-card-text>
                    {{ t('annotations.rollbackConfirm', { target: selectedRollback?.title || '' }) }}
                    <v-alert class="mt-3" type="info" variant="tonal">
                        {{ t('annotations.rollbackKeepsContent') }}
                    </v-alert>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="rollbackDialog = false">{{ t('common.cancel') }}</v-btn>
                    <v-btn color="warning" :loading="rollingBack" @click="rollbackImport">{{ t('annotations.rollback') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
    bookId: { type: [Number, String], required: true },
    compact: { type: Boolean, default: false },
    hideWhenEmpty: { type: Boolean, default: false },
    chapterNavigation: { type: Boolean, default: false },
    backend: { type: Function, default: null },
});

defineEmits(['locate']);

const { t, locale } = useI18n();
const backend = props.backend || useNuxtApp().$backend;
const headingId = `annotation-heading-${Math.random().toString(36).slice(2)}`;
const annotations = ref([]);
const loading = ref(true);
const loadError = ref('');
const viewMode = ref('public');
const sourceFilter = ref('all');
const feedback = ref(null);
const feedbackAlert = ref(null);
const deleteDialog = ref(false);
const deleting = ref(false);
const pendingDelete = ref(null);
const rollbackDialog = ref(false);
const rollingBack = ref(false);
const rollbackKey = ref('');

const sourceLabel = (name) => {
    const key = `annotations.sources.${name}`;
    const translated = t(key);
    return translated === key ? name : translated;
};

const annotationSourceNames = (annotation) => {
    if (!annotation.sources?.length) return ['talebook'];
    return [...new Set(annotation.sources.map(source => source.source_name).filter(Boolean))];
};

const publicAnnotations = computed(() => annotations.value
    .filter(annotation => !annotation.is_private)
    .sort((left, right) => String(right.updated_at || '').localeCompare(String(left.updated_at || ''))));
const myAnnotations = computed(() => annotations.value.filter(annotation => annotation.can_edit));
const viewAnnotations = computed(() => viewMode.value === 'mine' ? myAnnotations.value : publicAnnotations.value);

const sourceOptions = computed(() => {
    const names = [...new Set(viewAnnotations.value.flatMap(annotationSourceNames))];
    return [
        { title: t('annotations.allSources'), value: 'all' },
        ...names.sort().map(name => ({ title: sourceLabel(name), value: name })),
    ];
});

const filteredAnnotations = computed(() => {
    if (sourceFilter.value === 'all') return viewAnnotations.value;
    return viewAnnotations.value.filter(annotation => annotationSourceNames(annotation).includes(sourceFilter.value));
});

const rollbackTargets = computed(() => {
    const groups = new Map();
    for (const annotation of myAnnotations.value) {
        for (const source of annotation.sources || []) {
            if (!source.source_name) continue;
            const runId = source.source_run_id || '';
            const key = [source.source_name, source.source_connection_id || '', runId].join('\u001f');
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    sourceName: source.source_name,
                    connectionId: source.source_connection_id || '',
                    runId,
                    count: 0,
                });
            }
            groups.get(key).count += 1;
        }
    }
    return [...groups.values()].map(target => ({
        ...target,
        title: target.runId
            ? t('annotations.rollbackRunOption', { source: sourceLabel(target.sourceName), run: target.runId, count: target.count })
            : t('annotations.rollbackSourceOption', { source: sourceLabel(target.sourceName), count: target.count }),
    }));
});

const selectedRollback = computed(() => rollbackTargets.value.find(item => item.key === rollbackKey.value));

watch(rollbackTargets, (targets) => {
    if (!targets.some(item => item.key === rollbackKey.value)) rollbackKey.value = targets[0]?.key || '';
}, { immediate: true });
watch(viewMode, () => { sourceFilter.value = 'all'; });

const displaySources = (annotation) => {
    if (!annotation.sources?.length) {
        return [{ key: 'talebook', label: sourceLabel('talebook'), external: false }];
    }
    return annotation.sources.map((source, index) => ({
        key: `${source.source_name}-${source.source_connection_id}-${index}`,
        label: sourceLabel(source.source_name),
        external: true,
    }));
};

const typeIcon = (type) => ({
    highlight: 'mdi-marker', note: 'mdi-note-text-outline', bookmark: 'mdi-bookmark-outline', chapter_comment: 'mdi-comment-text-outline',
}[type] || 'mdi-note-outline');

const typeLabel = (type) => {
    const key = `annotations.types.${type}`;
    const translated = t(key);
    return translated === key ? type : translated;
};

const formatTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const timestampLabel = (annotation) => {
    const updated = formatTime(annotation.updated_at);
    const created = formatTime(annotation.created_at);
    if (updated && annotation.updated_at !== annotation.created_at) return t('annotations.updatedAt', { time: updated });
    return t('annotations.createdAt', { time: created });
};

const focusFeedback = async () => {
    await nextTick();
    feedbackAlert.value?.$el?.focus?.();
};

const loadAnnotations = async () => {
    loading.value = true;
    loadError.value = '';
    try {
        const response = await backend(`/book/${props.bookId}/annotations`);
        if (response.err === 'ok') {
            annotations.value = Array.isArray(response.annotations) ? response.annotations : [];
        } else if (response.err === 'user.need_login' || response.err === 'params.book.invalid') {
            loadError.value = t('annotations.permissionDenied');
        } else {
            loadError.value = response.msg || t('annotations.loadFailed');
        }
    } catch {
        loadError.value = t('annotations.loadFailed');
    } finally {
        loading.value = false;
    }
};

const requestDelete = (annotation) => {
    pendingDelete.value = annotation;
    deleteDialog.value = true;
};

const deleteAnnotation = async () => {
    if (!pendingDelete.value) return;
    deleting.value = true;
    const annotation = pendingDelete.value;
    try {
        const response = await backend(`/book/${props.bookId}/annotations/${annotation.id}`, { method: 'DELETE' });
        if (response.err === 'ok') {
            annotations.value = annotations.value.filter(item => item.id !== annotation.id);
            feedback.value = { type: 'success', message: t('annotations.deleted') };
        } else if (response.err === 'annotation.not_found') {
            annotations.value = annotations.value.filter(item => item.id !== annotation.id);
            feedback.value = { type: 'info', message: t('annotations.alreadyDeleted') };
        } else {
            feedback.value = { type: 'error', message: response.msg || t('annotations.deleteFailed') };
        }
        deleteDialog.value = false;
        await focusFeedback();
    } catch {
        feedback.value = { type: 'error', message: t('annotations.deleteFailed') };
        deleteDialog.value = false;
        await focusFeedback();
    } finally {
        deleting.value = false;
        pendingDelete.value = null;
    }
};

const rollbackImport = async () => {
    const target = selectedRollback.value;
    if (!target) return;
    rollingBack.value = true;
    try {
        const query = new URLSearchParams({
            book_id: String(props.bookId),
            source_name: target.sourceName,
            source_connection_id: target.connectionId,
        });
        if (target.runId) query.set('source_run_id', target.runId);
        const response = await backend(`/annotations?${query.toString()}`, { method: 'DELETE' });
        if (response.err !== 'ok') {
            feedback.value = { type: 'error', message: response.msg || t('annotations.rollbackFailed') };
        } else if (response.sources_deleted < target.count) {
            feedback.value = {
                type: 'warning',
                message: t('annotations.rollbackPartial', { deleted: response.sources_deleted, total: target.count }),
            };
        } else {
            feedback.value = { type: 'success', message: t('annotations.rollbackDone', { count: response.sources_deleted }) };
        }
        rollbackDialog.value = false;
        await loadAnnotations();
        await focusFeedback();
    } catch {
        feedback.value = { type: 'error', message: t('annotations.rollbackFailed') };
        rollbackDialog.value = false;
        await focusFeedback();
    } finally {
        rollingBack.value = false;
    }
};

defineExpose({ annotations, viewMode, sourceFilter, rollbackTargets, rollbackKey, requestDelete, deleteAnnotation, rollbackImport, loadAnnotations });

onMounted(loadAnnotations);
watch(() => props.bookId, loadAnnotations);
</script>

<style scoped>
.annotation-panel { --annotation-line:#315f7d; padding:clamp(12px,2vw,18px); border:1px solid rgba(var(--v-border-color),var(--v-border-opacity)); border-radius:14px; background:rgb(var(--v-theme-surface)); }
.annotation-panel__header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; }
.annotation-panel__title { margin:0; font-size:clamp(1.25rem,2.2vw,1.45rem); line-height:1.2; }
.annotation-panel__count { display:inline-grid; min-width:1.45rem; height:1.45rem; margin-inline-start:.25rem; place-items:center; color:rgb(var(--v-theme-on-primary)); background:rgb(var(--v-theme-primary)); border-radius:999px; font-size:.75rem; vertical-align:middle; }
.annotation-panel__tabs { margin:0 0 10px; border-bottom:1px solid rgba(var(--v-border-color),var(--v-border-opacity)); }
.annotation-panel__tab-count { margin-inline-start:5px; color:rgba(var(--v-theme-on-surface),.56); font-size:.72rem; }
.annotation-panel__controls { display:grid; grid-template-columns:minmax(180px,240px) minmax(280px,1fr); gap:8px; align-items:start; margin-bottom:10px; }
.annotation-panel__rollback { display:grid; grid-template-columns:minmax(180px,1fr) auto; gap:8px; align-items:start; }
.annotation-panel__state { display:flex; min-height:120px; align-items:center; justify-content:center; gap:10px; color:rgba(var(--v-theme-on-surface),.72); }
.annotation-panel__state--empty { flex-direction:column; text-align:center; }.annotation-panel__state--empty strong{color:rgb(var(--v-theme-on-surface));}
.annotation-list { display:grid; gap:7px; margin:0; padding:0; list-style:none; }
.annotation-card { position:relative; overflow:hidden; padding:9px 11px 8px 14px; border:1px solid rgba(var(--v-border-color),var(--v-border-opacity)); border-radius:9px; background:rgba(var(--v-theme-on-surface),.035); }
.annotation-card::before { position:absolute; inset:0 auto 0 0; width:3px; background:var(--annotation-line); content:""; }
.annotation-card--external::before { background:#5c6bc0; }
.annotation-card__topline,.annotation-card__footer { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.annotation-card__topline { align-items:flex-start; }
.annotation-card__meta { display:flex; flex-wrap:wrap; align-items:center; gap:4px 6px; min-width:0; }
.annotation-card__chapter { display:inline-flex; align-items:center; gap:4px; font-size:.78rem; font-weight:700; }
.annotation-card__fallback { padding:1px 5px; color:#8a5a00; background:#fff2ce; border-radius:999px; font-size:.75rem; font-weight:700; }
.annotation-card__quote { margin:6px 0 3px; padding-inline-start:10px; color:rgba(var(--v-theme-on-surface),.76); border-inline-start:2px solid rgba(var(--v-theme-primary),.4); font-family:"Noto Serif SC","Songti SC",serif; line-height:1.5; }
.annotation-card__content { margin:3px 0; white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.45; }
.annotation-card__footer { min-height:28px; margin-top:4px; color:rgba(var(--v-theme-on-surface),.68); font-size:.75rem; flex-wrap:wrap; }
.annotation-card__author { display:inline-flex; align-items:center; gap:4px; color:rgba(var(--v-theme-on-surface),.78); font-weight:600; }
.annotation-card__footer .v-btn { margin-inline-start:auto; }
.annotation-panel--compact { min-height:100vh; padding:10px; border:0; border-radius:0; }
@media(max-width:700px){.annotation-panel{padding:10px;border-radius:10px}.annotation-panel__controls{grid-template-columns:1fr}.annotation-card{padding-inline:12px 9px}.annotation-card__topline{gap:4px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition-duration:.01ms!important}}
</style>
