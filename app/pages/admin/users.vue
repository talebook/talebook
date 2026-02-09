
<template>
    <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
            <span> {{ $t('admin.title.users') }} </span>
            <div>
                <v-btn
                    color="primary"
                    class="mr-2"
                    @click="showGuestPermissionDialog = true"
                >
                    <v-icon start>
                        mdi-account-group
                    </v-icon>
                    {{ $t('admin.button.guestPermission') }}
                </v-btn>
                <v-btn
                    color="primary"
                    @click="showAddDialog = true"
                >
                    <v-icon start>
                        mdi-plus
                    </v-icon>
                    {{ $t('admin.button.addUser') }}
                </v-btn>
            </div>
        </v-card-title>
        
        <!-- 添加用户对话框 -->
        <v-dialog
            v-model="showAddDialog"
            max-width="500px"
        >
            <v-card>
                <v-card-title> {{ $t('admin.button.addUser') }} </v-card-title>
                <v-card-text>
                    <v-form
                        ref="addUserForm"
                        @submit.prevent="addUser"
                    >
                        <!-- 基本信息 -->
                        <v-text-field
                            v-model="newUser.username"
                            :label="$t('admin.label.username')"
                            :rules="[requiredRule, usernameRule]"
                            required
                            prepend-icon="mdi-account"
                            :placeholder="$t('admin.placeholder.username')"
                        />
                        <v-text-field
                            v-model="newUser.password"
                            :label="$t('admin.label.password')"
                            :rules="[requiredRule, passwordRule]"
                            required
                            prepend-icon="mdi-lock"
                            type="password"
                            :placeholder="$t('admin.placeholder.password')"
                        />
                        <v-text-field
                            v-model="newUser.name"
                            :label="$t('admin.label.nickname')"
                            :rules="[requiredRule, nicknameRule]"
                            required
                            prepend-icon="mdi-account-circle"
                            :placeholder="$t('admin.placeholder.nickname')"
                        />
                        <v-text-field
                            v-model="newUser.email"
                            :label="$t('admin.label.email')"
                            :rules="[requiredRule, emailRule]"
                            required
                            prepend-icon="mdi-email"
                            :placeholder="$t('admin.placeholder.email')"
                        />
                        
                        <!-- 账号设置 -->
                        <v-divider class="my-4" />
                        <h3 class="mb-2">
                            {{ $t('admin.section.accountSettings') }}
                        </h3>
                        
                        <v-checkbox
                            v-model="newUser.active"
                            :label="$t('admin.label.activeStatus')"
                            color="primary"
                            hide-details
                        />
                        
                        <v-checkbox
                            v-model="newUser.admin"
                            :label="$t('admin.label.adminPermission')"
                            color="primary"
                            hide-details
                        />
                        
                        <!-- 权限设置 -->
                        <v-divider class="my-4" />
                        <h3 class="mb-2">
                            {{ $t('admin.section.permissionSettings') }}
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
                        {{ $t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        @click="addUser"
                    >
                        {{ $t('common.confirm') }}
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
                <v-card-title> {{ $t('admin.button.guestPermission') }} </v-card-title>
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
                        {{ $t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        @click="saveGuestPermissions"
                    >
                        {{ $t('common.save') }}
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
                                {{ $t('admin.user.action') }} <v-icon size="small">
                                    mdi-dots-vertical
                                </v-icon>
                            </v-btn>
                    </template>
                    <v-list density="compact">
                        <v-list-subheader>{{ $t('admin.user.modifyPermission') }}</v-list-subheader>
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
                                <v-list-item-title>{{ $t('admin.user.enabled') }}{{ perm.text }}</v-list-item-title>
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
                                        {{ $t('admin.user.disable') }}
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
                                <v-list-item-title>{{ $t('admin.user.disabled') }}{{ perm.text }}</v-list-item-title>
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
                                        {{ $t('admin.user.enable') }}
                                    </v-btn>
                                </template>
                            </v-list-item>
                        </template>

                        <v-divider />
                        <v-list-subheader>{{ $t('admin.user.accountManagement') }}</v-list-subheader>
                        <v-list-item
                            v-if="!item.is_active"
                            @click="
                                setuser(item.id, { active: true });
                                item.is_active = true;
                            "
                        >
                            <v-list-item-title> {{ $t('admin.user.activateAccount') }} </v-list-item-title>
                        </v-list-item>
                        <v-list-item
                            v-if="item.is_admin"
                            @click="
                                setuser(item.id, { admin: false });
                                item.is_admin = !item.is_admin;
                            "
                        >
                            <v-list-item-title> {{ $t('admin.user.removeAdmin') }} </v-list-item-title>
                        </v-list-item>
                        <v-list-item
                            v-else
                            @click="
                                setuser(item.id, { admin: true });
                                item.is_admin = !item.is_admin;
                            "
                        >
                            <v-list-item-title> {{ $t('admin.user.setAdmin') }} </v-list-item-title>
                        </v-list-item>
                        <v-list-item
                            @click="
                                setuser(item.id, { delete: item.username });
                                getDataFromApi()
                            "
                        >
                            <v-list-item-title> {{ $t('admin.user.deleteUser') }} </v-list-item-title>
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
const { $backend, $alert, $t } = useNuxtApp();

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
    { key: 'ALLOW_GUEST_READ', label: $t('admin.label.allowGuestRead') },
    { key: 'ALLOW_GUEST_DOWNLOAD', label: $t('admin.label.allowGuestDownload') },
    { key: 'ALLOW_GUEST_PUSH', label: $t('admin.label.allowGuestPush') },
    { key: 'ALLOW_GUEST_UPLOAD', label: $t('admin.label.allowGuestUpload') },
];

const headers = [
    { title: 'ID', key: 'id', sortable: true },
    { title: $t('admin.label.username'), key: 'username', sortable: true },
    { title: $t('admin.label.nickname'), key: 'name', sortable: false },
    { title: 'Email', key: 'email', sortable: true },
    { title: $t('admin.label.registrationPlatform'), key: 'provider', sortable: false },
    { title: $t('admin.label.registrationTime'), key: 'create_time', sortable: true },
    { title: $t('admin.label.loginTime'), key: 'access_time', sortable: true },
    { title: $t('admin.label.loginIp'), key: 'login_ip', sortable: false },
    { title: $t('admin.label.detail'), key: 'detail', sortable: false },
    { title: $t('admin.label.action'), key: 'actions', sortable: false },
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
    title: $t('admin.title.users')
});
</script>
