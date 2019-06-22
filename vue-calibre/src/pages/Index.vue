<template>
    <v-layout wrap >
        <v-flex md12>
            <p class="page-title">随便推荐{{$store.state.avatar}}</p>
        </v-flex>
        <v-flex xs6 sm4 md2 v-for="(book,idx) in random_books" :key="'rec'+idx+book.id" class="book-card">
            <v-card flat :href="book.href" >
                <v-img :src="book.img" height="240px" contain > </v-img>
            </v-card>
        </v-flex>

        <v-flex xs12 >
            <v-divider class="new-legend"></v-divider>
            <p class="page-title">新书推荐-{{$vuetify.breakpoint.name}}</p>
        </v-flex>
        <v-flex>
            <book-cards :books="recent_books"></book-cards>
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
        this.$store.commit('loading');
        var url = "https://www.talebook.org/?random=12&recent=12&fmt=json";
        fetch(url, {
            credentials: 'include',
            mode: "cors",
            redirect: "follow",
        })
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
