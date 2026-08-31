<template>
    <v-card class="weread-workbench">
        <v-card-title class="d-flex align-center flex-wrap ga-2 px-4 pt-4">
            <v-btn
                icon="mdi-arrow-left"
                variant="text"
                :aria-label="t('common.back')"
                @click="router.back()"
            />
            <div>
                <h1 class="text-h6">
                    {{ t('weread.title') }}
                </h1>
                <div class="text-body-2 text-medium-emphasis font-weight-regular">
                    {{ t('weread.description') }}
                </div>
            </div>
        </v-card-title>

        <v-card-text>
            <v-alert
                type="info"
                variant="tonal"
                density="compact"
                class="mb-4"
            >
                {{ t('weread.readOnly') }}
            </v-alert>
            <div class="d-flex flex-wrap align-start ga-3 mb-4">
                <v-text-field
                    v-model="apiKey"
                    type="password"
                    autocomplete="off"
                    prepend-inner-icon="mdi-key"
                    :label="t('weread.apiKey')"
                    :hint="connection?.secret?.configured ? t('weread.savedKey', { mask: connection.secret.mask }) : t('weread.apiKeyHint')"
                    persistent-hint
                    variant="outlined"
                    density="compact"
                    class="weread-key"
                />
                <v-btn
                    color="primary"
                    variant="tonal"
                    :loading="busy === 'connect'"
                    @click="connect"
                >
                    {{ t('weread.connect') }}
                </v-btn>
            </div>
            <v-alert
                v-if="error"
                type="error"
                variant="tonal"
                closable
                class="mb-4"
                @click:close="error = ''"
            >
                {{ error }}
            </v-alert>
        </v-card-text>

        <v-tabs
            v-model="activeTab"
            show-arrows
            density="compact"
            class="px-2"
        >
            <v-tab
                v-for="tab in tabs"
                :key="tab.value"
                :value="tab.value"
            >
                {{ tab.label }}
            </v-tab>
        </v-tabs>
        <v-divider />

        <v-window v-model="activeTab">
            <v-window-item value="search">
                <section class="pa-4">
                    <div class="d-flex flex-wrap ga-3 align-start">
                        <v-text-field
                            v-model="keyword"
                            :label="t('weread.searchKeyword')"
                            variant="outlined"
                            density="compact"
                            class="weread-query"
                            @keyup.enter="searchBooks"
                        />
                        <v-select
                            v-model="searchScope"
                            :items="searchScopes"
                            item-title="title"
                            item-value="value"
                            :label="t('weread.searchScope')"
                            variant="outlined"
                            density="compact"
                            class="weread-select"
                        />
                        <v-btn
                            color="primary"
                            :loading="busy === 'search'"
                            @click="searchBooks"
                        >
                            {{ t('weread.search') }}
                        </v-btn>
                    </div>
                    <v-list v-if="searchResults.length">
                        <v-list-item
                            v-for="item in searchResults"
                            :key="item.bookId || item.deepLink || `${item.groupTitle}-${item.title}`"
                            :title="item.title"
                            :subtitle="[item.groupTitle, item.author, rating(item.newRating)].filter(Boolean).join(' · ')"
                        >
                            <template #append>
                                <v-btn
                                    v-if="item.bookId"
                                    size="small"
                                    variant="text"
                                    @click="loadBook(item.bookId)"
                                >
                                    {{ t('weread.details') }}
                                </v-btn>
                                <v-btn
                                    v-if="item.deepLink"
                                    size="small"
                                    variant="text"
                                    :href="item.deepLink"
                                >
                                    {{ t('weread.openInWeread') }}
                                </v-btn>
                            </template>
                        </v-list-item>
                    </v-list>
                    <EmptyState v-else-if="loaded.search" :text="t('weread.noResults')" />
                </section>
            </v-window-item>

            <v-window-item value="shelf">
                <section class="pa-4">
                    <v-btn
                        color="primary"
                        variant="tonal"
                        :loading="busy === 'shelf'"
                        @click="loadShelf"
                    >
                        {{ t('weread.loadShelf') }}
                    </v-btn>
                    <v-alert
                        v-if="shelf"
                        type="success"
                        variant="tonal"
                        density="compact"
                        class="my-4"
                    >
                        <div>{{ t('weread.shelfSummary', shelfSummary) }}</div>
                        <div class="text-caption mt-1">{{ t('weread.shelfPrivacy', shelfPrivacySummary) }}</div>
                    </v-alert>
                    <v-list v-if="shelf?.books?.length">
                        <v-list-item
                            v-for="book in shelf.books.slice(0, 50)"
                            :key="book.bookId"
                            :title="book.title"
                            :subtitle="book.author"
                        >
                            <template #append>
                                <v-chip
                                    v-if="book.finishReading"
                                    size="x-small"
                                    color="success"
                                    variant="tonal"
                                >
                                    {{ t('weread.finished') }}
                                </v-chip>
                            </template>
                        </v-list-item>
                    </v-list>
                    <v-list v-if="shelf?.albums?.length">
                        <v-list-subheader>{{ t('weread.audioShelf') }}</v-list-subheader>
                        <v-list-item
                            v-for="album in shelf.albums"
                            :key="album.albumInfo?.albumId"
                            :title="album.albumInfo?.name"
                            :subtitle="[album.albumInfo?.authorName, album.albumInfo?.finishStatus].filter(Boolean).join(' · ')"
                        />
                    </v-list>
                    <v-list v-if="shelf?.mp">
                        <v-list-item
                            prepend-icon="mdi-text-box-multiple-outline"
                            :title="t('weread.savedArticles')"
                            :subtitle="t('weread.savedArticlesHint')"
                        />
                    </v-list>
                    <EmptyState v-else-if="loaded.shelf && !shelfItems.length" :text="t('weread.emptyShelf')" />
                </section>
            </v-window-item>

            <v-window-item value="statistics">
                <section class="pa-4">
                    <div class="d-flex flex-wrap ga-3 align-start">
                        <v-select
                            v-model="statisticsMode"
                            :items="statisticsModes"
                            item-title="title"
                            item-value="value"
                            :label="t('weread.period')"
                            variant="outlined"
                            density="compact"
                            class="weread-select"
                        />
                        <v-btn
                            color="primary"
                            variant="tonal"
                            :loading="busy === 'statistics'"
                            @click="loadStatistics"
                        >
                            {{ t('weread.loadStatistics') }}
                        </v-btn>
                    </div>
                    <v-row v-if="statistics" class="mt-2">
                        <v-col cols="12" sm="4">
                            <MetricCard :label="t('weread.totalTime')" :value="duration(statistics.totalReadTime)" />
                        </v-col>
                        <v-col cols="12" sm="4">
                            <MetricCard :label="t('weread.readDays')" :value="String(statistics.readDays || 0)" />
                        </v-col>
                        <v-col cols="12" sm="4">
                            <MetricCard :label="t('weread.dailyAverage')" :value="duration(statistics.dayAverageReadTime)" />
                        </v-col>
                    </v-row>
                    <v-list v-if="statistics?.readStat?.length">
                        <v-list-item
                            v-for="item in statistics.readStat"
                            :key="item.stat"
                            :title="item.stat"
                            :subtitle="item.counts"
                        />
                    </v-list>
                </section>
            </v-window-item>

            <v-window-item value="notes">
                <section class="pa-4">
                    <v-card
                        color="primary"
                        variant="tonal"
                        class="mb-4"
                    >
                        <v-card-text class="d-flex flex-wrap ga-4 align-center">
                            <div class="flex-grow-1">
                                <div class="text-subtitle-1 font-weight-bold">
                                    {{ t('weread.importNotesTitle') }}
                                </div>
                                <div class="text-body-2 text-medium-emphasis">
                                    {{ t('weread.importNotesDescription') }}
                                </div>
                            </div>
                            <WeReadImportDialog
                                :backend="$backend"
                                :saved-connection="connection"
                                @imported="loadNotebooks"
                            />
                        </v-card-text>
                    </v-card>
                    <div class="d-flex flex-wrap ga-2 align-center">
                        <v-btn
                            color="primary"
                            variant="tonal"
                            :loading="busy === 'notebooks'"
                            @click="loadNotebooks"
                        >
                            {{ t('weread.loadNotebooks') }}
                        </v-btn>
                    </div>
                    <v-alert
                        v-if="notebooks"
                        type="info"
                        variant="tonal"
                        density="compact"
                        class="my-4"
                    >
                        {{ t('weread.notebookSummary', { books: notebooks.totalBookCount || 0, notes: notebooks.totalNoteCount || 0 }) }}
                    </v-alert>
                    <v-list v-if="notebooks?.books?.length">
                        <v-list-item
                            v-for="item in notebooks.books"
                            :key="item.bookId"
                            :title="item.book?.title"
                            :subtitle="t('weread.noteCounts', { highlights: item.noteCount || 0, reviews: item.reviewCount || 0, bookmarks: item.bookmarkCount || 0 })"
                        >
                            <template #append>
                                <v-btn
                                    size="small"
                                    variant="text"
                                    @click="loadPersonalNotes(item)"
                                >
                                    {{ t('weread.viewNotes') }}
                                </v-btn>
                            </template>
                        </v-list-item>
                    </v-list>
                    <EmptyState v-else-if="loaded.notebooks" :text="t('weread.emptyNotebooks')" />
                </section>
            </v-window-item>

            <v-window-item value="community">
                <section class="pa-4">
                    <div class="d-flex flex-wrap ga-3 align-start">
                        <v-text-field
                            v-model="communityBookId"
                            :label="t('weread.bookId')"
                            variant="outlined"
                            density="compact"
                            class="weread-query"
                        />
                        <v-btn
                            color="primary"
                            variant="tonal"
                            :loading="busy === 'community'"
                            @click="loadCommunity"
                        >
                            {{ t('weread.loadCommunity') }}
                        </v-btn>
                    </div>
                    <h2 v-if="popularHighlights?.items?.length" class="text-subtitle-1 mt-4">
                        {{ t('weread.popularHighlights') }}
                    </h2>
                    <v-list v-if="popularHighlights?.items?.length">
                        <v-list-item
                            v-for="item in popularHighlights.items"
                            :key="item.bookmarkId"
                            :title="item.markText"
                            :subtitle="t('weread.highlightedBy', { count: item.totalCount || 0 })"
                        >
                            <template #append>
                                <v-btn
                                    v-if="item.range && item.chapterUid !== undefined"
                                    size="small"
                                    variant="text"
                                    @click="loadHighlightDiscussion(item)"
                                >
                                    {{ t('weread.viewDiscussion') }}
                                </v-btn>
                            </template>
                        </v-list-item>
                    </v-list>
                    <v-alert v-if="highlightHeat" type="info" variant="tonal" density="compact" class="my-3">
                        {{ t('weread.chapterHeat', { count: highlightHeat.underlines?.length || 0 }) }}
                    </v-alert>
                    <v-list v-if="highlightThoughts.length">
                        <v-list-subheader>{{ t('weread.highlightThoughts') }}</v-list-subheader>
                        <v-list-item
                            v-for="item in highlightThoughts"
                            :key="item.reviewId"
                            :title="item.review?.author?.name || t('weread.reader')"
                            :subtitle="item.review?.content"
                        >
                            <template #append>
                                <v-btn size="small" variant="text" @click="loadReviewDetail(item)">
                                    {{ t('weread.details') }}
                                </v-btn>
                            </template>
                        </v-list-item>
                    </v-list>
                    <h2 v-if="publicReviews?.reviews?.length" class="text-subtitle-1 mt-4">
                        {{ t('weread.publicReviews') }}
                    </h2>
                    <v-list v-if="publicReviews?.reviews?.length">
                        <v-list-item
                            v-for="item in publicReviews.reviews"
                            :key="item.review?.reviewId"
                            :title="item.review?.review?.author?.name || t('weread.reader')"
                            :subtitle="item.review?.review?.content"
                        />
                    </v-list>
                    <EmptyState
                        v-if="loaded.community && !popularHighlights?.items?.length && !publicReviews?.reviews?.length"
                        :text="t('weread.emptyCommunity')"
                    />
                </section>
            </v-window-item>

            <v-window-item value="discover">
                <section class="pa-4">
                    <div class="d-flex flex-wrap ga-2 align-center">
                        <v-btn
                            color="primary"
                            variant="tonal"
                            :loading="busy === 'recommendations'"
                            @click="loadRecommendations"
                        >
                            {{ t('weread.forYou') }}
                        </v-btn>
                        <v-btn
                            variant="outlined"
                            :loading="busy === 'friends'"
                            @click="loadFriends"
                        >
                            {{ t('weread.friendsReading') }}
                        </v-btn>
                        <v-text-field
                            v-model="similarBookId"
                            :label="t('weread.similarBookId')"
                            variant="outlined"
                            density="compact"
                            hide-details
                            class="weread-query"
                        />
                        <v-btn
                            variant="outlined"
                            :loading="busy === 'similar'"
                            @click="loadSimilar"
                        >
                            {{ t('weread.similar') }}
                        </v-btn>
                    </div>
                    <v-list v-if="discoveryBooks.length" class="mt-3">
                        <v-list-item
                            v-for="book in discoveryBooks"
                            :key="book.bookId || book.id || book.title"
                            :title="book.title"
                            :subtitle="[book.author, book.reason].filter(Boolean).join(' · ')"
                        />
                    </v-list>
                    <EmptyState v-else-if="loaded.discover" :text="t('weread.emptyDiscovery')" />
                </section>
            </v-window-item>
        </v-window>

        <v-dialog
            v-model="detailOpen"
            max-width="760"
            scrollable
            aria-labelledby="weread-detail-dialog-title"
        >
            <v-card>
                <v-card-title class="d-flex align-center">
                    <span id="weread-detail-dialog-title">
                        {{ selectedBook?.title || selectedNotebook?.book?.title || t('weread.details') }}
                    </span>
                    <v-spacer />
                    <v-btn icon="mdi-close" variant="text" :aria-label="t('common.close')" @click="detailOpen = false" />
                </v-card-title>
                <v-divider />
                <v-card-text>
                    <template v-if="selectedBook">
                        <p>{{ selectedBook.author }} · {{ selectedBook.publisher }}</p>
                        <p class="text-body-2">{{ selectedBook.intro }}</p>
                        <v-chip class="me-2" variant="tonal">{{ t('weread.chapterCount', { count: selectedChapters.length }) }}</v-chip>
                        <v-chip v-if="selectedProgress" variant="tonal">{{ t('weread.progress', { count: selectedProgress.book?.progress || 0 }) }}</v-chip>
                        <v-btn v-if="selectedBook.deepLink" class="ms-2" variant="text" :href="selectedBook.deepLink">
                            {{ t('weread.openInWeread') }}
                        </v-btn>
                    </template>
                    <template v-else-if="selectedReview">
                        <p class="text-body-1">{{ selectedReview.review?.content || selectedReview.htmlContent }}</p>
                        <p class="text-caption text-medium-emphasis">
                            {{ selectedReview.review?.author?.name || t('weread.reader') }}
                        </p>
                    </template>
                    <template v-else>
                        <h3 class="text-subtitle-1">{{ t('weread.highlights') }}</h3>
                        <blockquote v-for="item in personalHighlights" :key="item.bookmarkId" class="weread-quote">
                            {{ item.markText }}
                        </blockquote>
                        <h3 class="text-subtitle-1 mt-4">{{ t('weread.thoughts') }}</h3>
                        <p v-for="item in personalReviews" :key="item.reviewId || item.review?.reviewId">
                            {{ item.review?.content || item.content }}
                        </p>
                    </template>
                </v-card-text>
            </v-card>
        </v-dialog>
    </v-card>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import WeReadImportDialog from '~/components/WeReadImportDialog.vue';
