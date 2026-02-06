<template>
    <div>
        <v-row>
            <template v-for="nav in navs" :key="nav.legend">
                <v-col cols="12">
                    <h2>{{ nav.legend }}</h2>
                    <v-btn
                        rounded
                        size="small"
                        class="ma-1"
                        v-for="item in nav.tags"
                        :to="'/tag/' + encodeURIComponent(item.name)"
                        :key="item.name"
                        variant="outlined"
                        :color="item.count !== 0 ? 'primary' : 'grey'"
                    >
                        {{ item.name }}
                        <span v-if="item.count">&nbsp;({{ item.count }})</span>
                    </v-btn>
                </v-col>
            </template>
        </v-row>

        <!-- 空状态提示 -->
        <v-row v-if="!hasAnyBooks" class="empty-state">
            <v-col cols="12">
                <v-card class="ma-1 pa-6 text-center">
                    <v-icon size="large" color="grey-lighten-2">mdi-book-open-variant</v-icon>
                    <h3 class="text-h6 text-grey">本书库暂无藏书</h3>
                    <p class="text-caption text-grey">请先添加书籍到书库</p>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useMainStore } from '@/stores/main'

const store = useMainStore()
const { $backend } = useNuxtApp()

const navs = ref([])

// 修复1: 移除 await，正确使用 useAsyncData
const { data: navData } = useAsyncData('nav', async () => {
    try {
        const response = await $backend('/book/nav')
        return response
    } catch (error) {
        console.error('获取导航数据失败:', error)
        return { navs: [] }
    }
})

// 修复2: 使用 watch 监听数据变化
watch(navData, (newData) => {
    if (newData) {
        navs.value = newData.navs || []
    }
}, { immediate: true })

const hasAnyBooks = computed(() => {
    for (const nav of navs.value) {
        for (const tag of nav.tags) {
            if (tag.count > 0) {
                return true
            }
        }
    }
    return false
})

store.setNavbar(true)

useHead({
    title: '书籍索引'
})
</script>
