<template>
    <div>
        <v-row>
            <v-col cols="12">
                <h2>{{ title }}</h2>
                <v-divider class="mt-3 mb-0" />
            </v-col>

            <v-col cols="12">
                <div class="library-filter-panel">
                    <div class="library-metadata-filters">
                        <LibraryChipFilter
                            v-for="filter in metadataFilters"
                            :key="filter.key"
                            :model-value="filters[filter.key]"
                            :items="filterOptions[filter.key]"
                            :label="filter.label"
                            :filter-key="filter.key"
                            @update:model-value="updateFilter(filter.key, $event)"
                        />
                    </div>

                    <div class="library-quick-filters">
                        <div class="quick-filter-row">
                            <span class="filter-label">{{ $t('book.format') }}{{ $t('messages.colon') }}</span>
                            <div
                                class="filter-chip-group"
                                role="group"
                                :aria-label="$t('book.format')"
                            >
                                <v-chip
                                    :class="filters.format === null ? 'filter-chip-active' : 'filter-chip-inactive'"
                                    :aria-pressed="filters.format === null"
                                    class="quick-filter-chip"
                                    label
                                    role="button"
                                    @click="updateFilter('format', null)"
                                >
                                    {{ t('messages.all') }}
                                </v-chip>
                                <v-chip
                                    v-for="item in filterOptions.format"
                                    :key="item.id"
                                    :class="filters.format === item.name ? 'filter-chip-active' : 'filter-chip-inactive'"
                                    :aria-pressed="filters.format === item.name"
                                    class="quick-filter-chip"
                                    label
                                    role="button"
                                    @click="updateFilter('format', item.name)"
                                >
                                    {{ item.name }}
                                </v-chip>
                            </div>
                        </div>

                        <div
                            v-if="store.sys.show_network_library !== false"
                            class="quick-filter-row"
                        >
                            <span class="filter-label">{{ $t('network.status.label') }}{{ $t('messages.colon') }}</span>
                            <div
                                class="filter-chip-group"
                                role="group"
                                :aria-label="$t('network.status.label')"
                            >
                                <v-chip
                                    v-for="opt in statusOptions"
                                    :key="opt.value"
                                    :class="statusFilter === opt.value ? 'filter-chip-active' : 'filter-chip-inactive'"
                                    :aria-pressed="statusFilter === opt.value"
                                    class="quick-filter-chip"
                                    label
                                    role="button"
                                    @click="updateStatus(opt.value)"
                                >
                                    {{ opt.text }}
                                </v-chip>
                            </div>
                        </div>
                    </div>
                </div>
            </v-col>
            <v-col>
                <v-progress-linear
                    v-if="loading"
                    indeterminate
                    color="primary"
                    class="mb-3"
                />
                <BookCards
                    :books="books"
                    :show-empty-state="inited && !loading && books.length === 0"
                >
                    <template #introduce="{ book }">
                        <SerializeStatusBadge
                            v-if="book.serialize_status"
                            :status="book.serialize_status"
                        />
                    </template>
                </BookCards>
            </v-col>

            <v-col cols="12">
                <v-container class="max-width">
                    <v-pagination
                        v-if="page_cnt > 0"
                        v-model="page"
                        :length="page_cnt"
                        circle
                        @update:model-value="change_page"
                    />
                </v-container>
                <div class="text-xs-center book-pager" />
            </v-col>
        </v-row>
    </div>
</template>

<script setup>
import BookCards from '~/components/BookCards.vue';
import LibraryChipFilter from '~/components/LibraryChipFilter.vue';
import SerializeStatusBadge from '~/components/SerializeStatusBadge.vue';
import { useMainStore } from '@/stores/main';
import { useI18n } from 'vue-i18n';

const store = useMainStore();
const { t } = useI18n();
const { $backend, $backend_stream, $alert } = useNuxtApp();
const route = useRoute();

store.setNavbar(true);

const title = ref(t('library.title'));
const page = ref(1);
const books = ref([]);
const total = ref(0);
const page_size = 60;
const page_cnt = ref(1);
const inited = ref(false);
const loading = ref(false);

const filters = ref({
    publisher: null,
    author: null,
    tag: null,
    format: null
});

const filterOptions = ref({
    publisher: [],
    author: [],
    tag: [],
    format: []
});

const metadataFilters = computed(() => [
    { key: 'publisher', label: t('messages.publisher') },
    { key: 'author', label: t('messages.author') },
    { key: 'tag', label: t('messages.tags') }
]);

const statusFilter = ref('all');
const statusOptions = computed(() => [
    { value: 'all', text: t('network.status.all') },
    { value: 'serial', text: t('network.status.serial') },
    { value: 'finished', text: t('network.status.finished') }
]);

const updateStatus = (value) => {
    statusFilter.value = value;
    fetchBooks(1);
};

// 监听total变化，动态更新page_cnt
watch(total, (newTotal) => {
    page_cnt.value = newTotal > 0 ? Math.max(1, Math.ceil(newTotal / page_size)) : 0;
});