import { useMainStore } from '@/stores/main';

const EmptyState = defineComponent({ props: { text: String }, setup: props => () => h('p', { class: 'text-medium-emphasis mt-4' }, props.text) });
const MetricCard = defineComponent({ props: { label: String, value: String }, setup: props => () => h('div', { class: 'pa-4 rounded border' }, [h('div', { class: 'text-caption text-medium-emphasis' }, props.label), h('div', { class: 'text-h6 mt-1' }, props.value)]) });
const { t } = useI18n();
const { $backend } = useNuxtApp();
const route = useRoute();
const router = useRouter();
useMainStore().setNavbar(true);

const tabs = computed(() => [
    { value: 'search', label: t('weread.tabs.search') },
    { value: 'shelf', label: t('weread.tabs.shelf') },
    { value: 'statistics', label: t('weread.tabs.statistics') },
    { value: 'notes', label: t('weread.tabs.notes') },
    { value: 'community', label: t('weread.tabs.community') },
    { value: 'discover', label: t('weread.tabs.discover') },
]);
const activeTab = computed({
    get: () => tabs.value.some(tab => tab.value === route.query.tab) ? route.query.tab : 'search',
    set: (value) => {
        const current = tabs.value.some(tab => tab.value === route.query.tab) ? route.query.tab : 'search';
        if (value !== current) router.replace({ query: { ...route.query, tab: value } });
    },
});
const connection = ref(null);
const apiKey = ref('');
const error = ref('');
const busy = ref('');
const loaded = ref({});
const busyCounts = new Map();
const keyword = ref('');
const searchScope = ref(10);
const searchData = ref(null);
const shelf = ref(null);
const statisticsMode = ref('monthly');
const statistics = ref(null);
const notebooks = ref(null);
const communityBookId = ref('');
const popularHighlights = ref(null);
const publicReviews = ref(null);
const highlightHeat = ref(null);
const highlightThoughts = ref([]);
const similarBookId = ref('');
const discoveryBooks = ref([]);
const detailOpen = ref(false);
const selectedBook = ref(null);
const selectedChapters = ref([]);
const selectedProgress = ref(null);
const selectedNotebook = ref(null);
const selectedReview = ref(null);
const personalHighlights = ref([]);
const personalReviews = ref([]);

