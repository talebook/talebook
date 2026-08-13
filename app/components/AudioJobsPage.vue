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
            <div class="jobs-header-actions">
                <v-btn
                    prepend-icon="mdi-plus"
                    color="primary"
                    variant="flat"
                    to="/audios/create"
                    data-testid="create-audiobook-from-jobs"
                >
                    {{ t('audiobook.createAudiobook') }}
                </v-btn>
                <v-btn
                    prepend-icon="mdi-book-music"
                    variant="outlined"
                    to="/audios"
                >
                    {{ t('audiobook.openLibrary') }}
                </v-btn>
            </div>
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
                        <NuxtLink
                            v-if="job.book"
                            class="job-book"
                            :to="`/book/${job.book_id}/audios`"
                            :aria-label="t('audiobook.openBookJob', { title: job.book.title })"
                        >
                            <img
                                :src="job.book.thumb || job.book.img"
                                :alt="job.book.title"
                            >
                            <span>
                                <strong>{{ job.book.title }}</strong>
                                <small>{{ job.book.author }}</small>
                                <small>#{{ job.book_id }}</small>
                            </span>
                        </NuxtLink>
                        <div
                            v-else
                            class="job-book deleted-book"
                        >
                            <span class="deleted-cover"><v-icon icon="mdi-book-remove-outline" /></span>
                            <span>
                                <strong>{{ t('audiobook.deletedBook', { id: job.book_id }) }}</strong>
                                <small>{{ t('audiobook.deletedBookHint') }}</small>
                            </span>
                        </div>
                        <button
                            type="button"
                            class="job-plan-toggle"
                            :aria-expanded="expandedJobId === job.id"
                            :aria-controls="`job-plan-${job.id}`"
                            :data-testid="`job-plan-toggle-${job.id}`"
                            @click="toggleJob(job.id)"
                        >
                            <span class="job-config">{{ modeLabel(job.mode) }} · {{ engineLabel(job.config?.engine) }} · {{ job.config?.speed || 'x1.0' }}</span>
                            <span class="phase-heading">
                                <span>{{ phaseLabel(job.phase) }}</span>
                                <strong>{{ overallPercent(job) }}%</strong>
                            </span>
                            <v-progress-linear
                                :model-value="overallPercent(job)"
                                color="amber-darken-2"
                                rounded
                            />
                            <span class="expand-label">
                                {{ expandedJobId === job.id ? t('audiobook.collapsePlan') : t('audiobook.expandPlan') }}
                                <v-icon :icon="expandedJobId === job.id ? 'mdi-chevron-up' : 'mdi-chevron-down'" />
                            </span>
                        </button>
                    </div>
                    <p
                        v-if="job.error_message"
                        class="job-error"
                    >
                        {{ job.error_message }}
                    </p>
                </v-card-text>
                <v-expand-transition>
                    <section
                        v-if="expandedJobId === job.id"
                        :id="`job-plan-${job.id}`"
                        class="job-plan"
                        :data-testid="`job-plan-${job.id}`"
                    >
                        <div class="plan-heading">
                            <div>
                                <p class="eyebrow">
                                    {{ t('audiobook.generationPlan') }}
                                </p>
                                <h3>{{ t('audiobook.overallProgress', { percent: overallPercent(job) }) }}</h3>
                            </div>
                            <span>{{ t('audiobook.progressMethodHint') }}</span>
                        </div>
                        <div class="plan-metrics">
                            <div>
                                <strong>{{ job.plan?.summary?.chapters_completed || 0 }}/{{ job.plan?.summary?.chapters_total || 0 }}</strong>
                                <span>{{ t('audiobook.metricChapters') }}</span>
                            </div>
                            <div>
                                <strong>{{ job.plan?.summary?.segments_completed || 0 }}/{{ job.plan?.summary?.segments_total || 0 }}</strong>
                                <span>{{ t('audiobook.metricSegments') }}</span>
                            </div>
                            <div>
                                <strong>{{ job.plan?.summary?.cache_hits || 0 }}</strong>
                                <span>{{ t('audiobook.metricCacheHits') }}</span>
                            </div>
                            <div>
                                <strong>{{ job.plan?.summary?.attempts || 0 }}</strong>
                                <span>{{ t('audiobook.metricAttempts') }}</span>
                            </div>
                        </div>
                        <v-alert
                            v-if="!job.plan?.detailed"
                            type="info"
                            variant="tonal"
                            density="compact"
                            class="legacy-plan-alert"
                        >
                            {{ t('audiobook.legacyPlanUnavailable') }}
                        </v-alert>
                        <ol class="phase-list">
                            <li
                                v-for="phase in job.plan?.phases || []"
                                :key="phase.key"
                                :class="`phase-${phase.status}`"
                            >
                                <span class="phase-icon"><v-icon :icon="phaseIcon(phase.status)" /></span>
                                <div>
                                    <div class="phase-title-row">
                                        <strong>{{ planPhaseLabel(phase.key) }}</strong>
                                        <v-chip
                                            size="x-small"
                                            :color="phaseStatusColor(phase.status)"
                                            variant="tonal"
                                        >
                                            {{ planStatusLabel(phase.status) }}
                                        </v-chip>
                                    </div>
                                    <p>{{ planPhaseSummary(phase) }}</p>
                                    <time v-if="phase.completed_at || phase.started_at">
                                        {{ formatDate(phase.completed_at || phase.started_at) }}
                                    </time>
                                </div>
                            </li>
                        </ol>
                        <div
                            v-if="job.plan?.chapters?.length"
                            class="chapter-progress"
                        >
                            <div class="chapter-progress-heading">
                                <h4>{{ t('audiobook.chapterProgress') }}</h4>
                                <span>{{ t('audiobook.chapterProgressCount', { count: job.plan.chapters.length }) }}</span>
                            </div>
                            <div class="chapter-progress-list">
                                <article
                                    v-for="chapter in job.plan.chapters"
                                    :key="chapter.number"
                                    class="chapter-progress-row"
                                >
                                    <span class="chapter-number">{{ String(chapter.number).padStart(2, '0') }}</span>
                                    <div>
                                        <strong>{{ chapter.title || t('audiobook.untitledChapter', { number: chapter.number }) }}</strong>
                                        <span>
                                            {{ chapterStatusLabel(chapter.status) }} ·
                                            {{ t('audiobook.segmentProgress', { completed: chapter.completed_segments || 0, total: chapter.total_segments || 0 }) }}
                                        </span>
                                    </div>
                                    <div class="chapter-facts">
                                        <span v-if="chapter.cache_hits">{{ t('audiobook.chapterCacheHits', { count: chapter.cache_hits }) }}</span>
                                        <span v-if="chapter.resumed">{{ t('audiobook.chapterResumed') }}</span>
                                        <span v-if="chapter.duration_ms">{{ formatDuration(chapter.duration_ms) }}</span>
                                        <span v-if="chapter.size_bytes">{{ formatBytes(chapter.size_bytes) }}</span>
                                    </div>
                                </article>
                            </div>
                        </div>
                    </section>
                </v-expand-transition>
                <v-card-actions>
                    <v-btn
                        v-if="job.status === 'awaiting_review'"
                        color="primary"
                        variant="flat"
                        prepend-icon="mdi-script-text-outline"
                        data-testid="edit-workspace"
                        @click.stop="openWorkspace(job)"
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
                        v-if="job.script_available && job.status !== 'awaiting_review'"
                        color="primary"
                        variant="text"
                        prepend-icon="mdi-script-text-outline"
                        :data-testid="`view-script-${job.id}`"
                        @click.stop="openWorkspace(job)"
                    >
                        {{ t('audiobook.viewScript') }}
                    </v-btn>
                    <v-btn
                        v-if="activeStatuses.includes(job.status)"
                        color="error"
                        variant="text"
                        @click.stop="jobAction(job, 'cancel')"
                    >
                        {{ t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        v-if="['failed', 'cancelled'].includes(job.status)"
                        color="primary"
                        variant="text"
                        @click.stop="jobAction(job, 'retry')"
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
                    prepend-icon="mdi-plus"
                    to="/audios/create"
                    data-testid="open-library-to-create-job"
                >
                    {{ t('audiobook.createAudiobook') }}
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
                <v-toolbar
                    class="workspace-toolbar"
                    color="blue-grey-darken-4"
                >
                    <v-btn
                        icon="mdi-close"
                        :aria-label="t('common.close')"
                        @click="workspaceDialog = false"
                    />
                    <v-toolbar-title>
                        {{ t('audiobook.advancedWorkspace') }}
                        <small v-if="workspaceJob?.config?.revision_number">v{{ workspaceJob.config.revision_number }}</small>
                    </v-toolbar-title>
                    <v-spacer />
                    <v-btn
                        v-if="workspace.editable && !workspace.revision_info?.source_edition_id"
                        color="amber-lighten-2"
                        variant="flat"
                        :loading="confirming"
                        data-testid="confirm-workspace"
                        @click="confirmWorkspace('book')"
                    >
                        {{ t('audiobook.confirmAndGenerate') }}
                    </v-btn>
                    <template v-if="workspace.editable && workspace.revision_info?.source_edition_id">
                        <v-btn
                            class="revision-action"
                            color="amber-lighten-2"
                            variant="text"
                            prepend-icon="mdi-file-refresh-outline"
                            :loading="confirming"
                            :disabled="!selectedChapter"
                            data-testid="regenerate-current-chapter"
                            @click="confirmWorkspace('chapter')"
                        >
                            {{ t('audiobook.regenerateChapter') }}
                        </v-btn>
                        <v-btn
                            class="revision-action"
                            color="amber-lighten-2"
                            variant="flat"
                            prepend-icon="mdi-book-refresh-outline"
                            :loading="confirming"
                            data-testid="regenerate-full-book"
                            @click="confirmWorkspace('book')"
                        >
                            {{ t('audiobook.regenerateBook') }}
                        </v-btn>
                    </template>
                </v-toolbar>
                <v-alert
                    v-if="hasNormalizationReport"
                    type="info"
                    variant="tonal"
                    class="normalization-alert"
                    data-testid="script-normalization-report"
                >
                    {{ t('audiobook.normalizationSummary', {
                        chaptersBefore: normalizationReport.chapters_before || 0,
                        chaptersAfter: normalizationReport.chapters_after || 0,
                        segmentsBefore: normalizationReport.segments_before || 0,
                        segmentsAfter: normalizationReport.segments_after || 0,
                        removed: normalizationReport.removed_chapter_count || 0,
                        blocks: normalizationReport.removed_noncontent_block_count || 0,
                        renamed: normalizationReport.renamed_chapter_count || 0,
                        unmapped: normalizationReport.locator_unmapped_count || 0,
                    }) }}
                </v-alert>
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
                                    v-if="workspace.editable"
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
                                                    :disabled="!workspace.editable"
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
                                                        :disabled="!workspace.editable"
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
                                        v-if="workspace.editable"
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
                                    :readonly="!workspace.editable"
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

interface JobBook {
    id: number;
    title: string;
    author: string;
    img: string;
    thumb: string;
}

interface JobPhase {
    key: string;
    status: string;
    started_at?: string | null;
    completed_at?: string | null;
    summary: Record<string, string | number>;
}

interface JobChapter {
    number: number;
    title: string;
    status: string;
    total_segments: number;
    completed_segments: number;
    cache_hits: number;
    resumed: boolean;
    duration_ms: number;
    size_bytes: number;
}

interface JobPlan {
    detailed: boolean;
    overall_percent: number;
    phases: JobPhase[];
    summary: {
        chapters_total: number;
        chapters_completed: number;
        segments_total: number;
        segments_completed: number;
        cache_hits: number;
        attempts: number;
    };
    chapters: JobChapter[];
}

interface AudiobookJob {
    id: number;
    book_id: number;
    edition_id: number;
    mode: string;
    status: string;
    phase: string;
    progress: number;
    config: { engine?: string; speed?: string };
    book: JobBook | null;
    plan: JobPlan;
    script_available?: boolean;
    error_message?: string;
    created_at?: string;
    updated_at?: string;
}

const { t, locale } = useI18n();
const route = useRoute();
const { $backend, $alert } = useNuxtApp();
const store = useMainStore();
const statusFilter = ref('');
const expandedJobId = ref<number | null>(null);
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

const { data, pending, error, refresh } = await useAsyncData<{ jobs: AudiobookJob[] }>('audiobook-jobs', async () => {
    const response = await $backend('/audio-jobs');
    if (response.err !== 'ok') throw new Error(response.msg || t('audiobook.loadFailed'));
    return response;
}, { default: () => ({ jobs: [] }) });

const filteredJobs = computed(() => statusFilter.value
    ? (data.value?.jobs || []).filter(job => job.status === statusFilter.value)
    : (data.value?.jobs || []));
const voiceOptions = computed(() => voices.value.map(item => ({
    label: `${item.name} · ${item.gender === 'male' ? t('audiobook.male') : t('audiobook.female')} · ${item.engine}`,
    value: `${item.engine}=${item.voice_id}`,
})));
const normalizationReport = computed(() => workspace.value?.normalization || {});
const hasNormalizationReport = computed(() => Object.keys(normalizationReport.value).length > 0);

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
    workspaceJob.value = response.job || job;
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
            return true;
        } else {
            scriptErrors.value = response.errors || [];
            $alert('error', response.msg);
            return false;
        }
    } finally {
        saving.value = false;
    }
}

