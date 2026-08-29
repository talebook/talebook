<template>
    <div class="audiobook-create">
        <header class="create-header">
            <div>
                <v-btn
                    variant="text"
                    prepend-icon="mdi-arrow-left"
                    to="/audios"
                    class="mb-3"
                >
                    {{ t('audiobook.backToLibrary') }}
                </v-btn>
                <p class="eyebrow">
                    {{ t('audiobook.createWizardEyebrow') }}
                </p>
                <h1>{{ t('audiobook.createAudiobook') }}</h1>
                <p>{{ t('audiobook.createWizardDescription') }}</p>
            </div>
        </header>

        <v-alert
            v-if="loadError"
            type="error"
            variant="tonal"
            class="mb-5"
        >
            {{ loadError }}
        </v-alert>

        <div class="wizard-grid">
            <section class="book-picker">
                <div class="panel-heading">
                    <div>
                        <p class="eyebrow dark">
                            {{ t('audiobook.pickBookEyebrow') }}
                        </p>
                        <h2>{{ t('audiobook.pickBook') }}</h2>
                    </div>
                    <v-chip
                        size="small"
                        variant="tonal"
                    >
                        {{ t('audiobook.bookCount', { count: filteredBooks.length }) }}
                    </v-chip>
                </div>
                <v-text-field
                    v-model="keyword"
                    :label="t('audiobook.searchBooks')"
                    prepend-inner-icon="mdi-magnify"
                    variant="outlined"
                    density="compact"
                    clearable
                    hide-details
                    class="mb-4"
                />
                <div
                    v-if="loadingBooks"
                    class="loading-panel"
                >
                    <v-progress-circular
                        indeterminate
                        color="amber-darken-2"
                    />
                </div>
                <div
                    v-else-if="filteredBooks.length"
                    class="book-list"
                    data-testid="create-wizard-book-list"
                >
                    <button
                        v-for="book in filteredBooks"
                        :key="book.id"
                        type="button"
                        class="book-row"
                        :class="{ selected: Number(book.id) === selectedBookId }"
                        :data-testid="`select-audiobook-book-${book.id}`"
                        @click="selectBook(book)"
                    >
                        <img
                            :src="book.thumb || book.img"
                            :alt="book.title"
                        >
                        <span class="book-main">
                            <strong>{{ book.title }}</strong>
                            <small>{{ authorLabel(book) }}</small>
                            <small>{{ bookFormatLabel(book) }}</small>
                        </span>
                        <v-chip
                            size="x-small"
                            :color="bookStatus(book).color"
                            variant="tonal"
                            :data-testid="`wizard-book-status-${book.id}`"
                        >
                            {{ bookStatus(book).label }}
                        </v-chip>
                    </button>
                </div>
                <v-empty-state
                    v-else
                    icon="mdi-bookshelf"
                    :title="t('audiobook.noSelectableBooks')"
                    :text="t('audiobook.noSelectableBooksDescription')"
                />
            </section>

            <section
                class="create-panel"
                data-testid="selected-book-panel"
            >
                <div
                    v-if="!selectedBook"
                    class="empty-selection"
                >
                    <v-icon icon="mdi-book-search-outline" />
                    <h2>{{ t('audiobook.pickBookFirst') }}</h2>
                    <p>{{ t('audiobook.pickBookFirstDescription') }}</p>
                </div>
                <template v-else>
                    <div class="selected-book">
                        <v-img
                            :src="selectedBook.img"
                            width="92"
                            aspect-ratio="0.72"
                            cover
                            class="selected-cover"
                        />
                        <div>
                            <p class="eyebrow dark">
                                {{ t('audiobook.selectedBook') }}
                            </p>
                            <h2>{{ selectedBook.title }}</h2>
                            <p>{{ authorLabel(selectedBook) }}</p>
                            <div class="selected-meta">
                                <v-chip
                                    size="small"
                                    variant="tonal"
                                >
                                    {{ bookFormatLabel(selectedBook) }}
                                </v-chip>
                                <v-chip
                                    size="small"
                                    :color="selectedStatus.color"
                                    variant="tonal"
                                >
                                    {{ selectedStatus.label }}
                                </v-chip>
                            </div>
                        </div>
                    </div>

                    <v-alert
                        v-if="selectedActiveJob"
                        type="info"
                        variant="tonal"
                        class="mt-5"
                        data-testid="create-wizard-active-job"
                    >
                        {{ t('audiobook.bookHasActiveJob') }}
                    </v-alert>
                    <v-alert
                        v-else-if="selectedHasPublished"
                        type="info"
                        variant="tonal"
                        class="mt-5"
                    >
                        {{ t('audiobook.bookHasPublishedEdition') }}
                    </v-alert>
                    <v-alert
                        v-else-if="formatNotSupported"
                        type="warning"
                        variant="tonal"
                        class="mt-5"
                        data-testid="create-wizard-unsupported-format"
                    >
                        {{ t('audiobook.unsupportedFormatDescription') }}
                    </v-alert>
                    <v-alert
                        v-else-if="generationReason"
                        type="warning"
                        variant="tonal"
                        class="mt-5"
                    >
                        {{ generationReason }}
                    </v-alert>

                    <section
                        class="settings-panel"
                        :aria-disabled="!canSubmit"
                    >
                        <div class="panel-heading compact">
                            <div>
                                <p class="eyebrow dark">
                                    {{ t('audiobook.settingsEyebrow') }}
                                </p>
                                <h2>{{ t('audiobook.generationSettings') }}</h2>
                            </div>
                        </div>
                        <v-btn-toggle
                            v-model="generation.mode"
                            mandatory
                            color="primary"
                            class="mb-5"
                            divided
                            :disabled="!canConfigure"
                        >
                            <v-btn value="quick">
                                {{ t('audiobook.quickMode') }}
                            </v-btn>
                            <v-btn value="advanced">
                                {{ t('audiobook.advancedMode') }}
                            </v-btn>
                        </v-btn-toggle>
                        <v-alert
                            type="info"
                            variant="tonal"
                            density="compact"
                            class="mb-5"
                        >
                            {{ generation.mode === 'advanced' ? t('audiobook.advancedModeHint') : t('audiobook.quickModeHint') }}
                        </v-alert>
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
                                    :disabled="!canConfigure"
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
                                    :disabled="!canConfigure"
                                />
                            </v-col>
                            <v-col cols="12">
                                <v-text-field
                                    v-model="generation.chapters"
                                    :label="t('audiobook.chapterSelection')"
                                    :hint="t('audiobook.chapterSelectionHint')"
                                    persistent-hint
                                    variant="outlined"
                                    :disabled="!canConfigure"
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
                                    variant="outlined"
                                    :disabled="!canConfigure"
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
                                    variant="outlined"
                                    :disabled="!canConfigure"
                                />
                            </v-col>
                        </v-row>
                    </section>

                    <div class="wizard-actions">
                        <v-btn
                            v-if="selectedActiveJob"
                            color="primary"
                            variant="flat"
                            prepend-icon="mdi-progress-wrench"
                            :to="`/audio-job/${selectedActiveJob.id}`"
                            data-testid="view-active-job-from-wizard"
                        >
                            {{ selectedActiveJob.status === 'awaiting_review' ? t('audiobook.continueScriptReview') : t('audiobook.viewProductionProgress') }}
                        </v-btn>
                        <v-btn
                            v-else-if="formatNotSupported"
                            color="primary"
                            variant="flat"
                            prepend-icon="mdi-swap-horizontal"
                            :to="`/book/${selectedBook.id}?convert=epub`"
                            data-testid="convert-selected-book"
                        >
                            {{ t('audiobook.convertToEpubThenCreate') }}
                        </v-btn>
                        <v-btn
                            v-else
                            color="primary"
                            variant="flat"
                            prepend-icon="mdi-progress-wrench"
                            :loading="submitting"
                            :disabled="!canSubmit"
                            data-testid="submit-create-wizard"
                            @click="submitGeneration"
                        >
                            {{ generation.mode === 'advanced' ? t('audiobook.startInspection') : t('audiobook.startGeneration') }}
                        </v-btn>
                        <v-btn
                            variant="text"
                            :to="selectedBook ? `/book/${selectedBook.id}/audios` : '/audios'"
                        >
                            {{ t('audiobook.openBookAudioPage') }}
                        </v-btn>
                    </div>
                </template>
            </section>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useMainStore();
