<template>
    <div class="tag-organizer-page">
        <div
            class="sr-only"
            role="status"
        >
            {{ statusMessage }}
        </div>
        <header class="organizer-hero">
            <div>
                <div class="eyebrow">
                    {{ t('tagOrganizer.eyebrow') }}
                </div>
                <h1>{{ t('tagOrganizer.title') }}</h1>
                <p>{{ t('tagOrganizer.subtitle') }}</p>
            </div>
            <v-chip
                color="primary"
                variant="tonal"
                prepend-icon="mdi-tag-multiple"
            >
                {{ t('tagOrganizer.previewFirst') }}
            </v-chip>
        </header>

        <ol
            class="workflow-rail"
            :aria-label="t('tagOrganizer.workflow')"
        >
            <li
                v-for="(label, index) in steps"
                :key="label"
                :class="{ active: currentStep >= index + 1, current: currentStep === index + 1 }"
                :aria-current="currentStep === index + 1 ? 'step' : undefined"
            >
                <span>{{ index + 1 }}</span>{{ label }}
            </li>
        </ol>

        <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            closable
            class="mb-5"
            @click:close="error = ''"
        >
            {{ error }}
        </v-alert>

        <section
            v-if="!task"
            class="organizer-panel scope-panel"
        >
            <div class="section-heading">
                <div>
                    <span>01</span>
                    <h2>{{ t('tagOrganizer.chooseScope') }}</h2>
                </div>
                <p>{{ t('tagOrganizer.scopeHint') }}</p>
            </div>
            <v-radio-group
                v-model="scopeType"
                inline
                hide-details
                class="scope-options"
            >
                <v-radio
                    :label="t('tagOrganizer.allEditableBooks')"
                    value="all"
                />
                <v-radio
                    :label="t('tagOrganizer.selectedTags')"
                    value="tags"
                />
                <v-radio
                    :label="t('tagOrganizer.selectedBooks')"
                    value="books"
                />
            </v-radio-group>
            <v-combobox
                v-if="scopeType === 'tags'"
                v-model="scopeTags"
                :label="t('tagOrganizer.tagNames')"
                :hint="t('tagOrganizer.tagNamesHint')"
                multiple
                chips
                closable-chips
                persistent-hint
                variant="outlined"
                class="mt-4"
            />
            <v-text-field
                v-if="scopeType === 'books'"
                v-model="scopeBookIds"
                :label="t('tagOrganizer.bookIds')"
                :hint="t('tagOrganizer.bookIdsHint')"
                persistent-hint
                variant="outlined"
                class="mt-4"
            />
            <div class="privacy-note">
                <v-icon>mdi-shield-check</v-icon>
                <span>{{ t('tagOrganizer.privacy') }}</span>
            </div>
            <v-btn
                color="primary"
                size="large"
                :loading="busy"
                prepend-icon="mdi-tag-multiple"
                @click="startAnalysis"
            >
                {{ t('tagOrganizer.analyze') }}
            </v-btn>
        </section>

        <section
            v-else-if="task.status === 'analyzing'"
            class="organizer-panel analyzing-panel"
            aria-busy="true"
        >
            <v-progress-circular
                indeterminate
                color="primary"
                size="58"
                width="5"
            />
            <div>
                <h2>{{ t('tagOrganizer.analyzing') }}</h2>
                <p>{{ t('tagOrganizer.analyzingHint') }}</p>
            </div>
        </section>

        <section
            v-else-if="task.status === 'failed'"
            class="organizer-panel"
        >
            <v-alert
                type="error"
                variant="tonal"
            >
                {{ task.error?.message || t('tagOrganizer.analysisFailed') }}
            </v-alert>
            <v-btn
                class="mt-4"
                color="primary"
                :loading="busy"
                @click="retryAnalysis"
            >
                {{ t('common.retry') }}
            </v-btn>
        </section>

        <template v-else>
            <section class="organizer-panel">
                <div class="section-heading">
                    <div>
                        <span>02</span>
                        <h2>{{ t('tagOrganizer.reviewSuggestions') }}</h2>
                    </div>
                    <p>{{ t('tagOrganizer.reviewHint') }}</p>
                </div>
                <v-alert
                    v-if="!editableSuggestions.length"
                    type="info"
                    variant="tonal"
                >
                    {{ t('tagOrganizer.noSuggestions') }}
                </v-alert>
                <div class="suggestion-list">
                    <article
                        v-for="item in editableSuggestions"
                        :key="item.id"
                        class="suggestion-card"
                        :class="{ selected: item.selected }"
                    >
                        <v-checkbox
                            v-model="item.selected"
                            hide-details
                            color="primary"
                            :aria-label="t('tagOrganizer.selectSuggestion', { tag: item.source })"
                        />
                        <div class="suggestion-main">
                            <div class="suggestion-title">
                                <strong>{{ item.source }}</strong>
                                <v-icon size="18">
                                    mdi-arrow-right
                                </v-icon>
                                <v-text-field
                                    v-if="item.action === 'merge' || item.action === 'rename'"
                                    v-model="item.target"
                                    density="compact"
                                    variant="outlined"
                                    hide-details
                                    :aria-label="t('tagOrganizer.targetTag')"
                                />
                                <strong v-else>{{ t(`tagOrganizer.action.${item.action}`) }}</strong>
                            </div>
                            <p>{{ item.reason }}</p>
                            <div class="suggestion-meta">
                                <v-chip
                                    size="small"
                                    :color="item.origin === 'rule' ? 'teal' : 'indigo'"
                                    variant="tonal"
                                >
                                    {{ t(`tagOrganizer.origin.${item.origin}`) }}
                                </v-chip>
                                <v-chip
                                    size="small"
                                    :color="confidenceColor(item.confidence)"
                                    variant="tonal"
                                >
                                    {{ t('tagOrganizer.confidence', { value: Math.round(item.confidence * 100) }) }}
                                </v-chip>
                                <span>{{ t('tagOrganizer.affectedBooks', { count: affectedBooks(item).length }) }}</span>
                            </div>
                            <v-select
                                v-if="affectedBooks(item).length"
                                v-model="item.excluded_book_ids"
                                :items="affectedBooks(item)"
                                item-title="title"
                                item-value="id"
                                multiple
                                chips
                                closable-chips
                                density="compact"
                                variant="outlined"
                                :label="t('tagOrganizer.excludeBooks')"
                                hide-details
                                class="mt-3"
                            />
                        </div>
                    </article>
                </div>
                <div class="panel-actions">
                    <v-btn
                        variant="text"
                        @click="resetTask"
                    >
                        {{ t('tagOrganizer.newAnalysis') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        :loading="busy"
                        :disabled="!editableSuggestions.some(item => item.selected)"
                        prepend-icon="mdi-check-circle-outline"
                        @click="saveAndPreview"
                    >
                        {{ t('tagOrganizer.generatePreview') }}
                    </v-btn>
                </div>
            </section>

            <section
                v-if="task.preview?.token"
                class="organizer-panel preview-panel"
            >
                <div class="section-heading">
                    <div>
                        <span>03</span>
                        <h2>{{ t('tagOrganizer.previewTitle') }}</h2>
                    </div>
                    <p>{{ t('tagOrganizer.previewSummary', task.preview.summary || {}) }}</p>
                </div>
                <v-alert
                    v-if="task.preview.conflicts?.length"
                    type="warning"
                    variant="tonal"
                    class="mb-4"
                >
                    {{ t('tagOrganizer.previewConflicts', { count: task.preview.conflicts.length }) }}
                </v-alert>
                <div class="change-list">
                    <article
                        v-for="change in task.preview.changes"
                        :key="change.book_id"
                        class="change-card"
                    >
                        <h3>{{ change.title }}</h3>
                        <div class="tag-diff">
                            <div>
                                <span>{{ t('tagOrganizer.before') }}</span>
                                <v-chip
                                    v-for="tag in change.before_tags"
                                    :key="tag"
                                    size="small"
                                    variant="outlined"
                                >
                                    {{ tag }}
                                </v-chip>
                            </div>
                            <v-icon>mdi-arrow-right</v-icon>
                            <div>
                                <span>{{ t('tagOrganizer.after') }}</span>
                                <v-chip
                                    v-for="tag in change.after_tags"
                                    :key="tag"
                                    size="small"
                                    color="primary"
                                    variant="tonal"
                                >
                                    {{ tag }}
                                </v-chip>
                            </div>
                        </div>
                    </article>
                </div>
                <v-checkbox
                    v-model="confirmed"
                    color="primary"
                    :label="t('tagOrganizer.confirmChanges')"
                />
                <div class="panel-actions">
                    <v-btn
                        variant="outlined"
                        @click="confirmed = false"
                    >
                        {{ t('tagOrganizer.backToSuggestions') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        :loading="busy"
                        :disabled="!confirmed || !task.preview.changes?.length"
                        prepend-icon="mdi-check-circle"
                        @click="execute"
                    >
                        {{ t('tagOrganizer.execute') }}
                    </v-btn>
                </div>
            </section>

            <section
                v-if="task.status === 'executed'"
                class="organizer-panel result-panel"
            >
                <div class="section-heading">
                    <div>
                        <span>04</span>
                        <h2>{{ t('tagOrganizer.resultTitle') }}</h2>
                    </div>
                </div>
                <div class="result-grid">
                    <div class="success">
                        <strong>{{ task.result.succeeded || 0 }}</strong><span>{{ t('tagOrganizer.succeeded') }}</span>
                    </div>
                    <div class="warning">
                        <strong>{{ task.result.skipped || 0 }}</strong><span>{{ t('tagOrganizer.skipped') }}</span>
                    </div>
                    <div class="danger">
                        <strong>{{ task.result.failed || 0 }}</strong><span>{{ t('tagOrganizer.failed') }}</span>
                    </div>
                    <div>
                        <strong>{{ task.result.undone || 0 }}</strong><span>{{ t('tagOrganizer.undone') }}</span>
                    </div>
                </div>
                <v-alert
                    v-if="task.result.undo_conflicts"
                    type="warning"
                    variant="tonal"
                    class="mt-4"
                >
                    {{ t('tagOrganizer.undoConflicts', { count: task.result.undo_conflicts }) }}
                </v-alert>
                <div class="panel-actions">
                    <v-btn
                        v-if="task.result.failed || task.result.skipped"
                        variant="outlined"
                        :loading="busy"
                        @click="retryChanges"
                    >
                        {{ t('tagOrganizer.retryPartial') }}
                    </v-btn>
                    <v-btn
                        color="error"
                        variant="outlined"
                        :loading="busy"
                        :disabled="Boolean(task.result.undone || task.result.undo_conflicts)"
                        prepend-icon="mdi-backup-restore"
                        @click="undoDialog = true"
                    >
                        {{ t('tagOrganizer.undoTask') }}
                    </v-btn>
                </div>
            </section>
        </template>

        <v-dialog
            v-model="undoDialog"
            max-width="520"
        >
            <v-card>
                <v-card-title>{{ t('tagOrganizer.undoTitle') }}</v-card-title>
                <v-card-text>{{ t('tagOrganizer.undoWarning') }}</v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn @click="undoDialog = false">
                        {{ t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        color="error"
                        :loading="busy"
                        @click="undo"
                    >
                        {{ t('tagOrganizer.confirmUndo') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';

const { $backend } = useNuxtApp();
const { t } = useI18n();

const scopeType = ref('all');
const scopeTags = ref([]);
const scopeBookIds = ref('');
const task = ref(null);
const editableSuggestions = ref([]);
const busy = ref(false);
const error = ref('');
const confirmed = ref(false);
const undoDialog = ref(false);
let pollTimer = null;

const steps = computed(() => [
    t('tagOrganizer.step.scope'),
    t('tagOrganizer.step.review'),
    t('tagOrganizer.step.preview'),
    t('tagOrganizer.step.result'),
]);
const currentStep = computed(() => {
    if (!task.value) return 1;
    if (task.value.status === 'executed') return 4;
    if (task.value.preview?.token) return 3;
    return 2;
});
const statusMessage = computed(() => {
    if (!task.value) return '';
    if (task.value.status === 'analyzing') return t('tagOrganizer.analyzing');
    if (task.value.status === 'failed') return task.value.error?.message || t('tagOrganizer.analysisFailed');
    if (task.value.status === 'executed') {
        return t('tagOrganizer.resultAnnouncement', task.value.result || {});
    }
    if (task.value.preview?.token) {
        return t('tagOrganizer.previewAnnouncement', task.value.preview.summary || {});
    }
    return t('tagOrganizer.suggestionsAnnouncement', { count: task.value.suggestions?.length || 0 });
});

function scopePayload() {
    if (scopeType.value === 'tags') return { type: 'tags', tags: scopeTags.value };
    if (scopeType.value === 'books') {
        return {
            type: 'books',
            book_ids: scopeBookIds.value.split(/[,，\s]+/).filter(Boolean).map(Number),
        };
    }
    return { type: 'all' };
}

function syncTask(value) {
    task.value = value;
    editableSuggestions.value = (value?.suggestions || []).map(item => ({
        ...item,
        excluded_book_ids: [...(item.excluded_book_ids || [])],
    }));
}

async function request(url, options) {
    error.value = '';
    const response = await $backend(url, options);
    if (response.err !== 'ok') {
        error.value = response.msg || response.err;
        return null;
    }
    if (response.task) syncTask(response.task);
    return response;
}

async function startAnalysis() {
    busy.value = true;
    try {
        const response = await request('/ai/tag_organizer/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scope: scopePayload() }),
        });
        if (response?.task?.status === 'analyzing') schedulePoll();
    } finally {
        busy.value = false;
    }
}

function schedulePoll() {
    clearTimeout(pollTimer);
    pollTimer = setTimeout(pollTask, 1200);
}

async function pollTask() {
    if (!task.value?.id) return;
    const response = await request(`/ai/tag_organizer/tasks/${task.value.id}`);
    if (response?.task?.status === 'analyzing') schedulePoll();
}

async function retryAnalysis() {
    busy.value = true;
    try {
        const response = await request(`/ai/tag_organizer/tasks/${task.value.id}/analysis-retry`, { method: 'POST' });
        if (response) schedulePoll();
    } finally {
        busy.value = false;
    }
}

function affectedBooks(item) {
    return (task.value?.books || []).filter(book => book.tags.includes(item.source));
}

function confidenceColor(value) {
    if (value >= 0.85) return 'success';
    if (value >= 0.65) return 'warning';
    return 'grey';
}

async function saveAndPreview() {
    busy.value = true;
    try {
        const adjustments = editableSuggestions.value.map(item => ({
            id: item.id,
            selected: item.selected,
            target: item.target,
            excluded_book_ids: item.excluded_book_ids || [],
        }));
        const saved = await request(`/ai/tag_organizer/tasks/${task.value.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adjustments }),
        });
        if (saved) {
            await request(`/ai/tag_organizer/tasks/${task.value.id}/preview`, { method: 'POST' });
            confirmed.value = false;
        }
    } finally {
        busy.value = false;
    }
}

function idempotencyKey(prefix) {
    return `${prefix}-${task.value.id}-${Date.now()}`;
}

async function execute() {
    busy.value = true;
    try {
        await request(`/ai/tag_organizer/tasks/${task.value.id}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                preview_token: task.value.preview.token,
                idempotency_key: idempotencyKey('execute'),
            }),
        });
    } finally {
        busy.value = false;
    }
}

async function retryChanges() {
    busy.value = true;
    try {
        await request(`/ai/tag_organizer/tasks/${task.value.id}/retry`, { method: 'POST' });
    } finally {
        busy.value = false;
    }
}

async function undo() {
    busy.value = true;
    try {
        const response = await request(`/ai/tag_organizer/tasks/${task.value.id}/undo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idempotency_key: idempotencyKey('undo') }),
        });
        if (response) undoDialog.value = false;
    } finally {
        busy.value = false;
    }
}

function resetTask() {
    clearTimeout(pollTimer);
    task.value = null;
    editableSuggestions.value = [];
    confirmed.value = false;
}

onBeforeUnmount(() => clearTimeout(pollTimer));
</script>

<style scoped>
.tag-organizer-page { --tag-ink:#263231; --tag-muted:#667472; --tag-line:rgba(82,103,99,.2); max-width:1180px; margin:0 auto; padding:22px 18px 64px; color:var(--tag-ink); }
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; border:0; }
.organizer-hero { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; padding:30px 32px; border:1px solid var(--tag-line); border-radius:24px; background:linear-gradient(135deg,rgba(228,238,226,.85),rgba(253,248,234,.9)); }
.organizer-hero h1 { margin:4px 0 8px; font-family:Georgia,"Noto Serif SC",serif; font-size:clamp(30px,5vw,52px); line-height:1.08; letter-spacing:-.03em; }
.organizer-hero p { max-width:760px; margin:0; color:var(--tag-muted); font-size:16px; }
.eyebrow { color:#3f6e62; font-size:12px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; }
.workflow-rail { display:grid; grid-template-columns:repeat(4,1fr); gap:0; margin:24px 8px; padding:0; list-style:none; }
.workflow-rail li { position:relative; display:flex; align-items:center; gap:9px; color:var(--tag-muted); font-size:13px; }
.workflow-rail li::after { height:1px; flex:1; margin:0 10px; background:var(--tag-line); content:""; }
.workflow-rail li:last-child::after { display:none; }
.workflow-rail li span { display:grid; width:28px; height:28px; place-items:center; border:1px solid var(--tag-line); border-radius:50%; background:rgb(var(--v-theme-surface)); font-weight:800; }
.workflow-rail li.active { color:rgb(var(--v-theme-primary)); font-weight:700; }.workflow-rail li.active span { color:white; border-color:rgb(var(--v-theme-primary)); background:rgb(var(--v-theme-primary)); }.workflow-rail li.current span { box-shadow:0 0 0 5px rgba(var(--v-theme-primary),.12); }
.organizer-panel { margin-top:18px; padding:28px; border:1px solid var(--tag-line); border-radius:22px; background:rgb(var(--v-theme-surface)); box-shadow:0 14px 38px rgba(38,50,49,.06); }
.section-heading { display:flex; justify-content:space-between; gap:24px; margin-bottom:22px; }.section-heading>div { display:flex; align-items:center; gap:10px; }.section-heading>div>span { color:rgb(var(--v-theme-primary)); font:800 12px/1 ui-monospace,monospace; }.section-heading h2 { margin:0; font:700 24px/1.2 Georgia,"Noto Serif SC",serif; }.section-heading p { max-width:480px; margin:0; color:var(--tag-muted); text-align:right; }
.scope-options { padding:12px 14px; border:1px solid var(--tag-line); border-radius:14px; }.privacy-note { display:flex; align-items:center; gap:9px; margin:18px 0; color:var(--tag-muted); font-size:13px; }
.analyzing-panel { display:flex; min-height:210px; align-items:center; justify-content:center; gap:24px; text-align:left; }.analyzing-panel h2 { margin:0 0 6px; }.analyzing-panel p { margin:0; color:var(--tag-muted); }
.suggestion-list,.change-list { display:grid; gap:12px; }.suggestion-card { display:grid; grid-template-columns:auto 1fr; gap:8px; padding:16px; border:1px solid var(--tag-line); border-radius:16px; transition:border-color .2s,background .2s; }.suggestion-card.selected { border-color:rgba(var(--v-theme-primary),.55); background:rgba(var(--v-theme-primary),.045); }.suggestion-main { min-width:0; }.suggestion-title { display:flex; align-items:center; gap:10px; }.suggestion-title .v-text-field { max-width:280px; }.suggestion-main p { margin:8px 0; color:var(--tag-muted); }.suggestion-meta { display:flex; flex-wrap:wrap; align-items:center; gap:8px; color:var(--tag-muted); font-size:12px; }
.panel-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:22px; }.change-card { padding:16px 18px; border:1px solid var(--tag-line); border-radius:15px; }.change-card h3 { margin:0 0 12px; font-size:16px; }.tag-diff { display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:14px; }.tag-diff>div { display:flex; flex-wrap:wrap; gap:6px; }.tag-diff>div>span { width:100%; color:var(--tag-muted); font-size:11px; font-weight:800; text-transform:uppercase; }
.result-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }.result-grid>div { display:flex; min-height:110px; flex-direction:column; justify-content:center; padding:18px; border:1px solid var(--tag-line); border-radius:16px; }.result-grid strong { font:700 34px/1 Georgia,serif; }.result-grid span { margin-top:7px; color:var(--tag-muted); }.result-grid .success strong { color:#297254; }.result-grid .warning strong { color:#9a681a; }.result-grid .danger strong { color:#b04545; }
@media (max-width:760px) { .tag-organizer-page { padding-inline:8px; }.organizer-hero { align-items:flex-start; flex-direction:column; padding:24px 20px; }.workflow-rail { grid-template-columns:repeat(4,auto); overflow-x:auto; }.workflow-rail li { min-width:max-content; }.organizer-panel { padding:21px 17px; }.section-heading { align-items:flex-start; flex-direction:column; }.section-heading p { text-align:left; }.suggestion-title { align-items:flex-start; flex-wrap:wrap; }.suggestion-title .v-text-field { width:100%; max-width:none; }.tag-diff { grid-template-columns:1fr; }.tag-diff>.v-icon { transform:rotate(90deg); }.result-grid { grid-template-columns:repeat(2,1fr); }.panel-actions { align-items:stretch; flex-direction:column-reverse; } }
:global(.v-theme--dark) .tag-organizer-page { --tag-ink:#e7efed; --tag-muted:#aebbb8; --tag-line:rgba(210,226,221,.18); }:global(.v-theme--dark) .organizer-hero { background:linear-gradient(135deg,rgba(34,60,54,.85),rgba(55,48,32,.72)); }
@media (prefers-reduced-motion:reduce) { .suggestion-card { transition:none; } }
</style>
