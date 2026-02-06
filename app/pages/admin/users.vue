
<template>
    <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
            <span> 用户管理 </span>
            <div>
                <v-btn
                    color="primary"
                    class="mr-2"
                    @click="showGuestPermissionDialog = true"
                >
                    <v-icon start>
                        mdi-account-group
                    </v-icon>
                    访客权限
                </v-btn>
                <v-btn
                    color="primary"
                    @click="showAddDialog = true"
                >
                    <v-icon start>
                        mdi-plus
                    </v-icon>
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
                    <v-form
                        ref="addUserForm"
                        @submit.prevent="addUser"
                    >
                        <!-- 基本信息 -->
                        <v-text-field
                            v-model="newUser.username"
                            label="用户名"
                            :rules="[requiredRule, usernameRule]"
                            required
                            prepend-icon="mdi-account"
                            placeholder="请输入用户名，小写字母开头"
                        />
                        
                        <v-text-field
                            v-model="newUser.password"
                            label="密码"
                            :rules="[requiredRule, passwordRule]"
                            required
                            prepend-icon="mdi-lock"
                            type="password"
                            placeholder="请输入8-20个字符的密码"
                        />
                        
                        <v-text-field
                            v-model="newUser.name"
                            label="昵称"
                            :rules="[requiredRule, nicknameRule]"
                            required
                            prepend-icon="mdi-account-circle"
                            placeholder="请输入用户昵称，至少2个字符"
                        />
                        
                        <v-text-field
                            v-model="newUser.email"
                            label="邮箱"
                            :rules="[requiredRule, emailRule]"
                            required
                            prepend-icon="mdi-email"
                            placeholder="请输入邮箱地址"
                        />
                        
                        <!-- 账号设置 -->
                        <v-divider class="my-4" />
                        <h3 class="mb-2">
                            账号设置
                        </h3>
                        
                        <v-checkbox
                            v-model="newUser.active"
                            label="激活状态"
                            color="primary"
                            hide-details
                        />
                        
                        <v-checkbox
                            v-model="newUser.admin"
                            label="管理员权限"
                            color="primary"
                            hide-details
                        />
                        
                        <!-- 权限设置 -->
                        <v-divider class="my-4" />
                        <h3 class="mb-2">
                            权限设置
                        </h3>
                        
                        <v-container fluid>
                            <v-row>
                                <v-col
                                    v-for="perm in permissions"
                                    :key="perm.name"
                                    cols="12"
                                    sm="6"
                                    md="4"
                                >
                                    <v-checkbox
                                        v-model="newUser.permissions[perm.name]"
                                        :label="perm.text"
                                        color="primary"
                                        hide-details
                                    />
                                </v-col>
                            </v-row>
                        </v-container>
                    </v-form>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        text
                        @click="showAddDialog = false"
                    >
                        取消
                    </v-btn>
                    <v-btn
                        color="primary"
                        @click="addUser"
                    >
                        确定
                    </v-btn>
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
                    <v-form ref="guestPermissionForm">
                        <v-container fluid>
                            <v-row>
                                <v-col
                                    v-for="perm in guestPermissionList"
                                    :key="perm.key"
                                    cols="12"
                                >
                                    <v-checkbox
                                        v-model="guestPermissions[perm.key]"
                                        :label="perm.label"
                                        color="primary"
                                        hide-details
                                    />
                                </v-col>
                            </v-row>
                        </v-container>
                    </v-form>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        text
                        @click="showGuestPermissionDialog = false"
                    >
                        取消
                    </v-btn>
                    <v-btn
                        color="primary"
                        @click="saveGuestPermissions"
                    >
                        保存
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        
        <v-data-table-server
            density="compact"
            class="elevation-1 text-body-2"
            :headers="headers"
            :items="items"
            :items-length="total"
            :loading="loading"
            :items-per-page="itemsPerPage"
            @update:options="updateOptions"
        >
            <template #item.login_ip="{ item }">
                {{ item.extra.login_ip }}
            </template>
            <template #item.detail="{ item }">
                <span v-if="item.extra.visit_history"> 访问{{ item.extra.visit_history.length }}本 </span>
                <span v-if="item.extra.read_history"> 阅读{{ item.extra.read_history.length }}本 </span>
                <span v-if="item.extra.push_history"> 推送{{ item.extra.push_history.length }}本 </span>
                <span v-if="item.extra.download_history"> 下载{{ item.extra.download_history.length }}本 </span>
                <span v-if="item.extra.upload_history"> 上传{{ item.extra.upload_history.length }}本 </span>
            </template>
            <template #item.actions="{ item }">
                <v-menu>
                    <template #activator="{ props }">
                        <v-btn
                            color="primary"
                            size="small"
                            v-bind="props"
                        >
                            操作 <v-icon size="small">
                                mdi-dots-vertical
                            </v-icon>
                        </v-btn>
                    </template>
                    <v-list density="compact">
                        <v-list-subheader>修改用户权限</v-list-subheader>
                        <template
                            v-for="perm in permissions"
                            :key="perm.name"
                        >
                            <v-list-item v-if="item[perm.name]">
                                <template #prepend>
                                    <v-icon color="success">
                                        mdi-account-check
                                    </v-icon>
                                </template>
                                <v-list-item-title>已允许{{ perm.text }}</v-list-item-title>
                                <template #append>
                                    <v-btn
                                        variant="text"
                                        size="small"
                                        color="error"
                                        @click="
                                            setuser(item.id, { permission: perm.code.toUpperCase() });
                                            item[perm.name] = !item[perm.name];
                                        "
                                    >
                                        关闭
                                    </v-btn>
                                </template>
                            </v-list-item>
                            <v-list-item
                                v-else
                                :key="'enable-' + perm.name"
                            >
                                <template #prepend>
                                    <v-icon color="error">
                                        mdi-account-remove
                                    </v-icon>
                                </template>
                                <v-list-item-title>已禁止{{ perm.text }}</v-list-item-title>
                                <template #append>
                                    <v-btn
                                        variant="text"
                                        size="small"
                                        color="primary"
                                        @click="
                                            setuser(item.id, { permission: perm.code.toLowerCase() });
                                            item[perm.name] = !item[perm.name];
                                        "
                                    >
                                        开启
                                    </v-btn>
                                </template>
                            </v-list-item>
                        </template>

                        <v-divider />
                        <v-list-subheader>账号管理</v-list-subheader>
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
                                item.is_admin = !item.is_admin;
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
        </v-data-table-server>
    </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMainStore } from '@/stores/main';

