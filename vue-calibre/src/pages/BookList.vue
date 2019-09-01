<template>
    <v-layout align-start row wrap >
        <v-flex xs12 >
            <h2>{{title}}</h2>
            <v-divider class="book-list-legend"></v-divider>
        </v-flex>

        <v-flex xs12>
            <book-cards :books="books"></book-cards>
        </v-flex>

        <v-flex xs12>
            <div class="text-xs-center book-pager">
                <v-pagination
                 v-model="page"
                 :length="page_cnt"
                 :total-visible="page_visible"
                 circle
                 ></v-pagination>
            </div>
        </v-flex>
    </v-layout>
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
    beforeRouteUpdate(to, from, next) {
        this.init(to, next);
    },
    methods: {
        init(route, next) {
            //alert(JSON.stringify(route.params));
            this.$store.commit('navbar', true);
            this.$store.commit('loading');
            var url = route.fullPath;
            if ( url != route.path ) {
                url += "&fmt=json";
            } else {
                url += "?fmt=json";
            }
            this.backend(url)
            .then(rsp => rsp.json())
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
