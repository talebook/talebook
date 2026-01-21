<template>
  <div>
    <v-container fluid class="d-flex align-center justify-center min-vh-100">
      <v-row justify="center">
        <v-col cols="12" class="text-center">
          <h1 class="display-1 font-weight-bold mb-4">503</h1>
          <h2 class="text-h4 mb-8">服务不可用</h2>
          <p class="text-body-1 mb-12">抱歉，服务器暂时不可用，请稍后再试。</p>
          <v-btn
            color="primary"
            href="/"
            large
            rounded
          >
            返回首页
          </v-btn>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script>
export default {
  name: 'ServiceUnavailablePage',
  // 确保使用默认布局
  layout: 'default',
  head() {
    return {
      title: '503 - 服务不可用',
    };
  },
};
</script>