const searchScopes = computed(() => [
    { title: t('weread.scopes.books'), value: 10 },
    { title: t('weread.scopes.all'), value: 0 },
    { title: t('weread.scopes.webNovel'), value: 16 },
    { title: t('weread.scopes.audio'), value: 14 },
    { title: t('weread.scopes.author'), value: 6 },
    { title: t('weread.scopes.fullText'), value: 12 },
    { title: t('weread.scopes.bookList'), value: 13 },
    { title: t('weread.scopes.account'), value: 2 },
    { title: t('weread.scopes.article'), value: 4 },
]);
const statisticsModes = computed(() => [
    { title: t('weread.periods.weekly'), value: 'weekly' },
    { title: t('weread.periods.monthly'), value: 'monthly' },
    { title: t('weread.periods.annually'), value: 'annually' },
    { title: t('weread.periods.overall'), value: 'overall' },
]);
const searchResults = computed(() => (searchData.value?.results || []).flatMap(group => (group.books || []).map(item => ({
    ...item,
    ...(item.bookInfo || {}),
    groupTitle: group.title,
}))));
const shelfSummary = computed(() => ({
    total: (shelf.value?.books?.length || 0) + (shelf.value?.albums?.length || 0) + (shelf.value?.mp ? 1 : 0),
    books: shelf.value?.books?.length || 0,
    albums: shelf.value?.albums?.length || 0,
    articles: shelf.value?.mp ? 1 : 0,
}));
const shelfItems = computed(() => [
    ...(shelf.value?.books || []),
    ...(shelf.value?.albums || []),
    ...(shelf.value?.mp ? [shelf.value.mp] : []),
]);
const shelfPrivacySummary = computed(() => ({
    public: (shelf.value?.books || []).filter(item => !item.secret).length
        + (shelf.value?.albums || []).filter(item => !item.albumInfoExtra?.secret).length,
    private: (shelf.value?.books || []).filter(item => item.secret).length
        + (shelf.value?.albums || []).filter(item => item.albumInfoExtra?.secret).length
        + (shelf.value?.mp ? 1 : 0),
}));

