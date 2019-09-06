<template>
    <v-row>
        <v-col cols=12>
            <p class="ma-0 title">随便推荐(size={{$vuetify.breakpoint.name}})</p>
        </v-col>
        <v-col cols=6 xs=6 sm=4 md=2 v-for="(book,idx) in random_books" :key="'rec'+idx+book.id" class="book-card">
            <v-card :to="book.href" class="ma-1">
                <v-img :src="book.img" :aspect-ratio="4/3" height="240px" > </v-img>
            </v-card>
        </v-col>
        <v-col cols=12>
            <v-divider class="new-legend"></v-divider>
            <p class="ma-0 title">新书推荐</p>
        </v-col>
        <v-col cols=12>
            <book-cards :books="recent_books"></book-cards>
        </v-col>
    </v-row>
</template>

<script>
import BookCards from "../components/BookCards.vue";
export default {
    components: {
        BookCards,
    },
    computed: {
        random_books: function() {
            return this.rsp.random_books.map( b => {
                b['href'] = "/book/" + b.id;
                return b;
            });
        },
        recent_books: function() {
            return this.rsp.new_books.map( b => {
                b['href'] = "/book/" + b.id;
                return b;
            });
        },
    },
    created() {
        this.$store.commit('navbar', true);
        this.$store.commit('loading');
        this.backend("/index?random=12&recent=12&fmt=json")
        .then(rsp => rsp.json() )
        .then(data => {
            this.rsp = data;
            if ( data.user !== undefined ) {
                this.$store.commit('login', data.user);
            }
            this.$store.commit('loaded');
        });
    },
    data: () => ({
        rsp: {
            random_books: [],
            new_books: [],
            title: '奇异书屋',
        }
    })
}
</script>

<style>
.book-title {
    display: block;
    /*height: 1em;*/
    overflow-y: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    text-overflow: clip;
    text-align: left;
    font-weight: bold;
}
.book-comments {
    /*text-indent: 2em;*/
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    text-overflow: clip;
    margin-top: 6px;
    text-align: left;
}
.book-card {
    padding: 6px;
}
.page-title {
    font-weight: bold;
    text-align: left;
}
.new-legend {
    margin-top: 30px;
    margin-bottom: 20px;
}

</style>