const { $backend, $backend_stream, $alert } = useNuxtApp();
store.setNavbar(true);

const keyword = ref('');
const books = ref<any[]>([]);
const detailsByBookId = reactive<Record<number, any>>({});
const selectedBookId = ref<number | null>(Number(route.query.book) || null);
const loadingBooks = ref(false);
const loadingDetail = ref(false);
const loadError = ref('');
const submitting = ref(false);
const voices = ref<any[]>([]);
const activeJobStatuses = ['queued', 'inspecting', 'awaiting_review', 'generating', 'finalizing'];
const speeds = ['x0.75', 'x0.9', 'x1.0', 'x1.1', 'x1.25', 'x1.5'];
const generation = reactive({
    mode: 'quick',
    engine: 'edgetts',
    speed: 'x1.0',
    quality: 'standard',
    chapters: '',
    protagonist_voices: { male: '', female: '' },
});
const engines = computed(() => [
    { title: t('audiobook.edgeTts'), value: 'edgetts' },
    { title: t('audiobook.qwenTts'), value: 'qwen3tts' },
]);

const { data: jobData, refresh: refreshJobs } = await useAsyncData('audiobook-create-jobs', async () => {
    if (!store.user.is_login) await store.loadUserInfo();
    if (!store.user.is_login) return { jobs: [] };
    const response = await $backend('/audio-jobs');
    if (response.err !== 'ok') return { jobs: [] };
    return response;
}, { default: () => ({ jobs: [] }) });