async function query(operation, params = {}, busyKey = operation) {
    busy.value = busyKey;
    busyCounts.set(busyKey, (busyCounts.get(busyKey) || 0) + 1);
    error.value = '';
    try {
        const body = { params };
        if (apiKey.value.trim()) {
            body.credentials = { api_key: apiKey.value.trim() };
        }
        const endpoint = `/plugins/talebook.combo.weread/features/${operation}`;
        const response = await $backend(endpoint, { method: 'POST', body: JSON.stringify(body) });
        if (response.err !== 'ok') throw new Error(response.msg || response.err);
        connection.value = response.connection || connection.value;
        apiKey.value = '';
        return response.data;
    } catch (reason) {
        error.value = reason?.message || t('weread.failed');
        return null;
    } finally {
        const remaining = (busyCounts.get(busyKey) || 1) - 1;
        if (remaining) busyCounts.set(busyKey, remaining);
        else {
            busyCounts.delete(busyKey);
            if (busy.value === busyKey) busy.value = '';
        }
    }
}

async function connect() { await query('notebooks', { count: 1 }, 'connect'); }
async function searchBooks() { if (!keyword.value.trim()) return; searchData.value = await query('search', { keyword: keyword.value.trim(), scope: searchScope.value }); loaded.value.search = true; }
async function loadShelf() { shelf.value = await query('shelf'); loaded.value.shelf = true; }
async function loadStatistics() { statistics.value = await query('statistics', { mode: statisticsMode.value, baseTime: 0 }); }
async function loadNotebooks() { notebooks.value = await query('notebooks', { count: 20 }); loaded.value.notebooks = true; }
async function loadBook(bookId) {
    busy.value = 'book';
    const [book, chapters, progress] = await Promise.all([
        query('book_info', { bookId }, 'book'), query('chapters', { bookId }, 'book'), query('progress', { bookId }, 'book'),
    ]);
    selectedBook.value = book;
    selectedReview.value = null;
    selectedChapters.value = chapters?.chapters || [];
    selectedProgress.value = progress;
    detailOpen.value = Boolean(book);
}
async function loadPersonalNotes(item) {
    const bookId = String(item.bookId || item.book?.bookId || '');
    const [highlights, reviews] = await Promise.all([
        query('highlights', { bookId }, 'personal_notes'), query('my_reviews', { bookid: bookId, count: 100, synckey: 0 }, 'personal_notes'),
    ]);
    selectedNotebook.value = item;
    selectedBook.value = null;
    selectedReview.value = null;
    personalHighlights.value = highlights?.updated || [];
    personalReviews.value = (reviews?.reviews || []).map(entry => entry.review || entry);
    detailOpen.value = true;
}
async function loadCommunity() {
    if (!communityBookId.value.trim()) return;
    const bookId = communityBookId.value.trim();
    [popularHighlights.value, publicReviews.value] = await Promise.all([
        query('popular_highlights', { bookId, chapterUid: 0, synckey: 0 }, 'community'),
        query('public_reviews', { bookId, reviewListType: 0, count: 20, maxIdx: 0, synckey: 0 }, 'community'),
    ]);
    highlightHeat.value = null;
    highlightThoughts.value = [];
    loaded.value.community = true;
}
async function loadHighlightDiscussion(item) {
    const bookId = communityBookId.value.trim();
    const chapterUid = Number(item.chapterUid || 0);
    const [heat, discussions] = await Promise.all([
        query('underline_stats', { bookId, chapterUid, synckey: 0 }, 'community'),
        query('highlight_reviews', {
            bookId, chapterUid, reviews: [{ range: item.range, count: 20, maxIdx: 0, synckey: 0 }],
        }, 'community'),
    ]);
    highlightHeat.value = heat;
    highlightThoughts.value = (discussions?.reviews || []).flatMap(entry => entry.pageReviews || []);
}
async function loadReviewDetail(item) {
    const data = await query('review_detail', {
        reviewId: item.reviewId, commentsCount: 20, commentsDirection: 0, likesCount: 20, likesDirection: 0, synckey: 0,
    }, 'community');
    if (!data) return;
    selectedBook.value = null;
    selectedNotebook.value = null;
    selectedReview.value = data;
    detailOpen.value = true;
}
async function loadRecommendations() { const data = await query('recommendations', { count: 20, maxIdx: 0 }); discoveryBooks.value = data?.books || []; loaded.value.discover = true; }
async function loadFriends() { const data = await query('friends_reading', { count: 20 }); discoveryBooks.value = (data?.items || []).map(item => item.book || item.bookInfo || item); loaded.value.discover = true; }
async function loadSimilar() {
    if (!similarBookId.value.trim()) return;
    const data = await query('similar', { bookId: similarBookId.value.trim(), count: 20, maxIdx: 0 });
    discoveryBooks.value = (data?.booksimilar?.books || []).map(item => item.book?.bookInfo || item.book || item);
    loaded.value.discover = true;
}
function duration(seconds) { const value = Number(seconds || 0); return t('weread.duration', { hours: Math.floor(value / 3600), minutes: Math.floor((value % 3600) / 60) }); }
function rating(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return '';
    const normalized = numeric > 100 ? Number((numeric / 10).toFixed(1)) : numeric;
    return t('weread.rating', { value: normalized });
}

onMounted(async () => {
    try {
        const response = await $backend('/plugins/talebook.combo.weread');
        if (response.err === 'ok') {
            connection.value = (response.connections || []).find(item => item.role === 'default') || null;
        }
    } catch {
        error.value = t('weread.failed');
    }
});
useHead(() => ({ title: t('weread.title') }));
</script>

<style scoped>
.weread-key { flex: 1 1 320px; max-width: 560px; }
.weread-query { flex: 1 1 280px; max-width: 520px; }
.weread-select { flex: 0 1 220px; }
.weread-quote { margin: 12px 0; padding: 10px 14px; border-inline-start: 3px solid rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), .06); }
@media (max-width: 600px) {
    .weread-key, .weread-query, .weread-select { max-width: none; flex-basis: 100%; }
}
</style>
