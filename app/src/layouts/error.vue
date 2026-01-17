<template>
  <v-app dark>
    <v-main>
      <v-container fluid class="d-flex align-center justify-center min-vh-100">
        <v-row justify="center">
          <v-col cols="12" class="text-center">
            <h1 class="display-1 font-weight-bold mb-4" v-if="error.statusCode === 404">
              {{ pageNotFound }}
            </h1>
            <h1 class="display-1 font-weight-bold mb-4" v-else>
              {{ otherError }}
            </h1>
            <v-btn
              color="primary"
              to="/"
              large
              rounded
              class="mt-8"
            >
              返回首页
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: "ErrorLayout",

  props: {
    error: {
      type: Object,
      default: null,
    },
  },
  created() {
    //this.$store.commit("puremode", true);
    // 当error.statusCode === 404时，跳转到/404页面
    if (this.error && this.error.statusCode === 404) {
      this.$router.push('/error/404');
    }
  },

  data() {
    return {
      pageNotFound: "404 Not Found",
      otherError: "An error occurred",
    };
  },
  head() {
    const title = this.error.statusCode === 404 ? this.pageNotFound : this.otherError;
    return {
      title,
    };
  },
};
</script>

<style scoped>
h1 {
  font-size: 3rem;
}
</style>

