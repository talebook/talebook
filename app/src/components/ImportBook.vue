<template>
    <v-card>
        <v-card-text> 请将需要导入的书籍放入uploads目录中。 支持的格式为 azw/azw3/epub/mobi/pdf/txt</v-card-text>
        <v-card-actions>
            <v-btn :disabled="loading" color="primary" @click="scan_books"><v-icon>mdi-file-find</v-icon>扫描书籍</v-btn>
            <v-btn :disabled="loading" outlined color="primary" @click="getDataFromApi"><v-icon>mdi-reload</v-icon>刷新</v-btn>
            <template v-if="selected.length > 0">
                <v-btn :disabled="loading" outlined color="primary" @click="import_books"><v-icon>mdi-import</v-icon>导入书籍 </v-btn>
                <v-btn :disabled="loading" outlined color="primary" @click="delete_record"><v-icon>mdi-delete</v-icon>删除 </v-btn>
                <!--
                <v-btn :disabled="loading" outlined color="primary" @click="mark_as('ignore')"><v-icon>mdi-tag</v-icon>全部标记为「忽略」</v-btn>
                <v-btn :disabled="loading" outlined color="primary" @click="mark_as('done')"><v-icon>mdi-tag</v-icon>全部标记为「已完成」</v-btn>
                -->
            </template>
            <v-spacer></v-spacer>
            <v-text-field cols="2" dense v-model="search" append-icon="mdi-magnify" label="搜索" single-line hide-details></v-text-field>
        </v-card-actions>
        <v-card-text>
            <div v-if="selected.length == 0">请勾选需要处理的文件</div>
            <div v-else>共选择了{{ selected.length }}个</div>
        </v-card-text>
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
            :page.sync="page"
            :items-per-page="100"
            :options="{ sortDesc: true }"
            :footer-props="{ 'items-per-page-options': [10, 50, 100] }"
        >
            <template v-slot:item.status="{ item }">
                <v-chip small v-if="item.status == 'ready'" class="success">可导入</v-chip>
                <v-chip small v-else-if="item.status == 'exist'" class="lighten-4">已存在</v-chip>
                <v-chip small v-else-if="item.status == 'imported'" class="primary">导入成功</v-chip>
                <v-chip small v-else-if="item.status == 'new'" class="grey">待扫描</v-chip>
                <v-chip small v-else class="info">{{ item.status }}</v-chip>
            </template>
            <template v-slot:item.title="{ item }">
                书名：<span v-if="item.book_id == 0"> {{ item.title }} </span>
                <a v-else target="_blank" :href="`/book/${item.book_id}`">{{ item.title }}</a> <br />
                作者：{{ item.author }}
            </template>
            <template v-slot:item.detail="{ item }">
                <span v-if="item.extra.visit_history"> 访问{{ item.extra.visit_history.length }}本 </span>
                <span v-if="item.extra.read_history"> 阅读{{ item.extra.read_history.length }}本 </span>
                <span v-if="item.extra.push_history"> 推送{{ item.extra.push_history.length }}本 </span>
                <span v-if="item.extra.download_history"> 下载{{ item.extra.download_history.length }}本 </span>
                <span v-if="item.extra.upload_history"> 上传{{ item.extra.upload_history.length }}本 </span>
            </template>
            <template v-slot:item.actions="{ item }">
                <v-menu offset-y right>
                    <template v-slot:activator="{ on }">
                        <v-btn color="primary" small v-on="on">操作 <v-icon small>more_vert</v-icon></v-btn>
                    </template>
                    <v-list dense>
                        <v-subheader>修改用户权限</v-subheader>

                        <v-divider></v-divider>
                        <v-subheader>账号管理</v-subheader>
                        <v-list-item v-if="!item.is_active">
                            <v-list-item-title> 免邮箱认证，直接激活账户 </v-list-item-title>
                        </v-list-item>
                        <v-list-item v-if="item.is_admin">
                            <v-list-item-title> 取消管理员 </v-list-item-title>
                        </v-list-item>
                        <v-list-item v-else>
                            <v-list-item-title> 设置为管理员 </v-list-item-title>
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
            { text: "状态", sortable: true, value: "status" },
            { text: "路径", sortable: true, value: "path" },
            { text: "扫描信息", sortable: false, value: "title" },
            { text: "时间", sortable: true, value: "create_time", width: "200px" },
            { text: "操作", sortable: false, value: "actions" },
        ],
        progress: {
            done: 0,
            total: 0,
            status: "finish",
        },
    }),
    watch: {
        options: {
            handler() {
                this.getDataFromApi();
            },
            deep: true,
        },
    },
    mounted() {
        this.getDataFromApi();
    },
    computed: {
        pageCount: function () {
            return parseInt(this.total / 20);
        },
    },
    methods: {
        getDataFromApi() {
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
            this.$backend("/admin/scan/list?" + data.toString())
                .then((rsp) => {
                    if (rsp.err != "ok") {
                        this.items = [];
                        this.total = 0;
                        alert(rsp.msg);
                        return false;
                    }
                    this.items = rsp.items;
                    this.total = rsp.total;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        loop_check_status(url, callback) {
            this.loading = true;
            this.$backend(url)
                .then((rsp) => {
                    if (rsp.err != "ok") {
                        this.$alert("error", rsp.msg);
                        return;
                    }
                    if (callback(rsp)) {
                        setTimeout(() => {
                            this.loop_check_status(url, callback);
                        }, 1000);
                    } else {
                        this.getDataFromApi();
                        this.$alert("info", "处理完毕！");
                    }
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        scan_books() {
            var path = "/data/books/upload";
            this.loading = true;
            this.$backend("/admin/scan/run", {
                method: "POST",
                body: JSON.stringify({ path: path }),
            })
                .then((rsp) => {
                    if (rsp.err != "ok") {
                        this.$alert("error", rsp.msg);
                        return;
                    }

                    //this.check_scan_status();
                    this.loop_check_status("/admin/scan/status", (rsp) => {
                        this.scan = rsp.status;
                        if (this.scan.new == 0) {
                            this.loading = false;
                            return false;
                        }
                        return true;
                    });
                })
                .finally(() => {});
        },
        import_books() {
            this.loading = true;
            this.$backend("/admin/import/run", {
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
                    //this.check_import_status();
                    this.loop_check_status("/admin/import/status", (rsp) => {
                        this.import = rsp.status;
                        if (this.import.ready == 0) {
                            this.loading = false;
                            return false;
                        }
                        return true;
                    });
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        delete_record() {
            console.log(this.selected);
            this.loading = true;
            this.$backend("/admin/scan/delete", {
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
        mark_as(status) {
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
    },
};
</script>
