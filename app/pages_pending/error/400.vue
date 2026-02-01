<template>
  <div>
    <v-container fluid class="d-flex align-center justify-center min-vh-100">
      <v-row justify="center">
        <v-col cols="12" class="text-center">
          <h1 class="display-1 font-weight-bold mb-4">400</h1>
          <h2 class="text-h4 mb-8">请求错误</h2>
          <p class="text-body-1 mb-12">抱歉，您的请求无效或格式不正确，请检查后重试。</p>
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
  name: 'BadRequestPage',
  // 确保使用默认布局
  layout: 'default',
  head() {
    return {
      title: '400 - 请求错误',
    };
  },
};
</script>