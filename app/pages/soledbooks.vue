<template>
    <div>
        <v-row>
            <v-col cols="12">
                <h2>{{ title }}</h2>
                <v-divider class="mt-3 mb-0" />
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

const title = ref(t('navigation.soledBooks'));
const page = ref(1);
const books = ref([]);
const total = ref(0);
const page_size = 60;
const page_cnt = ref(1);
const inited = ref(false);

// 监听 total 变化，动态更新 page_cnt
watch(total, (newTotal) => {
    page_cnt.value = newTotal > 0 ? Math.max(1, Math.ceil(newTotal / page_size)) : 0;
});

// 获取私藏书籍数据
const fetchBooks = async (p = 1) => {
    try {
        const rsp = await $backend(`/soledbooks?start=${(p - 1) * page_size}&size=${page_size}`);
        if (rsp.err === 'exception' || rsp.err === 'network_error') {
            if ($alert) $alert('error', rsp.msg || t('errors.networkError'));
            return;
        }
    
        books.value = rsp.books || [];
        total.value = rsp.total || 0;
        page_cnt.value = total.value > 0 ? Math.max(1, Math.ceil(total.value / page_size)) : 0;
        page.value = p;
        title.value = rsp.title || t('navigation.soledBooks');
    } catch (error) {
        console.error('Failed to fetch soled books:', error);
        if ($alert) $alert('error', t('library.message.fetchBooksFailed'));
    }
};

// 初始化函数
const init = async () => {
    inited.value = true;
  
    // 解析页码
    let p = 1;
    if (route.query.start) {
        p = 1 + parseInt(route.query.start / page_size);
    }
  
    await fetchBooks(p);
};

// 翻页
const change_page = (newPage) => {
    page.value = newPage;
    fetchBooks(newPage);
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
    title: t('navigation.soledBooks')
}));
</script>

<style scoped>
.book-pager {
  margin-top: 30px;
}
</style>
