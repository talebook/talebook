<template>
    <v-layout row wrap align-start>
        <v-flex xs12>
            <v-card>
                <v-card-actions>
                    <v-btn flat @click="dialog_kindle = !dialog_kindle" color="purple"><v-icon>email</v-icon> Push Kindle</v-btn>
                    <v-btn flat :href="'/read/'+book.id" :target="_blank"> <v-icon>import_contacts</v-icon> Read Online</v-btn>
                    <v-spacer></v-spacer>
                    <v-btn flat class="hidden-xs-only" v-for="file in book.files" :key="file[0]"><v-icon>cloud_download</v-icon>{{file[0]}}</v-btn>
                    <v-btn class="hidden-xs-only" icon> <v-icon>thumb_up</v-icon> </v-btn>
                    <v-btn class="hidden-xs-only" icon> <v-icon>share</v-icon> </v-btn>
                    <v-btn class="hidden-xs-only" icon @click="show = !show">
                        <v-icon>{{ show ? 'keyboard_arrow_down' : 'keyboard_arrow_up' }}</v-icon>
                    </v-btn>
                </v-card-actions>

                <v-dialog v-model="dialog_kindle" persistent >
                    <v-card>
                        <v-card-title class="headline">Use Google's location service?</v-card-title>
                        <v-card-text>
                            <v-container>
                                <v-row>
                                    <v-col cols="12">
                                        <v-text-field label="Email*" required></v-text-field>
                                    </v-col>
                                </v-row>
                            </v-container>
                            <small>* 请先将本站邮箱加入到Kindle发件人中</small>
                        </v-card-text>
                        <v-card-actions>
                            <div class="flex-grow-1"></div>
                            <v-btn color="green darken-1" text @click="dialog_kindle = false">Disagree</v-btn>
                            <v-btn color="green darken-1" text @click="dialog_kindle = false">Agree</v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>

                <v-layout row wrap >
                    <v-flex d-flex xs12 sm4 md4>
                        <v-img class="book-img" :src="book.img" height2="500px" contain ></v-img>
                    </v-flex>
                    <v-flex xs12 sm8 md8>
                        <v-card-text align-left class="small-tags">
                            <div>
                            <h1>{{book.title}}</h1>
                            <span color="grey--text">{{book.author}}著，{{pub_year}}年版</span>
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
                        </v-card-text>
                        <v-card-text>
                            <p v-if="book.comments" v-html="book.comments"></p>
                            <p  v-else>点击浏览详情</p>
                        </v-card-text>
                    </v-flex>
                </v-layout>
                <v-card-text class="align-right book-footer" >
                    <span class="grey--text">
                    {{book.collector}} @ {{book.timestamp}}
                    </span>
                </v-card-text>
                <v-slide-y-transition>
                    <v-card-text v-show="show">
                        {{book}}
                    </v-card-text>
                </v-slide-y-transition>
            </v-card>
        </v-flex>
    </v-layout>
</template>

<script>
export default {
    components: {
    },
    computed: {
        pub_year: function() {
            if ( this.book === null ) {
                return "";
            }
            return this.book.pubdate.split("-")[0];
        },
    },
    data: () => ({
        book: null,
        show: false,
        dialog_kindle: false,
    }),
    created() {
        this.fetch_book();
    },
    methods: {
        fetch_book() {
            this.$store.commit('loading');
            var bookid = this.$route.params.bookid;
            this.backend("/book/" + bookid + "?fmt=json")
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
