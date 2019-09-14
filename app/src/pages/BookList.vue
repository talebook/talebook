<template>
    <div>
    <v-row >
        <v-col cols=12 align="baseline">
            <h2>{{title}}</h2>
            <v-divider class="book-list-legend"></v-divider>
        </v-col>

        <v-col>
            <book-cards :books="books"></book-cards>
        </v-col>

        <v-col cols=12 align="end" >
            <div class="text-xs-center book-pager">
                <v-pagination
                 v-model="page"
                 :length="page_cnt"
                 total-visible="7"
                 circle
                 ></v-pagination>
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
        page_cnt: function() {
            return 1 + parseInt(this.total/this.page_size);
        },
        page_visible: function() {
            var cnt = 1 + parseInt(this.total/this.page_size);
            if ( cnt < 7 ) { return cnt; }
            if ( this.$vuetify.breakpoint.smAndUp ) {
                return 7;
            } else {
                return 5;
            }
        },
    },
    data: () => ({
        title: "",
        page: 1,
        books: [],
        total: 0,
        page_size: 20,
    }),
    created() {
        this.init(this.$route);
    },
    beforeRouteEnter(to, from, next) {
        next(vm => { vm.init(to) });
    },
    beforeRouteUpdate(to, from, next) {
        this.init(to, next);
    },
    methods: {
        init(route, next) {
            this.$store.commit('navbar', true);
            this.$store.commit('loading');
            var url = route.fullPath;
            if ( url != route.path ) {
                url += "&fmt=json";
            } else {
                url += "?fmt=json";
            }
            this.backend(url)
            .then(rsp => {
                this.title = rsp.title;
                this.books = rsp.books;
                this.total = rsp.total
                this.$store.commit('loaded');
            })
            if ( next ) next();
        },
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
