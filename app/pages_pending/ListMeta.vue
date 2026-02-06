<template>
    <div>
        <v-row>
            <template v-if="meta == 'rating'">
                <v-col
                    v-for="item in meta_items"
                    :key="item.name"
                    cols="4"
                    sm="2"
                >
                    <v-chip
                        :to="item.href"
                        outlined
                        color="primary"
                    >
                        {{ item.name }}星
                        <span v-if="item.count">&nbsp;({{ item.count }})</span>
                    </v-chip>
                </v-col>
            </template>
            <v-col v-else>
                <v-chip
                    v-for="item in meta_items"
                    :key="item.name"
                    small
                    class="ma-1"
                    :to="item.href"
                    outlined
                    color="primary"
                >
                    {{ item.name }}
                    <span v-if="item.count">&nbsp;({{ item.count }})</span>
                </v-chip>
                <v-btn
                    v-if="total > items.length"
                    color="primary"
                    rounded
                    small
                    @click="expand()"
                >
                    显示全部...
                </v-btn>
            </v-col>
        </v-row>
        
        <!-- 空状态提示 -->
        <v-row
            v-if="meta_items.length === 0"
            class="empty-state"
        >
            <v-col cols="12">
                <v-card class="ma-1 pa-6 text-center">
                    <v-icon
                        large
                        color="grey lighten-2"
                    >
                        mdi-book-open-variant
                    </v-icon>
                    <h3 class="text-h6 grey--text">
                        本书库暂无藏书
                    </h3>
                    <p class="text-caption grey--text">
                        请先添加书籍到书库
                    </p>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<script>
export default {
    beforeRouteEnter(to, from, next) {
        next();
    },
    beforeRouteUpdate(to, from, next) {
        this.init(to, next);
    },
    async asyncData({ app, route, res }) {
        if ( res !== undefined ) {
            res.setHeader('Cache-Control', 'no-cache');
        }
        return app.$backend(route.fullPath);
    },
    data: () => ({
        meta: '',
        page: 0,
        items: [],
        total: 0,
        show_all: false,
        page_size: 20,
    }),
    head() {
        var path = this.$route.path;
        var titles = {
            tag: '全部标签',
            series: '全部丛书',
            rating: '全部评分',
            author: '全部作者',
            publisher: '全部出版社',
            format: '全部格式',
        };
        var meta = this.$route.path.split('/')[1];
        if ( titles[meta] !== undefined ) {
            return {
                title: titles[meta],
            };
        }
        return {};
    },
    computed: {
        page_cnt: function() {
            return Math.max(1, Math.ceil(this.total/this.page_size));
        },
        meta_items: function() {
            var prefix = this.$route.path + '/';
            return this.items.map(d => {
                d.href = prefix + encodeURIComponent(d.name);
                return d;
            });
        },
    },
    created() {
        //this.init(this.$route);
    },
    methods: {
        init(route, next) {
            this.$store.commit('navbar', true);
            this.meta = this.$route.path.split('/')[1];
            this.$backend('/'+this.meta + (this.show_all?'?show=all':'') )
                .then(rsp => {
                    this.items = rsp.items;
                    this.total = rsp.total;
                });
            if ( next ) next();
        },
        expand() {
            this.show_all = !this.show_all;
            this.init(this.$route);
        },
    },
};
</script>