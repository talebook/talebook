<template>
    <section
        class="annotation-panel"
        :class="{ 'annotation-panel--compact': compact }"
        :aria-labelledby="headingId"
    >
        <header class="annotation-panel__header">
            <div>
                <p class="annotation-panel__eyebrow">
                    {{ t('annotations.eyebrow') }}
                </p>
                <h2 :id="headingId" class="annotation-panel__title">
                    {{ t('annotations.title') }}
                    <span v-if="!loading" class="annotation-panel__count">{{ filteredAnnotations.length }}</span>
                </h2>
            </div>
            <v-btn
                icon="mdi-refresh"
                size="small"
                variant="text"
                :aria-label="t('annotations.refresh')"
                :loading="loading"
                @click="loadAnnotations"
            />
        </header>

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
            <div v-if="rollbackTargets.length" class="annotation-panel__rollback">
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
            class="mb-4"
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
                    <div class="annotation-card__badges">
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

                <p class="annotation-card__chapter">
                    <v-icon size="16">mdi-book-open-variant</v-icon>
                    <span>{{ annotation.chapter || t('annotations.unknownChapter') }}</span>
                    <span v-if="!annotation.cfi" class="annotation-card__fallback">
                        {{ t('annotations.chapterOnly') }}
                    </span>
                </p>

                <blockquote v-if="annotation.quote_text" class="annotation-card__quote">
                    {{ annotation.quote_text }}
                </blockquote>
                <p v-if="annotation.content" class="annotation-card__content">
                    {{ annotation.content }}
                </p>

                <footer class="annotation-card__footer">
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

        <v-dialog v-model="deleteDialog" max-width="460">
            <v-card>
                <v-card-title>{{ t('annotations.deleteTitle') }}</v-card-title>
                <v-card-text>{{ t('annotations.deleteConfirm') }}</v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="deleteDialog = false">{{ t('common.cancel') }}</v-btn>
                    <v-btn color="error" :loading="deleting" @click="deleteAnnotation">{{ t('common.delete') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="rollbackDialog" max-width="520">
            <v-card>
                <v-card-title>{{ t('annotations.rollbackTitle') }}</v-card-title>
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

const sourceOptions = computed(() => {
    const names = [...new Set(annotations.value.flatMap(annotationSourceNames))];
    return [
        { title: t('annotations.allSources'), value: 'all' },
        ...names.sort().map(name => ({ title: sourceLabel(name), value: name })),
    ];
});

const filteredAnnotations = computed(() => {
    if (sourceFilter.value === 'all') return annotations.value;
    return annotations.value.filter(annotation => annotationSourceNames(annotation).includes(sourceFilter.value));
});

const rollbackTargets = computed(() => {
    const groups = new Map();
    for (const annotation of annotations.value) {
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

defineExpose({ annotations, sourceFilter, rollbackKey, requestDelete, deleteAnnotation, rollbackImport, loadAnnotations });

onMounted(loadAnnotations);
watch(() => props.bookId, loadAnnotations);
</script>

<style scoped>
.annotation-panel { --annotation-line:#315f7d; padding:clamp(18px,3vw,28px); border:1px solid rgba(var(--v-border-color),var(--v-border-opacity)); border-radius:18px; background:rgb(var(--v-theme-surface)); }
.annotation-panel__header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:18px; }
.annotation-panel__eyebrow { margin:0 0 3px; color:rgb(var(--v-theme-primary)); font-size:.72rem; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
.annotation-panel__title { margin:0; font-size:clamp(1.35rem,3vw,1.75rem); line-height:1.25; }
.annotation-panel__count { display:inline-grid; min-width:1.8rem; height:1.8rem; margin-left:.35rem; place-items:center; color:rgb(var(--v-theme-on-primary)); background:rgb(var(--v-theme-primary)); border-radius:999px; font-size:.8rem; vertical-align:middle; }
.annotation-panel__controls { display:grid; grid-template-columns:minmax(180px,260px) minmax(300px,1fr); gap:12px; align-items:start; margin-bottom:18px; }
.annotation-panel__rollback { display:grid; grid-template-columns:minmax(190px,1fr) auto; gap:10px; align-items:start; }
.annotation-panel__state { display:flex; min-height:160px; align-items:center; justify-content:center; gap:12px; color:rgba(var(--v-theme-on-surface),.72); }
.annotation-panel__state--empty { flex-direction:column; text-align:center; }.annotation-panel__state--empty strong{color:rgb(var(--v-theme-on-surface));}
.annotation-list { display:grid; gap:14px; margin:0; padding:0; list-style:none; }
.annotation-card { position:relative; overflow:hidden; padding:16px 18px 14px 21px; border:1px solid rgba(var(--v-border-color),var(--v-border-opacity)); border-radius:13px; background:rgba(var(--v-theme-on-surface),.035); }
.annotation-card::before { position:absolute; inset:0 auto 0 0; width:4px; background:var(--annotation-line); content:""; }
.annotation-card--external::before { background:#5c6bc0; }
.annotation-card__topline,.annotation-card__footer { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.annotation-card__badges { display:flex; flex-wrap:wrap; gap:6px; }
.annotation-card__chapter { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:13px 0 9px; font-size:.84rem; font-weight:700; }
.annotation-card__fallback { padding:2px 7px; color:#8a5a00; background:#fff2ce; border-radius:999px; font-size:.72rem; font-weight:700; }
.annotation-card__quote { margin:10px 0; padding:2px 0 2px 14px; color:rgba(var(--v-theme-on-surface),.76); border-left:2px solid rgba(var(--v-theme-primary),.4); font-family:"Noto Serif SC","Songti SC",serif; }
.annotation-card__content { margin:10px 0; white-space:pre-wrap; overflow-wrap:anywhere; }
.annotation-card__footer { margin-top:12px; color:rgba(var(--v-theme-on-surface),.68); font-size:.75rem; }
.annotation-panel--compact { min-height:100vh; border:0; border-radius:0; }
@media(max-width:700px){.annotation-panel{padding:16px;border-radius:12px}.annotation-panel__controls{grid-template-columns:1fr}.annotation-panel__rollback{grid-template-columns:1fr}.annotation-card__footer{align-items:flex-start;flex-direction:column}.annotation-card__footer .v-btn{align-self:flex-end}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition-duration:.01ms!important}}
</style>
