
<template>
    <div>
        <v-row>
            <template v-for="nav in navs" :key="nav.legend">
            <v-col cols=12>
                <h2>{{nav.legend}}</h2>
                <v-btn rounded small class="ma-1" v-for="item in nav.tags" :to="'/tag/'+encodeURIComponent(item.name)" :key="item.name" variant="outlined" :color="item.count != 0 ? 'primary': 'grey'" >
                    {{item.name}}
                    <span v-if="item.count">&nbsp;({{item.count}})</span>
                </v-btn>
            </v-col>
            </template>
        </v-row>
        
        <!-- 空状态提示 -->
        <v-row v-if="!hasAnyBooks" class="empty-state">
            <v-col cols=12>
                <v-card class="ma-1 pa-6 text-center">
                    <v-icon large color="grey lighten-2">mdi-book-open-variant</v-icon>
                    <h3 class="text-h6 grey--text">本书库暂无藏书</h3>
                    <p class="text-caption grey--text">请先添加书籍到书库</p>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useMainStore } from '@/stores/main'

const store = useMainStore()
const { $backend } = useNuxtApp()

store.setNavbar(true)

const { data: navs } = await useAsyncData('book-nav', async () => {
    const rsp = await $backend("/book/nav");
    return rsp.navs || [];
})

const hasAnyBooks = computed(() => {
    if (!navs.value) return false;
    for (let nav of navs.value) {
        for (let tag of nav.tags) {
            if (tag.count > 0) {
                return true;
            }
        }
    }
    return false;
})

useHead({
    title: "书籍索引"
})
</script>