const store = useMainStore();
const { $backend, $alert } = useNuxtApp();

store.setNavbar(true);

const items = ref([]);
const total = ref(0);
const loading = ref(true);
const itemsPerPage = ref(10);
const options = ref({ page: 1, itemsPerPage: 10, sortBy: [{ key: 'access_time', order: 'desc' }] });

// Add user dialog state
const showAddDialog = ref(false);
const addUserForm = ref(null);

// Guest permission dialog state
const showGuestPermissionDialog = ref(false);

// Form rules
const requiredRule = v => !!v || '此项为必填项';
const emailRule = (email) => {
    var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email) || '邮箱格式不正确';
};
const usernameRule = v => ((20 >= v.length && v.length >= 5) && /^[a-z][a-z0-9_]*$/.test(v)) || '用户名必须以小写字母开头，只能包含字母、数字和下划线，长度在5-20个字符之间';
const passwordRule = v => (20 >= v.length && v.length >= 8) || '密码长度必须在8-20个字符之间';
const nicknameRule = v => v.length >= 2 || '昵称长度至少为2个字符';

// New user data
const newUser = ref({
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
});

// Guest permissions
const guestPermissions = ref({
    ALLOW_GUEST_READ: true,
    ALLOW_GUEST_DOWNLOAD: true,
    ALLOW_GUEST_PUSH: true,
    ALLOW_GUEST_UPLOAD: false,
});

const guestPermissionList = [
    { key: 'ALLOW_GUEST_READ', label: '允许访客在线阅读（无需注册和登录）' },
    { key: 'ALLOW_GUEST_DOWNLOAD', label: '允许任意下载（访客无需注册和登录）' },
    { key: 'ALLOW_GUEST_PUSH', label: '允许任意推送Kindle（访客无需注册和登录）' },
    { key: 'ALLOW_GUEST_UPLOAD', label: '允许访客上传书籍（无需注册和登录）' },
];

