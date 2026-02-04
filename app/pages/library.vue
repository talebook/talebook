<template>
  <div>
    <v-row>
      <v-col cols=12>
        <h2>{{ title }}</h2>
        <v-divider class="mt-3 mb-0"></v-divider>
      </v-col>

      <v-col cols=12>
        <!-- 出版社筛选 -->
        <div class="mb-2">
          <div class="d-flex align-center">
            <span class="mr-3">出版社：</span>
            <v-chip-group column="false" class="flex-grow-1">
              <v-chip @click="updateFilter('publisher', '全部')" :class="filters.publisher === '全部' ? 'filter-chip-active' : 'filter-chip-inactive'" density="compact" label small>{{ '全部' }}</v-chip>
              <v-chip v-for="item in filterOptions.publisher.slice(0, 10)" :key="item.id" @click="updateFilter('publisher', item.name)" :class="filters.publisher === item.name ? 'filter-chip-active' : 'filter-chip-inactive'" density="compact" label small>{{ item.name }}</v-chip>
              <template v-if="filterOptions.publisher.length > 10">
                <v-chip @click="expanded.publisher = !expanded.publisher" class="filter-chip-more" density="compact" label small>{{ expanded.publisher ? '收起' : `更多(${filterOptions.publisher.length - 10})` }}</v-chip>
              </template>
            </v-chip-group>
          </div>
          <!-- 展开的标签从下一行开始显示 -->
          <template v-if="filterOptions.publisher.length > 10 && expanded.publisher">
            <div class="d-flex align-center mt-1">
              <span class="mr-3"></span>
              <v-chip-group column="false" class="flex-grow-1">
                <v-chip v-for="item in filterOptions.publisher.slice(10)" :key="item.id" @click="updateFilter('publisher', item.name)" :class="filters.publisher === item.name ? 'filter-chip-active' : 'filter-chip-inactive'" density="compact" label small>{{ item.name }}</v-chip>
              </v-chip-group>
            </div>
          </template>
        </div>

        <!-- 作者筛选 -->
        <div class="mb-2">
          <div class="d-flex align-center">
            <span class="mr-3">作者：</span>
            <v-chip-group column="false" class="flex-grow-1">
              <v-chip @click="updateFilter('author', '全部')" :class="filters.author === '全部' ? 'filter-chip-active' : 'filter-chip-inactive'" density="compact" label small>{{ '全部' }}</v-chip>
              <v-chip v-for="item in filterOptions.author.slice(0, 10)" :key="item.id" @click="updateFilter('author', item.name)" :class="filters.author === item.name ? 'filter-chip-active' : 'filter-chip-inactive'" density="compact" label small>{{ item.name }}</v-chip>
              <template v-if="filterOptions.author.length > 10">
                <v-chip @click="expanded.author = !expanded.author" class="filter-chip-more" density="compact" label small>{{ expanded.author ? '收起' : `更多(${filterOptions.author.length - 10})` }}</v-chip>
              </template>
            </v-chip-group>
          </div>
          <!-- 展开的标签从下一行开始显示 -->
          <template v-if="filterOptions.author.length > 10 && expanded.author">
            <div class="d-flex align-center mt-1">
              <span class="mr-3"></span>
              <v-chip-group column="false" class="flex-grow-1">
                <v-chip v-for="item in filterOptions.author.slice(10)" :key="item.id" @click="updateFilter('author', item.name)" :class="filters.author === item.name ? 'filter-chip-active' : 'filter-chip-inactive'" density="compact" label small>{{ item.name }}</v-chip>
              </v-chip-group>
            </div>
          </template>
        </div>

        <!-- 标签筛选 -->
        <div class="mb-2">
          <div class="d-flex align-center">
            <span class="mr-3">标签：</span>
            <v-chip-group column="false" class="flex-grow-1">
              <v-chip @click="updateFilter('tag', '全部')" :class="filters.tag === '全部' ? 'filter-chip-active' : 'filter-chip-inactive'" density="compact" label small>{{ '全部' }}</v-chip>
              <v-chip v-for="item in filterOptions.tag.slice(0, 10)" :key="item.id" @click="updateFilter('tag', item.name)" :class="filters.tag === item.name ? 'filter-chip-active' : 'filter-chip-inactive'" density="compact" label small>{{ item.name }}</v-chip>
              <template v-if="filterOptions.tag.length > 10">
                <v-chip @click="expanded.tag = !expanded.tag" class="filter-chip-more" density="compact" label small>{{ expanded.tag ? '收起' : `更多(${filterOptions.tag.length - 10})` }}</v-chip>
              </template>
            </v-chip-group>
          </div>
          <!-- 展开的标签从下一行开始显示 -->
          <template v-if="filterOptions.tag.length > 10 && expanded.tag">
            <div class="d-flex align-center mt-1">
              <span class="mr-3"></span>
              <v-chip-group column="false" class="flex-grow-1">
                <v-chip v-for="item in filterOptions.tag.slice(10)" :key="item.id" @click="updateFilter('tag', item.name)" :class="filters.tag === item.name ? 'filter-chip-active' : 'filter-chip-inactive'" density="compact" label small>{{ item.name }}</v-chip>
              </v-chip-group>
            </div>
          </template>
        </div>

        <!-- 文件格式筛选 -->
        <div class="mb-3">
          <div class="d-flex align-center">
            <span class="mr-3">文件格式：</span>
            <v-chip-group column="false" class="flex-grow-1">
              <v-chip @click="updateFilter('format', '全部')" :class="filters.format === '全部' ? 'filter-chip-active' : 'filter-chip-inactive'" density="compact" label small>{{ '全部' }}</v-chip>
              <v-chip v-for="item in filterOptions.format.slice(0, 10)" :key="item.id" @click="updateFilter('format', item.name)" :class="filters.format === item.name ? 'filter-chip-active' : 'filter-chip-inactive'" density="compact" label small>{{ item.name }}</v-chip>
              <template v-if="filterOptions.format.length > 10">
                <v-chip @click="expanded.format = !expanded.format" class="filter-chip-more" density="compact" label small>{{ expanded.format ? '收起' : `更多(${filterOptions.format.length - 10})` }}</v-chip>
              </template>
            </v-chip-group>
          </div>
          <!-- 展开的标签从下一行开始显示 -->
          <template v-if="filterOptions.format.length > 10 && expanded.format">
            <div class="d-flex align-center mt-1">
              <span class="mr-3"></span>
              <v-chip-group column="false" class="flex-grow-1">
                <v-chip v-for="item in filterOptions.format.slice(10)" :key="item.id" @click="updateFilter('format', item.name)" :class="filters.format === item.name ? 'filter-chip-active' : 'filter-chip-inactive'" density="compact" label small>{{ item.name }}</v-chip>
              </v-chip-group>
            </div>
          </template>
        </div>
      </v-col>

      <v-col>
        <BookCards :books="books"></BookCards>
      </v-col>

      <v-col cols=12>
        <v-container class="max-width">
          <v-pagination v-if="page_cnt > 0" v-model="page" :length="page_cnt" circle
                        @update:model-value="change_page"></v-pagination>
        </v-container>
        <div class="text-xs-center book-pager">
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import BookCards from "~/components/BookCards.vue";
import { useMainStore } from '@/stores/main'

