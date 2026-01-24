<template>
  <div>
    <v-row>
      <v-col cols=12>
        <h2>{{ title }}</h2>
        <v-divider class="mt-3 mb-0"></v-divider>
      </v-col>

      <v-col cols=12>
        <!-- 读者筛选 -->
        <div class="d-flex align-center mb-2">
          <span class="mr-3">读者：</span>
          <v-chip-group column="false">
            <v-chip @click="updateFilter('reader', '全部')" :color="filters.reader === '全部' ? 'primary' : 'grey lighten-2'" label small>{{ '全部' }}</v-chip>
            <v-chip @click="updateFilter('reader', '男生')" :color="filters.reader === '男生' ? 'primary' : 'grey lighten-2'" label small>{{ '男生' }}</v-chip>
            <v-chip @click="updateFilter('reader', '女生')" :color="filters.reader === '女生' ? 'primary' : 'grey lighten-2'" label small>{{ '女生' }}</v-chip>
          </v-chip-group>
        </div>

        <!-- 分类筛选 -->
        <div class="d-flex align-center mb-2">
          <span class="mr-3">分类：</span>
          <v-chip-group column="false">
            <v-chip @click="updateFilter('category', '全部')" :color="filters.category === '全部' ? 'primary' : 'grey lighten-2'" label small>{{ '全部' }}</v-chip>
            <v-chip @click="updateFilter('category', '主题')" :color="filters.category === '主题' ? 'primary' : 'grey lighten-2'" label small>{{ '主题' }}</v-chip>
            <v-chip @click="updateFilter('category', '角色')" :color="filters.category === '角色' ? 'primary' : 'grey lighten-2'" label small>{{ '角色' }}</v-chip>
            <v-chip @click="updateFilter('category', '情节')" :color="filters.category === '情节' ? 'primary' : 'grey lighten-2'" label small>{{ '情节' }}</v-chip>
          </v-chip-group>
        </div>

        <!-- 状态筛选 -->
        <div class="d-flex align-center mb-2">
          <span class="mr-3">状态：</span>
          <v-chip-group column="false">
            <v-chip @click="updateFilter('status', '全部')" :color="filters.status === '全部' ? 'primary' : 'grey lighten-2'" label small>{{ '全部' }}</v-chip>
            <v-chip @click="updateFilter('status', '已完结')" :color="filters.status === '已完结' ? 'primary' : 'grey lighten-2'" label small>{{ '已完结' }}</v-chip>
            <v-chip @click="updateFilter('status', '连载中')" :color="filters.status === '连载中' ? 'primary' : 'grey lighten-2'" label small>{{ '连载中' }}</v-chip>
          </v-chip-group>
        </div>

        <!-- 字数筛选 -->
        <div class="d-flex align-center mb-3">
          <span class="mr-3">字数：</span>
          <v-chip-group column="false">
            <v-chip @click="updateFilter('wordCount', '全部')" :color="filters.wordCount === '全部' ? 'primary' : 'grey lighten-2'" label small>{{ '全部' }}</v-chip>
            <v-chip @click="updateFilter('wordCount', '30万以下')" :color="filters.wordCount === '30万以下' ? 'primary' : 'grey lighten-2'" label small>{{ '30万以下' }}</v-chip>
            <v-chip @click="updateFilter('wordCount', '30-50万')" :color="filters.wordCount === '30-50万' ? 'primary' : 'grey lighten-2'" label small>{{ '30-50万' }}</v-chip>
            <v-chip @click="updateFilter('wordCount', '50-100万')" :color="filters.wordCount === '50-100万' ? 'primary' : 'grey lighten-2'" label small>{{ '50-100万' }}</v-chip>
            <v-chip @click="updateFilter('wordCount', '100-200万')" :color="filters.wordCount === '100-200万' ? 'primary' : 'grey lighten-2'" label small>{{ '100-200万' }}</v-chip>
            <v-chip @click="updateFilter('wordCount', '200万以上')" :color="filters.wordCount === '200万以上' ? 'primary' : 'grey lighten-2'" label small>{{ '200万以上' }}</v-chip>
          </v-chip-group>
        </div>
      </v-col>

      <v-col>
        <book-cards :books="books"></book-cards>
      </v-col>

      <v-col cols=12>
        <v-container class="max-width">
          <v-pagination v-if="page_cnt > 0" v-model="page" :length="page_cnt" circle
                        @input="change_page"></v-pagination>
        </v-container>
        <div class="text-xs-center book-pager">
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import BookCards from "../components/BookCards.vue";

export default {
  components: {
    BookCards,
  },
  computed: {},
  data: () => ({
    title: "书库",
    page: 1,
    books: [],
    total: 0,
    page_size: 60,
    page_cnt: 0,
    inited: false,
    filters: {
      reader: "全部",
      category: "全部",
      status: "全部",
      wordCount: "全部"
    }
  }),
  async asyncData({route, app, res}) {
    if (res !== undefined) {
      res.setHeader('Cache-Control', 'no-cache');
    }
    return app.$backend(route.fullPath);
  },
  head() {
    return {
      title: "书库"
    };
  },
  created() {
    if (this.$route.query.start != undefined) {
      this.page = 1 + parseInt(this.$route.query.start / this.page_size);
    }
    this.page_cnt = this.total > 0 ? Math.max(1, Math.ceil(this.total / this.page_size)) : 0;
  },

  beforeRouteUpdate(to, from, next) {
    this.init(to, next);
  },
  methods: {
    init(route, next) {
      this.inited = true;
      this.$store.commit('navbar', true);
      this.$backend(route.fullPath)
        .then(rsp => {
          if (rsp.err != 'ok') {
            this.alert("error", rsp.msg);
            return;
          }
          this.title = rsp.title;
          this.books = rsp.books;
          this.total = rsp.total;
          this.page_cnt = this.total > 0 ? Math.max(1, Math.ceil(this.total / this.page_size)) : 0;
        });
      if (next) next();
    },
    change_page() {
      var r = Object.assign({}, this.$route.query);
      if (this.page < 1) {
        this.page = 1;
      }
      r.start = (this.page - 1) * this.page_size;
      r.size = this.page_size;
      this.$router.push({query: r});
    },
    updateFilter(type, value) {
      this.filters[type] = value;
      // 这里可以添加筛选逻辑，例如调用 API 获取筛选后的书籍数据
      // 目前暂时只更新 UI 状态
    }
  },
}
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
