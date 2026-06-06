<template>
    <div>
        <v-row>
            <v-col cols="12">
                <h2>{{ $t('network.title') }}</h2>
                <v-divider class="mt-3 mb-0" />
            </v-col>

            <!-- 搜索 -->
            <v-col cols="12">
                <v-form @submit.prevent="doSearch">
                    <v-text-field
                        v-model="keyword"
                        :label="$t('network.search')"
                        :placeholder="$t('network.searchPlaceholder')"
                        prepend-inner-icon="mdi-magnify"
                        variant="solo"
                        hide-details
                        clearable
                        @keyup.enter="doSearch"
                    >
                        <template #append>
                            <v-btn
                                color="primary"
                                :loading="loading"
                                @click="doSearch"
                            >
                                {{ $t('common.search') }}
                            </v-btn>
                        </template>
                    </v-text-field>
                </v-form>
            </v-col>

            <!-- 搜索范围：近期可用 / 全部 / 手选 -->
            <v-col cols="12">
                <div class="d-flex align-center flex-wrap ga-2">
                    <span class="text-body-2 mr-1">{{ $t('network.searchScope') }}{{ $t('messages.colon') }}</span>
                    <v-btn-toggle
                        v-model="searchMode"
                        density="compact"
                        color="primary"
                        variant="outlined"
                        mandatory
                        divided
                    >
                        <v-btn
                            value="top"
                            size="small"
                        >
                            {{ $t('network.modeTop') }}
                        </v-btn>
                        <v-btn
                            value="all"
                            size="small"
                        >
                            {{ $t('network.modeAll') }}
                        </v-btn>
                        <v-btn
                            value="custom"
                            size="small"
                        >
                            {{ $t('network.modeCustom') }}
                        </v-btn>
                    </v-btn-toggle>
                    <span
                        v-if="sources.length > 0"
                        class="text-caption text-medium-emphasis"
                    >
                        {{ $t('network.sourceCount', { n: sources.length }) }}
                    </span>
                </div>
                <v-autocomplete
                    v-if="searchMode === 'custom'"
                    v-model="selected"
                    :items="sourceItems"
                    :label="$t('network.pickSources')"
                    multiple
                    chips
                    closable-chips
                    clearable
                    density="compact"
                    hide-details
                    class="mt-3"
                />
            </v-col>

            <v-col
                v-if="sources.length === 0"
                cols="12"
            >
                <v-alert
                    type="info"
                    variant="tonal"
                >
                    {{ $t('network.noSource') }}
                </v-alert>
            </v-col>

            <v-col
                v-if="loading && searchProgress.total > 0"
                cols="12"
            >
                <v-progress-linear
                    :model-value="searchProgress.total ? (searchProgress.done / searchProgress.total * 100) : 0"
                    color="primary"
                    height="6"
                    rounded
                />
                <div class="d-flex align-center text-caption text-medium-emphasis mt-1">
                    <span>{{ $t('network.searchProgress', { done: searchProgress.done, total: searchProgress.total }) }}</span>
                    <v-spacer />
                    <v-btn
                        size="x-small"
                        variant="text"
                        @click="stopSearch"
                    >
                        {{ $t('network.stopSearch') }}
                    </v-btn>
                </div>
            </v-col>

            <v-col
                v-if="partial.length > 0"
                cols="12"
            >
                <v-alert
                    type="warning"
                    variant="tonal"
                    density="compact"
                >
                    {{ $t('network.partialFailedCount', { n: partial.length }) }}
                </v-alert>
            </v-col>

            <v-col
                v-for="group in results"
                :key="group.source_id"
                cols="12"
            >
                <h3 class="text-subtitle-1 mb-2">
                    {{ group.source_name }}
                </h3>
                <BookCards :books="toCards(group)" />
            </v-col>

            <v-col
                v-if="searched && results.length === 0 && !loading"
                cols="12"
            >
                <v-alert
                    type="info"
                    variant="tonal"
                >
                    {{ $t('network.noResult') }}
                </v-alert>
            </v-col>

            <!-- 搜索分页 -->
            <v-col
                v-if="searched && (results.length > 0 || searchPage > 1)"
                cols="12"
                class="d-flex justify-center align-center"
            >
                <v-btn
                    variant="text"
                    :disabled="searchPage <= 1 || loading"
                    @click="changeSearchPage(searchPage - 1)"
                >
                    {{ $t('network.prevPage') }}
                </v-btn>
                <span class="mx-3">{{ $t('network.page', { n: searchPage }) }}</span>
                <v-btn
                    variant="text"
                    :disabled="results.length === 0 || loading"
                    @click="changeSearchPage(searchPage + 1)"
                >
                    {{ $t('network.nextPage') }}
                </v-btn>
            </v-col>

            <!-- 发现 -->
            <v-col
                v-if="sources.length > 0"
                cols="12"
            >
                <v-divider class="my-3" />
                <h3 class="text-subtitle-1 mb-2">
                    {{ $t('network.explore') }}
                </h3>
                <v-select
                    v-model="exploreSourceId"
                    :items="sources.map(s => ({ value: s.id, title: s.name }))"
                    :label="$t('network.explorePickSource')"
                    density="compact"
                    hide-details
                    clearable
                    style="max-width: 320px"
                    @update:model-value="loadCategories"
                />

                <div
                    v-if="categories.length > 0"
                    class="d-flex align-center flex-wrap mt-3"
                >
                    <v-chip
                        v-for="c in categories"
                        :key="c.url"
                        :color="exploreCategoryUrl === c.url ? 'primary' : undefined"
                        label
                        size="small"
                        class="mr-1 mb-1"
                        @click="pickCategory(c)"
                    >
                        {{ c.name }}
                    </v-chip>
                </div>
                <v-alert
                    v-else-if="exploreSourceId && !exploreLoading"
                    type="info"
                    variant="tonal"
                    density="compact"
                    class="mt-3"
                >
                    {{ $t('network.exploreEmpty') }}
                </v-alert>

                <div
                    v-if="exploreLoading"
                    class="d-flex align-center mt-3"
                >
                    <v-progress-circular
                        indeterminate
                        size="22"
                        class="mr-2"
                    />
                    {{ $t('network.searching') }}
                </div>

                <div
                    v-if="exploreBooks.length > 0"
                    class="mt-3"
                >
                    <BookCards :books="toExploreCards(exploreBooks)" />
                    <div class="d-flex justify-center align-center mt-2">
                        <v-btn
                            variant="text"
                            :disabled="explorePage <= 1 || exploreLoading"
                            @click="changeExplorePage(explorePage - 1)"
                        >
                            {{ $t('network.prevPage') }}
                        </v-btn>
                        <span class="mx-3">{{ $t('network.page', { n: explorePage }) }}</span>
                        <v-btn
                            variant="text"
                            :disabled="exploreLoading"
                            @click="changeExplorePage(explorePage + 1)"
                        >
                            {{ $t('network.nextPage') }}
                        </v-btn>
                    </div>
                </div>
            </v-col>
        </v-row>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import BookCards from '~/components/BookCards.vue';