const headers = [
    { title: 'ID', key: 'id', sortable: true },
    { title: '用户名', key: 'username', sortable: true },
    { title: '昵称', key: 'name', sortable: false },
    { title: 'Email', key: 'email', sortable: true },
    { title: '注册平台', key: 'provider', sortable: false },
    { title: '注册时间', key: 'create_time', sortable: true },
    { title: '登录时间', key: 'access_time', sortable: true },
    { title: '登录IP', key: 'login_ip', sortable: false },
    { title: '详情', key: 'detail', sortable: false },
    { title: '操作', key: 'actions', sortable: false },
];

const permissions = [
    { code: 'l', name: 'can_login', text: '登录' },
    { code: 'u', name: 'can_upload', text: '上传' },
    { code: 's', name: 'can_save', text: '下载' },
    { code: 'e', name: 'can_edit', text: '编辑' },
    { code: 'd', name: 'can_delete', text: '删除' },
    { code: 'p', name: 'can_push', text: '推送' },
    { code: 'r', name: 'can_read', text: '在线阅读' },
];

const updateOptions = (newOptions) => {
    options.value = newOptions;
    getDataFromApi();
};

const getDataFromApi = () => {
    loading.value = true;
    const { page, itemsPerPage, sortBy } = options.value;
    
    const sortKey = sortBy && sortBy.length ? sortBy[0].key : 'access_time';
    const sortOrder = sortBy && sortBy.length ? (sortBy[0].order === 'desc') : true;

    var data = new URLSearchParams();
    if (page != undefined) data.append('page', page);
    data.append('sort', sortKey);
    data.append('desc', sortOrder);
    if (itemsPerPage != undefined) data.append('num', itemsPerPage);

    $backend('/admin/users?' + data.toString())
        .then((rsp) => {
            if (rsp.err != 'ok') {
                items.value = [];
                total.value = 0;
                if ($alert) $alert('error', rsp.msg);
                return false;
            }
            items.value = rsp.users.items;
            total.value = rsp.users.total;
        })
        .finally(() => {
            loading.value = false;
        });
};

const setuser = (uid, action) => {
    action.id = uid;
    $backend('/admin/users', {
        body: JSON.stringify(action),
        method: 'POST',
    }).then((rsp) => {
        if (rsp.err != 'ok') {
            if ($alert) $alert('error', rsp.msg);
        }
    });
};

const resetForm = () => {
    if (addUserForm.value) addUserForm.value.reset();
    newUser.value = {
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
};

const addUser = async () => {
    const { valid } = await addUserForm.value.validate();
    if (!valid) return;
    
    loading.value = true;
    
    // 构建权限字符串
    let permissionStr = '';
    for (let perm of permissions) {
        if (newUser.value.permissions[perm.name]) {
            permissionStr += perm.code.toLowerCase();
        } else {
            permissionStr += perm.code.toUpperCase();
        }
    }
    
    const userData = {
        username: newUser.value.username,
        password: newUser.value.password,
        name: newUser.value.name,
        email: newUser.value.email,
        admin: newUser.value.admin,
        active: newUser.value.active,
        permission: permissionStr
    };
    
    $backend('/admin/users', {
        body: JSON.stringify(userData),
        method: 'POST',
    }).then((rsp) => {
        if (rsp.err != 'ok') {
            if ($alert) $alert('error', rsp.msg);
        } else {
            resetForm();
            showAddDialog.value = false;
            getDataFromApi();
        }
    }).finally(() => {
        loading.value = false;
    });
};

const saveGuestPermissions = () => {
    $backend('/admin/settings', {
        method: 'POST',
        body: JSON.stringify(guestPermissions.value)
    }).then((rsp) => {
        if (rsp.err != 'ok') {
            if ($alert) $alert('error', rsp.msg);
        } else {
            if ($alert) $alert('success', '访客权限设置保存成功！');
            showGuestPermissionDialog.value = false;
        }
    });
};

onMounted(() => {
    // 获取访客权限设置
    $backend('/admin/settings').then(rsp => {
        if (rsp.err === 'ok') {
            guestPermissions.value = {
                ALLOW_GUEST_READ: rsp.settings.ALLOW_GUEST_READ,
                ALLOW_GUEST_DOWNLOAD: rsp.settings.ALLOW_GUEST_DOWNLOAD,
                ALLOW_GUEST_PUSH: rsp.settings.ALLOW_GUEST_PUSH,
                ALLOW_GUEST_UPLOAD: rsp.settings.ALLOW_GUEST_UPLOAD,
            };
        }
    });
    
    getDataFromApi();
});

useHead({
    title: '用户管理'
});
</script>
