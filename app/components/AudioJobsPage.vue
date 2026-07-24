<template>
    <div class="jobs-page">
        <header class="jobs-header">
            <div>
                <p class="eyebrow">
                    {{ t('audiobook.productionDesk') }}
                </p>
                <div class="title-row">
                    <h1>{{ t('audiobook.jobs') }}</h1>
                    <v-chip
                        color="amber-darken-3"
                        variant="tonal"
                        size="small"
                        data-testid="audiobook-beta"
                    >
                        {{ t('audiobook.beta') }}
                    </v-chip>
                </div>
                <p>{{ t('audiobook.jobsDescription') }}</p>
            </div>
            <v-btn
                prepend-icon="mdi-book-music"
                variant="outlined"
                to="/audios"
            >
                {{ t('audiobook.openLibrary') }}
            </v-btn>
        </header>

        <div class="filter-row">
            <v-chip-group
                v-model="statusFilter"
                selected-class="text-primary"
                mandatory
            >
                <v-chip value="">
                    {{ t('audiobook.statusAll') }}
                </v-chip>
                <v-chip value="queued">
                    {{ t('audiobook.statusQueued') }}
                </v-chip>
                <v-chip value="generating">
                    {{ t('audiobook.statusGenerating') }}
                </v-chip>
                <v-chip value="awaiting_review">
                    {{ t('audiobook.statusAwaitingReview') }}
                </v-chip>
                <v-chip value="completed">
                    {{ t('audiobook.statusCompleted') }}
                </v-chip>
                <v-chip value="failed">
                    {{ t('audiobook.statusFailed') }}
                </v-chip>
            </v-chip-group>
            <v-btn
                icon="mdi-refresh"
                variant="text"
                :loading="pending"
                :aria-label="t('common.refresh')"
                @click="refresh"
            />
        </div>

        <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            class="mb-4"
        >
            {{ error.message }}
        </v-alert>
        <div class="job-list">
            <v-card
                v-for="job in filteredJobs"
                :key="job.id"
                class="job-card"
                :data-job-id="job.id"
                variant="flat"
            >
                <div
                    class="job-status-rail"
                    :class="`rail-${job.status}`"
                />
                <v-card-text>
                    <div class="job-topline">
                        <div>
                            <span class="job-id">#{{ job.id }}</span>
                            <v-chip
                                size="small"
                                :color="statusColor(job.status)"
                                variant="tonal"
                            >
                                {{ statusLabel(job.status) }}
                            </v-chip>
                        </div>
                        <time>{{ formatDate(job.updated_at || job.created_at) }}</time>
                    </div>
                    <div class="job-body">
                        <div>
                            <h2>{{ t('audiobook.bookJobTitle', { id: job.book_id }) }}</h2>
                            <p>{{ modeLabel(job.mode) }} · {{ engineLabel(job.config?.engine) }} · {{ job.config?.speed || 'x1.0' }}</p>
                            <p
                                v-if="job.error_message"
                                class="job-error"
                            >
                                {{ job.error_message }}
                            </p>
                        </div>
                        <div class="phase-block">
                            <span>{{ phaseLabel(job.phase) }}</span>
                            <v-progress-linear
                                :model-value="job.progress * 100"
                                :indeterminate="activeStatuses.includes(job.status) && !job.progress"
                                color="amber-darken-2"
                                rounded
                            />
                        </div>
                    </div>
                </v-card-text>
                <v-card-actions>
                    <v-btn
                        v-if="job.status === 'awaiting_review'"
                        color="primary"
                        variant="flat"
                        prepend-icon="mdi-script-text-edit"
                        data-testid="edit-workspace"
                        @click="openWorkspace(job)"
                    >
                        {{ t('audiobook.editScript') }}
                    </v-btn>
                    <v-btn
                        v-if="job.status === 'completed'"
                        color="primary"
                        variant="text"
                        :to="`/audio/${job.edition_id}`"
                    >
                        {{ t('audiobook.viewAudiobook') }}
                    </v-btn>
                    <v-btn
                        v-if="activeStatuses.includes(job.status)"
                        color="error"
                        variant="text"
                        @click="jobAction(job, 'cancel')"
                    >
                        {{ t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        v-if="['failed', 'cancelled'].includes(job.status)"
                        color="primary"
                        variant="text"
                        @click="jobAction(job, 'retry')"
                    >
                        {{ t('common.retry') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </div>
        <v-empty-state
            v-if="!pending && !filteredJobs.length"
            icon="mdi-progress-clock"
            :title="t('audiobook.noJobs')"
            :text="t('audiobook.noJobsDescription')"
            data-testid="audio-job-empty-state"
        >
            <template #actions>
                <v-btn
                    color="primary"
                    variant="flat"
                    prepend-icon="mdi-library-shelves"
                    to="/library"
                    data-testid="open-library-to-create-job"
                >
                    {{ t('audiobook.openLibraryToCreateJob') }}
                </v-btn>
            </template>
        </v-empty-state>

        <v-dialog
            v-model="workspaceDialog"
            fullscreen
            transition="dialog-bottom-transition"
        >
            <v-card
                v-if="workspace"
                class="workspace-card"
            >
                <v-toolbar color="blue-grey-darken-4">
                    <v-btn
                        icon="mdi-close"
                        :aria-label="t('common.close')"
                        @click="workspaceDialog = false"
                    />
                    <v-toolbar-title>{{ t('audiobook.advancedWorkspace') }}</v-toolbar-title>
                    <v-spacer />
                    <v-btn
                        color="amber-lighten-2"
                        variant="flat"
                        :loading="confirming"
                        data-testid="confirm-workspace"
                        @click="confirmWorkspace"
                    >
                        {{ t('audiobook.confirmAndGenerate') }}
                    </v-btn>
                </v-toolbar>
                <v-tabs
                    v-model="workspaceTab"
                    color="amber-darken-2"
                    align-tabs="center"
                >
                    <v-tab value="characters">
                        {{ t('audiobook.characters') }}
                    </v-tab>
                    <v-tab value="chapter">
                        {{ t('audiobook.chapterText') }}
                    </v-tab>
                </v-tabs>
                <v-window
                    v-model="workspaceTab"
                    class="workspace-window"
                >
                    <v-window-item value="characters">
                        <div class="workspace-pane">
                            <div class="pane-heading">
                                <div>
                                    <h2>{{ t('audiobook.characterCasting') }}</h2>
                                    <p>{{ t('audiobook.characterCastingHint') }}</p>
                                </div>
                                <v-btn
                                    color="primary"
                                    variant="flat"
                                    :loading="saving"
                                    @click="saveCharacters"
                                >
                                    {{ t('common.save') }}
                                </v-btn>
                            </div>
                            <div class="character-table-wrap">
                                <table class="character-table">
                                    <thead>
                                        <tr>
                                            <th>{{ t('audiobook.characterName') }}</th>
                                            <th>{{ t('audiobook.gender') }}</th>
                                            <th>{{ t('audiobook.age') }}</th>
                                            <th>{{ t('audiobook.region') }}</th>
                                            <th>{{ t('audiobook.speed') }}</th>
                                            <th>{{ t('audiobook.voice') }}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr
                                            v-for="role in workspace.characters"
                                            :key="role.name"
                                        >
                                            <td><strong>{{ role.name }}</strong><small>{{ role.position }}</small></td>
                                            <td>{{ role.gender }}</td>
                                            <td>{{ role.age }}</td>
                                            <td>{{ role.region }}</td>
                                            <td>
                                                <v-select
                                                    v-model="role.speed"
                                                    :items="speedOptions"
                                                    density="compact"
                                                    variant="outlined"
                                                    hide-details
                                                />
                                            </td>
                                            <td>
                                                <div class="voice-cell">
                                                    <v-select
                                                        v-model="role.voice_overrides"
                                                        :items="voiceOptions"
                                                        item-title="label"
                                                        item-value="value"
                                                        density="compact"
                                                        variant="outlined"
                                                        hide-details
                                                        clearable
                                                        :placeholder="t('audiobook.autoVoice')"
                                                    />
                                                    <v-btn
                                                        v-if="voiceFor(role.voice_overrides)?.preview_available"
                                                        icon="mdi-play-circle-outline"
                                                        size="small"
                                                        variant="text"
                                                        :aria-label="t('audiobook.previewVoice')"
                                                        @click="previewVoice(voiceFor(role.voice_overrides))"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </v-window-item>
                    <v-window-item value="chapter">
                        <div class="workspace-pane chapter-pane">
                            <aside>
                                <button
                                    v-for="item in workspace.chapters"
                                    :key="item.number"
                                    type="button"
                                    :class="{ active: selectedChapter?.number === item.number }"
                                    @click="selectChapter(item)"
                                >
                                    <span>{{ String(item.number).padStart(2, '0') }}</span>
                                    {{ item.title }}
                                </button>
                            </aside>
                            <main v-if="selectedChapter">
                                <div class="pane-heading">
                                    <div>
                                        <h2>{{ selectedChapter.title }}</h2>
                                        <p>{{ t('audiobook.chapterEditorHint') }}</p>
                                    </div>
                                    <v-btn
                                        color="primary"
                                        variant="flat"
                                        :loading="saving"
                                        data-testid="save-chapter"
                                        @click="saveChapter"
                                    >
                                        {{ t('common.save') }}
                                    </v-btn>
                                </div>
                                <v-textarea
                                    v-model="chapterText"
                                    class="script-editor"
                                    variant="outlined"
                                    rows="22"
                                    no-resize
                                    spellcheck="false"
                                />
                                <v-alert
                                    v-if="scriptErrors.length"
                                    type="error"
                                    variant="tonal"
                                >
                                    <p
                                        v-for="item in scriptErrors"
                                        :key="`${item.line}-${item.message}`"
                                    >
                                        {{ t('audiobook.lineError', { line: item.line, message: item.message }) }}
                                    </p>
                                </v-alert>
                            </main>
                        </div>
                    </v-window-item>
                </v-window>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';

const { t, locale } = useI18n();
const route = useRoute();
const { $backend, $alert } = useNuxtApp();
const store = useMainStore();
const statusFilter = ref('');
const workspaceDialog = ref(false);
const workspaceTab = ref('characters');
const workspaceJob = ref<any>(null);
const workspace = ref<any>(null);
const selectedChapter = ref<any>(null);
const chapterText = ref('');
const scriptErrors = ref<any[]>([]);
const saving = ref(false);
const confirming = ref(false);
const voices = ref<any[]>([]);
const speedOptions = ['自动', 'x0.75', 'x0.9', 'x1.0', 'x1.1', 'x1.25', 'x1.5'];
const activeStatuses = ['queued', 'inspecting', 'awaiting_review', 'generating', 'finalizing'];
let pollTimer: ReturnType<typeof setInterval> | null = null;
let previewAudio: HTMLAudioElement | null = null;
store.setNavbar(true);

const { data, pending, error, refresh } = await useAsyncData('audiobook-jobs', async () => {
    const response = await $backend('/audio-jobs');
    if (response.err !== 'ok') throw new Error(response.msg || t('audiobook.loadFailed'));
    return response;
}, { default: () => ({ jobs: [] }) });

const filteredJobs = computed(() => statusFilter.value
    ? (data.value?.jobs || []).filter((job: any) => job.status === statusFilter.value)
    : (data.value?.jobs || []));
const voiceOptions = computed(() => voices.value.map(item => ({
    label: `${item.name} · ${item.gender === 'male' ? t('audiobook.male') : t('audiobook.female')} · ${item.engine}`,
    value: `${item.engine}=${item.voice_id}`,
})));

watch(() => data.value?.jobs, (jobs) => {
    const selected = String(route.params.jid || '');
    if (selected && jobs?.some((job: any) => String(job.id) === selected && job.status === 'awaiting_review') && !workspaceDialog.value) {
        void openWorkspace(jobs.find((job: any) => String(job.id) === selected));
    }
}, { immediate: true });

onMounted(async () => {
    const response = await $backend('/audio-voices');
    voices.value = response.catalog?.voices || [];
    pollTimer = setInterval(() => refresh(), 1500);
});
onBeforeUnmount(() => {
    if (pollTimer) clearInterval(pollTimer);
    previewAudio?.pause();
});

async function openWorkspace(job: any) {
    const response = await $backend(`/audio-job/${job.id}/workspace`);
    if (response.err !== 'ok') return $alert('error', response.msg);
    workspaceJob.value = job;
    workspace.value = response.workspace;
    workspaceDialog.value = true;
    selectChapter(workspace.value.chapters[0]);
}

function selectChapter(item: any) {
    selectedChapter.value = item;
    chapterText.value = (item?.lines || []).join('\n');
    scriptErrors.value = [];
}

async function saveCharacters() {
    saving.value = true;
    try {
        const response = await $backend(`/audio-job/${workspaceJob.value.id}/workspace`, {
            method: 'PATCH',
            body: JSON.stringify({ kind: 'characters', characters: workspace.value.characters, revision: workspace.value.revision }),
        });
        if (response.err === 'ok') workspace.value = response.workspace;
        else $alert('error', response.msg);
    } finally {
        saving.value = false;
    }
}

async function saveChapter() {
    saving.value = true;
    scriptErrors.value = [];
    try {
        const response = await $backend(`/audio-job/${workspaceJob.value.id}/workspace`, {
            method: 'PATCH',
            body: JSON.stringify({
                kind: 'chapter',
                chapter_number: selectedChapter.value.number,
                text: chapterText.value,
                revision: workspace.value.revision,
            }),
        });
        if (response.err === 'ok') {
            workspace.value = response.workspace;
            selectChapter(workspace.value.chapters.find((item: any) => item.number === selectedChapter.value.number));
        } else {
            scriptErrors.value = response.errors || [];
            $alert('error', response.msg);
        }
    } finally {
        saving.value = false;
    }
}

async function confirmWorkspace() {
    confirming.value = true;
    try {
        const response = await $backend(`/audio-job/${workspaceJob.value.id}/confirm`, { method: 'POST', body: '{}' });
        if (response.err === 'ok') {
            workspaceDialog.value = false;
            await refresh();
        } else $alert('error', response.msg);
    } finally {
        confirming.value = false;
    }
}

async function jobAction(job: any, action: string) {
    const response = await $backend(`/audio-job/${job.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
    });
    if (response.err === 'ok') await refresh();
    else $alert('error', response.msg);
}

function voiceFor(value: string) {
    if (!value) return null;
    const [engine, voiceId] = value.split('=', 2);
    return voices.value.find(item => item.engine === engine && item.voice_id === voiceId);
}

function previewVoice(voice: any) {
    if (!import.meta.client || !voice?.preview_url) return;
    previewAudio?.pause();
    previewAudio = new Audio(voice.preview_url);
    void previewAudio.play();
}

function statusColor(status: string) {
    return ({ completed: 'success', failed: 'error', cancelled: 'grey', awaiting_review: 'warning' } as Record<string, string>)[status] || 'info';
}
function statusLabel(status: string) { return t(`audiobook.status_${status}`); }
function phaseLabel(phase: string) { return t(`audiobook.phase_${String(phase || 'QUEUED').toLowerCase()}`); }
function modeLabel(mode: string) { return mode === 'advanced' ? t('audiobook.advancedMode') : t('audiobook.quickMode'); }
function engineLabel(engine: string) { return engine === 'qwen3tts' ? t('audiobook.qwenTts') : t('audiobook.edgeTts'); }
function formatDate(value: string) { return value ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : ''; }

useHead({ title: () => t('audiobook.jobs') });
</script>

<style scoped>
.jobs-page { max-width: 1160px; margin: 0 auto; padding: 24px 0 120px; }
.jobs-header { margin-bottom: 24px; display: flex; align-items: end; justify-content: space-between; gap: 20px; }
.jobs-header h1 { font: 700 clamp(2.2rem, 5vw, 4rem) Georgia, 'Noto Serif SC', serif; }
.title-row { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 14px; }
.jobs-header p:not(.eyebrow) { color: rgb(var(--v-theme-on-surface-variant)); }
.eyebrow { color: #9d6a13; font-size: .75rem; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
.filter-row { margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; }
.job-list { display: grid; gap: 14px; }
.job-card { position: relative; overflow: hidden; border: 1px solid rgba(var(--v-border-color), .13); border-radius: 18px; }
.job-status-rail { position: absolute; top: 0; bottom: 0; left: 0; width: 5px; background: #7292a7; }
.rail-completed { background: #3f9b6c; }.rail-failed { background: #c94848; }.rail-awaiting_review { background: #d99a2b; }
.job-topline { display: flex; justify-content: space-between; color: rgb(var(--v-theme-on-surface-variant)); font-size: .76rem; }
.job-topline > div { display: flex; align-items: center; gap: 8px; }
.job-id { font: 700 .9rem monospace; }
.job-body { margin-top: 18px; display: grid; grid-template-columns: 1fr minmax(220px, 34%); align-items: end; gap: 30px; }
.job-body h2 { font: 700 1.3rem Georgia, 'Noto Serif SC', serif; }
.job-body p { color: rgb(var(--v-theme-on-surface-variant)); font-size: .82rem; }
.job-error { color: rgb(var(--v-theme-error)) !important; }
.phase-block { display: grid; gap: 7px; font-size: .78rem; }
.workspace-card { background: rgb(var(--v-theme-background)); }
.workspace-window { height: calc(100vh - 112px); overflow: auto; }
.workspace-pane { max-width: 1320px; margin: 0 auto; padding: 32px; }
.pane-heading { margin-bottom: 22px; display: flex; justify-content: space-between; align-items: start; gap: 20px; }
.pane-heading h2 { font: 700 1.8rem Georgia, 'Noto Serif SC', serif; }
.pane-heading p { color: rgb(var(--v-theme-on-surface-variant)); }
.character-table-wrap { overflow: auto; background: rgb(var(--v-theme-surface)); border: 1px solid rgba(var(--v-border-color), .13); border-radius: 18px; }
.character-table { width: 100%; border-collapse: collapse; }
.character-table th, .character-table td { min-width: 110px; padding: 14px; text-align: left; border-bottom: 1px solid rgba(var(--v-border-color), .09); }
.character-table th { color: rgb(var(--v-theme-on-surface-variant)); font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; }
.character-table td:first-child { min-width: 150px; }
.character-table small { display: block; color: rgb(var(--v-theme-on-surface-variant)); }
.voice-cell { min-width: 270px; display: flex; align-items: center; }
.voice-cell :deep(.v-input) { flex: 1; }
.chapter-pane { display: grid; grid-template-columns: 260px 1fr; gap: 30px; }
.chapter-pane aside { display: grid; align-content: start; gap: 6px; }
.chapter-pane aside button { padding: 12px; display: flex; gap: 12px; text-align: left; border-radius: 10px; }
.chapter-pane aside button span { color: #9d6a13; font: 700 .85rem monospace; }
.chapter-pane aside button.active { background: rgba(217,154,43,.13); }
.script-editor :deep(textarea) { font: .96rem/1.8 ui-monospace, SFMono-Regular, Menlo, monospace; }
@media (max-width: 760px) {
    .jobs-header, .job-body { align-items: start; grid-template-columns: 1fr; flex-direction: column; }
    .chapter-pane { grid-template-columns: 1fr; }
    .chapter-pane aside { max-height: 160px; overflow: auto; }
}
</style>
