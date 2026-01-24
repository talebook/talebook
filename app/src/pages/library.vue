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
              <v-chip @click="updateFilter('publisher', '全部')" :color="filters.publisher === '全部' ? 'primary' : 'grey lighten-2'" :text-color="filters.publisher === '全部' ? 'white' : 'black'" label small>{{ '全部' }}</v-chip>
              <v-chip v-for="item in filterOptions.publisher.slice(0, 10)" :key="item.id" @click="updateFilter('publisher', item.name)" :color="filters.publisher === item.name ? 'primary' : 'grey lighten-2'" :text-color="filters.publisher === item.name ? 'white' : 'black'" label small>{{ item.name }}</v-chip>
              <template v-if="filterOptions.publisher.length > 10">
                <v-chip @click="expanded.publisher = !expanded.publisher" color="white" text-color="primary" outlined label small>{{ expanded.publisher ? '收起' : `更多(${filterOptions.publisher.length - 10})` }}</v-chip>
              </template>
            </v-chip-group>
          </div>
          <!-- 展开的标签从下一行开始显示 -->
          <template v-if="filterOptions.publisher.length > 10 && expanded.publisher">
            <div class="d-flex align-center mt-1">
              <span class="mr-3"></span>
              <v-chip-group column="false" class="flex-grow-1">
                <v-chip v-for="item in filterOptions.publisher.slice(10)" :key="item.id" @click="updateFilter('publisher', item.name)" :color="filters.publisher === item.name ? 'primary' : 'grey lighten-2'" :text-color="filters.publisher === item.name ? 'white' : 'black'" label small>{{ item.name }}</v-chip>
              </v-chip-group>
            </div>
          </template>
        </div>

        <!-- 作者筛选 -->
        <div class="mb-2">
          <div class="d-flex align-center">
            <span class="mr-3">作者：</span>
            <v-chip-group column="false" class="flex-grow-1">
              <v-chip @click="updateFilter('author', '全部')" :color="filters.author === '全部' ? 'primary' : 'grey lighten-2'" :text-color="filters.author === '全部' ? 'white' : 'black'" label small>{{ '全部' }}</v-chip>
              <v-chip v-for="item in filterOptions.author.slice(0, 10)" :key="item.id" @click="updateFilter('author', item.name)" :color="filters.author === item.name ? 'primary' : 'grey lighten-2'" :text-color="filters.author === item.name ? 'white' : 'black'" label small>{{ item.name }}</v-chip>
              <template v-if="filterOptions.author.length > 10">
                <v-chip @click="expanded.author = !expanded.author" color="white" text-color="primary" outlined label small>{{ expanded.author ? '收起' : `更多(${filterOptions.author.length - 10})` }}</v-chip>
              </template>
            </v-chip-group>
          </div>
          <!-- 展开的标签从下一行开始显示 -->
          <template v-if="filterOptions.author.length > 10 && expanded.author">
            <div class="d-flex align-center mt-1">
              <span class="mr-3"></span>
              <v-chip-group column="false" class="flex-grow-1">
                <v-chip v-for="item in filterOptions.author.slice(10)" :key="item.id" @click="updateFilter('author', item.name)" :color="filters.author === item.name ? 'primary' : 'grey lighten-2'" :text-color="filters.author === item.name ? 'white' : 'black'" label small>{{ item.name }}</v-chip>
              </v-chip-group>
            </div>
          </template>
        </div>

        <!-- 标签筛选 -->
        <div class="mb-2">
          <div class="d-flex align-center">
            <span class="mr-3">标签：</span>
            <v-chip-group column="false" class="flex-grow-1">
              <v-chip @click="updateFilter('tag', '全部')" :color="filters.tag === '全部' ? 'primary' : 'grey lighten-2'" :text-color="filters.tag === '全部' ? 'white' : 'black'" label small>{{ '全部' }}</v-chip>
              <v-chip v-for="item in filterOptions.tag.slice(0, 10)" :key="item.id" @click="updateFilter('tag', item.name)" :color="filters.tag === item.name ? 'primary' : 'grey lighten-2'" :text-color="filters.tag === item.name ? 'white' : 'black'" label small>{{ item.name }}</v-chip>
              <template v-if="filterOptions.tag.length > 10">
                <v-chip @click="expanded.tag = !expanded.tag" color="white" text-color="primary" outlined label small>{{ expanded.tag ? '收起' : `更多(${filterOptions.tag.length - 10})` }}</v-chip>
              </template>
            </v-chip-group>
          </div>
          <!-- 展开的标签从下一行开始显示 -->
          <template v-if="filterOptions.tag.length > 10 && expanded.tag">
            <div class="d-flex align-center mt-1">
              <span class="mr-3"></span>
              <v-chip-group column="false" class="flex-grow-1">
                <v-chip v-for="item in filterOptions.tag.slice(10)" :key="item.id" @click="updateFilter('tag', item.name)" :color="filters.tag === item.name ? 'primary' : 'grey lighten-2'" :text-color="filters.tag === item.name ? 'white' : 'black'" label small>{{ item.name }}</v-chip>
              </v-chip-group>
            </div>
          </template>
        </div>

        <!-- 文件格式筛选 -->
        <div class="mb-3">
          <div class="d-flex align-center">
            <span class="mr-3">文件格式：</span>
            <v-chip-group column="false" class="flex-grow-1">
              <v-chip @click="updateFilter('format', '全部')" :color="filters.format === '全部' ? 'primary' : 'grey lighten-2'" :text-color="filters.format === '全部' ? 'white' : 'black'" label small>{{ '全部' }}</v-chip>
              <v-chip v-for="item in filterOptions.format.slice(0, 10)" :key="item.id" @click="updateFilter('format', item.name)" :color="filters.format === item.name ? 'primary' : 'grey lighten-2'" :text-color="filters.format === item.name ? 'white' : 'black'" label small>{{ item.name }}</v-chip>
              <template v-if="filterOptions.format.length > 10">
                <v-chip @click="expanded.format = !expanded.format" color="white" text-color="primary" outlined label small>{{ expanded.format ? '收起' : `更多(${filterOptions.format.length - 10})` }}</v-chip>
              </template>
            </v-chip-group>
          </div>
          <!-- 展开的标签从下一行开始显示 -->
          <template v-if="filterOptions.format.length > 10 && expanded.format">
            <div class="d-flex align-center mt-1">
              <span class="mr-3"></span>
              <v-chip-group column="false" class="flex-grow-1">
                <v-chip v-for="item in filterOptions.format.slice(10)" :key="item.id" @click="updateFilter('format', item.name)" :color="filters.format === item.name ? 'primary' : 'grey lighten-2'" :text-color="filters.format === item.name ? 'white' : 'black'" label small>{{ item.name }}</v-chip>
              </v-chip-group>
            </div>
          </template>
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
    },
    expanded: {
      publisher: false,
      author: false,
      tag: false,
      format: false
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
    // 页码和总数由fetchBooks方法处理
  },
  mounted() {
    // loadFilterOptions已在init方法中调用
  },
  beforeRouteUpdate(to, from, next) {
    this.init(to, next);
  },
  methods: {
    init(route, next) {
      this.inited = true;
      this.$store.commit('navbar', true);
      
      // 从URL查询参数中解析筛选条件
      const query = route.query;
      Object.keys(this.filters).forEach(key => {
        if (query[key] && query[key] !== '全部') {
          this.filters[key] = query[key];
        }
      });
      
      // 解析页码
      let page = 1;
      if (query.start) {
        page = 1 + parseInt(query.start / this.page_size);
      }
      
      this.fetchBooks(page);
      this.loadFilterOptions();
      
      if (next) next();
    },
    change_page() {
      // 直接调用fetchBooks获取对应页码的数据
      this.fetchBooks(this.page);
    },
    updateFilter(type, value) {
      this.filters[type] = value;
      // 更新筛选条件后重新获取书籍数据，重置到第一页
      this.fetchBooks(1);
    },
    async fetchBooks(page = 1) {
      // 构建查询参数
      const query = {
        start: (page - 1) * this.page_size,
        size: this.page_size
      };
      
      // 添加筛选条件
      Object.keys(this.filters).forEach(key => {
        if (this.filters[key] !== '全部') {
          query[key] = this.filters[key];
        }
      });
      
      // 构建查询字符串
      const queryString = Object.keys(query)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
        .join('&');
      
      try {
        const rsp = await this.$backend(`/library?${queryString}`);
        if (rsp.err === 'exception' || rsp.err === 'network_error') {
          this.alert("error", rsp.msg);
          return;
        }
        
        this.books = rsp.books || [];
        this.total = rsp.total || 0;
        this.page_cnt = this.total > 0 ? Math.max(1, Math.ceil(this.total / this.page_size)) : 0;
        this.page = page;
      } catch (error) {
        console.error('Failed to fetch books:', error);
        this.alert("error", "获取书籍数据失败");
      }
    },
    async loadFilterOptions() {
      // 获取所有筛选条件的选项
      const filterTypes = ['publisher', 'author', 'tag', 'format'];
      for (const type of filterTypes) {
        try {
          const rsp = await this.$backend(`/${type}?show=all`);
          if (rsp.items) {
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
