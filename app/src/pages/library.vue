<template>
  <div>
    <v-row>
      <v-col cols=12>
        <h2>{{ title }}</h2>
        <v-divider class="mt-3 mb-0"></v-divider>
      </v-col>

      <v-col cols=12>
        <!-- 出版社筛选 -->
        <div class="d-flex align-center mb-2">
          <span class="mr-3">出版社：</span>
          <v-chip-group column="false">
            <v-chip @click="updateFilter('publisher', '全部')" :color="filters.publisher === '全部' ? 'primary' : 'grey lighten-2'" label small>{{ '全部' }}</v-chip>
            <v-chip v-for="item in filterOptions.publisher" :key="item.id" @click="updateFilter('publisher', item.name)" :color="filters.publisher === item.name ? 'primary' : 'grey lighten-2'" label small>{{ item.name }}</v-chip>
          </v-chip-group>
        </div>

        <!-- 作者筛选 -->
        <div class="d-flex align-center mb-2">
          <span class="mr-3">作者：</span>
          <v-chip-group column="false">
            <v-chip @click="updateFilter('author', '全部')" :color="filters.author === '全部' ? 'primary' : 'grey lighten-2'" label small>{{ '全部' }}</v-chip>
            <v-chip v-for="item in filterOptions.author" :key="item.id" @click="updateFilter('author', item.name)" :color="filters.author === item.name ? 'primary' : 'grey lighten-2'" label small>{{ item.name }}</v-chip>
          </v-chip-group>
        </div>

        <!-- 标签筛选 -->
        <div class="d-flex align-center mb-2">
          <span class="mr-3">标签：</span>
          <v-chip-group column="false">
            <v-chip @click="updateFilter('tag', '全部')" :color="filters.tag === '全部' ? 'primary' : 'grey lighten-2'" label small>{{ '全部' }}</v-chip>
            <v-chip v-for="item in filterOptions.tag" :key="item.id" @click="updateFilter('tag', item.name)" :color="filters.tag === item.name ? 'primary' : 'grey lighten-2'" label small>{{ item.name }}</v-chip>
          </v-chip-group>
        </div>

        <!-- 文件格式筛选 -->
        <div class="d-flex align-center mb-3">
          <span class="mr-3">文件格式：</span>
          <v-chip-group column="false">
            <v-chip @click="updateFilter('format', '全部')" :color="filters.format === '全部' ? 'primary' : 'grey lighten-2'" label small>{{ '全部' }}</v-chip>
            <v-chip v-for="item in filterOptions.format" :key="item.id" @click="updateFilter('format', item.name)" :color="filters.format === item.name ? 'primary' : 'grey lighten-2'" label small>{{ item.name }}</v-chip>
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
      publisher: "全部",
      author: "全部",
      tag: "全部",
      format: "全部"
    },
    filterOptions: {
      publisher: [],
      author: [],
      tag: [],
      format: []
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
    this.loadFilterOptions();
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
    },
    async loadFilterOptions() {
      // 获取所有筛选条件的选项
      const filterTypes = ['publisher', 'author', 'tag', 'format'];
      for (const type of filterTypes) {
        try {
          const rsp = await this.$backend(`/api/${type}?show=all`);
          if (rsp.err === 'ok') {
            this.filterOptions[type] = rsp.items;
          }
        } catch (error) {
          console.error(`Failed to load ${type} options:`, error);
        }
      }
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
