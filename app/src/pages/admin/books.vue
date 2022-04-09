<template>
    <v-card>
        <v-card-title> 图书管理 <v-chip small class="primary">Beta</v-chip> </v-card-title>
        <v-card-text> 此表格仅展示图书的部分字段，点击即可快捷修改。完整图书信息请点击链接查看书籍详情页面</v-card-text>
        <v-card-actions>
            <v-btn :disabled="loading" outlined color="primary" @click="getDataFromApi"><v-icon>mdi-reload</v-icon>刷新</v-btn>
            <template v-if="selected.length > 0">
                <v-btn :disabled="loading" outlined color="primary" @click="delete_record"><v-icon>mdi-delete</v-icon>删除 </v-btn>
                <!--
                <v-btn :disabled="loading" outlined color="primary" @click="mark_as('ignore')"><v-icon>mdi-tag</v-icon>全部标记为「忽略」</v-btn>
                <v-btn :disabled="loading" outlined color="primary" @click="mark_as('done')"><v-icon>mdi-tag</v-icon>全部标记为「已完成」</v-btn>
                -->
            </template>
            <v-spacer></v-spacer>
            <v-text-field cols="2" dense v-model="search" append-icon="mdi-magnify" label="搜索" single-line hide-details></v-text-field>
        </v-card-actions>
        <v-data-table
            dense
            class="elevation-1 text-body-2"
            show-select
            v-model="selected"
            item-key="hash"
            :search="search"
            :headers="headers"
            :items="items"
            :options.sync="options"
            :server-items-length="total"
            :loading="loading"
            :items-per-page="100"
            :footer-props="{ 'items-per-page-options': [10, 50, 100] }"
        >
            <template v-slot:item.status="{ item }">
                <v-chip small v-if="item.status == 'ready'" class="success">可导入</v-chip>
                <v-chip small v-else-if="item.status == 'exist'" class="lighten-4">已存在</v-chip>
                <v-chip small v-else-if="item.status == 'imported'" class="primary">导入成功</v-chip>
                <v-chip small v-else-if="item.status == 'new'" class="grey">待扫描</v-chip>
                <v-chip small v-else class="info">{{ item.status }}</v-chip>
            </template>
            <template v-slot:item.id="{ item }">
                <a target="_blank" :href="`/book/${item.book_id}`">{{ item.id }}</a>
            </template>
            <template v-slot:item.title="{ item }">
                <v-edit-dialog
                    large
                    persistent
                    :return-value.sync="item.title"
                    @save="save(item, 'title')"
                    save-text="保存"
                    cancel-text="取消"
                >
                    {{ item.title }}
                    <template v-slot:input>
                        <div class="mt-4 text-caption">修改字段</div>
                        <v-text-field v-model="item.title" label="Edit" single-line counter></v-text-field>
                    </template>
                </v-edit-dialog>
            </template>

            <template v-slot:item.author="{ item }">
                <v-edit-dialog
                    large
                    persistent
                    :return-value.sync="item.author"
                    @save="save(item, 'author')"
                    save-text="保存"
                    cancel-text="取消"
                >
                    {{ item.author }}
                    <template v-slot:input>
                        <div class="mt-4 text-caption">修改字段</div>
                        <v-text-field v-model="item.author" label="Edit" single-line counter></v-text-field>
                    </template>
                </v-edit-dialog>
            </template>

            <template v-slot:item.publisher="{ item }">
                <v-edit-dialog
                    large
                    persistent
                    :return-value.sync="item.publisher"
                    @save="save(item, 'publisher')"
                    save-text="保存"
                    cancel-text="取消"
                >
                    {{ item.publisher }}
                    <template v-slot:input>
                        <div class="mt-4 text-caption">修改字段</div>
                        <v-text-field v-model="item.publisher" label="Edit" single-line counter></v-text-field>
                    </template>
                </v-edit-dialog>
            </template>

            <template v-slot:item.comments="{ item }">
                <v-edit-dialog
                    large
                    persistent
                    :return-value.sync="item.comments"
                    @save="save(item, 'comments')"
                    save-text="保存"
                    cancel-text="取消"
                >
                    <span :title="item.comments" style="width: 300px; display: inline-block" class="text-truncate">{{
                        item.comments
                    }}</span>
                    <template v-slot:input>
                        <div class="mt-4 text-caption">修改字段</div>
                        <v-textarea v-model="item.comments"></v-textarea>
                    </template>
                </v-edit-dialog>
            </template>
            <template v-slot:item.actions="{ item }">
                <v-menu offset-y right>
                    <template v-slot:activator="{ on }">
                        <v-btn color="primary" small v-on="on">操作 <v-icon small>more_vert</v-icon></v-btn>
                    </template>
                    <v-list dense>
                        <v-subheader>管理</v-subheader>
                        <v-divider></v-divider>
                        <v-list-item>
                            <v-list-item-title>待开发</v-list-item-title>
                        </v-list-item>
                    </v-list>
                </v-menu>
            </template>
        </v-data-table>
    </v-card>
</template>

<script>
export default {
    data: () => ({
        selected: [],
        search: "",
        page: 1,
        items: [],
        total: 0,
        loading: false,
        options: {},
        headers: [
            { text: "ID", sortable: true, value: "id" },
            { text: "书名", sortable: true, value: "title" },
            { text: "作者", sortable: true, value: "author" },
            { text: "出版社", sortable: false, value: "publisher" },
            { text: "标签", sortable: true, value: "tags", width: "100px" },
            { text: "简介", sortable: true, value: "comments" },
            { text: "操作", sortable: false, value: "actions" },
        ],
        progress: {
            done: 0,
            total: 0,
            status: "finish",
        },
    }),
    created() {},
    watch: {
        options: {
            handler() {
                this.getDataFromApi();
            },
            deep: true,
        },
    },
    methods: {
        getDataFromApi() {
            console.log(this.options);
            this.loading = true;
            const { sortBy, sortDesc, page, itemsPerPage } = this.options;

            var data = new URLSearchParams();
            if (page != undefined) {
                data.append("page", page);
            }
            if (sortBy != undefined) {
                data.append("sort", sortBy);
            }
            if (sortDesc != undefined) {
                data.append("desc", sortDesc);
            }
            if (itemsPerPage != undefined) {
                data.append("num", itemsPerPage);
            }
            this.$backend("/admin/book/list?" + data.toString())
                .then((rsp) => {
                    if (rsp.err != "ok") {
                        this.items = [];
                        this.total = 0;
                        this.$alert("error", rsp.msg);
                        return false;
                    }
                    this.items = rsp.items;
                    this.total = rsp.total;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        delete_book() {
            console.log(this.selected);
            this.loading = true;
            this.$backend("/admin/book/delete", {
                method: "POST",
                body: JSON.stringify({
                    hashlist: this.selected.map((v) => {
                        return v.hash;
                    }),
                }),
            })
                .then((rsp) => {
                    if (rsp.err != "ok") {
                        this.$alert("error", rsp.msg);
                    }
                    this.getDataFromApi();
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        update_book(status) {
            return;
            this.loading = true;
            this.$backend("/admin/scan/mark", {
                method: "POST",
                body: JSON.stringify({ hashlist: this.selected, status: status }),
            })
                .then((rsp) => {
                    if (rsp.err != "ok") {
                        this.$alert("error", rsp.msg);
                    }
                })
                .finally(() => {
                    this.loading = false;
                });
            this.items.map((v) => {
                if (this.selected.indexOf(v.hash)) {
                    v.status = status;
                }
            });
        },
        save(item, field) {
            console.log("click save", item);
        },
    },
};
</script>
