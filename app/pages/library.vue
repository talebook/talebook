<template>
    <div>
        <v-row>
            <v-col cols="12">
                <h2>{{ title }}</h2>
                <v-divider class="mt-3 mb-0" />
            </v-col>

            <v-col cols="12">
                <!-- 出版社筛选 -->
                <div class="mb-2">
                    <div class="d-flex align-center">
                        <span class="mr-3">{{ $t('messages.publisher') }}{{ $t('messages.colon') }}</span>
                        <v-chip-group
                            :column="false"
                            class="flex-grow-1"
                        >
                            <v-chip
                                :class="filters.publisher === t('messages.all') ? 'filter-chip-active' : 'filter-chip-inactive'"
                                density="compact"
                                label
                                small
                                @click="updateFilter('publisher', $t('messages.all'))"
                            >
                                {{ $t('messages.all') }}
                            </v-chip>
                            <v-chip
                                v-for="item in filterOptions.publisher.slice(0, 10)"
                                :key="item.id"
                                :class="filters.publisher === item.name ? 'filter-chip-active' : 'filter-chip-inactive'"
                                density="compact"
                                label
                                small
                                @click="updateFilter('publisher', item.name)"
                            >
                                {{ item.name }}
                            </v-chip>
                            <template v-if="filterOptions.publisher.length > 10">
                                <v-chip
                                    class="filter-chip-more"
                                    density="compact"
                                    label
                                    small
                                    @click="expanded.publisher = !expanded.publisher"
                                >
                                    {{ expanded.publisher ? $t('messages.collapse') : `${$t('messages.more')}(${filterOptions.publisher.length - 10})` }}
                                </v-chip>
                            </template>
                        </v-chip-group>
                    </div>
                    <!-- 展开的标签从下一行开始显示 -->
                    <template v-if="filterOptions.publisher.length > 10 && expanded.publisher">
                        <div class="d-flex align-center mt-1">
                            <span class="mr-3" />
                            <v-chip-group
                                :column="false"
                                class="flex-grow-1"
                            >
                                <v-chip
                                    v-for="item in filterOptions.publisher.slice(10)"
                                    :key="item.id"
                                    :class="filters.publisher === item.name ? 'filter-chip-active' : 'filter-chip-inactive'"
                                    density="compact"
                                    label
                                    small
                                    @click="updateFilter('publisher', item.name)"
                                >
                                    {{ item.name }}
                                </v-chip>
                            </v-chip-group>
                        </div>
                    </template>
                </div>

                <!-- 作者筛选 -->
                <div class="mb-2">
                    <div class="d-flex align-center">
                        <span class="mr-3">{{ $t('messages.author') }}{{ $t('messages.colon') }}</span>
                        <v-chip-group
                            :column="false"
                            class="flex-grow-1"
                        >
                            <v-chip
                                :class="filters.author === t('messages.all') ? 'filter-chip-active' : 'filter-chip-inactive'"
                                density="compact"
                                label
                                small
                                @click="updateFilter('author', $t('messages.all'))"
                            >
                                {{ $t('messages.all') }}
                            </v-chip>
                            <v-chip
                                v-for="item in filterOptions.author.slice(0, 10)"
                                :key="item.id"
                                :class="filters.author === item.name ? 'filter-chip-active' : 'filter-chip-inactive'"
                                density="compact"
                                label
                                small
                                @click="updateFilter('author', item.name)"
                            >
                                {{ item.name }}
                            </v-chip>
                            <template v-if="filterOptions.author.length > 10">
                                <v-chip
                                    class="filter-chip-more"
                                    density="compact"
                                    label
                                    small
                                    @click="expanded.author = !expanded.author"
                                >
                                    {{ expanded.author ? $t('messages.collapse') : `${$t('messages.more')}(${filterOptions.author.length - 10})` }}
                                </v-chip>
                            </template>
                        </v-chip-group>
                    </div>
                    <!-- 展开的标签从下一行开始显示 -->
                    <template v-if="filterOptions.author.length > 10 && expanded.author">
                        <div class="d-flex align-center mt-1">
                            <span class="mr-3" />
                            <v-chip-group
                                :column="false"
                                class="flex-grow-1"
                            >
                                <v-chip
                                    v-for="item in filterOptions.author.slice(10)"
                                    :key="item.id"
                                    :class="filters.author === item.name ? 'filter-chip-active' : 'filter-chip-inactive'"
                                    density="compact"
                                    label
                                    small
                                    @click="updateFilter('author', item.name)"
                                >
                                    {{ item.name }}
                                </v-chip>
                            </v-chip-group>
                        </div>
                    </template>
                </div>

                <!-- 标签筛选 -->
                <div class="mb-2">
                    <div class="d-flex align-center">
                        <span class="mr-3">{{ $t('messages.tags') }}{{ $t('messages.colon') }}</span>
                        <v-chip-group
                            :column="false"
                            class="flex-grow-1"
                        >
                            <v-chip
                                :class="filters.tag === t('messages.all') ? 'filter-chip-active' : 'filter-chip-inactive'"
                                density="compact"
                                label
                                small
                                @click="updateFilter('tag', t('messages.all'))"
                            >
                                {{ t('messages.all') }}
                            </v-chip>
                            <v-chip
                                v-for="item in filterOptions.tag.slice(0, 10)"
                                :key="item.id"
                                :class="filters.tag === item.name ? 'filter-chip-active' : 'filter-chip-inactive'"
                                density="compact"
                                label
                                small
                                @click="updateFilter('tag', item.name)"
                            >
                                {{ item.name }}
                            </v-chip>
                            <template v-if="filterOptions.tag.length > 10">
                                <v-chip
                                    class="filter-chip-more"
                                    density="compact"
                                    label
                                    small
                                    @click="expanded.tag = !expanded.tag"
                                >
                                    {{ expanded.tag ? $t('messages.collapse') : `${$t('messages.more')}(${filterOptions.tag.length - 10})` }}
                                </v-chip>
                            </template>
                        </v-chip-group>
                    </div>
                    <!-- 展开的标签从下一行开始显示 -->
                    <template v-if="filterOptions.tag.length > 10 && expanded.tag">
                        <div class="d-flex align-center mt-1">
                            <span class="mr-3" />
                            <v-chip-group
                                :column="false"
                                class="flex-grow-1"
                            >
                                <v-chip
                                    v-for="item in filterOptions.tag.slice(10)"
                                    :key="item.id"
                                    :class="filters.tag === item.name ? 'filter-chip-active' : 'filter-chip-inactive'"
                                    density="compact"
                                    label
                                    small
                                    @click="updateFilter('tag', item.name)"
                                >
                                    {{ item.name }}
                                </v-chip>
                            </v-chip-group>
                        </div>
                    </template>
                </div>

                <!-- 文件格式筛选 -->
                <div class="mb-3">
                    <div class="d-flex align-center">
                        <span class="mr-3">{{ $t('book.format') }}{{ $t('messages.colon') }}</span>
                        <v-chip-group
                            :column="false"
                            class="flex-grow-1"
                        >
                            <v-chip
                                :class="filters.format === t('messages.all') ? 'filter-chip-active' : 'filter-chip-inactive'"
                                density="compact"
                                label
                                small
                                @click="updateFilter('format', t('messages.all'))"
                            >
                                {{ t('messages.all') }}
                            </v-chip>
                            <v-chip
                                v-for="item in filterOptions.format.slice(0, 10)"
                                :key="item.id"
                                :class="filters.format === item.name ? 'filter-chip-active' : 'filter-chip-inactive'"
                                density="compact"
                                label
                                small
                                @click="updateFilter('format', item.name)"
                            >
                                {{ item.name }}
                            </v-chip>
                            <template v-if="filterOptions.format.length > 10">
                                <v-chip
                                    class="filter-chip-more"
                                    density="compact"
                                    label
                                    small
                                    @click="expanded.format = !expanded.format"
                                >
                                    {{ expanded.format ? $t('messages.collapse') : `${$t('messages.more')}(${filterOptions.format.length - 10})` }}
                                </v-chip>
                            </template>
                        </v-chip-group>
                    </div>
                    <!-- 展开的标签从下一行开始显示 -->
                    <template v-if="filterOptions.format.length > 10 && expanded.format">
                        <div class="d-flex align-center mt-1">
                            <span class="mr-3" />
                            <v-chip-group
                                :column="false"
                                class="flex-grow-1"
                            >
                                <v-chip
                                    v-for="item in filterOptions.format.slice(10)"
                                    :key="item.id"
                                    :class="filters.format === item.name ? 'filter-chip-active' : 'filter-chip-inactive'"
                                    density="compact"
                                    label
                                    small
                                    @click="updateFilter('format', item.name)"
                                >
                                    {{ item.name }}
                                </v-chip>
                            </v-chip-group>
                        </div>
                    </template>
                </div>
            </v-col>

            <v-col>
                <BookCards :books="books" />
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
import { useMainStore } from '@/stores/main';
import { useI18n } from 'vue-i18n';

