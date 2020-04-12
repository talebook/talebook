<template>
    <div>
    <v-row >
        <v-col cols=12 align="baseline" >
            <h2>{{title}}</h2>
            <v-divider class="mt-3 mb-0"></v-divider>
        </v-col>

        <v-col>
            <book-cards :books="books"></book-cards>
        </v-col>

        <v-col cols=12 align="end" >
            <v-container class="max-width">
                <v-pagination v-if="page_cnt > 0" v-model="page" :length="page_cnt" circle @input="change_page"></v-pagination>
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
    computed: {
    },
    data: () => ({
        title: "",
        page: 1,
        books: [],
        total: 0,
        page_size: 30,
        page_cnt: 0,
        inited: false,
    }),
    created() {
        if ( this.$route.query.start != undefined ) {
            this.page = 1 + parseInt(this.$route.query.start / this.page_size)
        }
        if ( !this.inited ) {
            this.init(this.$route);
        }
    },
    beforeRouteEnter(to, from, next) {
        next(vm => { vm.init(to) });
    },
    beforeRouteUpdate(to, from, next) {
        this.init(to, next);
    },
    methods: {
        init(route, next) {
            this.inited = true;
            this.$store.commit('navbar', true);
            this.$store.commit('loading');
            this.backend(route.fullPath)
            .then(rsp => {
                if ( rsp.err != 'ok' ) {
                    this.alert("error", rsp.msg);
                    return;
                }
                this.title = rsp.title;
                this.books = rsp.books;
                this.total = rsp.total
                this.page_cnt = parseInt(this.total/this.page_size);
                if ( this.page_cnt < 1 ) { this.page_cnt = 1; }
                this.$store.commit('loaded');
            })
            if ( next ) next();
        },
        change_page() {
            var r = Object.assign({}, this.$route.query);
            if ( this.page < 1 ) { this.page = 1 }
            r.start = (this.page - 1) * this.page_size;
            r.size = this.page_size;
            //this.alert('success', r);
            this.$router.push({query: r});
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
