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
                            v-if="canGenerate"
                            variant="outlined"
                            prepend-icon="mdi-waveform"
                            data-testid="generate-audiobook"
                            @click="generationDialog = true"
                        >
                            {{ t('audiobook.generate') }}
                        </v-btn>
                        <v-btn
                            v-if="store.user.is_admin"
                            variant="text"
                            to="/audio-jobs"
                            prepend-icon="mdi-progress-wrench"
                        >
                            {{ t('audiobook.jobs') }}
                        </v-btn>
                    </div>
                </div>
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
                :text="canGenerate ? t('audiobook.noEditionAdmin') : t('audiobook.noEditionReader')"
            >
                <template
                    v-if="canGenerate"
                    #actions
                >
                    <v-btn
                        color="primary"
                        @click="generationDialog = true"
                    >
                        {{ t('audiobook.generate') }}
                    </v-btn>
                </template>
            </v-empty-state>
        </template>

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
const submitting = ref(false);
const selectedEditionId = ref<number | null>(null);
const generation = reactive({ mode: 'quick', engine: 'edgetts', speed: 'x1.0', chapters: '' });
const speeds = ['x0.75', 'x0.9', 'x1.0', 'x1.1', 'x1.25', 'x1.5'];
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

const publishedEditions = computed(() => (detail.value?.editions || []).filter((item: any) => item.status === 'published'));
const publishedEdition = computed(() => publishedEditions.value.find((item: any) => item.id === selectedEditionId.value) || publishedEditions.value[0] || null);
const compatible = computed(() => (detail.value?.book?.files || []).some((item: any) => ['epub', 'txt'].includes(String(item.format).toLowerCase())));
const canGenerate = computed(() => store.user.is_admin && compatible.value);
const resumeLabel = computed(() => player.book?.id === bookId ? t('audiobook.continueListening') : t('audiobook.startListening'));

watch(publishedEditions, (items) => {
    if (!selectedEditionId.value && items.length) selectedEditionId.value = items[0].id;
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
    } finally {
        submitting.value = false;
    }
}

function formatDuration(ms: number) {
    const minutes = Math.max(1, Math.round((ms || 0) / 60000));
    if (minutes < 60) return t('audiobook.minutes', { count: minutes });
    return t('audiobook.hoursMinutes', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
}

function engineLabel(engine: string) {
    return engine === 'qwen3tts' ? t('audiobook.qwenTts') : t('audiobook.edgeTts');
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
.chapter-section { margin-top: 48px; }
.section-heading { margin-bottom: 18px; display: flex; justify-content: space-between; align-items: end; }
.section-heading h2 { font: 700 2rem Georgia, 'Noto Serif SC', serif; }
.edition-select { max-width: 250px; }
.chapter-list { overflow: hidden; border: 1px solid rgba(var(--v-border-color), .13); border-radius: 20px; }
.chapter-list :deep(.v-list-item) { min-height: 76px; border-bottom: 1px solid rgba(var(--v-border-color), .08); cursor: pointer; }
.chapter-list :deep(.v-list-item:last-child) { border-bottom: 0; }
.chapter-active { background: rgba(217,154,43,.1); }
.chapter-number { margin-right: 18px; color: #ad7418; font: 700 1.25rem Georgia, serif; }
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
