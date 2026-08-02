<template>
    <div class="audio-detail">
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
        <template v-else-if="detail?.book && detail?.audio">
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
                        <span>{{ t('audiobook.chapterCount', { count: detail.audio.chapter_count }) }}</span>
                        <span>{{ formatDuration(detail.audio.duration_ms) }}</span>
                        <span>{{ engineLabel(detail.audio.engine) }}</span>
                    </div>
                    <div class="hero-actions">
                        <v-btn
                            v-if="detail.audio.chapters?.length"
                            color="amber-darken-2"
                            variant="flat"
                            prepend-icon="mdi-play"
                            data-testid="play-audiobook"
                            @click="playChapter(detail.audio.chapters[0])"
                        >
                            {{ resumeLabel }}
                        </v-btn>
                        <v-btn
                            variant="outlined"
                            :to="`/book/${detail.book.id}/audios`"
                            prepend-icon="mdi-cog-outline"
                        >
                            {{ t('audiobook.edition') }}
                        </v-btn>
                    </div>
                </div>
            </section>

            <section class="chapter-section">
                <div class="section-heading">
                    <div>
                        <p class="eyebrow dark">
                            {{ t('audiobook.contentsEyebrow') }}
                        </p>
                        <h2>{{ t('audiobook.chapterList') }}</h2>
                    </div>
                </div>
                <v-list
                    class="chapter-list"
                    lines="two"
                >
                    <v-list-item
                        v-for="item in detail.audio.chapters"
                        :key="item.id"
                        :class="{ 'chapter-active': player.chapter?.id === item.id }"
                        @click="playChapter(item)"
                    >
                        <template #prepend>
                            <span class="chapter-number">{{ String(item.number).padStart(2, '0') }}</span>
                        </template>
                        <v-list-item-title>{{ item.title }}</v-list-item-title>
                        <v-list-item-subtitle>{{ formatDuration(item.duration_ms) }}</v-list-item-subtitle>
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
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';
import { useAudiobookStore } from '@/stores/audiobook';

const route = useRoute();
const store = useMainStore();
const player = useAudiobookStore();
const { $backend } = useNuxtApp();
const { t } = useI18n();
const audioId = Number(route.params.aid);
store.setNavbar(true);

const { data: detail, pending, error } = await useAsyncData(`audio-detail-${audioId}`, async () => {
    const audioResponse = await $backend(`/audio/${audioId}`);
    if (audioResponse.err !== 'ok') throw new Error(audioResponse.msg || t('audiobook.loadFailed'));
    const bookResponse = await $backend(`/book/${audioResponse.manifest.book_id}`);
    if (bookResponse.err !== 'ok') throw new Error(bookResponse.msg || t('audiobook.loadFailed'));
    return { book: bookResponse.book, audio: audioResponse.manifest, progress: audioResponse.progress };
});

const resumeLabel = computed(() => player.edition?.id === audioId
    ? t('audiobook.continueListening')
    : t('audiobook.startListening'));

async function playChapter(chapter: any) {
    if (!detail.value?.book || !detail.value?.audio) return;
    await player.open(
        { id: detail.value.book.id, title: detail.value.book.title, img: detail.value.book.img },
        detail.value.audio,
        chapter.number,
        detail.value.progress?.position_ms || 0,
    );
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
.audio-detail { max-width: 1120px; margin: 0 auto; padding: 14px 0 120px; }
.detail-hero { min-height: 330px; padding: clamp(24px, 5vw, 54px); display: flex; align-items: center; gap: clamp(28px, 6vw, 72px); color: #fff; background: radial-gradient(circle at 15% 15%, rgba(241,179,73,.2), transparent 30%), linear-gradient(130deg, #101b2b, #253c4e 62%, #46321f); border-radius: 28px; box-shadow: 0 24px 55px rgba(20,31,43,.2); }
.hero-cover { flex: 0 0 auto; border-radius: 8px 20px 20px 8px; box-shadow: 0 24px 38px rgba(0,0,0,.38); }
.hero-copy h1 { max-width: 670px; font: 700 clamp(2.2rem, 5vw, 4.6rem)/1 Georgia, 'Noto Serif SC', serif; letter-spacing: -.04em; }
.hero-copy > p:not(.eyebrow) { margin-top: 12px; color: rgba(255,255,255,.7); }
.title-row, .hero-actions, .metadata { display: flex; flex-wrap: wrap; gap: 10px; }
.title-row { align-items: flex-start; gap: 14px; }
.metadata { margin: 22px 0; gap: 8px; }
.metadata span { padding: 5px 10px; background: rgba(255,255,255,.09); border: 1px solid rgba(255,255,255,.14); border-radius: 99px; font-size: .76rem; }
.eyebrow { color: #f1b957; font-size: .75rem; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
.eyebrow.dark { color: #9d6a13; }
.chapter-section { margin-top: 48px; }
.section-heading { margin-bottom: 18px; }
.section-heading h2 { font: 700 2rem Georgia, 'Noto Serif SC', serif; }
.chapter-list { overflow: hidden; border: 1px solid rgba(var(--v-border-color), .13); border-radius: 20px; }
.chapter-list :deep(.v-list-item) { min-height: 76px; border-bottom: 1px solid rgba(var(--v-border-color), .08); cursor: pointer; }
.chapter-list :deep(.v-list-item:last-child) { border-bottom: 0; }
.chapter-active { background: rgba(217,154,43,.1); }
.chapter-number { margin-right: 18px; color: #ad7418; font: 700 1.25rem Georgia, serif; }
@media (max-width: 700px) {
    .detail-hero { align-items: start; flex-direction: column; }
    .hero-cover { width: 125px !important; }
}
</style>