const selectedBook = computed(() => {
    const candidate = books.value.find(book => Number(book.id) === selectedBookId.value)
        || detailsByBookId[selectedBookId.value || 0]?.book
        || null;
    return isAudiobookSourceBook(candidate) ? candidate : null;
});
const selectedDetail = computed(() => (selectedBookId.value ? detailsByBookId[selectedBookId.value] : null));
const selectedActiveJob = computed(() => activeJobForBook(selectedBookId.value));
const selectedHasPublished = computed(() => (selectedDetail.value?.editions || []).some((item: any) => item.status === 'published'));
const selectedGeneration = computed(() => selectedDetail.value?.generation || null);
const formatNotSupported = computed(() => (
    selectedGeneration.value?.reason === 'format.not_supported'
    || selectedGeneration.value?.compatible === false
    || (selectedBook.value && !isCompatibleBook(selectedBook.value))
));
const canConfigure = computed(() => Boolean(selectedBook.value && !selectedActiveJob.value && !formatNotSupported.value));
const canSubmit = computed(() => Boolean(canConfigure.value && selectedGeneration.value?.can_generate));
const generationReason = computed(() => {
    const reason = selectedGeneration.value?.reason;
    if (!reason || reason === 'format.not_supported') return '';
    if (reason === 'disabled') return t('audiobook.audiobookDisabled');
    if (reason === 'login.required') return t('audiobook.loginRequiredForGeneration');
    if (reason === 'permission') return t('audiobook.permissionDeniedForGeneration');
    if (reason === 'disk.low') return t('audiobook.capacityUnavailable');
    if (selectedGeneration.value?.health && !selectedGeneration.value.health.ok) return t('audiobook.voicebookUnavailable');
    return t('audiobook.createUnavailable');
});
const selectedStatus = computed(() => selectedBook.value ? bookStatus(selectedBook.value) : { label: '', color: 'default' });
const filteredBooks = computed(() => {
    const candidates = books.value.filter(isAudiobookSourceBook);
    const query = keyword.value.trim().toLowerCase();
    if (!query) return candidates;
    return candidates.filter((book) => {
        const authors = authorLabel(book);
        return `${book.title} ${authors}`.toLowerCase().includes(query);
    });
});
const voiceItems = computed(() => voices.value
    .filter(item => item.engine === generation.engine)
    .map(item => ({ title: item.name || item.voice_id, value: item.voice_id })));

watch(() => route.query.book, (value) => {
    const nextId = Number(value);
    if (!nextId || selectedBookId.value === nextId) return;
    selectedBookId.value = nextId;
    void loadBookDetail(nextId);
});

watch(selectedBookId, (bookId) => {
    if (bookId) void loadBookDetail(bookId);
}, { immediate: true });

watch(() => store.user.is_login, (loggedIn) => {
    if (loggedIn) void refreshJobs();
}, { immediate: true });

onMounted(async () => {
    await Promise.all([fetchBooks(), loadVoices()]);
});

