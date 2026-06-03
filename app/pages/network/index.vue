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

            <v-col
                v-if="sources.length > 0"
                cols="12"
            >
                <div class="d-flex align-center flex-wrap">
                    <span class="mr-3">{{ $t('network.sources') }}{{ $t('messages.colon') }}</span>
                    <v-chip
                        :color="selected.length === 0 ? 'primary' : undefined"
                        label
                        size="small"
                        class="mr-1 mb-1"
                        @click="selected = []"
                    >
                        {{ $t('network.allSources') }}
                    </v-chip>
                    <v-chip
                        v-for="s in sources"
                        :key="s.id"
                        :color="selected.includes(s.id) ? 'primary' : undefined"
                        label
                        size="small"
                        class="mr-1 mb-1"
                        @click="toggleSource(s.id)"
                    >
                        {{ s.name }}
                    </v-chip>
                </div>
            </v-col>

            <v-col
                v-else
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
                v-if="partial.length > 0"
                cols="12"
            >
                <v-alert
                    type="warning"
                    variant="tonal"
                    density="compact"
                >
                    {{ $t('network.partialFailed') }}：{{ partial.map(p => p.source_name).join('、') }}
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
const keyword = ref('');
const results = ref([]);
const partial = ref([]);
const loading = ref(false);
const searched = ref(false);
const searchPage = ref(1);

const exploreSourceId = ref(null);
const categories = ref([]);
const exploreCategoryUrl = ref('');
const exploreBooks = ref([]);
const explorePage = ref(1);
const exploreLoading = ref(false);

const toggleSource = (id) => {
    const i = selected.value.indexOf(id);
    if (i >= 0) selected.value.splice(i, 1);
    else selected.value.push(id);
};

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

const fetchSearch = async (page) => {
    const { $backend, $alert } = useNuxtApp();
    loading.value = true;
    try {
        let url = `/network/search?key=${encodeURIComponent(keyword.value.trim())}&page=${page}`;
        if (selected.value.length > 0) url += `&sources=${selected.value.join(',')}`;
        const rsp = await $backend(url);
        if (rsp.err === 'ok') {
            results.value = (rsp.results || []).filter((g) => (g.books || []).length > 0);
            partial.value = rsp.partial || [];
            searchPage.value = page;
        } else if ($alert) {
            $alert('error', rsp.msg || rsp.err);
        }
    } finally {
        loading.value = false;
    }
};

const doSearch = () => {
    const key = (keyword.value || '').trim();
    if (!key) return;
    searched.value = true;
    fetchSearch(1);
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

useHead(() => ({ title: t('network.title') }));
</script>
