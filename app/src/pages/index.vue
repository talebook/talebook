<template>
    <div>
    <v-row>
        <v-col cols=12>
            <p class="ma-0 title">随便推荐</p>
        </v-col>
        <v-col cols=6 xs=6 sm=4 md=2 lg=1 v-for="(book,idx) in get_random_books" :key="'rec'+idx+book.id" class="book-card">
            <v-card :to="book.href" class="ma-1">
                <v-img :src="book.img" :aspect-ratio="11/15" > </v-img>
            </v-card>
        </v-col>
    </v-row>
    <v-row>
        <v-col cols=12>
            <v-divider class="new-legend"></v-divider>
            <p class="ma-0 title">新书推荐</p>
        </v-col>
        <v-col cols=12>
            <book-cards :books="get_recent_books"></book-cards>
        </v-col>
    </v-row>
    <v-row>
        <v-col cols=12>
            <v-divider class="new-legend"></v-divider>
            <p class="ma-0 title">分类浏览</p>
        </v-col>
        <v-col cols=12 sm=6 md=4 v-for="nav in navs" :key="nav.text">
            <v-card outlined>
                <v-list>
                    <v-list-item :to="nav.href" >
                        <v-list-item-avatar large color='primary' >
                            <v-icon dark >{{nav.icon}}</v-icon>
                        </v-list-item-avatar>
                        <v-list-item-content>
                            <v-list-item-title>{{nav.text}} </v-list-item-title>
                            <v-list-item-subtitle>{{nav.subtitle}}</v-list-item-subtitle>
                        </v-list-item-content>
                        <v-list-item-action>
                            <v-icon >mdi-arrow-right</v-icon>
                        </v-list-item-action>
                    </v-list-item>
                </v-list>
            </v-card>
        </v-col>
    </v-row>
    </div>
</template>

<script>
import BookCards from "~/components/BookCards.vue";
export default {
    name: 'IndexPage',
    components: {
        BookCards,
    },
    computed: {
        get_random_books: function() {
            return this.random_books.map( b => {
                b['href'] = "/book/" + b.id;
                return b;
            });
        },
        get_recent_books: function() {
            return this.new_books.map( b => {
                b['href'] = "/book/" + b.id;
                return b;
            });
        },
    },
    created() {
        this.$store.commit('navbar', true);
        this.navs = [
            { icon: 'widgets',            href:'/nav',       text: '分类导览',  count: this.$store.state.sys.books      },
            { icon: 'mdi-human-greeting', href:'/author',    text: '作者',     count: this.$store.state.sys.authors    },
            { icon: 'mdi-home-group',     href:'/publisher', text: '出版社',   count: this.$store.state.sys.publishers },
            { icon: 'mdi-tag-heart',      href:'/tag',       text: '标签',     count: this.$store.state.sys.tags       },
            { icon: 'mdi-history',        href:'/recent',    text: '所有书籍', },
            { icon: 'mdi-trending-up',    href:'/hot',       text: '热度榜单', },
            ]
    },
    async asyncData({ app, res }) {
        if ( res !== undefined ) {
            res.setHeader('Cache-Control', 'no-cache');
        }
        return app.$backend("/index?random=12&recent=12");
    },
    data: () => ({
        random_books: [],
        new_books: [],
        navs: [],
    }),
    head: () => ({
        titleTemplate: "%s",
    })
}
</script>

<style>
.new-legend {
    margin-top: 30px;
    margin-bottom: 20px;
}
</style>
