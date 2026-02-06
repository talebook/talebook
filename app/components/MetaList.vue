
<template>
    <div>
        <v-row>
            <template v-if="meta == 'rating'">
                <v-col
                    v-for="item in meta_items"
                    :key="item.name"
                    cols="4"
                    sm="2"
                >
                    <v-chip
                        :to="item.href"
                        variant="outlined"
                        color="primary"
                    >
                        {{ item.name }}星
                        <span v-if="item.count">&nbsp;({{ item.count }})</span>
                    </v-chip>
                </v-col>
            </template>
            <v-col v-else>
                <v-chip
                    v-for="item in meta_items"
                    :key="item.name"
                    size="small"
                    class="ma-1"
                    :to="item.href"
                    variant="outlined"
                    color="primary"
                >
                    {{ item.name }}
                    <span v-if="item.count">&nbsp;({{ item.count }})</span>
                </v-chip>
                <v-btn
                    v-if="total > items.length"
                    color="primary"
                    rounded
                    size="small"
                    @click="expand()"
                >
                    显示全部...
                </v-btn>
            </v-col>
        </v-row>
        
        <!-- 空状态提示 -->
        <v-row
            v-if="meta_items.length === 0"
            class="empty-state"
        >
            <v-col cols="12">
                <v-card class="ma-1 pa-6 text-center">
                    <v-icon
                        large
                        color="grey lighten-2"
                    >
                        mdi-book-open-variant
                    </v-icon>
                    <h3 class="text-h6 grey--text">
                        本书库暂无藏书
                    </h3>
                    <p class="text-caption grey--text">
                        请先添加书籍到书库
                    </p>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useMainStore } from '@/stores/main';

const route = useRoute();
const store = useMainStore();
const { $backend } = useNuxtApp();

const props = defineProps({
    metaType: {
        type: String,
        default: ''
    }
});

store.setNavbar(true);

const meta = computed(() => props.metaType || route.path.split('/')[1]);
const show_all = ref(false);
const items = ref([]);
const total = ref(0);
const page_size = ref(20);

const loadData = async () => {
    const path = '/' + meta.value + (show_all.value ? '?show=all' : '');
    try {
        const rsp = await $backend(path);
        items.value = rsp.items || [];
        total.value = rsp.total || 0;
    } catch (e) {
        console.error(e);
    }
};

// 修复：移除 await，正确使用 useAsyncData
// 使用 useAsyncData 替代直接调用
const { data, refresh } = useAsyncData(`meta-${meta.value}`, async () => {
    const path = '/' + meta.value + (show_all.value ? '?show=all' : '');
    try {
        const rsp = await $backend(path);
        items.value = rsp.items || [];
        total.value = rsp.total || 0;
        return rsp;
    } catch (e) {
        console.error(e);
        return null;
    }
}, {
    watch: [meta, show_all] // 监听 meta 和 show_all 的变化
});

// 或者使用 watch 监听变化来刷新数据
watch([meta, show_all], () => {
    refresh();
});

const expand = () => {
    show_all.value = !show_all.value;
    // 不需要手动调用 loadData，因为 watch 会自动触发 refresh
};

const meta_items = computed(() => {
    var prefix = '/' + meta.value + '/';
    return items.value.map(d => {
        d.href = prefix + encodeURIComponent(d.name);
        return d;
    });
});

const page_cnt = computed(() => {
    return Math.max(1, Math.ceil(total.value/page_size.value));
});

const titles = {
    tag: '全部标签',
    series: '全部丛书',
    rating: '全部评分',
    author: '全部作者',
    publisher: '全部出版社',
    format: '全部格式',
};

useHead({
    title: titles[meta.value] || ''
});
</script>