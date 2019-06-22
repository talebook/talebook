<template>
    <v-layout row wrap align-start>
        <v-flex xs12>
            <v-card>
                <v-card-actions>
                    <v-btn flat color="purple"><v-icon>email</v-icon> Push Kindle</v-btn>
                    <v-btn flat > <v-icon>import_contacts</v-icon> Read Online</v-btn>
                    <v-spacer></v-spacer>
                    <v-btn class="hidden-xs-only" icon> <v-icon>cloud_download</v-icon> </v-btn>
                    <v-btn class="hidden-xs-only" icon> <v-icon>thumb_up</v-icon> </v-btn>
                    <v-btn class="hidden-xs-only" icon> <v-icon>share</v-icon> </v-btn>
                    <v-btn class="hidden-xs-only" icon @click="show = !show">
                        <v-icon>{{ show ? 'keyboard_arrow_down' : 'keyboard_arrow_up' }}</v-icon>
                    </v-btn>
                </v-card-actions>

                <v-layout row wrap >
                    <v-flex d-flex xs12 sm4>
                        <v-img class="book-img" :src="book.img" height="500px" contain ></v-img>
                    </v-flex>
                    <v-flex xs12 sm8>
                        <v-card-text align-left class="small-tags">
                            <div>
                            <h2>{{book.title}}</h2>
                            <span color="grey--text">{{book.author}}著</span>
                            </div>
                            <br/>
                            <div>
                                <v-btn round small dark color="indigo" :href="'/author/'+book.author" >
                                    <v-icon>face</v-icon>{{book.author}}
                                </v-btn>
                                <v-btn round small dark color="indigo" :href="'/pub/'+book.publisher" >
                                    <v-icon>group</v-icon>{{book.publisher}}
                                </v-btn>
                                <v-btn round small dark color="grey" v-if="book.isbn" >
                                    <v-icon>explore</v-icon>ISBN-{{book.isbn}}
                                </v-btn>
                                <template v-for="tag in book.tags" >
                                <v-btn round small dark color="grey" :key="tag" v-if="tag" :href="'/tag/'+tag" >
                                    <v-icon>loyalty</v-icon> {{tag}}
                                </v-btn>
                                </template>
                            </div>
                            <div class="">
                                <br/>
                                <p v-if="book.comments" v-html="book.comments"></p>
                                <p  v-else>点击浏览详情</p>
                            </div>
                        </v-card-text>
                        <v-slide-y-transition>
                            <v-card-text v-show="show">
                                {{book}}
                            </v-card-text>
                        </v-slide-y-transition>
                    </v-flex>
                </v-layout>
                <v-card-text class="align-right book-footer" >
                    <span class="grey--text">
                    {{book.collector}} @ {{book.timestamp}}
                    </span>
                </v-card-text>
            </v-card>
        </v-flex>
    </v-layout>
</template>

<script>
export default {
    components: {
    },
    computed: {
    },
    data: () => ({
        book: null,
        show: false,
    }),
    created() {
        this.fetch_book();
    },
    methods: {
        fetch_book() {
            this.$store.commit('loading');
            var bookid = this.$route.params.bookid;
            var url = "https://www.talebook.org/book/" + bookid + "?fmt=json";
            fetch(url)
            .then( rsp => rsp.json() )
            .then( book => {
                book.img = book.cover_large_url;
                book.tags = book.tags.split("/").map( m => m.trim() );
                this.book = book;
                this.$store.commit('loaded');
            });
        }
    },
}
</script>

<style>
.book-img {
    /*
    margin-left: 16px;
    box-shadow: 1px 1px 1px rgba(0,0,0,0.12);
    box-shadow: 0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12);
    */
}
.align-right {
    text-align: right;
}
.book-footer {
    padding-top: 0px;
    padding-bottom: 3px;
}

@media only screen and (max-width: 959px) {
    .small-tags .v-btn__content {
        font-size: 12px;
    }
  .small-tags i {
      font-size: 16px;
  }
  .small-tags .v-btn--small {
      min-width: 40px;
      padding: 0 8px 0 4px;
      margin: 3px 2px;
  }
}

</style>
