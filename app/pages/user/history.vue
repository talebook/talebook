<template>
  <div>
    <v-row align="start" v-if="history.length == 0">
      <v-col cols="12">
        <p class="title"> 暂无阅读历史。请尽情<NuxtLink to="/">畅游书籍的海洋</NuxtLink>吧~ </p>
      </v-col>
    </v-row>
    <v-row v-else v-for="item in history" :key="item.name">
      <v-col cols="12">
        <legend>{{ item.name }}</legend>
        <v-divider></v-divider>
      </v-col>
      <v-col cols="12" v-if="item.books.length == 0">
        <p class="pb-6">无记录</p>
      </v-col>
      <v-col cols="4" sm="2" v-else v-for="book in item.books" :key="item.name + book.id">
        <v-card :to="book.href" class="ma-1">
          <v-img :src="book.img" :aspect-ratio="11 / 15"> </v-img>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMainStore } from '@/stores/main'

const { $backend } = useNuxtApp()
const mainStore = useMainStore()
const user = ref({})

useHead({
  title: "阅读记录",
})

const get_history = (his) => {
  if (!his) { return []; }
  return his.map(b => {
    b.href = '/book/' + b.id;
    return b;
  });
}

const history = computed(() => {
  if (user.value.extra === undefined) { return [] }
  return [
    { name: '在线阅读', books: get_history(user.value.extra.read_history) },
    { name: '推送过的书', books: get_history(user.value.extra.push_history) },
    { name: '浏览记录', books: get_history(user.value.extra.visit_history) },
  ]
})

onMounted(() => {
  mainStore.setNavbar(true)
  $backend("/user/info?detail=1")
    .then(rsp => {
      user.value = rsp.user;
    });
})
</script>

<style></style>
