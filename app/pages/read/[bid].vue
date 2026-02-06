<template>
  <div>Redirecting...</div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { onMounted } from 'vue'

const route = useRoute()
const router = useRouter()
const bookid = route.params.bid

onMounted(() => {
  // 保持原有逻辑：前端直接访问 /read/:id 时，重定向到 /book/:id/readtxt
  // 注意：实际后端也会做这个判断，但前端路由也需要处理直接访问的情况
  router.replace(`/book/${bookid}/readtxt`)
})
</script>
