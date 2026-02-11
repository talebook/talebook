
<template>
    <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
            <span> {{ t('admin.users.title') }} </span>
            <div>
                <v-btn
                    color="primary"
                    class="mr-2"
                    @click="showGuestPermissionDialog = true"
                >
                    <v-icon start>
                        mdi-account-group
                    </v-icon>
                    {{ t('admin.users.button.guestPermission') }}
                </v-btn>
                <v-btn
                    color="primary"
                    @click="showAddDialog = true"
                >
                    <v-icon start>
                        mdi-plus
                    </v-icon>
                    {{ t('admin.users.button.addUser') }}
                </v-btn>
            </div>
        </v-card-title>
        
        <!-- 添加用户对话框 -->
        <v-dialog
            v-model="showAddDialog"
            max-width="500px"
        >
            <v-card>
                <v-card-title> {{ t('admin.users.button.addUser') }} </v-card-title>
                <v-card-text>
                    <v-form
                        ref="addUserForm"
                        @submit.prevent="addUser"
                    >
                        <!-- 基本信息 -->
                        <v-text-field
                            v-model="newUser.username"
                            :label="t('admin.users.label.username')"
                            :rules="[requiredRule, usernameRule]"
                            required
                            prepend-icon="mdi-account"
                            :placeholder="t('admin.users.placeholder.username')"
                        />
                        <v-text-field
                            v-model="newUser.password"
                            :label="t('admin.users.label.password')"
                            :rules="[requiredRule, passwordRule]"
                            required
                            prepend-icon="mdi-lock"
                            type="password"
                            :placeholder="t('admin.users.placeholder.password')"
                        />
                        <v-text-field
                            v-model="newUser.name"
                            :label="t('admin.users.label.nickname')"
                            :rules="[requiredRule, nicknameRule]"
                            required
                            prepend-icon="mdi-account-circle"
                            :placeholder="t('admin.users.placeholder.nickname')"
                        />
                        <v-text-field
                            v-model="newUser.email"
                            :label="t('admin.users.label.email')"
                            :rules="[requiredRule, emailRule]"
                            required
                            prepend-icon="mdi-email"
                            :placeholder="t('admin.users.placeholder.email')"
                        />
                        
                        <!-- 账号设置 -->
                        <v-divider class="my-4" />
                        <h3 class="mb-2">
                            {{ t('admin.users.label.accountSettings') }}
                        </h3>
                        
                        <v-checkbox
                            v-model="newUser.active"
                            :label="t('admin.users.label.activeStatus')"
                            color="primary"
                            hide-details
                        />
                        
                        <v-checkbox
                            v-model="newUser.admin"
                            :label="t('admin.users.label.adminPermission')"
                            color="primary"
                            hide-details
                        />
                        
                        <!-- 权限设置 -->
                        <v-divider class="my-4" />
                        <h3 class="mb-2">
                            {{ t('admin.users.label.permissionSettings') }}
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
                <v-card-title> {{ t('admin.users.button.guestPermission') }} </v-card-title>
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
                        {{ t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        @click="saveGuestPermissions"
                    >
                        {{ t('common.save') }}
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
                <span v-if="item.extra.visit_history"> {{ t('admin.users.label.visited') }}{{ item.extra.visit_history.length }}{{ t('admin.users.label.books') }} </span>
                <span v-if="item.extra.read_history"> {{ t('admin.users.label.read') }}{{ item.extra.read_history.length }}{{ t('admin.users.label.books') }} </span>
                <span v-if="item.extra.push_history"> {{ t('admin.users.label.pushed') }}{{ item.extra.push_history.length }}{{ t('admin.users.label.books') }} </span>
                <span v-if="item.extra.download_history"> {{ t('admin.users.label.downloaded') }}{{ item.extra.download_history.length }}{{ t('admin.users.label.books') }} </span>
                <span v-if="item.extra.upload_history"> {{ t('admin.users.label.uploaded') }}{{ item.extra.upload_history.length }}{{ t('admin.users.label.books') }} </span>
            </template>
            <template #item.actions="{ item }">
                <v-menu>
                    <template #activator="{ props }">
                        <v-btn
                                color="primary"
                                size="small"
                                v-bind="props"
                            >
                                {{ t('admin.users.user.action') }} <v-icon size="small">
                                    mdi-dots-vertical
                                </v-icon>
                            </v-btn>
                    </template>
                    <v-list density="compact">
                        <v-list-subheader>{{ t('admin.users.user.modifyPermission') }}</v-list-subheader>
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
                                <v-list-item-title>{{ t('admin.users.user.enabled') }}{{ perm.text }}</v-list-item-title>
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
                                        {{ t('admin.users.user.disable') }}
                                    </v-btn>
                                </template>
                            </v-list-item>
                            <v-list-item
                                v-else
                                :key="'enable-'+perm.name"
                            >
                                <template #prepend>
                                    <v-icon color="error">
                                        mdi-account-remove
                                    </v-icon>
                                </template>
                                <v-list-item-title>{{ t('admin.users.user.disabled') }}{{ perm.text }}</v-list-item-title>
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
                                        {{ t('admin.users.user.enable') }}
                                    </v-btn>
                                </template>
                            </v-list-item>
                        </template>

                        <v-divider />
                        <v-list-subheader>{{ t('admin.users.user.accountManagement') }}</v-list-subheader>
                        <v-list-item
                            v-if="!item.is_active"
                            @click="
                                setuser(item.id, { active: true });
                                item.is_active = true;
                            "
                        >
                            <v-list-item-title> {{ t('admin.users.user.activateAccount') }} </v-list-item-title>
                        </v-list-item>
                        <v-list-item
                            v-if="item.is_admin"
                            @click="
                                setuser(item.id, { admin: false });
                                item.is_admin = !item.is_admin;
                            "
                        >
                            <v-list-item-title> {{ t('admin.users.user.removeAdmin') }} </v-list-item-title>
                        </v-list-item>
                        <v-list-item
                            v-else
                            @click="
                                setuser(item.id, { admin: true });
                                item.is_admin = !item.is_admin;
                            "
                        >
                            <v-list-item-title> {{ t('admin.users.user.setAdmin') }} </v-list-item-title>
                        </v-list-item>
                        <v-list-item
                            @click="
                                setuser(item.id, { delete: item.username });
                                getDataFromApi()
                            "
                        >
                            <v-list-item-title> {{ t('admin.users.user.deleteUser') }} </v-list-item-title>
                        </v-list-item>
                    </v-list>
                </v-menu>
            </template>
        </v-data-table-server>
    </v-card>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';

const store = useMainStore();
const { $backend, $alert } = useNuxtApp();
const { t } = useI18n();

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
const requiredRule = v => !!v || t('admin.users.message.required');
const emailRule = (email) => {
    var re = /^(([^<>()[\.,;:\s@"]+([^<>()[\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email) || t('admin.users.message.invalidEmail');
};
const usernameRule = v => ((20 >= v.length && v.length >= 5) && /^[a-z][a-z0-9_]*$/.test(v)) || t('admin.users.message.invalidUsername');
const passwordRule = v => (20 >= v.length && v.length >= 8) || t('admin.users.message.invalidPassword');
const nicknameRule = v => v.length >= 2 || t('admin.users.message.invalidNickname');

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

const guestPermissionList = computed(() => [
    { key: 'ALLOW_GUEST_READ', label: t('admin.users.label.allowGuestRead') },
    { key: 'ALLOW_GUEST_DOWNLOAD', label: t('admin.users.label.allowGuestDownload') },
    { key: 'ALLOW_GUEST_PUSH', label: t('admin.users.label.allowGuestPush') },
    { key: 'ALLOW_GUEST_UPLOAD', label: t('admin.users.label.allowGuestUpload') },
]);

const headers = computed(() => [
    { title: 'ID', key: 'id', sortable: true },
    { title: t('admin.users.label.username'), key: 'username', sortable: true },
    { title: t('admin.users.label.nickname'), key: 'name', sortable: false },
    { title: 'Email', key: 'email', sortable: true },
    { title: t('admin.users.label.registrationPlatform'), key: 'provider', sortable: false },
    { title: t('admin.users.label.registrationTime'), key: 'create_time', sortable: true },
    { title: t('admin.users.label.loginTime'), key: 'access_time', sortable: true },
    { title: t('admin.users.label.loginIp'), key: 'login_ip', sortable: false },
    { title: t('admin.users.label.detail'), key: 'detail', sortable: false },
    { title: t('admin.users.label.action'), key: 'actions', sortable: false },
]);

const permissions = [
    { code: 'l', name: 'can_login', text: t('admin.users.label.permissionLogin') },
    { code: 'u', name: 'can_upload', text: t('admin.users.label.permissionUpload') },
    { code: 's', name: 'can_save', text: t('admin.users.label.permissionDownload') },
    { code: 'e', name: 'can_edit', text: t('admin.users.label.permissionEdit') },
    { code: 'd', name: 'can_delete', text: t('admin.users.label.permissionDelete') },
    { code: 'p', name: 'can_push', text: t('admin.users.label.permissionPush') },
    { code: 'r', name: 'can_read', text: t('admin.users.label.permissionRead') },
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
            if ($alert) $alert('success', t('admin.users.message.guestPermissionSaved'));
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
    title: t('admin.users.title')
});
</script>