async function confirmWorkspace(scope: 'book' | 'chapter') {
    if (scope === 'chapter' && !await saveChapter()) return;
    confirming.value = true;
    try {
        const response = await $backend(`/audio-job/${workspaceJob.value.id}/confirm`, {
            method: 'POST',
            body: JSON.stringify({ scope, chapter_number: selectedChapter.value?.number }),
        });
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

function toggleJob(jobId: number) {
    expandedJobId.value = expandedJobId.value === jobId ? null : jobId;
}

function overallPercent(job: AudiobookJob) {
    const value = job.plan?.overall_percent ?? Math.round(Number(job.progress || 0) * 100);
    return Math.max(0, Math.min(100, Math.round(value)));
}

function phaseIcon(status: string) {
    return ({
        done: 'mdi-check',
        current: 'mdi-progress-clock',
        skipped: 'mdi-skip-next',
        failed: 'mdi-alert',
        cancelled: 'mdi-close',
    } as Record<string, string>)[status] || 'mdi-circle-small';
}

function phaseStatusColor(status: string) {
    return ({ done: 'success', current: 'warning', skipped: 'blue-grey', failed: 'error', cancelled: 'grey' } as Record<string, string>)[status] || 'grey';
}

function planPhaseLabel(key: string) { return t(`audiobook.planPhase_${key}`); }
function planStatusLabel(status: string) { return t(`audiobook.planStatus_${status}`); }

function planPhaseSummary(phase: JobPhase) {
    const summary = phase.summary || {};
    if (phase.key === 'queue') return t('audiobook.planSummaryQueue', { attempts: summary.attempts || 0 });
    if (phase.key === 'inspect') return summary.chapters_total
        ? t('audiobook.planSummaryInspectDone', { chapters: summary.chapters_total })
        : t('audiobook.planSummaryInspect');
    if (phase.key === 'review') return phase.status === 'skipped'
        ? t('audiobook.planSummaryReviewSkipped')
        : t('audiobook.planSummaryReview');
    if (phase.key === 'generate') return t('audiobook.planSummaryGenerate', {
        chaptersCompleted: summary.chapters_completed || 0,
        chaptersTotal: summary.chapters_total || 0,
        segmentsCompleted: summary.segments_completed || 0,
        segmentsTotal: summary.segments_total || 0,
    });
    if (phase.key === 'finalize') return t('audiobook.planSummaryFinalize');
    return t('audiobook.planSummaryComplete', { chapters: summary.chapters_completed || 0 });
}

function chapterStatusLabel(status: string) { return t(`audiobook.chapterStatus_${status || 'pending'}`); }

function formatDuration(milliseconds: number) {
    const seconds = Math.max(0, Math.round(milliseconds / 1000));
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatBytes(bytes: number) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
.jobs-header p:not(.eyebrow) { color: rgba(var(--v-theme-on-surface), .64); }
.jobs-header-actions { max-width: 100%; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }
.eyebrow { color: #9d6a13; font-size: .75rem; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
.filter-row { margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; }
.job-list { display: grid; gap: 14px; }
.job-card { position: relative; overflow: hidden; border: 1px solid rgba(var(--v-border-color), .13); border-radius: 18px; }
.job-status-rail { position: absolute; top: 0; bottom: 0; left: 0; width: 5px; background: #7292a7; }
.rail-completed { background: #3f9b6c; }.rail-failed { background: #c94848; }.rail-awaiting_review { background: #d99a2b; }
.job-topline { display: flex; justify-content: space-between; color: rgba(var(--v-theme-on-surface), .64); font-size: .76rem; }
.job-topline > div { display: flex; align-items: center; gap: 8px; }
.job-id { font: 700 .9rem monospace; }
.job-body { margin-top: 18px; display: grid; grid-template-columns: minmax(250px, 38%) 1fr; align-items: stretch; gap: 26px; }
.job-book { min-width: 0; display: flex; align-items: center; gap: 14px; color: inherit; text-decoration: none; border-radius: 12px; }
.job-book:hover strong { color: #9d6a13; }
.job-book img, .deleted-cover { width: 58px; height: 76px; flex: 0 0 auto; object-fit: cover; border-radius: 7px; background: rgba(var(--v-theme-on-surface), .06); box-shadow: 0 5px 16px rgba(35, 27, 18, .13); }
.deleted-cover { display: grid; place-items: center; color: rgba(var(--v-theme-on-surface), .64); box-shadow: none; }
.job-book > span:last-child { min-width: 0; display: grid; gap: 3px; }
.job-book strong { overflow: hidden; font: 700 1.18rem Georgia, 'Noto Serif SC', serif; text-overflow: ellipsis; white-space: nowrap; transition: color .18s ease; }
.job-book small { overflow: hidden; color: rgba(var(--v-theme-on-surface), .64); font-size: .76rem; text-overflow: ellipsis; white-space: nowrap; }
.job-plan-toggle { min-width: 0; padding: 4px 2px; display: grid; align-content: center; gap: 8px; color: inherit; text-align: left; border-radius: 10px; }
.job-plan-toggle:focus-visible { outline: 3px solid rgba(217,154,43,.42); outline-offset: 4px; }
.job-config { color: rgba(var(--v-theme-on-surface), .64); font-size: .76rem; }
.phase-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: .82rem; }
.phase-heading strong { color: #9d6a13; font: 800 1rem ui-monospace, SFMono-Regular, Menlo, monospace; }
.expand-label { display: flex; align-items: center; justify-content: flex-end; color: #9d6a13; font-size: .72rem; font-weight: 700; }
.job-error { color: rgb(var(--v-theme-error)) !important; }
.job-plan { padding: 28px 28px 32px; background: rgba(157, 106, 19, .035); border-top: 1px solid rgba(var(--v-border-color), .12); border-bottom: 1px solid rgba(var(--v-border-color), .08); }
.plan-heading { display: flex; align-items: end; justify-content: space-between; gap: 22px; }
.plan-heading h3 { font: 700 1.55rem Georgia, 'Noto Serif SC', serif; }
.plan-heading > span { max-width: 420px; color: rgba(var(--v-theme-on-surface), .64); font-size: .75rem; text-align: right; }
.plan-metrics { margin: 22px 0; display: grid; grid-template-columns: repeat(4, 1fr); background: rgb(var(--v-theme-surface)); border: 1px solid rgba(var(--v-border-color), .12); border-radius: 13px; }
.plan-metrics > div { min-width: 0; padding: 14px 18px; display: grid; gap: 2px; border-right: 1px solid rgba(var(--v-border-color), .1); }
.plan-metrics > div:last-child { border-right: 0; }
.plan-metrics strong { font: 750 1.15rem ui-monospace, SFMono-Regular, Menlo, monospace; }
.plan-metrics span { color: rgba(var(--v-theme-on-surface), .64); font-size: .68rem; letter-spacing: .06em; text-transform: uppercase; }
.legacy-plan-alert { margin-bottom: 20px; }
.phase-list { position: relative; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; list-style: none; }
.phase-list li { min-width: 0; padding: 15px; display: grid; grid-template-columns: 30px 1fr; gap: 10px; background: rgba(var(--v-theme-surface), .72); border: 1px solid rgba(var(--v-border-color), .1); border-radius: 12px; }
.phase-icon { width: 28px; height: 28px; display: grid; place-items: center; color: rgba(var(--v-theme-on-surface), .64); background: rgba(var(--v-theme-on-surface), .06); border-radius: 50%; }
.phase-done .phase-icon { color: #26734d; background: rgba(63,155,108,.15); }
.phase-current { border-color: rgba(217,154,43,.52) !important; box-shadow: inset 3px 0 #d99a2b; }
.phase-current .phase-icon { color: #9d6a13; background: rgba(217,154,43,.17); }
.phase-failed .phase-icon { color: rgb(var(--v-theme-error)); background: rgba(var(--v-theme-error), .12); }
.phase-title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.phase-title-row strong { font-size: .86rem; }
.phase-list p { min-height: 2.5em; margin-top: 5px; color: rgba(var(--v-theme-on-surface), .64); font-size: .72rem; line-height: 1.35; }
.phase-list time { color: rgba(var(--v-theme-on-surface), .64); font-size: .65rem; }
.chapter-progress { margin-top: 24px; }
.chapter-progress-heading { margin-bottom: 10px; display: flex; align-items: baseline; justify-content: space-between; }
.chapter-progress-heading h4 { font: 700 1.1rem Georgia, 'Noto Serif SC', serif; }
.chapter-progress-heading span { color: rgba(var(--v-theme-on-surface), .64); font-size: .72rem; }
.chapter-progress-list { max-height: 360px; overflow: auto; background: rgb(var(--v-theme-surface)); border: 1px solid rgba(var(--v-border-color), .12); border-radius: 13px; }
.chapter-progress-row { padding: 13px 16px; display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; gap: 12px; border-bottom: 1px solid rgba(var(--v-border-color), .08); }
.chapter-progress-row:last-child { border-bottom: 0; }
.chapter-number { color: #9d6a13; font: 750 .8rem ui-monospace, SFMono-Regular, Menlo, monospace; }
.chapter-progress-row > div:nth-child(2) { min-width: 0; display: grid; gap: 2px; }
.chapter-progress-row strong { overflow: hidden; font-size: .82rem; text-overflow: ellipsis; white-space: nowrap; }
.chapter-progress-row > div:nth-child(2) span, .chapter-facts { color: rgba(var(--v-theme-on-surface), .64); font-size: .7rem; }
.chapter-facts { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 5px 10px; }
.workspace-card { background: rgb(var(--v-theme-background)); }
.workspace-card :deep(.v-toolbar-title small) { margin-left: 8px; color: #f1b957; font: 700 .72rem ui-monospace, SFMono-Regular, Menlo, monospace; }
.normalization-alert { flex: 0 0 auto; height: auto !important; min-height: 72px; margin: 12px 24px 0; }
.normalization-alert :deep(.v-alert__content) { overflow: visible; line-height: 1.5; white-space: normal; }
.workspace-window { height: calc(100vh - 112px); overflow: auto; }
.workspace-pane { max-width: 1320px; margin: 0 auto; padding: 32px; }
.pane-heading { margin-bottom: 22px; display: flex; justify-content: space-between; align-items: start; gap: 20px; }
.pane-heading h2 { font: 700 1.8rem Georgia, 'Noto Serif SC', serif; }
.pane-heading p { color: rgba(var(--v-theme-on-surface), .64); }
.character-table-wrap { overflow: auto; background: rgb(var(--v-theme-surface)); border: 1px solid rgba(var(--v-border-color), .13); border-radius: 18px; }
.character-table { width: 100%; border-collapse: collapse; }
.character-table th, .character-table td { min-width: 110px; padding: 14px; text-align: left; border-bottom: 1px solid rgba(var(--v-border-color), .09); }
.character-table th { color: rgba(var(--v-theme-on-surface), .64); font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; }
.character-table td:first-child { min-width: 150px; }
.character-table small { display: block; color: rgba(var(--v-theme-on-surface), .64); }
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
    .jobs-header-actions { width: 100%; justify-content: flex-start; }
    .jobs-header-actions :deep(.v-btn) { flex: 1 1 100%; min-width: 0; }
    .job-body { gap: 16px; }
    .job-book, .job-plan-toggle { width: 100%; }
    .plan-heading { align-items: start; flex-direction: column; }
    .plan-heading > span { text-align: left; }
    .plan-metrics { grid-template-columns: repeat(2, 1fr); }
    .plan-metrics > div:nth-child(2) { border-right: 0; }
    .plan-metrics > div:nth-child(-n+2) { border-bottom: 1px solid rgba(var(--v-border-color), .1); }
    .phase-list { grid-template-columns: 1fr; }
    .chapter-progress-row { grid-template-columns: 32px minmax(0, 1fr); }
    .chapter-facts { grid-column: 2; justify-content: flex-start; }
    .chapter-pane { grid-template-columns: 1fr; }
    .chapter-pane aside { max-height: 160px; overflow: auto; }
    .workspace-toolbar .revision-action :deep(.v-btn__content) { font-size: 0; }
    .workspace-toolbar .revision-action :deep(.v-icon) { margin: 0; font-size: 1.35rem; }
}
@media (max-width: 960px) {
    .workspace-toolbar :deep(.v-toolbar-title) { display: none; }
}
</style>
