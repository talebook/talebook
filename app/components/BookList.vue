
<template>
    <div>
        <v-row>
            <v-col cols="12">
                <h2>{{ title }}</h2>
                <v-divider class="mt-3 mb-0" />
            </v-col>

            <v-col cols="12">
                <BookCards :books="books" />
            </v-col>

            <v-col cols="12">
                <v-container class="max-width">
                    <v-pagination
                        v-if="page_cnt > 1"
                        v-model="page"
                        :length="page_cnt"
                        rounded="circle"
                        @update:model-value="change_page"
                    />
                </v-container>
            </v-col>
        </v-row>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAsyncData, useNuxtApp } from 'nuxt/app';
import { useMainStore } from '@/stores/main';

const route = useRoute();
const router = useRouter();
const store = useMainStore();
const { $backend } = useNuxtApp();

store.setNavbar(true);

const title = ref('');
const books = ref([]);
const total = ref(0);
const page_size = ref(60);
const page = ref(1);

const loadData = async () => {
    const fullPath = route.fullPath;
    try {
        const rsp = await $backend(fullPath);
        if (rsp.err === 'ok') {
            title.value = rsp.title;
            books.value = rsp.books || [];
            total.value = rsp.total || 0;
        }
    } catch (e) {
        console.error(e);
    }
};

// 使用 useAsyncData，它会自动处理异步数据
const { data, refresh } = useAsyncData(
    'book-list-' + route.fullPath,
    () => loadData(),
    {
        watch: [() => route.fullPath] // 自动监听路由变化
    }
);

// Calculate page from query
if (route.query.start) {
    page.value = 1 + Math.floor(parseInt(route.query.start) / page_size.value);
}

const page_cnt = computed(() => {
    return total.value > 0 ? Math.max(1, Math.ceil(total.value / page_size.value)) : 0;
});

const change_page = (val) => {
    var r = { ...route.query };
    if (val < 1) val = 1;
    r.start = (val - 1) * page_size.value;
    r.size = page_size.value;
    router.push({ query: r });
};

// 不再需要 watch，因为 useAsyncData 已经监听了路由变化

useHead({
    title: () => title.value
});
</script>