const store = useMainStore()
const { $backend, $alert } = useNuxtApp()
const route = useRoute()

store.setNavbar(true)

const title = ref("书库")
const page = ref(1)
const books = ref([])
const total = ref(0)
const page_size = 60
const page_cnt = ref(1)
const inited = ref(false)

const filters = ref({
  publisher: "全部",
  author: "全部",
  tag: "全部",
  format: "全部"
})

const filterOptions = ref({
  publisher: [],
  author: [],
  tag: [],
  format: []
})

const expanded = ref({
  publisher: false,
  author: false,
  tag: false,
  format: false
})

// 监听total变化，动态更新page_cnt
watch(total, (newTotal) => {
  page_cnt.value = newTotal > 0 ? Math.max(1, Math.ceil(newTotal / page_size)) : 0
})

// 构建查询参数
const buildQuery = (p = 1) => {
  const query = {
    start: (p - 1) * page_size,
    size: page_size
  }
  
  // 添加筛选条件
  Object.keys(filters.value).forEach(key => {
    if (filters.value[key] !== '全部') {
      query[key] = filters.value[key]
    }
  })
  
  return query
}

// 获取书籍数据
const fetchBooks = async (p = 1) => {
  try {
    const rsp = await $backend(`/library`, { query: buildQuery(p) })
    if (rsp.err === 'exception' || rsp.err === 'network_error') {
      if ($alert) $alert('error', rsp.msg)
      return
    }
    
    books.value = rsp.books || []
    total.value = rsp.total || 0
    page_cnt.value = total.value > 0 ? Math.max(1, Math.ceil(total.value / page_size)) : 0
    page.value = p
    title.value = rsp.title || "书库"
  } catch (error) {
    console.error('Failed to fetch books:', error)
    if ($alert) $alert('error', '获取书籍数据失败')
  }
}

// 加载筛选选项
const loadFilterOptions = async () => {
  const filterTypes = ['publisher', 'author', 'tag', 'format']
  for (const type of filterTypes) {
    try {
      const rsp = await $backend(`/${type}?show=all`)
      if (rsp.items) {
        filterOptions.value[type] = rsp.items
      }
    } catch (error) {
      console.error(`Failed to load ${type} options:`, error)
    }
  }
}

// 初始化函数
const init = async () => {
  inited.value = true
  
  // 从URL查询参数中解析筛选条件
  const query = route.query
  Object.keys(filters.value).forEach(key => {
    if (query[key] && query[key] !== '全部') {
      filters.value[key] = query[key]
    }
  })
  
  // 解析页码
  let p = 1
  if (query.start) {
    p = 1 + parseInt(query.start / page_size)
  }
  
  await fetchBooks(p)
  await loadFilterOptions()
}

// 翻页
const change_page = (newPage) => {
  page.value = newPage
  fetchBooks(newPage)
}

// 更新筛选
const updateFilter = (type, value) => {
  filters.value[type] = value
  // 更新筛选条件后重新获取书籍数据，重置到第一页
  fetchBooks(1)
}

// 监听路由变化
watch(() => route.query, () => {
  if (inited.value) {
    init()
  }
}, { deep: true })

// 初始加载
onMounted(() => {
  init()
})

useHead({
  title: "书库"
})
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
