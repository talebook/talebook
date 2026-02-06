<template>
    <v-card>
        <v-card-title>
            图书管理 <v-chip
                small
                class="primary"
            >
                Beta
            </v-chip>
        </v-card-title>
        <v-card-text> 此表格仅展示图书的部分字段，点击即可快捷修改。完整图书信息请点击链接查看书籍详情页面</v-card-text>
        <v-card-actions>
            <v-btn
                :disabled="loading"
                outlined
                color="primary"
                @click="getDataFromApi"
            >
                <v-icon>mdi-reload</v-icon>刷新
            </v-btn>
            <v-btn
                :disabled="loading"
                outlined
                color="info"
                @click="show_dialog_auto_file"
            >
                <v-icon>mdi-info</v-icon>自动更新图书信息...
            </v-btn>
            <v-btn
                v-if="books_selected.length > 0"
                :disabled="loading"
                outlined
                color="red"
                @click="delete_selected_books"
            >
                <v-icon>mdi-delete</v-icon>批量删除 ({{ books_selected.length
                }})
            </v-btn>
            <v-spacer />
            <v-text-field
                v-model="search"
                cols="2"
                dense
                append-icon="mdi-magnify"
                label="搜索"
                single-line
                hide-details
            />
        </v-card-actions>
        <v-data-table
            v-model="books_selected"
            v-model:options="options"
            dense
            class="elevation-1 text-body-2"
            show-select
            item-key="id"
            :search="search"
            :headers="headers"
            :items="items"
            :server-items-length="total"
            :loading="loading"
            :items-per-page="100"
            :footer-props="{ 'items-per-page-options': [10, 50, 100] }"
        >
            <template #item.status="{ item }">
                <v-chip
                    v-if="item.status == 'ready'"
                    small
                    class="success"
                >
                    可导入
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'exist'"
                    small
                    class="lighten-4"
                >
                    已存在
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'imported'"
                    small
                    class="primary"
                >
                    导入成功
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'new'"
                    small
                    class="grey"
                >
                    待扫描
                </v-chip>
                <v-chip
                    v-else
                    small
                    class="info"
                >
                    {{ item.status }}
                </v-chip>
            </template>
            <template #item.img="{ item }">
                <v-edit-dialog
                    large
                    @save="saveCover(item)"
                >
                    <v-btn 
                        class="cover-btn" 
                        :style="{
                            'background-image': `url(${item.img})`,
                            'aspect-ratio': '3/4',
                            'width': 'auto',
                            'height': 'auto',
                            'min-height': '80px',
                            'max-height': '80px',
                            'background-size': 'cover',
                            'background-position': 'center'
                        }"
                    />

                    <template #input>
                        <div class="mt-4 text-h6">
                            修改封面图
                        </div>
                        <v-container fluid>
                            <v-row>
                                <v-col
                                    cols="12"
                                    sm="6"
                                >
                                    <v-img
                                        :src="item.img"
                                        max-height="200"
                                        class="mb-4"
                                        contain
                                    />
                                </v-col>
                                <v-col
                                    cols="12"
                                    sm="6"
                                >
                                    <v-file-input
                                        v-model="coverFile"
                                        accept="image/jpeg, image/png, image/gif"
                                        label="选择封面图"
                                        prepend-icon="mdi-image"
                                        @change="onCoverFileChange"
                                    />
                                    <small class="text-caption">支持JPG、PNG、GIF格式，大小不超过5MB</small>
                                </v-col>
                            </v-row>
                        </v-container>
                    </template>
                </v-edit-dialog>
            </template>
            <template #item.id="{ item }">
                <a
                    target="_blank"
                    :href="`/book/${item.id}`"
                >{{ item.id }}</a>
            </template>
            <template #item.title="{ item }">
                <v-edit-dialog
                    v-model:return-value="item.title"
                    large
                    save-text="保存"
                    cancel-text="取消"
                    @save="save(item, 'title')"
                >
                    <span
                        class="three-lines"
                        style="max-width: 200px; min-width: 120px; "
                    >{{ item.title }}</span>

                    <template #input>
                        <div class="mt-4 text-h6">
                            修改字段
                        </div>
                        <v-textarea
                            v-model="item.title"
                            label="书名"
                            style="min-width: 400px"
                            counter
                        />
                    </template>
                </v-edit-dialog>
            </template>

            <template #item.author="{ item }">
                <v-edit-dialog
                    v-model:return-value="item.author"
                    large
                    save-text="保存"
                    cancel-text="取消"
                    @save="save(item, 'authors')"
                >
                    <span
                        v-if="item.authors"
                        class="three-lines"
                        style="max-width: 200px"
                    >{{ item.authors.join("/")
                    }}</span>
                    <span v-else> - </span>
                    <template #input>
                        <!-- AUTHORS -->
                        <div class="mt-4 text-h6">
                            修改字段
                        </div>
                        <v-combobox
                            v-model="item.authors"
                            v-model:search-input="tag_input"
                            :items="item.authors"
                            label="作者"
                            hide-selected
                            multiple
                            small-chips
                        >
                            <template #no-data>
                                <v-list-item>
                                    <span v-if="!tag_input">请输入新的名称</span>
                                    <div v-else>
                                        <span class="subheading">添加</span>
                                        <v-chip
                                            color="green lighten-3"
                                            label
                                            small
                                            rounded
                                        >
                                            {{ tag_input }}
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
                    </template>
                </v-edit-dialog>
            </template>

            <template #item.rating="{ item }">
                <v-edit-dialog
                    v-model:return-value="item.rating"
                    large
                    save-text="保存"
                    cancel-text="取消"
                    @save="save(item, 'rating')"
                >
                    <span v-if="item.rating != null">{{ item.rating }} 星</span>
                    <span v-else> - </span>
                    <template #input>
                        <div class="mt-4 text-h6">
                            修改字段
                        </div>
                        <v-rating
                            v-model="item.rating"
                            label="评分"
                            color="yellow accent-4"
                            length="10"
                            dense
                        />
                    </template>
                </v-edit-dialog>
            </template>

            <template #item.publisher="{ item }">
                <v-edit-dialog
                    v-model:return-value="item.publisher"
                    large
                    save-text="保存"
                    cancel-text="取消"
                    @save="save(item, 'publisher')"
                >
                    {{ item.publisher }}
                    <template #input>
                        <div class="mt-4 text-h6">
                            修改字段
                        </div>
                        <v-text-field
                            v-model="item.publisher"
                            label="出版社"
                            counter
                        />
                    </template>
                </v-edit-dialog>
            </template>

            <template #item.tags="{ item }">
                <v-edit-dialog
                    v-model:return-value="item.tags"
                    large
                    save-text="保存"
                    cancel-text="取消"
                    @save="save(item, 'tags')"
                >
                    <span
                        v-if="item.tags"
                        style="width: 200px"
                        class="three-lines"
                    >{{ item.tags.join("/") }}</span>
                    <span v-else> - </span>
                    <template #input>
                        <!-- TAGS -->
                        <div class="mt-4 text-h6">
                            修改字段
                        </div>
                        <v-combobox
                            v-model="item.tags"
                            v-model:search-input="tag_input"
                            :items="item.tags"
                            label="标签列表"
                            hide-selected
                            multiple
                            small-chips
                        >
                            <template #no-data>
                                <v-list-item>
                                    <span v-if="!tag_input">请输入新的标签名称</span>
                                    <div v-else>
                                        <span class="subheading">添加标签</span>
                                        <v-chip
                                            color="green lighten-3"
                                            label
                                            small
                                            rounded
                                        >
                                            {{ tag_input }}
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
                    </template>
                </v-edit-dialog>
            </template>

            <template #item.comments="{ item }">
                <v-edit-dialog
                    v-model:return-value="item.comments"
                    large
                    save-text="保存"
                    cancel-text="取消"
                    @save="save(item, 'comments')"
                >
                    <span
                        :title="item.comments"
                        style="width: 300px"
                        class="three-lines"
                    >{{ item.comments.substr(0, 80)
                    }}</span>
                    <template #input>
                        <div class="mt-4 text-h6">
                            修改字段
                        </div>
                        <v-textarea
                            v-model="item.comments"
                            label="简介"
                        />
                    </template>
                </v-edit-dialog>
            </template>

            <template #item.actions="{ item }">
                <v-menu
                    offset-y
                    right
                >
                    <template #activator="{ on }">
                        <v-btn
                            color="primary"
                            small
                            v-on="on"
                        >
                            操作 <v-icon small>
                                more_vert
                            </v-icon>
                        </v-btn>
                    </template>
                    <v-list dense>
                        <v-list-item @click="delete_book(item)">
                            <v-list-item-title>删除此书</v-list-item-title>
                        </v-list-item>
                    </v-list>
                </v-menu>
            </template>
        </v-data-table>

        <!-- 小浮窗提醒 -->
        <v-snackbar
            v-model="snack"
            top
            :timeout="3000"
            :color="snackColor"
        >
            {{ snackText }}

            <template #action="{ attrs }">
                <v-btn
                    v-bind="attrs"
                    text
                    @click="snack = false"
                >
                    关闭
                </v-btn>
            </template>
        </v-snackbar>

        <!-- 提醒拉取图书的规则说明 -->
        <v-dialog
            v-model="meta_dialog"
            persistent
            transition="dialog-bottom-transition"
            width="500"
        >
            <v-card>
                <v-toolbar
                    flat
                    dense
                    dark
                    color="primary"
                >
                    提醒
                </v-toolbar>
                <v-card-title />
                <v-card-text>
                    <p> 即将从互联网拉取所有图书的书籍信息，请了解以下功能限制：</p>
                    <p> 1. 请在「系统设置」中配置好「互联网书籍信息源」，启用豆瓣插件；</p>
                    <p> 2. 本操作只更新「没有封面」或「没有简介」的图书；</p>
                    <p> 3. 受限于豆瓣等服务的限制，每秒钟仅更新1本书; </p>
                    <br>
                    <template v-if="progress.total > 0">
                        <p>
                            当前进展：<v-btn
                                small
                                text
                                link
                                @click="refresh_progress"
                            >
                                刷新
                            </v-btn>
                        </p>
                        <p>
                            总共 {{ progress.total }} 本书籍，已更新 {{ progress.done }} 本，更新失败 {{ progress.fail }} 本，无需处理 {{
                                progress.skip }} 本。
                        </p>
                    </template>
                    <p v-else>
                        预计需要运行 {{ auto_fill_mins }} 分钟，在此期间请不要停止程序
                    </p>
                </v-card-text>
                <v-card-actions>
                    <v-btn @click="meta_dialog = !meta_dialog">
                        取消
                    </v-btn>
                    <v-spacer />
                    <v-btn
                        color="primary"
                        @click="auto_fill"
                    >
                        开始执行！
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- 批量删除确认对话框 -->
        <v-dialog
            v-model="delete_dialog"
            persistent
            width="500"
        >
            <v-card>
                <v-toolbar
                    flat
                    dense
                    dark
                    color="error"
                >
                    确认删除
                </v-toolbar>
                <v-card-text>
                    <p> 您确定要删除选中的 {{ books_selected.length }} 本书籍吗？</p>
                    <p class="text--secondary">
                        此操作不可逆，请谨慎操作！
                    </p>
                </v-card-text>
                <v-card-actions>
                    <v-btn @click="delete_dialog = !delete_dialog">
                        取消
                    </v-btn>
                    <v-spacer />
                    <v-btn
                        color="error"
                        @click="confirm_delete_books"
                    >
                        确定删除
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-card>
</template>

