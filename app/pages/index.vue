<template>
    <div>
        <v-row>
            <v-col cols="12">
                <p class="ma-0 title">
                    {{ t('navigation.recommended') }}
                </p>
            </v-col>
            <v-col
                v-for="(book,idx) in get_random_books"
                :key="'rec'+idx+book.id"
                cols="6"
                xs="6"
                sm="4"
                md="2"
                lg="1"
                class="book-card"
            >
                <v-card
                    :to="book.href"
                    class="ma-1"
                >
                    <v-img
                        :src="book.img"
                        :aspect-ratio="11/15"
                        cover
                    />
                </v-card>
            </v-col>
            <!-- 空状态提示 -->
            <v-col
                v-if="get_random_books.length === 0"
                cols="12"
            >
                <v-card class="ma-1 pa-6 text-center">
                    <v-icon
                        large
                        color="grey lighten-2"
                    >
                        mdi-book-open-variant
                    </v-icon>
                    <h3 class="text-h6 grey--text">
                        {{ t('library.noBooks') }}
                    </h3>
                    <p class="text-caption grey--text">
                        {{ t('library.addBooksFirst') }}
                    </p>
                </v-card>
            </v-col>
        </v-row>
        <v-row>
            <v-col cols="12">
                <v-divider class="new-legend" />
                <p class="ma-0 title">
                    {{ t('index.newReleases') }}
                </p>
            </v-col>
            <v-col cols="12">
                <BookCards :books="get_recent_books" />
            </v-col>
        </v-row>
        <v-row>
            <v-col cols="12">
                <v-divider class="new-legend" />
                <p class="ma-0 title">
                    {{ t('index.browseByCategory') }}
                </p>
            </v-col>
            <v-col
                v-for="nav in navs"
                :key="nav.text"
                cols="12"
                sm="6"
                md="4"
            >
                <v-card outlined>
                    <v-list>
                        <v-list-item
                            :to="nav.href"
                            :title="nav.text"
                            :subtitle="nav.subtitle"
                        >
                            <template #prepend>
                                <v-avatar color="primary">
                                    <v-icon color="white">
                                        {{ nav.icon }}
                                    </v-icon>
                                </v-avatar>
                            </template>
                            <template #append>
                                <v-icon>mdi-arrow-right</v-icon>
                            </template>
                        </v-list-item>
                    </v-list>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useAsyncData, useNuxtApp, useRoute } from 'nuxt/app';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';

const store = useMainStore();
const { $backend, $alert } = useNuxtApp();
const route = useRoute();
const { t } = useI18n();

onMounted(() => {
    // 处理URL参数中的错误信息
    if (route.query.err === 'opds_disabled' && route.query.msg) {
        if ($alert) {
            $alert('error', route.query.msg);
        }
    }
});

// 修复: 直接使用 useAsyncData 不添加 await
const { data: indexData } = useAsyncData('index', () => 
    $backend('/index?random=12&recent=12')
);

store.setNavbar(true);

// 使用计算属性直接处理数据
const navs = computed(() => [
    { icon: 'mdi-widgets',        href:'/nav',       text: t('navigation.browse'),  subtitle: t('counts.books', { count: store.sys.books || 0 }) },
    { icon: 'mdi-human-greeting', href:'/author',    text: t('navigation.authors'), subtitle: t('counts.authors', { count: store.sys.authors || 0 }) },
    { icon: 'mdi-home-group',     href:'/publisher', text: t('navigation.publishers'), subtitle: t('counts.publishers', { count: store.sys.publishers || 0 }) },
    { icon: 'mdi-tag-heart',      href:'/tag',       text: t('navigation.tags'), subtitle: t('counts.tags', { count: store.sys.tags || 0 }) },
    { icon: 'mdi-file',           href:'/format',    text: t('navigation.formats'), subtitle: t('counts.formats', { count: store.sys.formats || 0 }) },
    { icon: 'mdi-history',        href:'/recent',    text: t('navigation.recent'), subtitle: '' },
    { icon: 'mdi-trending-up',    href:'/hot',       text: t('navigation.hot'), subtitle: '' },
]);

// 直接计算书籍数据 - 这是正确的做法
const get_random_books = computed(() => {
    const books = indexData.value?.random_books || [];
    return books.map(b => ({
        ...b,
        href: '/book/' + b.id
    }));
});

const get_recent_books = computed(() => {
    const books = indexData.value?.new_books || [];
    return books.map(b => ({
        ...b,
        href: '/book/' + b.id
    }));
});

// 如果你需要单独的 random_books 和 new_books 变量，可以使用计算属性
const random_books = computed(() => indexData.value?.random_books || []);
const new_books = computed(() => indexData.value?.new_books || []);
</script>

<style>
.new-legend {
    margin-top: 30px;
    margin-bottom: 20px;
}
.title {
    font-size: 1.25rem;
    font-weight: 500;
}
</style>