const store = useMainStore();
const { t } = useI18n();
const { $backend, $alert } = useNuxtApp();
const route = useRoute();

store.setNavbar(true);

const title = ref(t('library.title'));
const page = ref(1);
const books = ref([]);
const total = ref(0);
const page_size = 60;
const page_cnt = ref(1);
const inited = ref(false);

const filters = ref({
    publisher: t('messages.all'),
    author: t('messages.all'),
    tag: t('messages.all'),
    format: t('messages.all')
});

const filterOptions = ref({
    publisher: [],
    author: [],
    tag: [],
    format: []
});

const expanded = ref({
    publisher: false,
    author: false,
    tag: false,
    format: false
});

// 监听total变化，动态更新page_cnt
watch(total, (newTotal) => {
    page_cnt.value = newTotal > 0 ? Math.max(1, Math.ceil(newTotal / page_size)) : 0;
});

// 获取书籍数据
const fetchBooks = async (p = 1) => {
    // 构建查询参数
    const query = {
        start: (p - 1) * page_size,
        size: page_size
    };
  
    // 添加筛选条件
    Object.keys(filters.value).forEach(key => {
        if (filters.value[key] !== t('messages.all')) {
            query[key] = filters.value[key];
        }
    });
  
    // 构建查询字符串
    const queryString = Object.keys(query)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
        .join('&');
  
    try {
        const rsp = await $backend(`/library?${queryString}`);
        if (rsp.err === 'exception' || rsp.err === 'network_error') {
            if ($alert) $alert('error', rsp.msg || t('errors.networkError'));
            return;
        }
    
        books.value = rsp.books || [];
        total.value = rsp.total || 0;
        page_cnt.value = total.value > 0 ? Math.max(1, Math.ceil(total.value / page_size)) : 0;
        page.value = p;
        title.value = rsp.title || t('library.title');
    } catch (error) {
        console.error('Failed to fetch books:', error);
        if ($alert) $alert('error', t('library.message.fetchBooksFailed'));
    }
};

