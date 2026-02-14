<template>
    <v-row align="start">
        <v-col cols="12">
            <v-card>
                <v-toolbar
                    dark
                    color="primary"
                >
                    <v-toolbar-title align-center>
                        编辑书籍信息
                    </v-toolbar-title>
                    <v-spacer />
                    <v-btn
                        class="mr-2"
                        color="red"
                        :to="'/book/'+book.id"
                    >
                        取消
                    </v-btn>
                    <v-btn
                        color="green"
                        @click="save_book"
                    >
                        保存
                    </v-btn>
                </v-toolbar>
                <v-card-text class="pa-0 pa-md-2">
                    <v-form>
                        <v-container>
                            <v-row>
                                <v-col cols="12">
                                    <h3>封面图</h3>
                                    <v-row>
                                        <v-col
                                            cols="12"
                                            sm="4"
                                        >
                                            <v-img
                                                :src="book.img"
                                                max-height="200"
                                                contain
                                                class="mb-4"
                                            />
                                        </v-col>
                                        <v-col
                                            cols="12"
                                            sm="8"
                                        >
                                            <v-file-input
                                                v-model="coverFile"
                                                accept="image/jpeg, image/png, image/gif"
                                                label="选择封面图"
                                                prepend-icon="mdi-image"
                                                @change="onCoverFileChange"
                                            />
                                            <small class="text-caption">支持JPG、PNG、GIF格式，大小不超过5MB</small>
                                            <div class="mt-2">
                                                <v-btn
                                                    color="primary"
                                                    small
                                                    :disabled="!coverFile"
                                                    @click="uploadCover"
                                                >
                                                    上传封面
                                                </v-btn>
                                            </div>
                                        </v-col>
                                    </v-row>
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="12"
                                    sm="6"
                                >
                                    <v-text-field
                                        v-model="book.title"
                                        label="书名"
                                    >
                                        {{ book.title }}
                                    </v-text-field>
                                </v-col>
                                <v-col
                                    class="py-4"
                                    cols="12"
                                    sm="6"
                                >
                                    <v-rating
                                        v-model="book.rating"
                                        label="Rating"
                                        color="yellow accent-4"
                                        length="10"
                                        dense
                                    />
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="12"
                                    sm="6"
                                >
                                    <!-- AUTHORS -->
                                    <v-combobox
                                        v-model="book.authors"
                                        v-model:search-input="author_input"
                                        :items="book.authors"
                                        label="作者"
                                        hide-selected
                                        multiple
                                        small-chips
                                    >
                                        <template #no-data>
                                            <v-list-item>
                                                <span v-if="! author_input">请输入新的名称</span>
                                                <div v-else>
                                                    <span class="subheading">添加</span>
                                                    <v-chip
                                                        color="green lighten-3"
                                                        label
                                                        small
                                                        rounded
                                                    >
                                                        {{
                                                            author_input
                                                        }}
                                                    </v-chip>
                                                </div>
                                            </v-list-item>
                                        </template>
                                        <!-- author chip & close -->
                                        <template #selection="{ attrs, item, parent, selected }">
                                            <v-chip
                                                v-bind="attrs"
                                                color="green lighten-3"
                                                :input-value="selected"
                                                label
                                                small
                                            >
                                                <span class="pr-2"> {{ item }} </span>
                                                <v-icon
                                                    small
                                                    @click="parent.selectItem(item)"
                                                >
                                                    close
                                                </v-icon>
                                            </v-chip>
                                        </template>
                                    </v-combobox>
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="12"
                                    sm="6"
                                >
                                    <v-text-field
                                        v-model="book.series"
                                        label="丛书名称"
                                    >
                                        {{ book.series }}
                                    </v-text-field>
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="12"
                                    sm="6"
                                >
                                    <v-text-field
                                        v-model="book.publisher"
                                        label="出版社"
                                    >
                                        {{ book.publisher }}
                                    </v-text-field>
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="12"
                                    sm="6"
                                >
                                    <v-text-field
                                        v-model="book.pubdate"
                                        label="出版日期"
                                    >
                                        {{ book.pubdate }}
                                    </v-text-field>
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="12"
                                    sm="6"
                                >
                                    <v-text-field
                                        v-model="book.isbn"
                                        label="ISBN编号"
                                    >
                                        {{ book.isbn }}
                                    </v-text-field>
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="12"
                                    sm="6"
                                >
                                    <v-text-field
                                        v-model="book.language"
                                        label="语言"
                                    >
                                        {{ book.language }}
                                    </v-text-field>
                                </v-col>


                                <v-col
                                    class="py-0"
                                    cols="12"
                                >
                                    <!-- TAGS -->
                                    <v-combobox
                                        v-model="book.tags"
                                        v-model:search-input="tag_input"
                                        :items="book.tags"
                                        label="标签列表"
                                        hide-selected
                                        multiple
                                        small-chips
                                    >
                                        <template #no-data>
                                            <v-list-item>
                                                <span v-if="! tag_input">请输入新的标签名称</span>
                                                <div v-else>
                                                    <span class="subheading">添加标签</span>
                                                    <v-chip
                                                        color="green lighten-3"
                                                        label
                                                        small
                                                        rounded
                                                    >
                                                        {{
                                                            tag_input
                                                        }}
                                                    </v-chip>
                                                </div>
                                            </v-list-item>
                                        </template>
                                        <!-- tag chip & close -->
                                        <template #selection="{ attrs, item, parent, selected }">
                                            <v-chip
                                                v-bind="attrs"
                                                color="green lighten-3"
                                                :input-value="selected"
                                                label
                                                small
                                            >
                                                <span class="pr-2"> {{ item }} </span>
                                                <v-icon
                                                    small
                                                    @click="parent.selectItem(item)"
                                                >
                                                    close
                                                </v-icon>
                                            </v-chip>
                                        </template>
                                    </v-combobox>
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="12"
                                >
                                    <v-textarea
                                        v-model="book.comments"
                                        small
                                        outlined
                                        rows="15"
                                        label="内容简介"
                                        :value="book.comments"
                                    />
                                </v-col>
                                <v-divider />
                                <v-col
                                    align="center"
                                    cols="12"
                                >
                                    <v-btn
                                        dark
                                        color="green"
                                        @click="save_book"
                                    >
                                        保存
                                    </v-btn>
                                </v-col>
                            </v-row>
                        </v-container>
                    </v-form>
                </v-card-text>
            </v-card>
        </v-col>
    </v-row>
