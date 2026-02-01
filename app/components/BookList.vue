
<template>
  <div>
    <v-row>
      <v-col cols=12>
        <h2>{{ title }}</h2>
        <v-divider class="mt-3 mb-0"></v-divider>
      </v-col>

      <v-col cols=12>
        <BookCards :books="books"></BookCards>
      </v-col>

      <v-col cols=12>
        <v-container class="max-width">
          <v-pagination v-if="page_cnt > 1" v-model="page" :length="page_cnt" rounded="circle"
                        @update:model-value="change_page"></v-pagination>
        </v-container>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMainStore } from '@/stores/main'
import BookCards from '~/components/BookCards.vue'

const route = useRoute()
const router = useRouter()
const store = useMainStore()
const { $backend } = useNuxtApp()

store.setNavbar(true)

const title = ref("")
const books = ref([])
const total = ref(0)
const page_size = ref(60)
const page = ref(1)

const loadData = async () => {
    const fullPath = route.fullPath
    try {
        const rsp = await $backend(fullPath)
        if (rsp.err === 'ok') {
            title.value = rsp.title
            books.value = rsp.books || []
            total.value = rsp.total || 0
        }
    } catch (e) {
        console.error(e)
    }
}

// Initial load
await useAsyncData('book-list-' + route.fullPath, loadData)

// Calculate page from query
if (route.query.start) {
    page.value = 1 + Math.floor(parseInt(route.query.start) / page_size.value)
}

const page_cnt = computed(() => {
    return total.value > 0 ? Math.max(1, Math.ceil(total.value / page_size.value)) : 0
})

const change_page = (val) => {
    var r = { ...route.query }
    if (val < 1) val = 1
    r.start = (val - 1) * page_size.value
    r.size = page_size.value
    router.push({ query: r })
}

// Watch route changes to reload data (e.g. pagination)
watch(() => route.fullPath, () => {
    loadData()
})

useHead({
    title: () => title.value
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
</style>
