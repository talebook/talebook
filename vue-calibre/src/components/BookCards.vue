<template>
    <v-layout row wrap>
    <v-flex xs12 sm6 md4 v-for="(book,idx) in render_books" :key="idx+'-books-'+book.id" class="book-card">
        <v-card :href="book.href">
            <v-layout>
                <v-flex xs3>
                    <v-img :src="book.img" :aspect-ratio="11/15" ></v-img>
                </v-flex>
                <v-flex xs9>
                    <v-card-text align-left>
                        <div class="book-title">{{book.title}}</div>
                        <div class="book-comments">
                            <p v-if="book.comments" v-html="book.comments"></p>
                            <p  v-else>点击浏览详情</p>
                        </div>
                    </v-card-text>
                </v-flex>
            </v-layout>
        </v-card>
    </v-flex>
    </v-layout>
</template>

<script>
export default {
    props: {
        books: Array,
    },
    components: {
    },
    computed: {
        render_books: function() {
            return this.books.map( b => {
                b['href'] = "/book/" + b.id;
                return b;
            });
        },
    },
    data: () => {
        return {}
    },
}
</script>

<style scoped>
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
.book-comments p {
    font-size: small;
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