// 每次发起请求自增，旧的流式循环据此识别自身是否已过期，避免向已重置的 books 追加陈旧数据
let fetchSeq = 0;

// 获取书籍数据
const fetchBooks = async (p = 1) => {
    const myReq = ++fetchSeq;
    loading.value = true;
    books.value = [];

    const query = {
        start: (p - 1) * page_size,
        size: page_size
    };

    Object.keys(filters.value).forEach(key => {
        const value = filters.value[key];
        if (value) {
            query[key] = value;
        }
    });

    // 连载状态筛选走网络书专用接口（普通 JSON），其余走流式 /library 接口
    const online = statusFilter.value !== 'all';
    if (online) {
        query.status = statusFilter.value;
    } else {
        query.stream = 1;
    }

    // 构建查询字符串
    const queryString = Object.keys(query)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
        .join('&');

    try {
        if (online) {
            // /library/online 使用 @js 返回普通 JSON，一次性拿到全部书籍
            const data = await $backend(`/library/online?${queryString}`);
            if (myReq !== fetchSeq) return;
            if (data.err && data.err !== 'ok') {
                if ($alert) $alert('error', data.msg || t('errors.networkError'));
                return;
            }
            total.value = data.total || 0;
            page_cnt.value = total.value > 0 ? Math.max(1, Math.ceil(total.value / page_size)) : 0;
            page.value = p;
            title.value = data.title || t('library.title');
            books.value = data.books || [];
            return;
        }

        let firstLine = true;
        for await (const data of $backend_stream(`/library?${queryString}`)) {
            // 用户已切换筛选/翻页，当前循环已过期，停止向新列表追加陈旧数据
            if (myReq !== fetchSeq) return;
            if (firstLine) {
                firstLine = false;
                if (data.err === 'exception') {
                    if ($alert) $alert('error', data.msg || t('errors.networkError'));
                    return;
                }
                total.value = data.total || 0;
                page_cnt.value = total.value > 0 ? Math.max(1, Math.ceil(total.value / page_size)) : 0;
                page.value = p;
                title.value = data.title || t('library.title');
            } else {
                books.value.push(data);
            }
        }
    } catch (error) {
        console.error('Failed to fetch books:', error);
        if (myReq === fetchSeq && $alert) $alert('error', t('library.message.fetchBooksFailed'));
    } finally {
        if (myReq === fetchSeq) loading.value = false;
    }
};

// 加载筛选选项
const loadFilterOptions = async () => {
    const filterTypes = ['publisher', 'author', 'tag', 'format'];
    await Promise.all(filterTypes.map(async (type) => {
        try {
            const rsp = await $backend(`/${type}?show=all`);
            if (rsp.items) {
                filterOptions.value[type] = rsp.items;
            }
        } catch (error) {
            console.error(`Failed to load ${type} options:`, error);
        }
    }));
};

// 初始化函数
const init = async () => {
    inited.value = true;

    // 从URL查询参数中解析筛选条件
    const query = route.query;
    Object.keys(filters.value).forEach(key => {
        const value = query[key];
        filters.value[key] = typeof value === 'string' && value !== t('messages.all') ? value : null;
    });

    // 解析页码
    let p = 1;
    if (query.start) {
        p = 1 + parseInt(query.start / page_size);
    }

    await Promise.all([fetchBooks(p), loadFilterOptions()]);
};

// 翻页
const change_page = (newPage) => {
    page.value = newPage;
    fetchBooks(newPage);
};

// 更新筛选
const updateFilter = (type, value) => {
    filters.value[type] = value || null;
    // 更新筛选条件后重新获取书籍数据，重置到第一页
    fetchBooks(1);
};

// 监听路由变化
watch(() => route.query, () => {
    if (inited.value) {
        init();
    }
}, { deep: true });

// 初始加载
onMounted(() => {
    init();
});

useHead(() => ({
    title: t('library.title')
}));
</script>

<style scoped>
.book-list-legend {
  margin-top: 6px;
  margin-bottom: 16px;
}

.book-pager {
  margin-top: 30px;
}

.library-filter-panel {
  padding: 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgba(var(--v-theme-surface), 0.72);
}

.library-metadata-filters {
  display: grid;
  gap: 6px;
}

.library-quick-filters {
  display: grid;
  gap: 6px;
  margin-top: 6px;
}

.quick-filter-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.filter-label {
  flex: 0 0 auto;
  min-width: 4.25rem;
  padding-top: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.filter-chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1 1 auto;
  min-width: 0;
}

.quick-filter-chip {
  height: 28px;
  min-height: 28px;
  padding: 0 8px;
  font-size: 0.75rem;
}

/* 筛选按钮样式 */
.filter-chip-active {
  background-color: rgb(var(--v-theme-primary)) !important;
  color: rgb(var(--v-theme-on-primary)) !important;
}

.filter-chip-inactive {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background-color: transparent !important;
}

@media (max-width: 600px) {
  .library-filter-panel {
    padding: 8px;
  }

  .quick-filter-row {
    display: block;
  }

  .filter-label {
    display: block;
    min-width: 0;
    padding-top: 0;
    margin-bottom: 4px;
  }
}
</style>
