
<template>
    <div>
        <v-row>
            <v-col cols="12">
                <h2 class="text-h5 my-4">
                    {{ title }}
                </h2>
                <v-divider class="mb-4" />
            </v-col>

            <v-col cols="12">
                <BookCards :books="books" />
            </v-col>

            <v-col cols="12">
                <v-container class="max-width">
                    <v-pagination
                        v-if="page_cnt > 0"
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
const { $backend, $alert } = useNuxtApp();

const title = ref('');
const page = ref(1);
const books = ref([]);
const total = ref(0);
const page_size = 60;
const page_cnt = ref(0);

// Initialize page from query
if (route.query.start != undefined) {
    page.value = 1 + parseInt(route.query.start / page_size);
}

// Fetch data function
const fetchData = async () => {
    try {
        const data = await $backend(route.fullPath);
        if (data.err != 'ok') {
            if ($alert) $alert('error', data.msg);
            return;
        }
        title.value = data.title;
        books.value = data.books;
        total.value = data.total;
        page_cnt.value = total.value > 0 ? Math.max(1, Math.ceil(total.value / page_size)) : 0;
    } catch (e) {
        console.error(e);
    }
};

// 修复这里：不要使用 await，直接使用 useAsyncData
// useAsyncData 会自动处理异步操作
const { data, refresh } = useAsyncData(`list-${route.fullPath}`, async () => {
    return await $backend(route.fullPath);
});

// 在响应式上下文中处理数据
watch(data, (newData) => {
    if (newData && newData.err === 'ok') {
        title.value = newData.title;
        books.value = newData.books;
        total.value = newData.total;
        page_cnt.value = total.value > 0 ? Math.max(1, Math.ceil(total.value / page_size)) : 0;
    } else if (newData && newData.err !== 'ok' && $alert) {
        $alert('error', newData.msg);
    }
}, { immediate: true });

// Watch for route changes (e.g. search query change or pagination)
watch(() => route.fullPath, async () => {
    await refresh();  // 刷新 useAsyncData
    // fetchData()  // 或者直接调用 fetchData
});

const change_page = (newPage) => {
    var r = Object.assign({}, route.query);
    if (newPage < 1) {
        newPage = 1;
    }
    r.start = (newPage - 1) * page_size;
    r.size = page_size;
    router.push({query: r});
};

useHead({
    title: () => title.value  // 注意：这里需要是一个函数
});
</script>