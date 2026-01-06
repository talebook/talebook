<template>
    <v-row>
        <template v-if="meta == 'rating'">
            <v-col cols=4 sm=2 v-for="item in meta_items" :key="item.name" >
                <v-chip :to="item.href" outlined color="primary" >
                    {{item.name}}星
                    <span v-if="item.count">&nbsp;({{item.count}})</span>
                </v-chip>
            </v-col>
        </template >
        <v-col v-else>
            <v-chip small class="ma-1" v-for="item in meta_items" :to="item.href" :key="item.name" outlined color="primary" >
                {{item.name}}
                <span v-if="item.count">&nbsp;({{item.count}})</span>
            </v-chip>
            <v-btn v-if="total > items.length" @click="expand()" color="primary" rounded small>显示全部...</v-btn>
        </v-col>
    </v-row>
</template>

<script>
export default {
    computed: {
        page_cnt: function() {
            return Math.max(1, Math.ceil(this.total/this.page_size));
        },
        meta_items: function() {
            var prefix = this.$route.path + "/";
            return this.items.map(d => {
                d.href = prefix + encodeURIComponent(d.name);
                return d;
            });
        },
    },
    data: () => ({
        meta: "",
        page: 0,
        items: [],
        total: 0,
        show_all: false,
        page_size: 20,
    }),
    async asyncData({ app, route, res }) {
        if ( res !== undefined ) {
            res.setHeader('Cache-Control', 'no-cache');
        }
        return app.$backend(route.fullPath);
    },
    head() {
        var path = this.$route.path;
        var titles = {
            tag: "全部标签",
            series: "全部丛书",
            rating: "全部评分",
            author: "全部作者",
            publisher: "全部出版社",
        }
        var meta = this.$route.path.split("/")[1];
        if ( titles[meta] !== undefined ) {
            return {
                title: titles[meta],
            }
        }
        return {};
    },
    created() {
        //this.init(this.$route);
    },
    beforeRouteEnter(to, from, next) {
        next();
    },
    beforeRouteUpdate(to, from, next) {
        this.init(to, next);
    },
    methods: {
        init(route, next) {
            this.$store.commit('navbar', true);
            this.meta = this.$route.path.split("/")[1];
            this.$backend("/"+this.meta + (this.show_all?"?show=all":"") )
            .then(rsp => {
                this.items = rsp.items;
                this.total = rsp.total;
            })
            if ( next ) next()
        },
        expand() {
            this.show_all = !this.show_all;
            this.init(this.$route);
        },
    },
}
</script>