async function fetchBooks() {
    loadingBooks.value = true;
    loadError.value = '';
    books.value = [];
    try {
        let firstLine = true;
        for await (const data of $backend_stream('/library?stream=1&size=80')) {
            if (firstLine) {
                firstLine = false;
                if (data.err && data.err !== 'ok') {
                    loadError.value = data.msg || t('audiobook.loadFailed');
                    return;
                }
            } else if (isAudiobookSourceBook(data)) {
                books.value.push(data);
            }
        }
        const routeBookId = Number(route.query.book) || selectedBookId.value;
        if (routeBookId && books.value.some(book => Number(book.id) === Number(routeBookId))) {
            selectedBookId.value = Number(routeBookId);
            await loadBookDetail(Number(routeBookId));
        } else if (!selectedBookId.value && books.value.length) {
            selectBook(books.value[0], false);
        }
    } catch (error) {
        loadError.value = error instanceof Error && error.message ? error.message : t('audiobook.loadFailed');
    } finally {
        loadingBooks.value = false;
    }
}

async function loadVoices() {
    const response = await $backend('/audio-voices');
    if (response.err === 'ok') voices.value = response.catalog?.voices || [];
}

async function loadBookDetail(bookId: number) {
    if (detailsByBookId[bookId] || loadingDetail.value) return;
    loadingDetail.value = true;
    try {
        const response = await $backend(`/book/${bookId}/audios`);
        if (response.err === 'ok') {
            detailsByBookId[bookId] = response;
        } else {
            $alert('error', response.msg || t('audiobook.loadFailed'));
        }
    } finally {
        loadingDetail.value = false;
    }
}

function selectBook(book: any, updateRoute = true) {
    selectedBookId.value = Number(book.id);
    void loadBookDetail(Number(book.id));
    if (updateRoute) {
        void router.replace({ query: { ...route.query, book: String(book.id) } });
    }
}

function activeJobForBook(bookId: number | null) {
    if (!bookId) return null;
    return (jobData.value?.jobs || []).find((job: any) => (
        Number(job.book_id) === Number(bookId) && activeJobStatuses.includes(job.status)
    )) || null;
}

function bookStatus(book: any) {
    const activeJob = activeJobForBook(Number(book.id));
    const detail = detailsByBookId[Number(book.id)];
    if (activeJob) return { label: t('audiobook.statusHasActiveJob'), color: 'info' };
    if ((detail?.editions || []).some((item: any) => item.status === 'published')) {
        return { label: t('audiobook.statusHasEdition'), color: 'success' };
    }
    if (detail?.generation?.reason === 'permission') {
        return { label: t('audiobook.statusNoPermission'), color: 'warning' };
    }
    if (!isCompatibleBook(book) || detail?.generation?.reason === 'format.not_supported') {
        return { label: t('audiobook.statusNeedsConversion'), color: 'warning' };
    }
    if (detail?.generation?.can_generate) return { label: t('audiobook.statusReadyToCreate'), color: 'success' };
    if (detail?.generation?.reason) return { label: t('audiobook.statusUnavailable'), color: 'warning' };
    return { label: t('audiobook.statusReadyToCreate'), color: 'success' };
}

function bookFormats(book: any) {
    const values = book.available_formats?.length
        ? book.available_formats
        : (book.files || []).map((item: any) => item.format);
    return [...new Set((values || []).map((item: any) => String(item).toUpperCase()))];
}

function isAudiobookSourceBook(book: any) {
    return Boolean(book && book.media_type !== 'comic');
}

function isCompatibleBook(book: any) {
    return isAudiobookSourceBook(book) && bookFormats(book).some(format => ['EPUB', 'TXT'].includes(format));
}

function bookFormatLabel(book: any) {
    const formats = bookFormats(book);
    return formats.length ? formats.join(' / ') : t('audiobook.unknownFormat');
}

function authorLabel(book: any) {
    return (book.authors || [book.author]).filter(Boolean).join(' / ') || t('audiobook.unknownAuthor');
}

async function submitGeneration() {
    if (!selectedBook.value || !canSubmit.value) return;
    submitting.value = true;
    try {
        const response = await $backend(`/book/${selectedBook.value.id}/audio-jobs`, {
            method: 'POST',
            body: JSON.stringify(generation),
        });
        if (response.err === 'ok') {
            $alert('success', response.deduplicated ? t('audiobook.jobAlreadyQueued') : t('audiobook.jobCreated'));
            await refreshJobs();
            await router.push(`/audio-job/${response.job.id}`);
        } else if (response.err === 'format.not_supported') {
            $alert('error', t('audiobook.unsupportedFormatDescription'));
        } else {
            $alert('error', response.msg || t('audiobook.createJobFailed'));
        }
    } catch (error) {
        const message = error instanceof Error && error.message ? error.message : t('audiobook.createJobFailed');
        $alert('error', message);
    } finally {
        submitting.value = false;
    }
}