// 加载筛选选项
const loadFilterOptions = async () => {
    const filterTypes = ['publisher', 'author', 'tag', 'format'];
    for (const type of filterTypes) {
        try {
            const rsp = await $backend(`/${type}?show=all`);
            if (rsp.items) {
                filterOptions.value[type] = rsp.items;
            }
        } catch (error) {
            console.error(`Failed to load ${type} options:`, error);
        }
    }
};

// 初始化函数
const init = async () => {
    inited.value = true;
  
    // 从URL查询参数中解析筛选条件
    const query = route.query;
    Object.keys(filters.value).forEach(key => {
        if (query[key] && query[key] !== t('messages.all')) {
            filters.value[key] = query[key];
        }
    });
  
    // 解析页码
    let p = 1;
    if (query.start) {
        p = 1 + parseInt(query.start / page_size);
    }
  
    await fetchBooks(p);
    await loadFilterOptions();
};

// 翻页
const change_page = (newPage) => {
    page.value = newPage;
    fetchBooks(newPage);
};

// 更新筛选
const updateFilter = (type, value) => {
    filters.value[type] = value;
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

/* 筛选按钮样式 */
.filter-chip-active {
  background-color: rgb(var(--v-theme-primary)) !important;
  color: white !important;
}

.filter-chip-inactive {
  border: 1px solid rgba(0, 0, 0, 0.12);
  background-color: transparent !important;
}

.filter-chip-more {
  border: 1px solid rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-primary)) !important;
  background-color: transparent !important;
}
</style>
