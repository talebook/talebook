<template>
    <div class="audiobook-library">
        <section class="library-hero">
            <div>
                <p class="eyebrow">
                    {{ t('audiobook.privateLibrary') }}
                </p>
                <div class="title-row">
                    <h1>{{ t('audiobook.libraryTitle') }}</h1>
                    <v-chip
                        color="amber-lighten-2"
                        variant="outlined"
                        size="small"
                        data-testid="audiobook-beta"
                    >
                        {{ t('audiobook.beta') }}
                    </v-chip>
                </div>
                <p class="hero-copy">
                    {{ t('audiobook.libraryDescription') }}
                </p>
            </div>
            <div class="hero-actions">
                <v-btn
                    color="amber-lighten-2"
                    variant="flat"
                    prepend-icon="mdi-rss"
                    @click="openPodcast"
                >
                    {{ t('audiobook.privatePodcast') }}
                </v-btn>
                <v-btn
                    v-if="store.user.is_admin"
                    variant="outlined"
                    prepend-icon="mdi-progress-wrench"
                    to="/audio-jobs"
                >
                    {{ t('audiobook.jobs') }}
                </v-btn>
            </div>
        </section>

        <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            class="mb-5"
        >
            {{ error.message }}
        </v-alert>
        <div
            v-if="pending"
            class="d-flex justify-center py-16"
        >
            <v-progress-circular
                indeterminate
                color="amber-darken-2"
            />
        </div>
        <template v-else>
            <section
                v-if="home?.continue_listening?.length"
                class="mb-10"
            >
                <div class="section-heading">
                    <div>
                        <p class="eyebrow dark">
                            {{ t('audiobook.resumeEyebrow') }}
                        </p>
                        <h2>{{ t('audiobook.continueListening') }}</h2>
                    </div>
                </div>
                <div class="continue-grid">
                    <NuxtLink
                        v-for="item in home.continue_listening"
                        :key="item.edition.id"
                        class="continue-card"
                        :to="`/audio/${item.edition.id}`"
                    >
                        <v-img
                            :src="item.img"
                            width="80"
                            height="112"
                            cover
                            class="continue-cover"
                        />
                        <div>
                            <strong>{{ item.title }}</strong>
                            <span>{{ t('audiobook.listenedFor', { percent: progressOf(item) }) }}</span>
                            <v-progress-linear
                                :model-value="progressOf(item)"
                                color="amber-darken-2"
                                rounded
                            />
                        </div>
                    </NuxtLink>
                </div>
            </section>

            <section>
                <div class="section-heading">
                    <div>
                        <p class="eyebrow dark">
                            {{ t('audiobook.collectionEyebrow') }}
                        </p>
                        <h2>{{ t('audiobook.allAudiobooks') }}</h2>
                    </div>
                    <v-text-field
                        v-model="keyword"
                        :label="t('audiobook.searchLibrary')"
                        prepend-inner-icon="mdi-magnify"
                        variant="outlined"
                        density="compact"
                        hide-details
                        clearable
                        class="library-search"
                    />
                </div>
                <div
                    v-if="filteredBooks.length"
                    class="book-grid"
                >
                    <NuxtLink
                        v-for="item in filteredBooks"
                        :key="item.edition.id"
                        class="book-card"
                        :to="`/audio/${item.edition.id}`"
                    >
                        <div class="cover-wrap">
                            <v-img
                                :src="item.img"
                                aspect-ratio="0.72"
                                cover
                                class="book-cover"
                            />
                            <span class="chapter-count">{{ t('audiobook.chapterCount', { count: item.edition.chapter_count }) }}</span>
                        </div>
                        <div class="book-copy">
                            <h3>{{ item.title }}</h3>
                            <p>{{ (item.authors || []).join(' / ') }}</p>
                            <span>{{ formatDuration(item.edition.duration_ms) }}</span>
                        </div>
                    </NuxtLink>
                </div>
                <v-empty-state
                    v-else
                    icon="mdi-book-music-outline"
                    :title="t('audiobook.emptyTitle')"
                    :text="t('audiobook.emptyDescription')"
                />
            </section>
        </template>

        <v-dialog
            v-model="podcastDialog"
            max-width="680"
        >
            <v-card class="podcast-dialog">
                <v-card-title>{{ t('audiobook.privatePodcast') }}</v-card-title>
                <v-card-text>
                    <p class="mb-4">
                        {{ t('audiobook.podcastDescription') }}
                    </p>
                    <v-alert
                        type="warning"
                        variant="tonal"
                        density="compact"
                        class="mb-4"
                    >
                        {{ t('audiobook.podcastSecretWarning') }}
                    </v-alert>
                    <v-text-field
                        v-if="feedUrl"
                        :model-value="feedUrl"
                        readonly
                        :label="t('audiobook.feedUrl')"
                        append-inner-icon="mdi-content-copy"
                        @click:append-inner="copyFeed"
                    />
                    <p
                        v-else-if="podcast?.active"
                        class="text-medium-emphasis"
                    >
                        {{ t('audiobook.podcastActiveHint', { hint: podcast.token_hint }) }}
                    </p>
                </v-card-text>
                <v-card-actions>
                    <v-btn
                        v-if="podcast?.active"
                        color="error"
                        variant="text"
                        @click="revokePodcast"
                    >
                        {{ t('audiobook.revokePodcast') }}
                    </v-btn>
                    <v-spacer />
                    <v-btn
                        variant="text"
                        @click="podcastDialog = false"
                    >
                        {{ t('common.close') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        variant="flat"
                        @click="createPodcast"
                    >
                        {{ podcast?.active ? t('audiobook.resetPodcast') : t('audiobook.createPodcast') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';

const { t } = useI18n();
const { $backend, $alert } = useNuxtApp();
const store = useMainStore();
const keyword = ref('');
const podcastDialog = ref(false);
const podcast = ref<{ active: boolean; token_hint: string } | null>(null);
const feedUrl = ref('');
store.setNavbar(true);

const { data: home, pending, error } = await useAsyncData('audiobook-home', async () => {
    const response = await $backend('/audios/home');
    if (response.err !== 'ok') throw new Error(response.msg || t('audiobook.loadFailed'));
    return response;
}, { default: () => ({ continue_listening: [], recent: [], completed: [] }) });

const filteredBooks = computed(() => {
    const query = keyword.value.trim().toLowerCase();
    if (!query) return home.value?.recent || [];
    return (home.value?.recent || []).filter((item: any) => {
        const authors = (item.authors || []).join(' ');
        return `${item.title} ${authors}`.toLowerCase().includes(query);
    });
});

function progressOf(item: any) {
    const duration = item.edition.duration_ms || 1;
    return Math.min(100, Math.round((item.listening_progress?.position_ms || 0) / duration * 100));
}

function formatDuration(ms: number) {
    const minutes = Math.round((ms || 0) / 60000);
    if (minutes < 60) return t('audiobook.minutes', { count: minutes });
    return t('audiobook.hoursMinutes', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
}

async function openPodcast() {
    podcastDialog.value = true;
    feedUrl.value = '';
    const response = await $backend('/me/podcast-subscription');
    podcast.value = response.subscription;
}

async function createPodcast() {
    const response = await $backend('/me/podcast-subscription', { method: 'POST', body: '{}' });
    if (response.err === 'ok') {
        feedUrl.value = response.feed_url;
        podcast.value = { active: true, token_hint: response.token_hint };
    }
}

async function revokePodcast() {
    const response = await $backend('/me/podcast-subscription', { method: 'DELETE' });
    if (response.err === 'ok') {
        podcast.value = null;
        feedUrl.value = '';
    }
}

async function copyFeed() {
    if (!feedUrl.value || !import.meta.client) return;
    await navigator.clipboard.writeText(feedUrl.value);
    $alert('success', t('audiobook.copied'));
}

useHead({ title: () => t('audiobook.libraryTitle') });
</script>

<style scoped>
.audiobook-library { max-width: 1320px; margin: 0 auto; padding-bottom: 110px; }
.library-hero { position: relative; overflow: hidden; min-height: 250px; margin: -16px -16px 34px; padding: 48px clamp(24px, 6vw, 80px); display: flex; align-items: end; justify-content: space-between; gap: 32px; color: #fffaf0; background: radial-gradient(circle at 80% 20%, rgba(245, 183, 73, .24), transparent 32%), linear-gradient(125deg, #111d2c 0%, #1b3144 58%, #39291d 100%); border-radius: 0 0 34px 34px; }
.library-hero::after { content: '◖'; position: absolute; right: 5%; top: -70px; color: rgba(255,255,255,.04); font: 340px Georgia, serif; transform: rotate(-12deg); }
.library-hero h1 { max-width: 760px; font: 700 clamp(2.2rem, 5vw, 4.7rem)/.98 Georgia, 'Noto Serif SC', serif; letter-spacing: -.04em; }
.title-row { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 14px; }
.eyebrow { margin-bottom: 9px; color: #f4bd5d; font-size: .75rem; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
.eyebrow.dark { color: #9d6a13; }
.hero-copy { max-width: 650px; margin-top: 18px; color: rgba(255,255,255,.72); }
.hero-actions { z-index: 1; display: flex; flex-wrap: wrap; gap: 10px; }
.section-heading { margin-bottom: 20px; display: flex; align-items: end; justify-content: space-between; gap: 20px; }
.section-heading h2 { font: 700 clamp(1.55rem, 3vw, 2.45rem) Georgia, 'Noto Serif SC', serif; }
.library-search { max-width: 310px; }
.book-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(176px, 1fr)); gap: clamp(18px, 2.4vw, 30px); }
.book-card { color: inherit; text-decoration: none; transition: transform .25s ease; }
.book-card:hover { transform: translateY(-6px); }
.cover-wrap { position: relative; }
.book-cover { border-radius: 8px 18px 18px 8px; box-shadow: 0 16px 28px rgba(22, 31, 42, .17); }
.cover-wrap::after { content: ''; position: absolute; top: 3%; bottom: 3%; left: 7px; width: 1px; background: rgba(255,255,255,.38); }
.chapter-count { position: absolute; right: 8px; bottom: 8px; padding: 4px 8px; color: #fff; background: rgba(16,29,44,.82); border-radius: 99px; font-size: .7rem; backdrop-filter: blur(8px); }
.book-copy { padding: 14px 4px; }
.book-copy h3 { overflow: hidden; font: 700 1.02rem/1.35 Georgia, 'Noto Serif SC', serif; text-overflow: ellipsis; white-space: nowrap; }
.book-copy p, .book-copy span { color: rgb(var(--v-theme-on-surface-variant)); font-size: .78rem; }
.continue-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 14px; }
.continue-card { display: flex; gap: 16px; padding: 14px; color: inherit; background: rgba(var(--v-theme-surface-variant), .34); border: 1px solid rgba(var(--v-border-color), .13); border-radius: 18px; text-decoration: none; }
.continue-cover { border-radius: 8px; }
.continue-card div { flex: 1; display: grid; align-content: center; gap: 7px; }
.continue-card span { color: rgb(var(--v-theme-on-surface-variant)); font-size: .78rem; }
.podcast-dialog { border-top: 5px solid #d99a2b; }
@media (max-width: 700px) {
    .library-hero { align-items: start; flex-direction: column; }
    .section-heading { align-items: stretch; flex-direction: column; }
    .library-search { max-width: none; }
}
</style>
