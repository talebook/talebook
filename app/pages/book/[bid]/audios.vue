<template>
    <div class="audiobook-detail">
        <v-btn
            variant="text"
            prepend-icon="mdi-arrow-left"
            to="/audios"
            class="mb-4"
        >
            {{ t('audiobook.backToLibrary') }}
        </v-btn>
        <div
            v-if="pending"
            class="d-flex justify-center py-16"
        >
            <v-progress-circular
                indeterminate
                color="amber-darken-2"
            />
        </div>
        <v-alert
            v-else-if="error"
            type="error"
            variant="tonal"
        >
            {{ error.message }}
        </v-alert>
        <template v-else-if="detail?.book">
            <section class="detail-hero">
                <v-img
                    :src="detail.book.img"
                    width="180"
                    aspect-ratio="0.72"
                    cover
                    class="hero-cover"
                />
                <div class="hero-copy">
                    <p class="eyebrow">
                        {{ t('audiobook.audioEdition') }}
                    </p>
                    <div class="title-row">
                        <h1>{{ detail.book.title }}</h1>
                        <v-chip
                            color="amber-lighten-2"
                            variant="outlined"
                            size="small"
                            data-testid="audiobook-beta"
                        >
                            {{ t('audiobook.beta') }}
                        </v-chip>
                    </div>
                    <p>{{ (detail.book.authors || []).join(' / ') }}</p>
                    <div class="metadata">
                        <span v-if="publishedEdition">{{ t('audiobook.chapterCount', { count: publishedEdition.chapter_count }) }}</span>
                        <span v-if="publishedEdition">{{ formatDuration(publishedEdition.duration_ms) }}</span>
                        <span v-if="publishedEdition">{{ engineLabel(publishedEdition.engine) }}</span>
                    </div>
                    <div class="hero-actions">
                        <v-btn
                            v-if="publishedEdition?.chapters?.length"
                            color="amber-darken-2"
                            variant="flat"
                            prepend-icon="mdi-play"
                            data-testid="play-audiobook"
                            @click="playChapter(publishedEdition.chapters[0])"
                        >
                            {{ resumeLabel }}
                        </v-btn>
                        <v-btn
                            v-if="activeJob"
                            color="amber-darken-2"
                            variant="flat"
                            prepend-icon="mdi-progress-wrench"
                            :to="`/audio-job/${activeJob.id}`"
                            data-testid="view-active-audio-job"
                        >
                            {{ activeJobActionLabel }}
                        </v-btn>
                        <v-btn
                            v-if="canGenerate && !activeJob"
                            variant="outlined"
                            prepend-icon="mdi-waveform"
                            data-testid="generate-audiobook"
                            @click="generationDialog = true"
                        >
                            {{ t('audiobook.generate') }}
                        </v-btn>
                        <v-btn
                            v-if="formatNotSupported && !activeJob"
                            color="amber-lighten-2"
                            variant="outlined"
                            prepend-icon="mdi-swap-horizontal"
                            :to="`/book/${bookId}?convert=epub`"
                            data-testid="convert-audiobook-source"
                        >
                            {{ t('audiobook.convertToEpubThenCreate') }}
                        </v-btn>
                        <v-btn
                            v-if="store.user.is_admin"
                            variant="text"
                            to="/audio-jobs"
                            prepend-icon="mdi-progress-wrench"
                        >
                            {{ t('audiobook.viewJobs') }}
                        </v-btn>
                        <v-btn
                            v-if="store.user.is_admin && publishedEdition?.has_script"
                            variant="outlined"
                            prepend-icon="mdi-file-document-edit-outline"
                            :loading="revisingEditionId === publishedEdition.id"
                            data-testid="create-audio-revision"
                            @click="createRevision(publishedEdition)"
                        >
                            {{ t('audiobook.createRevision') }}
                        </v-btn>
                        <v-btn
                            v-if="canDeleteAudiobook"
                            color="error"
                            variant="text"
                            prepend-icon="mdi-delete-outline"
                            data-testid="delete-audiobook"
                            @click="deleteDialog = true"
                        >
                            {{ t('audiobook.deleteAudiobook') }}
                        </v-btn>
                    </div>
                </div>
            </section>

            <v-alert
                v-if="detail.generation?.permitted && detail.generation?.health && !detail.generation.health.ok"
                type="warning"
                variant="tonal"
                class="mt-5"
                data-testid="voicebook-health-warning"
            >
                {{ t('audiobook.voicebookUnavailable') }}
                <span v-if="detail.generation.health.reason">：{{ detail.generation.health.reason }}</span>
            </v-alert>
            <v-alert
                v-if="detail.generation?.permitted && detail.generation?.capacity && !detail.generation.capacity.ok"
                type="warning"
                variant="tonal"
                class="mt-5"
                data-testid="audiobook-capacity-warning"
            >
                {{ t('audiobook.capacityUnavailable') }}
            </v-alert>
            <v-alert
                v-if="formatNotSupported && !activeJob"
                type="info"
                variant="tonal"
                class="mt-5"
                data-testid="audiobook-format-warning"
            >
                {{ t('audiobook.unsupportedFormatDescription') }}
            </v-alert>

            <section
                v-if="detail.generation?.can_manage && managedEditions.length"
                class="edition-management"
                data-testid="edition-management"
            >
                <div class="section-heading">
                    <div>
                        <p class="eyebrow dark">
                            {{ t('audiobook.editionManagementEyebrow') }}
                        </p>
                        <h2>{{ t('audiobook.editionManagement') }}</h2>
                        <p>{{ t('audiobook.backupRetentionSummary', { count: historicalEditions.length, retention: backupRetention }) }}</p>
                    </div>
                    <v-btn
                        variant="outlined"
                        color="error"
                        prepend-icon="mdi-broom"
                        :loading="cleaningBackups"
                        :disabled="expiredBackupCount === 0"
                        data-testid="cleanup-audio-backups"
                        @click="cleanupBackups"
                    >
                        {{ t('audiobook.cleanupBackups', { count: expiredBackupCount }) }}
                    </v-btn>
                </div>
                <v-list
                    class="edition-list"
                    lines="two"
                >
                    <v-list-item
                        v-for="edition in managedEditions"
                        :key="edition.id"
                    >
                        <template #prepend>
                            <v-chip
                                :color="edition.status === 'ready' ? 'success' : edition.status === 'partial' ? 'warning' : 'default'"
                                size="small"
                                variant="tonal"
                            >
                                {{ editionStatusLabel(edition.status) }}
                            </v-chip>
                        </template>
                        <v-list-item-title>
                            v{{ edition.revision_number || 1 }} · {{ engineLabel(edition.engine) }} · {{ t('audiobook.chapterCount', { count: edition.chapter_count }) }}
                        </v-list-item-title>
                        <v-list-item-subtitle>{{ edition.created_at }}</v-list-item-subtitle>
                        <template #append>
                            <div class="edition-actions">
                                <v-btn
                                    v-if="['ready', 'partial'].includes(edition.status)"
                                    size="small"
                                    variant="tonal"
                                    color="primary"
                                    :data-testid="`publish-edition-${edition.id}`"
                                    @click="changeEdition(edition, 'publish')"
                                >
                                    {{ publishedEdition ? t('audiobook.replaceCurrentEdition') : t('audiobook.publishEdition') }}
                                </v-btn>
                                <v-btn
                                    v-if="edition.has_script && edition.status === 'historical'"
                                    size="small"
                                    variant="text"
                                    :loading="revisingEditionId === edition.id"
                                    @click="createRevision(edition)"
                                >
                                    {{ t('audiobook.createRevision') }}
                                </v-btn>
                                <v-btn
                                    v-if="edition.status === 'historical'"
                                    size="small"
                                    variant="tonal"
                                    :data-testid="`rollback-edition-${edition.id}`"
                                    @click="changeEdition(edition, 'rollback')"
                                >
                                    {{ t('audiobook.rollbackEdition') }}
                                </v-btn>
                                <v-btn
                                    size="small"
                                    variant="text"
                                    color="error"
                                    :aria-label="t('audiobook.deleteEdition')"
                                    @click="changeEdition(edition, 'delete')"
                                >
                                    {{ t('audiobook.deleteEdition') }}
                                </v-btn>
                            </div>
                        </template>
                    </v-list-item>
                </v-list>
            </section>

            <section
                v-if="publishedEdition"
                class="chapter-section"
            >
                <div class="section-heading">
                    <div>
                        <p class="eyebrow dark">
                            {{ t('audiobook.contentsEyebrow') }}
                        </p>
                        <h2>{{ t('audiobook.chapterList') }}</h2>
                    </div>
                    <v-select
                        v-if="publishedEditions.length > 1"
                        v-model="selectedEditionId"
                        :items="publishedEditions"
                        item-title="created_at"
                        item-value="id"
                        :label="t('audiobook.edition')"
                        variant="outlined"
                        density="compact"
                        hide-details
                        class="edition-select"
                    />
                </div>
                <v-list
                    class="chapter-list"
                    lines="two"
                >
                    <v-list-item
                        v-for="item in publishedEdition.chapters"
                        :key="item.id"
                        :class="{ 'chapter-active': player.chapter?.id === item.id }"
                        @click="playChapter(item)"
                    >
                        <template #prepend>
                            <span class="chapter-number">{{ String(item.number).padStart(2, '0') }}</span>
                        </template>
                        <v-list-item-title>{{ item.title }}</v-list-item-title>
                        <v-list-item-subtitle>
                            {{ formatDuration(item.duration_ms) }}
                        </v-list-item-subtitle>
                        <template #append>
                            <v-btn
                                :icon="player.chapter?.id === item.id && player.playing ? 'mdi-pause' : 'mdi-play'"
                                variant="text"
                                :aria-label="t('audiobook.playChapter', { title: item.title })"
                            />
                        </template>
                    </v-list-item>
                </v-list>
            </section>

            <v-empty-state
                v-else
                icon="mdi-waveform"
                :title="t('audiobook.noEditionTitle')"
                :text="noEditionText"
            >
                <template
                    v-if="activeJob || canGenerate || formatNotSupported"
                    #actions
                >
                    <v-btn
                        v-if="activeJob"
                        color="primary"
                        :to="`/audio-job/${activeJob.id}`"
                        data-testid="view-active-audio-job-empty"
                    >
                        {{ activeJobActionLabel }}
                    </v-btn>
                    <v-btn
                        v-else-if="canGenerate"
                        color="primary"
                        @click="generationDialog = true"
                    >
                        {{ t('audiobook.generate') }}
                    </v-btn>
                    <v-btn
                        v-else
                        color="primary"
                        variant="flat"
                        :to="`/book/${bookId}?convert=epub`"
                    >
                        {{ t('audiobook.convertToEpubThenCreate') }}
                    </v-btn>
                </template>
            </v-empty-state>
        </template>

        <v-dialog
            v-model="deleteDialog"
            max-width="560"
        >
            <v-card
                class="delete-dialog"
                data-testid="delete-audiobook-dialog"
            >
                <v-card-title>{{ t('audiobook.deleteAudiobookTitle') }}</v-card-title>
                <v-card-text>
                    <p>{{ t('audiobook.deleteAudiobookWarning') }}</p>
                    <v-alert
                        type="info"
                        variant="tonal"
                        density="compact"
                        class="mt-4"
                    >
                        {{ t('audiobook.deleteAudiobookBookPreserved') }}
                    </v-alert>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        variant="text"
                        :disabled="deleting"
                        @click="deleteDialog = false"
                    >
                        {{ t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        color="error"
                        variant="flat"
                        :loading="deleting"
                        data-testid="confirm-delete-audiobook"
                        @click="deleteAudiobook"
                    >
                        {{ t('audiobook.deleteAudiobookConfirm') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog
            v-model="generationDialog"
            :max-width="generation.mode === 'advanced' ? 860 : 720"
        >
            <v-card class="generation-dialog">
                <v-card-title>{{ t('audiobook.generateTitle') }}</v-card-title>
                <v-card-subtitle>{{ detail?.book?.title }}</v-card-subtitle>
                <v-card-text>
                    <v-btn-toggle
                        v-model="generation.mode"
                        mandatory
                        color="primary"
                        class="mb-5"
                        divided
                    >
                        <v-btn value="quick">
                            {{ t('audiobook.quickMode') }}
                        </v-btn>
                        <v-btn value="advanced">
                            {{ t('audiobook.advancedMode') }}
                        </v-btn>
                    </v-btn-toggle>
                    <v-alert
                        v-if="generation.mode === 'quick'"
                        type="info"
                        variant="tonal"
                        density="compact"
                        class="mb-5"
                    >
                        {{ t('audiobook.quickModeHint') }}
                    </v-alert>
                    <section
                        v-else
                        class="advanced-entry"
                        data-testid="advanced-mode-panel"
                    >
                        <p class="advanced-kicker">
                            {{ t('audiobook.advancedFirstStep') }}
                        </p>
                        <h3>{{ t('audiobook.advancedEntryTitle') }}</h3>
                        <p class="advanced-description">
                            {{ t('audiobook.advancedEntryDescription') }}
                        </p>
                        <ol class="advanced-steps">
                            <li class="advanced-step current">
                                <div class="step-topline">
                                    <span class="step-number">01</span>
                                    <span class="step-state">{{ t('audiobook.currentStep') }}</span>
                                </div>
                                <v-icon icon="mdi-book-search-outline" />
                                <strong>{{ t('audiobook.advancedStepInspect') }}</strong>
                            </li>
                            <li class="advanced-step">
                                <div class="step-topline">
                                    <span class="step-number">02</span>
                                </div>
                                <v-icon icon="mdi-account-voice" />
                                <strong>{{ t('audiobook.advancedStepCast') }}</strong>
                            </li>
                            <li class="advanced-step">
                                <div class="step-topline">
                                    <span class="step-number">03</span>
                                </div>
                                <v-icon icon="mdi-script-text-outline" />
                                <strong>{{ t('audiobook.advancedStepEdit') }}</strong>
                            </li>
                        </ol>
                    </section>
                    <p
                        v-if="generation.mode === 'advanced'"
                        class="advanced-settings-label"
                    >
                        {{ t('audiobook.inspectionSettings') }}
                    </p>
                    <v-row>
                        <v-col
                            cols="12"
                            sm="6"
                        >
                            <v-select
                                v-model="generation.engine"
                                :items="engines"
                                item-title="title"
                                item-value="value"
                                :label="t('audiobook.ttsEngine')"
                                variant="outlined"
                            />
                        </v-col>
                        <v-col
                            cols="12"
                            sm="6"
                        >
                            <v-select
                                v-model="generation.speed"
                                :items="speeds"
                                :label="t('audiobook.defaultSpeed')"
                                variant="outlined"
                            />
                        </v-col>
                        <v-col cols="12">
                            <v-text-field
                                v-model="generation.chapters"
                                :label="t('audiobook.chapterSelection')"
                                :hint="t('audiobook.chapterSelectionHint')"
                                persistent-hint
                                variant="outlined"
                            />
                        </v-col>
                        <v-col
                            cols="12"
                            sm="6"
                        >
                            <v-combobox
                                v-model="generation.protagonist_voices.male"
                                :items="voiceItems"
                                item-title="title"
                                item-value="value"
                                :label="t('audiobook.maleProtagonistVoice')"
                                :hint="t('audiobook.protagonistVoiceHint')"
                                persistent-hint
                                clearable
                                variant="outlined"
                            />
                        </v-col>
                        <v-col
                            cols="12"
                            sm="6"
                        >
                            <v-combobox
                                v-model="generation.protagonist_voices.female"
                                :items="voiceItems"
                                item-title="title"
                                item-value="value"
                                :label="t('audiobook.femaleProtagonistVoice')"
                                :hint="t('audiobook.protagonistVoiceHint')"
                                persistent-hint
                                clearable
                                variant="outlined"
                            />
                        </v-col>
                    </v-row>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        variant="text"
                        @click="generationDialog = false"
                    >
                        {{ t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        variant="flat"
                        :loading="submitting"
                        :prepend-icon="generation.mode === 'advanced' ? 'mdi-book-search-outline' : 'mdi-progress-wrench'"
                        data-testid="submit-generation"
                        @click="submitGeneration"
                    >
                        {{ generation.mode === 'advanced' ? t('audiobook.startInspection') : t('audiobook.startGeneration') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';
import { useAudiobookStore } from '@/stores/audiobook';

const route = useRoute();
const router = useRouter();
const store = useMainStore();
const player = useAudiobookStore();
const { $backend, $alert } = useNuxtApp();
const { t } = useI18n();
const bookId = Number(route.params.bid);
const generationDialog = ref(false);
const deleteDialog = ref(false);
const submitting = ref(false);
const revisingEditionId = ref<number | null>(null);
const cleaningBackups = ref(false);
const deleting = ref(false);
const selectedEditionId = ref<number | null>(null);
const voiceCatalog = ref<any[]>([]);
const generation = reactive({
    mode: 'quick',
    engine: 'edgetts',
    speed: 'x1.0',
    quality: 'standard',
    chapters: '',
    protagonist_voices: { male: '', female: '' },
});
const speeds = ['x0.75', 'x0.9', 'x1.0', 'x1.1', 'x1.25', 'x1.5'];
const activeJobStatuses = ['queued', 'inspecting', 'awaiting_review', 'generating', 'finalizing'];
const engines = computed(() => [
    { title: t('audiobook.edgeTts'), value: 'edgetts' },
    { title: t('audiobook.qwenTts'), value: 'qwen3tts' },
]);
store.setNavbar(true);

const { data: detail, pending, error, refresh } = await useAsyncData(`audiobook-detail-${bookId}`, async () => {
    const response = await $backend(`/book/${bookId}/audios`);
    if (response.err !== 'ok') throw new Error(response.msg || t('audiobook.loadFailed'));
    return response;
});

const { data: jobData, refresh: refreshJobs } = await useAsyncData(`audiobook-book-jobs-${bookId}`, async () => {
    if (!store.user.is_login) await store.loadUserInfo();
    if (!store.user.is_login) return { jobs: [] };
    const response = await $backend('/audio-jobs');
    if (response.err !== 'ok') return { jobs: [] };
    return response;
}, { default: () => ({ jobs: [] }) });

const publishedEditions = computed(() => (detail.value?.editions || []).filter((item: any) => item.status === 'published'));
const publishedEdition = computed(() => publishedEditions.value.find((item: any) => item.id === selectedEditionId.value) || publishedEditions.value[0] || null);
const managedEditions = computed(() => (detail.value?.editions || []).filter((item: any) => item.status !== 'published'));
const historicalEditions = computed(() => managedEditions.value.filter((item: any) => item.status === 'historical'));
const backupRetention = computed(() => Number(detail.value?.backup_retention ?? 3));
const expiredBackupCount = computed(() => Math.max(0, historicalEditions.value.length - backupRetention.value));
const canGenerate = computed(() => Boolean(detail.value?.generation?.can_generate));
const activeJob = computed(() => (jobData.value?.jobs || []).find((job: any) => (
    Number(job.book_id) === bookId && activeJobStatuses.includes(job.status)
)) || null);
const formatNotSupported = computed(() => (
    detail.value?.generation?.reason === 'format.not_supported'
    || detail.value?.generation?.compatible === false
));
const canDeleteAudiobook = computed(() => Boolean(
    detail.value?.generation?.can_manage && detail.value?.editions?.length,
));
const voiceItems = computed(() => voiceCatalog.value
    .filter(item => item.engine === generation.engine)
    .map(item => ({ title: item.name || item.voice_id, value: item.voice_id })));
const resumeLabel = computed(() => player.book?.id === bookId ? t('audiobook.continueListening') : t('audiobook.startListening'));
const activeJobActionLabel = computed(() => (
    activeJob.value?.status === 'awaiting_review'
        ? t('audiobook.continueScriptReview')
        : t('audiobook.viewProductionProgress')
));
const noEditionText = computed(() => {
    if (activeJob.value) return t('audiobook.noEditionActiveJob');
    if (formatNotSupported.value) return t('audiobook.unsupportedFormatDescription');
    return canGenerate.value ? t('audiobook.noEditionAdmin') : t('audiobook.noEditionReader');
});

watch(publishedEditions, (items) => {
    if (!selectedEditionId.value && items.length) selectedEditionId.value = items[0].id;
}, { immediate: true });

watch(generationDialog, async (open) => {
    if (!open || voiceCatalog.value.length) return;
    const response = await $backend('/audio-voices');
    if (response.err === 'ok') voiceCatalog.value = response.catalog?.voices || [];
});

watch(() => store.user.is_login, (loggedIn) => {
    if (loggedIn) void refreshJobs();
}, { immediate: true });

watch([
    () => route.query.create,
    canGenerate,
    () => activeJob.value?.id,
], ([create]) => {
    if (create !== '1') return;
    if (activeJob.value) {
        generationDialog.value = false;
        return;
    }
    if (canGenerate.value) generationDialog.value = true;
}, { immediate: true });

async function playChapter(chapter: any) {
    if (!publishedEdition.value || !detail.value?.book) return;
    await player.open(
        { id: detail.value.book.id, title: detail.value.book.title, img: detail.value.book.img },
        publishedEdition.value,
        chapter.number,
    );
}

async function submitGeneration() {
    submitting.value = true;
    try {
        const response = await $backend(`/book/${bookId}/audio-jobs`, {
            method: 'POST',
            body: JSON.stringify(generation),
        });
        if (response.err === 'ok') {
            generationDialog.value = false;
            $alert('success', response.deduplicated ? t('audiobook.jobAlreadyQueued') : t('audiobook.jobCreated'));
            await router.push(`/audio-job/${response.job.id}`);
        } else {
            $alert('error', response.msg);
        }
    } catch (error) {
        const message = error instanceof Error && error.message ? error.message : t('audiobook.createJobFailed');
        $alert('error', message);
    } finally {
        submitting.value = false;
    }
}

async function createRevision(edition: any) {
    revisingEditionId.value = edition.id;
    try {
        const response = await $backend(`/audio/${edition.id}/revisions`, {
            method: 'POST',
            body: '{}',
        });
        if (response.err !== 'ok') {
            $alert('error', response.msg);
            return;
        }
        $alert('success', t('audiobook.revisionCreated'));
        await router.push(`/audio-job/${response.job.id}`);
    } finally {
        revisingEditionId.value = null;
    }
}

async function cleanupBackups() {
    if (!globalThis.confirm(t('audiobook.confirmBackupCleanup', { count: expiredBackupCount.value }))) return;
    cleaningBackups.value = true;
    try {
        const response = await $backend(`/book/${bookId}/audio-backups`, { method: 'DELETE' });
        if (response.err !== 'ok') {
            $alert('error', response.msg);
            return;
        }
        $alert('success', t('audiobook.backupsCleaned', { count: response.deleted_count }));
        await refresh();
    } finally {
        cleaningBackups.value = false;
    }
}

async function deleteAudiobook() {
    deleting.value = true;
    try {
        const response = await $backend(`/book/${bookId}/audios`, { method: 'DELETE' });
        if (response.err !== 'ok' && response.err !== 'audiobook.cleanup_failed') {
            $alert('error', response.msg || t('audiobook.deleteAudiobookFailed'));
            return;
        }
        if (player.book?.id === bookId) player.close();
        deleteDialog.value = false;
        $alert(
            response.err === 'ok' ? 'success' : 'error',
            response.err === 'ok' ? t('audiobook.deleteAudiobookSuccess') : response.msg,
        );
        await refresh();
    } catch (error) {
        const message = error instanceof Error && error.message ? error.message : t('audiobook.deleteAudiobookFailed');
        $alert('error', message);
    } finally {
        deleting.value = false;
    }
}

async function changeEdition(edition: any, action: 'publish' | 'rollback' | 'delete') {
    let allowPartial = false;
    if (edition.status === 'partial' && action === 'publish') {
        if (!globalThis.confirm(t('audiobook.confirmPartialPublish'))) return;
        allowPartial = true;
    }
    if (action === 'delete' && !globalThis.confirm(t('audiobook.confirmEditionDelete'))) return;
    const response = await $backend(`/audio/${edition.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action, allow_partial: allowPartial }),
    });
    if (response.err !== 'ok') {
        $alert('error', response.msg);
        return;
    }
    $alert('success', t(`audiobook.editionAction_${action}`));
    await refresh();
}

function formatDuration(ms: number) {
    const minutes = Math.max(1, Math.round((ms || 0) / 60000));
    if (minutes < 60) return t('audiobook.minutes', { count: minutes });
    return t('audiobook.hoursMinutes', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
}

function engineLabel(engine: string) {
    return engine === 'qwen3tts' ? t('audiobook.qwenTts') : t('audiobook.edgeTts');
}

function editionStatusLabel(status: string) {
    return t(`audiobook.editionStatus_${status}`);
}

useHead({ title: () => detail.value?.book?.title || t('audiobook.libraryTitle') });
</script>

<style scoped>
.audiobook-detail { max-width: 1120px; margin: 0 auto; padding: 14px 0 120px; }
.detail-hero { min-height: 330px; padding: clamp(24px, 5vw, 54px); display: flex; align-items: center; gap: clamp(28px, 6vw, 72px); color: #fff; background: radial-gradient(circle at 15% 15%, rgba(241,179,73,.2), transparent 30%), linear-gradient(130deg, #101b2b, #253c4e 62%, #46321f); border-radius: 28px; box-shadow: 0 24px 55px rgba(20,31,43,.2); }
.hero-cover { flex: 0 0 auto; border-radius: 8px 20px 20px 8px; box-shadow: 0 24px 38px rgba(0,0,0,.38); }
.hero-copy h1 { max-width: 670px; font: 700 clamp(2.2rem, 5vw, 4.6rem)/1 Georgia, 'Noto Serif SC', serif; letter-spacing: -.04em; }
.title-row { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 14px; }
.hero-copy > p:not(.eyebrow) { margin-top: 12px; color: rgba(255,255,255,.7); }
.eyebrow { color: #f1b957; font-size: .75rem; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
.eyebrow.dark { color: #9d6a13; }
.metadata { margin: 22px 0; display: flex; flex-wrap: wrap; gap: 8px; }
.metadata span { padding: 5px 10px; background: rgba(255,255,255,.09); border: 1px solid rgba(255,255,255,.14); border-radius: 99px; font-size: .76rem; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.edition-management { margin-top: 42px; }
.edition-list { overflow: hidden; border: 1px solid rgba(var(--v-border-color), .13); border-radius: 20px; }
.edition-list :deep(.v-list-item) { min-height: 78px; border-bottom: 1px solid rgba(var(--v-border-color), .08); }
.edition-list :deep(.v-list-item:last-child) { border-bottom: 0; }
.edition-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
.chapter-section { margin-top: 48px; }
.section-heading { margin-bottom: 18px; display: flex; justify-content: space-between; align-items: end; }
.section-heading h2 { font: 700 2rem Georgia, 'Noto Serif SC', serif; }
.section-heading p { margin-top: 5px; color: rgba(var(--v-theme-on-surface), .64); font-size: .78rem; }
.edition-select { max-width: 250px; }
.chapter-list { overflow: hidden; border: 1px solid rgba(var(--v-border-color), .13); border-radius: 20px; }
.chapter-list :deep(.v-list-item) { min-height: 76px; border-bottom: 1px solid rgba(var(--v-border-color), .08); cursor: pointer; }
.chapter-list :deep(.v-list-item:last-child) { border-bottom: 0; }
.chapter-active { background: rgba(217,154,43,.1); }
.chapter-number { margin-right: 18px; color: #ad7418; font: 700 1.25rem Georgia, serif; }
.delete-dialog { border-top: 5px solid rgb(var(--v-theme-error)); }
.generation-dialog { border-top: 5px solid #d99a2b; }
.advanced-entry { position: relative; overflow: hidden; margin-bottom: 22px; padding: 24px; color: #fffaf0; background: radial-gradient(circle at 92% 8%, rgba(241,185,87,.2), transparent 34%), linear-gradient(135deg, #132131, #263b48 58%, #42301f); border-radius: 20px; }
.advanced-kicker { margin-bottom: 6px; color: #f1b957; font-size: .72rem; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; }
.advanced-entry h3 { font: 700 clamp(1.55rem, 3vw, 2.2rem)/1.1 Georgia, 'Noto Serif SC', serif; }
.advanced-description { max-width: 680px; margin-top: 10px; color: rgba(255,255,255,.7); }
.advanced-steps { margin-top: 22px; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; list-style: none; }
.advanced-step { min-height: 118px; padding: 14px; display: grid; align-content: space-between; gap: 10px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); border-radius: 14px; }
.advanced-step.current { background: rgba(241,185,87,.11); border-color: rgba(241,185,87,.72); }
.step-topline { display: flex; align-items: center; justify-content: space-between; }
.step-number { color: #f1b957; font: 700 .72rem ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .08em; }
.step-state { padding: 3px 7px; color: #171f27; background: #f1b957; border-radius: 99px; font-size: .66rem; font-weight: 800; }
.advanced-step > .v-icon { color: rgba(255,255,255,.66); }
.advanced-step strong { font-size: .88rem; line-height: 1.45; }
.advanced-settings-label { margin: 0 0 10px 2px; color: rgb(var(--v-theme-on-surface-variant)); font-size: .76rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
@media (max-width: 700px) {
    .detail-hero { align-items: start; flex-direction: column; }
    .hero-cover { width: 125px !important; }
    .edition-list :deep(.v-list-item__append) { margin-inline-start: 8px; }
    .edition-actions { max-width: 112px; }
    .advanced-entry { padding: 18px; border-radius: 16px; }
    .advanced-entry h3 { font-size: 1.45rem; }
    .advanced-description { margin-top: 8px; font-size: .86rem; }
    .advanced-steps { margin-top: 16px; grid-template-columns: 1fr; gap: 7px; }
    .advanced-step { min-height: 0; padding: 10px 12px; grid-template-columns: 58px 28px 1fr; align-items: center; align-content: center; gap: 8px; }
    .step-topline { justify-content: flex-start; gap: 5px; }
    .step-state { padding: 2px 5px; font-size: .58rem; }
    .advanced-step strong { font-size: .82rem; }
}
</style>