import { useMainStore } from '@/stores/main';

const { t } = useI18n();
const store = useMainStore();

store.setNavbar(true);

const sources = ref([]);
const selected = ref([]);
const searchMode = ref('top');
const keyword = ref('');
const results = ref([]);
const partial = ref([]);
const searchProgress = ref({ done: 0, total: 0 });
const loading = ref(false);
const searched = ref(false);
const searchPage = ref(1);

// 自增标记：每次新搜索 +1，进行中的轮询发现 token 失配即退出，避免串台
let searchToken = 0;
const SEARCH_POLL_INTERVAL = 1000;
// 上限放大到 10 分钟，支持「全部」模式把上千个书源搜完；用户也可随时点“停止”
const SEARCH_POLL_TIMEOUT = 600000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const exploreSourceId = ref(null);
const categories = ref([]);
const exploreCategoryUrl = ref('');
const exploreBooks = ref([]);
const explorePage = ref(1);
const exploreLoading = ref(false);

// 手选模式下供 autocomplete 过滤选择（2000+ 源由 autocomplete 内置虚拟滚动处理）
const sourceItems = computed(() => sources.value.map((s) => ({ value: s.id, title: s.name })));

const toCards = (group) => {
    return (group.books || []).map((b) => ({
        id: b.book_url,
        title: b.name,
        img: b.cover_url,
        comments: [b.author, b.intro].filter(Boolean).join(' · '),
        href: `/network/book?source_id=${group.source_id}&book_url=${encodeURIComponent(b.book_url)}`,
    }));
};

