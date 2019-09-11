<template>
    <v-row align=start>
        <v-col cols=12>
            <v-dialog v-model="dialog_kindle" persistent width="300">
                <v-card>
                    <v-card-title class="headline">推送到Kindle</v-card-title>
                    <v-card-text>
                        <p>填写Kindle收件人邮箱地址：</p>
                        <v-text-field v-model="mail_to" label="Email*" required></v-text-field>
                        <small>* 请先将本站邮箱加入到Kindle发件人中</small>
                    </v-card-text>
                    <v-card-actions>
                        <v-btn color="" text @click="dialog_kindle = false">取消</v-btn>
                        <v-spacer></v-spacer>
                        <v-btn color="primary" text @click="sendto_kindle">发送</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
            <v-dialog v-model="dialog_msg" persistent width="300">
                <v-card>
                    <v-card-text>
                        <v-alert outlined v-model="dialog_msg" :type="alert_type">
                            {{alert_msg}}
                        </v-alert>
                    </v-card-text>
                    <v-card-text align="center">
                        <v-btn small @click="dialog_msg = false">关闭</v-btn>
                    </v-card-text>
                </v-card>
            </v-dialog>

            <v-card>
                <v-toolbar flat dense color="white">
                    <v-btn color="primary" outlined class="mr-2 d-flex d-sm-flex" @click="dialog_kindle = !dialog_kindle" ><v-icon>email</v-icon> 推送</v-btn>
                    <v-btn color="" outlined class="mr-2 d-flex d-sm-flex" :href="'/read/'+bookid" target="_blank"> <v-icon>import_contacts</v-icon> 阅读</v-btn>
                    <v-spacer></v-spacer>

                    <!-- download -->
                    <v-menu left offset-y>
                        <template v-slot:activator="{on}">
                            <v-btn v-on="on" icon small fab ><v-icon>get_app</v-icon></v-btn>
                        </template>
                        <v-list>
                            <v-list-item :key="file[0]" v-for="file in book.files">
                                <v-icon>get_app</v-icon>
                                下载{{file[0]}}格式({{parseInt(file[1]/1024)}} KB)
                            </v-list-item>
                        </v-list>
                    </v-menu>

                    <!-- Edit -->
                    <v-menu left offset-y>
                        <template v-slot:activator="{on}">
                            <v-btn v-if="book.is_owner" v-on="on" icon small fab><v-icon>build</v-icon></v-btn>
                        </template>
                        <v-list>
                            <v-list-item :to="'/book/'+bookid+'/edit'"> <v-icon>settings_applications</v-icon> 编辑元数据 </v-list-item>
                            <v-list-item> <v-icon>apps</v-icon> 从豆瓣更新信息</v-list-item>
                        </v-list>
                    </v-menu>

                    <v-btn class="d-none" icon small fab > <v-icon>thumb_up</v-icon> </v-btn>
                    <v-btn class="d-none" icon small fab > <v-icon>share</v-icon> </v-btn>

                    <v-menu v-if="book.is_owner" offset-y>
                        <template v-slot:activator="{on}">
                            <v-btn v-on="on" icon small fab><v-icon>more_vert</v-icon></v-btn>
                        </template>
                        <v-list>
                            <v-list-item> <v-icon>delete_forever</v-icon> 删除此书</v-list-item>
                        </v-list>
                    </v-menu>
                </v-toolbar>
                <v-row>
                    <v-col class="ma-auto" cols=8 sm=4>
                        <v-img class="book-img" :src="book.img" :aspect-ratio="11/15" max-height="500px" contain ></v-img>
                    </v-col>
                    <v-col cols=12 sm=8>
                        <v-card-text>
                            <div>
                            <h1>{{book.title}}</h1>
                            <span color="grey--text">{{book.author}}著，{{pub_year}}年版</span>
                            </div>
                            <v-rating v-model="book.rating" color="yellow accent-4" length="10" readonly dense small></v-rating>
                            <br/>
                            <div class='tag-chips'>
                                <template v-for="author in book.authors">
                                <v-chip rounded small dark color="indigo" :to="'/author/'+author" :key="author">
                                    <v-icon>face</v-icon>
                                    {{author}}
                                </v-chip>
                                </template>
                                <v-chip rounded small dark color="indigo" :to="'/pub/'+book.publisher" >
                                    <v-icon>group</v-icon>
                                    出版：{{book.publisher}}
                                </v-chip>
                                <v-chip rounded small dark color="indigo" v-if="book.series" >
                                    <v-icon>explore</v-icon>丛书: {{book.series}}
                                </v-chip>
                                <v-chip rounded small dark color="grey" v-if="book.isbn" >
                                    <v-icon>explore</v-icon>ISBN：{{book.isbn}}
                                </v-chip>
                                <template v-for="tag in book.tags" >
                                <v-chip rounded small dark color="grey" :key="tag" v-if="tag" :to="'/tag/'+tag" >
                                    <v-icon>loyalty</v-icon> {{tag}}
                                </v-chip>
                                </template>
                            </div>
                        </v-card-text>
                        <v-card-text>
                            <p v-if="book.comments" v-html="book.comments"></p>
                            <p  v-else>点击浏览详情</p>
                        </v-card-text>
                    </v-col>
                </v-row>
                <v-card-text class="align-right book-footer" >
                    <span class="grey--text">
                    {{book.collector}} @ {{book.timestamp}}
                    </span>
                </v-card-text>
            </v-card>
        </v-col>
    </v-row>
</template>

<script>
export default {
    components: {
    },
    computed: {
        pub_year: function() {
            if ( this.book === null || this.book.pubdate == null) {
                return "N/A";
            }
            return this.book.pubdate.split("-")[0];
        },
    },
    data: () => ({
        bookid: 0,
        book: {'id': 0, 'files': [], 'tags': [], 'pubdate': ''},
        debug: false,
        mail_to: "",
        dialog_kindle: false,
        dialog_msg: false,
        alert_msg: "please login",
        alert_type: "error",
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
            this.bookid = route.params.bookid;
            this.$store.commit('loading');
            var bookid = route.params.bookid;
            this.backend("/book/" + bookid + "?fmt=json")
            .then( rsp => rsp.json() )
            .then( book => {
                book.img = book.cover_large_url;
                this.book = book;
                this.$store.commit('loaded');
            });
            if ( next ) next();
        },
        sendto_kindle() {
            var bookid = this.$route.params.bookid;
            this.backend("/book/"+bookid+"/push", {
                method: "POST",
                body: "mail_to="+this.mail_to,
                headers: {
                    'Content-Type': "application/x-www-form-urlencoded",
                },
            }).then( rsp => rsp.json() )
            .then( rsp => {
                this.alert_msg = rsp.msg;
                this.alert_type = ( rsp.err == 'ok' )?  "success": "error";
                this.dialog_msg = true;
                this.dialog_kindle = false;
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
.tag-chips a {
    margin: 4px 2px;
}

</style>
