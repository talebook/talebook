<template>
    <div>
        <v-row align=start v-if="history.length == 0">
            <v-col cols=12>
                <p class="title"> 暂无阅读历史。请尽情<a to="/">畅游书籍的海洋</a>吧~ </p>
            </v-col>
        </v-row>
        <v-row v-else v-for="item in history" :key="item.name">
            <v-col cols=12>
                <legend>{{item.name}}</legend>
                <v-divider></v-divider>
            </v-col>
            <v-col cols=12 v-if="item.books.length==0" >
                <p class="pb-6">无记录</p>
            </v-col>
            <v-col cols=4 sm=2 v-else v-for="book in item.books" :key="item.name + book.id">
                <v-img :to="book.href" :src="book.img"> </v-img>
            </v-col>
        </v-row>
    </div>
</template>

<script>
export default {
    components: {
    },
    computed: {
        history: function() {
            if ( this.user.extra === undefined ) { return [] }
            return [
                { name: '在线阅读', books: this.get_history(this.user.extra.read_history) },
                { name: '推送过的书', books: this.get_history(this.user.extra.push_history) },
                { name: '浏览记录', books: this.get_history(this.user.extra.visit_history) },
            ]
        },
    },
    data: () => ({
        user: {},
    }),
    async asyncData({ params, app, res }) {
        if ( res !== undefined ) {
            res.setHeader('Cache-Control', 'no-cache');
        }
        return app.$backend("/user/info?detail=1");
    },
    head: () => ({
        title: "阅读记录",
    }),
    created() {
        this.init(this.$route);
    },
    beforeRouteUpdate(to, from, next) {
        this.init(to, next);
    },
    methods: {
        init(route, next) {
            this.$store.commit('navbar', true);
            this.$backend("/user/info?detail=1")
            .then( rsp => {
                this.user = rsp.user;
            });
            if ( next ) next();
        },
        get_history(his) {
            if ( ! his ) { return []; }
            return his.map( b => {
                b.href = '/book/' + b.id;
                return b;
            });
        },
    },
}
</script>

<style></style>