const toExploreCards = (books) => {
    return books.map((b) => ({
        id: b.book_url,
        title: b.name,
        img: b.cover_url,
        comments: [b.author, b.intro].filter(Boolean).join(' · '),
        href: `/network/book?source_id=${exploreSourceId.value}&book_url=${encodeURIComponent(b.book_url)}`,
    }));
};

// 轮询搜索任务进度，逐步把已完成源的结果渲染出来，直到完成 / 超时 / 被新搜索取代
const pollSearch = async (taskId, token) => {
    const { $backend } = useNuxtApp();
    const deadline = Date.now() + SEARCH_POLL_TIMEOUT;
    while (token === searchToken && Date.now() < deadline) {
        const s = await $backend(`/network/search/status?task_id=${taskId}`);
        if (token !== searchToken) return;
        if (s.err !== 'ok') break;
        results.value = (s.results || []).filter((g) => (g.books || []).length > 0);
        partial.value = s.partial || [];
        searchProgress.value = { done: s.done || 0, total: s.total || 0 };
        if (s.finished) break;
        await sleep(SEARCH_POLL_INTERVAL);
    }
};

const fetchSearch = async (page) => {
    const { $backend, $alert } = useNuxtApp();
    const token = ++searchToken;
    loading.value = true;
    results.value = [];
    partial.value = [];
    searchProgress.value = { done: 0, total: 0 };
    try {
        let url = `/network/search?key=${encodeURIComponent(keyword.value.trim())}&page=${page}&mode=${searchMode.value}`;
        if (searchMode.value === 'custom' && selected.value.length > 0) {
            url += `&sources=${selected.value.join(',')}`;
        }
        const rsp = await $backend(url);
        if (token !== searchToken) return;
        if (rsp.err !== 'ok') {
            if ($alert) $alert('error', rsp.msg || rsp.err);
            return;
        }
        searchPage.value = page;
        searchProgress.value = { done: 0, total: rsp.total || 0 };
        if (rsp.task_id && rsp.total > 0) {
            await pollSearch(rsp.task_id, token);
        }
    } finally {
        if (token === searchToken) loading.value = false;
    }
};

const doSearch = () => {
    const key = (keyword.value || '').trim();
    if (!key) return;
    if (searchMode.value === 'custom' && selected.value.length === 0) {
        const { $alert } = useNuxtApp();
        if ($alert) $alert('warning', t('network.pickSourcesFirst'));
        return;
    }
    searched.value = true;
    fetchSearch(1);
};

const stopSearch = () => {
    // 让进行中的轮询因 token 失配而退出
    searchToken += 1;
    loading.value = false;
};

const changeSearchPage = (n) => {
    if (n < 1) return;
    fetchSearch(n);
};

const loadCategories = async () => {
    categories.value = [];
    exploreCategoryUrl.value = '';
    exploreBooks.value = [];
    explorePage.value = 1;
    if (!exploreSourceId.value) return;
    const { $backend } = useNuxtApp();
    const rsp = await $backend(`/network/categories?source_id=${exploreSourceId.value}`);
    if (rsp.err === 'ok') categories.value = rsp.items || [];
};

const fetchExplore = async (page) => {
    if (!exploreSourceId.value || !exploreCategoryUrl.value) return;
    const { $backend, $alert } = useNuxtApp();
    exploreLoading.value = true;
    try {
        const url = `/network/explore?source_id=${exploreSourceId.value}&url=${encodeURIComponent(exploreCategoryUrl.value)}&page=${page}`;
        const rsp = await $backend(url);
        if (rsp.err === 'ok') {
            exploreBooks.value = rsp.books || [];
            explorePage.value = page;
        } else if ($alert) {
            $alert('error', rsp.msg || rsp.err);
        }
    } finally {
        exploreLoading.value = false;
    }
};

const pickCategory = (c) => {
    exploreCategoryUrl.value = c.url;
    fetchExplore(1);
};

const changeExplorePage = (n) => {
    if (n < 1) return;
    fetchExplore(n);
};

onMounted(async () => {
    const { $backend } = useNuxtApp();
    const rsp = await $backend('/network/sources');
    if (rsp.err === 'ok') sources.value = rsp.items || [];
});

onBeforeUnmount(() => {
    // 让进行中的轮询因 token 失配而退出
    searchToken += 1;
});

useHead(() => ({ title: t('network.title') }));
</script>