</template>

<script>
export default {
    components: {},
    beforeRouteUpdate(to, from, next) {
        this.init(to, next);
    },
    async asyncData({params, app, res}) {
        if (res !== undefined) {
            res.setHeader('Cache-Control', 'no-cache');
        }
        return app.$backend('/book/' + params.bid);
    },
    data: () => ({
        bookid: 0,
        book: {'id': 0, 'files': [], 'tags': [], 'pubdate': ''},
        author_input: null,
        tag_input: null,
        coverFile: null,
        debug: false,
        mail_to: '',
        dialog_kindle: false,
        dialog_msg: false,
        alert_msg: 'please login',
        alert_type: 'error',
    }),
    head() {
        return {
            title: '编辑 ' + this.book.title,
        };
    },
    computed: {
        pub_year: function () {
            if (this.book === null) {
                return '';
            }
            return this.book.pubdate.split('-')[0];
        },
    },
    created() {
        //this.$store.commit('navbar', true);
        //this.init(this.$route);
    },
    methods: {
        init(route, next) {
            //this.$store.commit('navbar', true);
            this.bookid = this.$route.params.bid;
            this.$backend('/book/' + this.bookid)
                .then(rsp => {
                    this.book = rsp.book;
                });
            if (next) next();
        },
        onCoverFileChange(file) {
            // 文件选择变化时的处理
            if (file) {
                // 可以在这里添加文件大小验证
                if (file.size > 5 * 1024 * 1024) {
                    this.$alert('error', '封面图大小不能超过5MB');
                    this.coverFile = null;
                }
            }
        },
        async uploadCover() {
            if (!this.coverFile) {
                this.$alert('info', '请选择要上传的封面图');
                return;
            }
            
            this.saving = true;
            
            // 创建FormData对象
            const formData = new FormData();
            formData.append('cover', this.coverFile);
            
            // 发送封面图上传请求
            const coverRsp = await this.$backend('/book/' + this.book.id + '/edit', {
                method: 'POST',
                body: formData
                // 不要手动设置Content-Type，浏览器会自动设置并添加boundary
            });
            
            if (coverRsp.err === 'ok') {
                this.$alert('success', '封面图上传成功！');
                // 重新获取书籍信息，更新封面图
                const bookRsp = await this.$backend('/book/' + this.book.id);
                if (bookRsp.err === 'ok') {
                    this.book = bookRsp.book;
                }
                this.coverFile = null; // 重置封面文件
            } else {
                this.$alert('error', '封面图上传失败：' + coverRsp.msg);
            }
            
            this.saving = false;
        },
        async save_book() {
            this.saving = true;
            
            // 先处理封面图上传（如果有）
            if (this.coverFile) {
                // 创建FormData对象
                const formData = new FormData();
                formData.append('cover', this.coverFile);
                
                // 发送封面图上传请求
                const coverRsp = await this.$backend('/book/' + this.book.id + '/edit', {
                    method: 'POST',
                    body: formData
                    // 不要手动设置Content-Type，浏览器会自动设置并添加boundary
                });
                
                if (coverRsp.err !== 'ok') {
                    this.$alert('error', '封面图上传失败：' + coverRsp.msg);
                    this.saving = false;
                    return;
                }
            }
            
            // 处理书籍信息，确保空值被正确设置
            const bookData = {...this.book};
            
            // 处理列表类型字段
            if (!bookData.tags || bookData.tags.length === 0) {
                bookData.tags = ['__DELETE__'];
            }
            if (!bookData.authors || bookData.authors.length === 0) {
                bookData.authors = ['__DELETE__'];
            }
            
            // 处理其他字段
            const fieldsToCheck = ['title', 'series', 'publisher', 'isbn', 'language', 'comments', 'pubdate'];
            for (const field of fieldsToCheck) {
                if (!bookData[field]) {
                    bookData[field] = '__DELETE__';
                }
            }
            
            // 保存其他书籍信息
            const rsp = await this.$backend('/book/' + this.book.id + '/edit', {
                method: 'POST',
                body: JSON.stringify(bookData),
            });
            
            if (rsp.err === 'ok') {
                this.$alert('success', '保存成功！');
                this.$router.push('/book/' + this.book.id);
            } else {
                this.$alert('error', rsp.msg);
            }
            
            this.saving = false;
        }
    },
};
</script>

<style>
.align-right {
    text-align: right;
}

.book-footer {
    padding-top: 0;
    padding-bottom: 3px;
}

.tag-chips a {
    margin: 4px 2px;
}
</style>