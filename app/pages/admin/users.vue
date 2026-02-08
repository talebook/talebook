
<template>
    <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
            <span> {{ $t('messages.userManagement') }} </span>
            <div>
                <v-btn
                    color="primary"
                    class="mr-2"
                    @click="showGuestPermissionDialog = true"
                >
                    <v-icon start>
                        mdi-account-group
                    </v-icon>
                    {{ $t('messages.guestPermission') }}
                        <v-btn
                            color="primary"
                            size="small"
                            v-bind="props"
                        >
                            {{ t('actions.more') }} <v-icon size="small">
                                mdi-dots-vertical
                            </v-icon>
                        </v-btn>
                </v-btn>
            </div>
        </v-card-title>
        
        <!-- 添加用户对话框 -->
        <v-dialog
            v-model="showAddDialog"
            max-width="500px"
        >
            <v-card>
                <v-card-title> {{ $t('messages.addNewUser') }} </v-card-title>
                <v-card-text>
                    <v-form
                        ref="addUserForm"
                        @submit.prevent="addUser"
                    >
                        <!-- 基本信息 -->
                        <v-text-field
                            v-model="newUser.username"
                            :label="$t('messages.username')"
                            :rules="[requiredRule, usernameRule]"
                            required
                            prepend-icon="mdi-account"
                            :placeholder="$t('messages.usernamePlaceholder')"
                        />
                        
                        <v-text-field
                            v-model="newUser.password"
                            :label="$t('messages.password')"
                            :rules="[requiredRule, passwordRule]"
                            required
                            prepend-icon="mdi-lock"
                            type="password"
                            :placeholder="$t('messages.passwordPlaceholder')"
                        />
                        
                        <v-text-field
                            v-model="newUser.name"
                            :label="$t('messages.nickname')"
                            :rules="[requiredRule, nicknameRule]"
                            required
                            prepend-icon="mdi-account-circle"
                            :placeholder="$t('messages.nicknamePlaceholder')"
                        />
                        
                        <v-text-field
                            v-model="newUser.email"
                            :label="$t('messages.email')"
                            :rules="[requiredRule, emailRule]"
                            required
                            prepend-icon="mdi-email"
                            :placeholder="$t('messages.emailPlaceholder')"
                        />
                        
                        <!-- 账号设置 -->
                        <v-divider class="my-4" />
                        <h3 class="mb-2">
                            {{ $t('messages.accountSettings') }}
                        </h3>
                        
                        <v-checkbox
                            v-model="newUser.active"
                            :label="$t('messages.activeStatus')"
                            color="primary"
                            hide-details
                        />
                        
                        <v-checkbox
                            v-model="newUser.admin"
                            :label="$t('messages.adminPermission')"
                            color="primary"
                            hide-details
                        />
                        
                        <!-- 权限设置 -->
                        <v-divider class="my-4" />
                        <h3 class="mb-2">
                            {{ $t('messages.permissionSettings') }}
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
                        {{ t('actions.cancel') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        @click="addUser"
                    >
                        {{ t('actions.confirm') }}
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
                <v-card-title> {{ t('admin.guest.title') }} </v-card-title>
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
                        {{ t('actions.cancel') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        @click="saveGuestPermissions"
                    >
                        {{ t('actions.save') }}
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
                <span v-if="item.extra.visit_history"> {{ $t('admin.users.history.visit', {count: item.extra.visit_history.length}) }} </span>
                <span v-if="item.extra.read_history"> {{ $t('admin.users.history.read', {count: item.extra.read_history.length}) }} </span>
                <span v-if="item.extra.push_history"> {{ $t('admin.users.history.push', {count: item.extra.push_history.length}) }} </span>
                <span v-if="item.extra.download_history"> {{ $t('admin.users.history.download', {count: item.extra.download_history.length}) }} </span>
                <span v-if="item.extra.upload_history"> {{ $t('admin.users.history.upload', {count: item.extra.upload_history.length}) }} </span>
            </template>
            <template #item.actions="{ item }">
                <v-menu>
                    <template #activator="{ props }">
                        <v-btn
                            color="primary"
                            size="small"
                            v-bind="props"
                        >
                            {{ $t('admin.users.actions.manage') }} <v-icon size="small">
                                mdi-dots-vertical
                            </v-icon>
                        </v-btn>
                    </template>
                    <v-list density="compact">
                        <v-list-subheader>{{ $t('admin.users.permissions.edit') }}</v-list-subheader>
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
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';

const store = useMainStore();
const { t } = useI18n();
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
const requiredRule = v => !!v || t('validation.required');
const emailRule = (email) => {
    var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email) || t('validation.emailInvalid');
};
const usernameRule = v => ((20 >= v.length && v.length >= 5) && /^[a-z][a-z0-9_]*$/.test(v)) || t('validation.usernameFormat');
const passwordRule = v => (20 >= v.length && v.length >= 8) || t('validation.passwordLength');
const nicknameRule = v => v.length >= 2 || t('validation.nickLength');

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
    { key: 'ALLOW_GUEST_READ', label: t('admin.guest.allow_read') },
    { key: 'ALLOW_GUEST_DOWNLOAD', label: t('admin.guest.allow_download') },
    { key: 'ALLOW_GUEST_PUSH', label: t('admin.guest.allow_push') },
    { key: 'ALLOW_GUEST_UPLOAD', label: t('admin.guest.allow_upload') },
];

const headers = [
    { title: t('admin.table.id'), key: 'id', sortable: true },
    { title: t('admin.table.username'), key: 'username', sortable: true },
    { title: t('admin.table.name'), key: 'name', sortable: false },
    { title: t('admin.table.email'), key: 'email', sortable: true },
    { title: t('admin.table.provider'), key: 'provider', sortable: false },
    { title: t('admin.table.create_time'), key: 'create_time', sortable: true },
    { title: t('admin.table.access_time'), key: 'access_time', sortable: true },
    { title: t('admin.table.login_ip'), key: 'login_ip', sortable: false },
    { title: t('admin.table.detail'), key: 'detail', sortable: false },
    { title: t('admin.table.actions'), key: 'actions', sortable: false },
];

const permissions = [
    { code: 'l', name: 'can_login', text: t('admin.perms.login') },
    { code: 'u', name: 'can_upload', text: t('admin.perms.upload') },
    { code: 's', name: 'can_save', text: t('admin.perms.download') },
    { code: 'e', name: 'can_edit', text: t('admin.perms.edit') },
    { code: 'd', name: 'can_delete', text: t('admin.perms.delete') },
    { code: 'p', name: 'can_push', text: t('admin.perms.push') },
    { code: 'r', name: 'can_read', text: t('admin.perms.read') },
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
            if ($alert) $alert('success', t('admin.guest.saveSuccess'));
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
    title: () => t('admin.usersTitle')
});
</script>
