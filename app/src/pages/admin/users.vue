<template>
    <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
            <span> 用户管理 </span>
            <div>
                <v-btn color="primary" @click="showGuestPermissionDialog = true" class="mr-2">
                    <v-icon>mdi-account-group</v-icon>
                    访客权限
                </v-btn>
                <v-btn color="primary" @click="showAddDialog = true">
                    <v-icon>mdi-plus</v-icon>
                    添加用户
                </v-btn>
            </div>
        </v-card-title>
        
        <!-- 添加用户对话框 -->
        <v-dialog
            v-model="showAddDialog"
            max-width="500px"
        >
            <v-card>
                <v-card-title> 添加新用户 </v-card-title>
                <v-card-text>
                    <v-form ref="addUserForm" v-model="valid">
                        <!-- 基本信息 -->
                        <v-text-field
                            v-model="newUser.username"
                            label="用户名"
                            :rules="[requiredRule, usernameRule]"
                            required
                            prepend-icon="mdi-account"
                            placeholder="请输入用户名，小写字母开头"
                        ></v-text-field>
                        
                        <v-text-field
                            v-model="newUser.password"
                            label="密码"
                            :rules="[requiredRule, passwordRule]"
                            required
                            prepend-icon="mdi-lock"
                            type="password"
                            placeholder="请输入8-20个字符的密码"
                        ></v-text-field>
                        
                        <v-text-field
                            v-model="newUser.name"
                            label="昵称"
                            :rules="[requiredRule, nicknameRule]"
                            required
                            prepend-icon="mdi-account-circle"
                            placeholder="请输入用户昵称，至少2个字符"
                        ></v-text-field>
                        
                        <v-text-field
                            v-model="newUser.email"
                            label="邮箱"
                            :rules="[requiredRule, emailRule]"
                            required
                            prepend-icon="mdi-email"
                            placeholder="请输入邮箱地址"
                        ></v-text-field>
                        
                        <!-- 账号设置 -->
                        <v-divider class="my-4"></v-divider>
                        <h3 class="mb-2">账号设置</h3>
                        
                        <v-checkbox
                            v-model="newUser.active"
                            label="激活状态"
                            color="primary"
                            hide-details
                        ></v-checkbox>
                        
                        <v-checkbox
                            v-model="newUser.admin"
                            label="管理员权限"
                            color="primary"
                            hide-details
                        ></v-checkbox>
                        
                        <!-- 权限设置 -->
                        <v-divider class="my-4"></v-divider>
                        <h3 class="mb-2">权限设置</h3>
                        
                        <v-container fluid>
                            <v-row>
                                <v-col cols="12" sm="6" md="4" v-for="perm in permissions" :key="perm.name">
                                    <v-checkbox
                                        v-model="newUser.permissions[perm.name]"
                                        :label="perm.text"
                                        color="primary"
                                        hide-details
                                    ></v-checkbox>
                                </v-col>
                            </v-row>
                        </v-container>
                    </v-form>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn text @click="showAddDialog = false">取消</v-btn>
                    <v-btn color="primary" @click="addUser">确定</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        
        <!-- 访客权限设置对话框 -->
        <v-dialog
            v-model="showGuestPermissionDialog"
            max-width="500px"
        >
            <v-card>
                <v-card-title> 访客权限设置 </v-card-title>
                <v-card-text>
                    <v-form ref="guestPermissionForm" v-model="guestValid">
                        <v-container fluid>
                            <v-row>
                                <v-col cols="12" v-for="perm in guestPermissionList" :key="perm.key">
                                    <v-checkbox
                                        v-model="guestPermissions[perm.key]"
                                        :label="perm.label"
                                        color="primary"
                                        hide-details
                                    ></v-checkbox>
                                </v-col>
                            </v-row>
                        </v-container>
                    </v-form>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn text @click="showGuestPermissionDialog = false">取消</v-btn>
                    <v-btn color="primary" @click="saveGuestPermissions">保存</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        
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
        // 添加用户对话框控制
        showAddDialog: false,
        valid: true,
        // 访客权限对话框控制
        showGuestPermissionDialog: false,
        guestValid: true,
        // 表单验证规则
        requiredRule: v => !!v || '此项为必填项',
        emailRule: function (email) {
            var re = /^(([^<>()[]\\.,;:\s@"]+(\.[^<>()[]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return re.test(email) || "邮箱格式不正确";
        },
        usernameRule: v => ((20 >= v.length && v.length >= 5) && /^[a-z][a-z0-9_]*$/.test(v)) || '用户名必须以小写字母开头，只能包含字母、数字和下划线，长度在5-20个字符之间',
        passwordRule: v => (20 >= v.length && v.length >= 8) || '密码长度必须在8-20个字符之间',
        nicknameRule: v => v.length >= 2 || '昵称长度至少为2个字符',
        // 新用户数据
        newUser: {
            username: '',
            password: '',
            name: '',
            email: '',
            admin: false,
            active: true,
            permissions: {
                can_login: true,
                can_upload: false,
                can_save: true,
                can_edit: false,
                can_delete: false,
                can_push: false,
                can_read: true
            }
        },
        // 访客权限设置
        guestPermissions: {
            ALLOW_GUEST_READ: true,
            ALLOW_GUEST_DOWNLOAD: true,
            ALLOW_GUEST_PUSH: true,
            ALLOW_GUEST_UPLOAD: false,
        },
        guestPermissionList: [
            { key: "ALLOW_GUEST_READ", label: "允许访客在线阅读（无需注册和登录）" },
            { key: "ALLOW_GUEST_DOWNLOAD", label: "允许任意下载（访客无需注册和登录）" },
            { key: "ALLOW_GUEST_PUSH", label: "允许任意推送Kindle（访客无需注册和登录）" },
            { key: "ALLOW_GUEST_UPLOAD", label: "允许访客上传书籍（无需注册和登录）" },
        ],
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
    created() {
        // 获取访客权限设置
        this.$backend("/admin/settings").then(rsp => {
            if (rsp.err === "ok") {
                this.guestPermissions = {
                    ALLOW_GUEST_READ: rsp.settings.ALLOW_GUEST_READ,
                    ALLOW_GUEST_DOWNLOAD: rsp.settings.ALLOW_GUEST_DOWNLOAD,
                    ALLOW_GUEST_PUSH: rsp.settings.ALLOW_GUEST_PUSH,
                };
            }
        });
    },
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
        // 重置表单
        resetForm() {
            this.$refs.addUserForm.reset();
            this.newUser = {
                username: '',
                password: '',
                name: '',
                email: '',
                admin: false,
                active: true,
                permissions: {
                    can_login: true,
                    can_upload: false,
                    can_save: true,
                    can_edit: false,
                    can_delete: false,
                    can_push: false,
                    can_read: true
                }
            };
        },
        // 添加用户
        addUser() {
            if (!this.$refs.addUserForm.validate()) {
                return;
            }
            
            this.loading = true;
            
            // 构建权限字符串
            let permissionStr = '';
            for (let perm of this.permissions) {
                if (this.newUser.permissions[perm.name]) {
                    permissionStr += perm.code.toLowerCase();
                } else {
                    permissionStr += perm.code.toUpperCase();
                }
            }
            
            // 准备请求数据
            const userData = {
                username: this.newUser.username,
                password: this.newUser.password,
                name: this.newUser.name,
                email: this.newUser.email,
                admin: this.newUser.admin,
                active: this.newUser.active,
                permission: permissionStr
            };
            
            // 发送请求
            this.$backend("/admin/users", {
                body: JSON.stringify(userData),
                method: "POST",
            }).then((rsp) => {
                if (rsp.err != "ok") {
                    this.$alert("error", rsp.msg);
                } else {
                    // 重置表单
                    this.resetForm();
                    // 关闭对话框
                    this.showAddDialog = false;
                    // 刷新用户列表
                    this.getDataFromApi();
                }
            }).finally(() => {
                this.loading = false;
            });
        },
        // 保存访客权限设置
        saveGuestPermissions() {
            this.$backend("/admin/settings", {
                method: "POST",
                body: JSON.stringify(this.guestPermissions)
            }).then((rsp) => {
                if (rsp.err != "ok") {
                    this.$alert("error", rsp.msg);
                } else {
                    this.$alert("success", "访客权限设置保存成功！");
                    this.showGuestPermissionDialog = false;
                }
            });
        }
    },
};
</script>