<script>
export default {
    data: () => ({
        snack: false,
        snackColor: '',
        snackText: '',
        meta_dialog: false,
        delete_dialog: false,
        coverFile: null,

        books_selected: [],
        tag_input: null,
        search: '',
        page: 1,
        items: [],
        total: 0,
        loading: false,
        options: { sortBy: ['id'], sortDesc: [true] },
        headers: [
            { text: '封面', sortable: false, value: 'img', width: '80px' },
            { text: 'ID', sortable: true, value: 'id', width: '80px' },
            { text: '书名', sortable: true, value: 'title' },
            { text: '作者', sortable: true, value: 'author', width: '100px' },
            { text: '评分', sortable: false, value: 'rating', width: '60px' },
            { text: '出版社', sortable: false, value: 'publisher' },
            { text: '标签', sortable: true, value: 'tags', width: '100px' },
            { text: '简介', sortable: true, value: 'comments' },
            { text: '操作', sortable: false, value: 'actions' },
        ],
        progress: {
            skip: 0,
            fail: 0,
            done: 0,
            total: 0,
            status: 'finish',
        },
    }),
    computed: {
        auto_fill_mins: function () {
            return Math.floor(this.total / 60) + 1;
        }
    },
    watch: {
        options: {
            handler() {
                this.getDataFromApi();
            },
            deep: true,
        },
    },
    created() { },
    methods: {
        getDataFromApi() {
            this.loading = true;
            const { sortBy, sortDesc, page, itemsPerPage } = this.options;

            var data = new URLSearchParams();
            if (page != undefined) {
                data.append('page', page);
            }
            if (sortBy != undefined) {
                data.append('sort', sortBy);
            }
            if (sortDesc != undefined) {
                data.append('desc', sortDesc);
            }
            if (itemsPerPage != undefined) {
                data.append('num', itemsPerPage);
            }
            if (this.search != undefined) {
                data.append('search', this.search);
            }
            this.$backend('/admin/book/list?' + data.toString())
                .then((rsp) => {
                    if (rsp.err != 'ok') {
                        this.items = [];
                        this.total = 0;
                        this.$alert('error', rsp.msg);
                        return false;
                    }
                    this.items = rsp.items;
                    this.total = rsp.total;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        refresh_progress() {
            this.$backend('/admin/book/fill', {
                method: 'GET',
            })
                .then((rsp) => {
                    this.progress = rsp.status;
                });
        },
        show_dialog_auto_file() {
            this.meta_dialog = true;
            this.refresh_progress();
        },
        auto_fill() {
            this.$backend('/admin/book/fill', {
                method: 'POST',
                body: JSON.stringify({ 'idlist': 'all' }),
            })
                .then((rsp) => {
                    this.meta_dialog = false;
                    if (rsp.err != 'ok') {
                        this.$alert('error', rsp.msg);
                    }
                    this.snack = true;
                    this.snackColor = 'success';
                    this.snackText = rsp.msg;
                });
        },
        delete_book(book) {
            this.loading = true;
            this.$backend('/book/' + book.id + '/delete', {
                method: 'POST',
                body: '',
            })
                .then((rsp) => {
                    if (rsp.err != 'ok') {
                        this.$alert('error', rsp.msg);
                    }
                    this.snack = true;
                    this.snackColor = 'success';
                    this.snackText = rsp.msg;

                    this.getDataFromApi();
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        // 显示批量删除确认对话框
        delete_selected_books() {
            if (this.books_selected.length === 0) {
                // 如果没有选中的书籍，显示提示信息
                this.snack = true;
                this.snackColor = 'warning';
                this.snackText = '请先勾选要删除的书籍';
                return;
            }
            // 显示确认对话框
            this.delete_dialog = true;
        },
        // 确认批量删除
        confirm_delete_books() {
            // 再次检查是否有选中的书籍
            if (this.books_selected.length === 0) {
                this.delete_dialog = false;
                return;
            }

            this.loading = true;
            this.delete_dialog = false;

            // 获取选中的图书ID列表
            const selectedIds = this.books_selected.map(book => book.id);

            // 发送批量删除请求
            this.$backend('/admin/book/delete', {
                method: 'POST',
                body: JSON.stringify({ idlist: selectedIds }),
            })
                .then((rsp) => {
                    if (rsp.err != 'ok') {
                        this.$alert('error', rsp.msg);
                    } else {
                        this.snack = true;
                        this.snackColor = 'success';
                        this.snackText = rsp.msg;
                        // 清空选中的图书
                        this.books_selected = [];
                        // 刷新图书列表
                        this.getDataFromApi();
                    }
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        save(book, field) {
            var edit = {};
            edit[field] = book[field];
            this.saving = true;
            this.$backend('/book/' + book.id + '/edit', {
                method: 'POST',
                body: JSON.stringify(edit),
            }).then((rsp) => {
                if (rsp.err == 'ok') {
                    this.snack = true;
                    this.snackColor = 'success';
                    this.snackText = rsp.msg;
                } else {
                    this.$alert('error', rsp.msg);
                }
            });
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
        saveCover(book) {
            if (!this.coverFile) {
                this.$alert('info', '请选择要上传的封面图');
                return;
            }

            this.loading = true;

            // 创建FormData对象
            const formData = new FormData();
            formData.append('cover', this.coverFile);

            // 发送请求
            this.$backend('/book/' + book.id + '/edit', {
                method: 'POST',
                body: formData
                // 不要手动设置Content-Type，浏览器会自动设置并添加boundary
            }).then((rsp) => {
                if (rsp.err == 'ok') {
                    this.snack = true;
                    this.snackColor = 'success';
                    this.snackText = rsp.msg;
                    // 刷新数据，更新封面图
                    this.getDataFromApi();
                } else {
                    this.$alert('error', rsp.msg);
                }
            }).finally(() => {
                this.loading = false;
                // 重置封面文件
                this.coverFile = null;
            });
        },
    },
};
</script>

<style>
.three-lines {
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    white-space: normal;
}

.cover-btn {
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border: none;
    cursor: pointer;
    margin: 1px;
    padding: 0;
    width: auto;
    height: auto;
}
</style>