useHead({ title: () => t('audiobook.createAudiobook') });
</script>

<style scoped>
.audiobook-create { max-width: 1240px; margin: 0 auto; padding: 8px 0 120px; }
.create-header { margin-bottom: 24px; padding: 26px 0 6px; }
.create-header h1 { max-width: 760px; font: 700 clamp(2rem, 4vw, 3.6rem)/1.05 Georgia, 'Noto Serif SC', serif; }
.create-header p:not(.eyebrow) { max-width: 720px; margin-top: 12px; color: rgba(var(--v-theme-on-surface), .66); }
.eyebrow { color: #9d6a13; font-size: .75rem; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
.eyebrow.dark { color: #8a621f; }
.wizard-grid { display: grid; grid-template-columns: minmax(320px, 420px) minmax(0, 1fr); gap: 22px; align-items: start; }
.book-picker, .create-panel { padding: 20px; background: rgb(var(--v-theme-surface)); border: 1px solid rgba(var(--v-border-color), .14); border-radius: 8px; }
.book-picker { position: sticky; top: 76px; }
.panel-heading { margin-bottom: 14px; display: flex; align-items: end; justify-content: space-between; gap: 14px; }
.panel-heading.compact { margin: 0 0 16px; }
.panel-heading h2, .selected-book h2, .empty-selection h2 { font: 700 1.45rem/1.2 Georgia, 'Noto Serif SC', serif; }
.loading-panel { min-height: 260px; display: grid; place-items: center; }
.book-list { max-height: min(680px, calc(100vh - 290px)); overflow: auto; display: grid; gap: 8px; }
.book-row { width: 100%; min-width: 0; padding: 10px; display: grid; grid-template-columns: 48px minmax(0, 1fr) auto; gap: 12px; align-items: center; color: inherit; text-align: left; border: 1px solid rgba(var(--v-border-color), .1); border-radius: 8px; background: rgba(var(--v-theme-surface), .72); }
.book-row:hover, .book-row.selected { border-color: rgba(157, 106, 19, .42); background: rgba(217, 154, 43, .08); }
.book-row:focus-visible { outline: 3px solid rgba(217,154,43,.4); outline-offset: 2px; }
.book-row img { width: 48px; height: 64px; object-fit: cover; border-radius: 6px; background: rgba(var(--v-theme-on-surface), .07); }
.book-main { min-width: 0; display: grid; gap: 2px; }
.book-main strong { overflow: hidden; font-size: .94rem; text-overflow: ellipsis; white-space: nowrap; }
.book-main small { overflow: hidden; color: rgba(var(--v-theme-on-surface), .62); font-size: .72rem; text-overflow: ellipsis; white-space: nowrap; }
.empty-selection { min-height: 420px; display: grid; place-items: center; align-content: center; gap: 10px; color: rgba(var(--v-theme-on-surface), .66); text-align: center; }
.empty-selection .v-icon { font-size: 3rem; color: #9d6a13; }
.selected-book { display: flex; gap: 18px; align-items: center; }
.selected-cover { flex: 0 0 auto; border-radius: 6px 14px 14px 6px; box-shadow: 0 12px 24px rgba(24, 31, 43, .16); }
.selected-book p:not(.eyebrow) { color: rgba(var(--v-theme-on-surface), .64); }
.selected-meta { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; }
.settings-panel { margin-top: 24px; padding-top: 22px; border-top: 1px solid rgba(var(--v-border-color), .12); }
.settings-panel[aria-disabled="true"] { opacity: .68; }
.wizard-actions { margin-top: 18px; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }
@media (max-width: 900px) {
    .wizard-grid { grid-template-columns: 1fr; }
    .book-picker { position: static; }
    .book-list { max-height: none; }
}
@media (max-width: 560px) {
    .audiobook-create { padding-top: 0; }
    .book-picker, .create-panel { padding: 14px; }
    .book-row { grid-template-columns: 42px minmax(0, 1fr); }
    .book-row .v-chip { grid-column: 2; justify-self: start; }
    .book-row img { width: 42px; height: 56px; }
    .selected-book { align-items: flex-start; flex-direction: column; }
    .wizard-actions { justify-content: stretch; }
    .wizard-actions :deep(.v-btn) { flex: 1 1 100%; }
}
</style>
