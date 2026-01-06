<template>
    <v-card>
        <v-card-title> 用户管理 </v-card-title>
        <v-data-table
            :headers="headers"
            :items="items"
            :options.sync="options"
            :server-items-length="total"
            :loading="loading"
            :items-per-page="10"
            :footer-props="{ 'items-per-page-options': [10, 50, 100] }"
            class="elevation-1"
        >
            <template v-slot:item.login_ip="{ item }">
                {{ item.extra.login_ip }}
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
                        <template v-for="perm in permissions">
                            <v-list-item :key="'disable-' + perm.name" v-if="item[perm.name]">
                                <v-list-item-title
                                    ><v-icon color="success">mdi-account-check</v-icon> 已允许{{ perm.text }}
                                </v-list-item-title>
                                <v-list-item-action>
                                    <v-btn
                                        text
                                        small
                                        color="error"
                                        @click="
                                            setuser(item.id, { permission: perm.code.toUpperCase() });
                                            item[perm.name] = !item[perm.name];
                                        "
                                    >
                                        关闭
                                    </v-btn>
                                </v-list-item-action>
                            </v-list-item>
                            <v-list-item :key="'enable-' + perm.name" v-else>
                                <v-list-item-title
                                    ><v-icon color="danger">mdi-account-remove</v-icon> 已禁止{{ perm.text }}
                                </v-list-item-title>
                                <v-list-item-action>
                                    <v-btn
                                        text
                                        small
                                        color="primary"
                                        @click="
                                            setuser(item.id, { permission: perm.code.toLowerCase() });
                                            item[perm.name] = !item[perm.name];
                                        "
                                    >
                                        开启
                                    </v-btn>
                                </v-list-item-action>
                            </v-list-item>
                        </template>

                        <v-divider></v-divider>
                        <v-subheader>账号管理</v-subheader>
                        <v-list-item
                            v-if="!item.is_active"
                            @click="
                                setuser(item.id, { active: true });
                                item.is_active = true;
                            "
                        >
                            <v-list-item-title> 免邮箱认证，直接激活账户 </v-list-item-title>
                        </v-list-item>
                        <v-list-item
                            v-if="item.is_admin"
                            @click="
                                setuser(item.id, { admin: false });
                                item.is_admin = !item.is_admin;
                            "
                        >
                            <v-list-item-title> 取消管理员 </v-list-item-title>
                        </v-list-item>
                        <v-list-item
                            v-else
                            @click="
                                setuser(item.id, { admin: true });
                                item.is_admin = item.is_admin = !item.is_admin;
                            "
                        >
                            <v-list-item-title> 设置为管理员 </v-list-item-title>
                        </v-list-item>
                        <v-list-item
                            @click="
                                setuser(item.id, { delete: item.username });
                                getDataFromApi()
                            "
                        >
                            <v-list-item-title> 立即删除该用户 </v-list-item-title>
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
        page: 1,
        items: [],
        total: 0,
        loading: true,
        options: { sortBy: ["access_time"], sortDesc: [true] },
        headers: [
            { text: "ID", sortable: true, value: "id" },
            { text: "用户名", sortable: true, value: "username" },
            { text: "昵称", sortable: false, value: "name" },
            { text: "Email", sortable: true, value: "email" },
            { text: "注册平台", sortable: false, value: "provider" },
            { text: "注册时间", sortable: true, value: "create_time" },
            { text: "登录时间", sortable: true, value: "access_time" },
            { text: "登录IP", sortable: false, value: "login_ip" },
            { text: "详情", sortable: false, value: "detail" },
            { text: "操作", sortable: false, value: "actions" },
        ],
        permissions: [
            { code: "l", name: "can_login", text: "登录" },
            { code: "u", name: "can_upload", text: "上传" },
            { code: "s", name: "can_save", text: "下载" },
            { code: "e", name: "can_edit", text: "编辑" },
            { code: "d", name: "can_delete", text: "删除" },
            { code: "p", name: "can_push", text: "推送" },
            { code: "r", name: "can_read", text: "在线阅读" },
        ],
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
            this.$backend("/admin/users?" + data.toString())
                .then((rsp) => {
                    if (rsp.err != "ok") {
                        this.items = [];
                        this.total = 0;
                        alert(rsp.msg);
                        return false;
                    }
                    this.items = rsp.users.items;
                    this.total = rsp.users.total;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        setuser(uid, action) {
            action.id = uid;
            this.$backend("/admin/users", {
                body: JSON.stringify(action),
                method: "POST",
            }).then((rsp) => {
                if (rsp.err != "ok") {
                    this.$alert("error", rsp.msg);
                }
            });
        },
    },
};
</script>
