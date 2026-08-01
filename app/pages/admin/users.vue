
<template>
    <v-card>
        <v-card-title class="pl-4">
            {{ t('admin.users.title') }}
        </v-card-title>
        <v-card-actions class="px-4">
            <v-spacer />
            <v-btn
                color="primary"
                class="mr-2"
                @click="openDefaultPermissionDialog"
            >
                <v-icon start>
                    mdi-account-cog
                </v-icon>
                {{ t('admin.users.button.defaultPermission') }}
            </v-btn>
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
        </v-card-actions>

        <!-- 批量操作工具栏 -->
        <v-expand-transition>
            <div v-if="selectedUsers.length > 0">
                <v-toolbar
                    density="compact"
                    color="primary"
                    class="px-4"
                >
                    <v-toolbar-title class="text-body-2">
                        {{ t('admin.users.message.selectedUsers', { count: selectedUsers.length }) }}
                    </v-toolbar-title>
                    <v-btn
                        variant="tonal"
                        size="small"
                        class="mr-2"
                        @click="showBatchPermissionDialog = true"
                    >
                        <v-icon start>
                            mdi-shield-edit
                        </v-icon>
                        {{ t('admin.users.button.batchPermission') }}
                    </v-btn>
                    <v-btn
                        variant="text"
                        size="small"
                        @click="selectedUsers = []"
                    >
                        {{ t('admin.users.button.cancelSelection') }}
                    </v-btn>
                </v-toolbar>
            </div>
        </v-expand-transition>

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
                        {{ t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        @click="addUser"
                    >
                        {{ t('common.confirm') }}
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

        <!-- 新用户默认权限设置对话框 -->
        <v-dialog
            v-model="showDefaultPermissionDialog"
            max-width="500px"
        >
            <v-card>
                <v-card-title> {{ t('admin.users.button.defaultPermission') }} </v-card-title>
                <v-card-text>
                    <v-alert
                        type="info"
                        variant="tonal"
                        density="compact"
                        class="mb-4"
                    >
                        {{ t('admin.users.label.defaultUserPermissionHint') }}
                    </v-alert>
                    <v-container fluid>
                        <v-row>
                            <v-col
                                v-for="perm in permissions"
                                :key="perm.name"
                                cols="12"
                                sm="6"
                            >
                                <v-checkbox
                                    v-model="defaultUserPermissions[perm.name]"
                                    :label="perm.text"
                                    color="primary"
                                    hide-details
                                />
                            </v-col>
                        </v-row>
                    </v-container>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        text
                        @click="showDefaultPermissionDialog = false"
                    >
                        {{ t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        @click="saveDefaultPermissions"
                    >
                        {{ t('common.save') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- 批量设置权限对话框 -->
        <v-dialog
            v-model="showBatchPermissionDialog"
            max-width="500px"
        >
            <v-card>
                <v-card-title> {{ t('admin.users.message.batchPermissionTitle') }} </v-card-title>
                <v-card-subtitle> {{ t('admin.users.message.batchPermissionSubtitle', { count: selectedUsers.length }) }} </v-card-subtitle>
                <v-card-text>
                    <v-container fluid>
                        <v-row>
                            <v-col
                                v-for="perm in permissions"
                                :key="perm.name"
                                cols="12"
                                sm="6"
                            >
                                <v-checkbox
                                    v-model="batchPermissions[perm.name]"
                                    :label="perm.text"
                                    color="primary"
                                    hide-details
                                />
                            </v-col>
                        </v-row>
                    </v-container>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        text
                        @click="showBatchPermissionDialog = false"
                    >
                        {{ t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        :loading="batchLoading"
                        @click="applyBatchPermissions"
                    >
                        {{ t('common.confirm') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-data-table-server
            v-model="selectedUsers"
            density="compact"
            class="elevation-1 text-body-2"
            show-select
            item-value="id"
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
                <br v-if="item.extra.visit_history">
                <span v-if="item.extra.read_history"> {{ t('admin.users.label.read') }}{{ item.extra.read_history.length }}{{ t('admin.users.label.books') }} </span>
                <br v-if="item.extra.read_history">
                <span v-if="item.extra.push_history"> {{ t('admin.users.label.pushed') }}{{ item.extra.push_history.length }}{{ t('admin.users.label.books') }} </span>
                <br v-if="item.extra.push_history">
                <span v-if="item.extra.download_history"> {{ t('admin.users.label.downloaded') }}{{ item.extra.download_history.length }}{{ t('admin.users.label.books') }} </span>
                <br v-if="item.extra.download_history">
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

// 多选状态
const selectedUsers = ref([]);

// Add user dialog state
const showAddDialog = ref(false);
const addUserForm = ref(null);

// Guest permission dialog state
const showGuestPermissionDialog = ref(false);

// Default user permission dialog state
const showDefaultPermissionDialog = ref(false);

// Batch permission dialog state
const showBatchPermissionDialog = ref(false);
const batchLoading = ref(false);

// Form rules
const requiredRule = v => !!v || t('admin.users.message.required');
const emailRule = (email) => {
    var re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return re.test(email) || t('admin.users.message.invalidEmail');
};
const usernameRule = v => ((20 >= v.length && v.length >= 5) && /^[a-z][a-z0-9_]*$/.test(v)) || t('admin.users.message.invalidUsername');
const RE_PASSWORD = /^[-a-zA-Z0-9!@#$%^&*()_+=[\]{};':",./<>?|]*$/;
const passwordRule = v => ((20 >= v.length && v.length >= 8) && RE_PASSWORD.test(v)) || t('admin.users.message.invalidPassword');
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

// Default user permissions
const defaultUserPermissions = ref({
    can_login: true,
    can_upload: false,
    can_save: true,
    can_edit: false,
    can_delete: false,
    can_push: false,
    can_read: true,
});

// Batch permissions state
const batchPermissions = ref({
    can_login: true,
    can_upload: false,
    can_save: true,
    can_edit: false,
    can_delete: false,
    can_push: false,
    can_read: true,
});

const guestPermissionList = computed(() => [
    { key: 'ALLOW_GUEST_READ', label: t('admin.users.label.allowGuestRead') },
    { key: 'ALLOW_GUEST_DOWNLOAD', label: t('admin.users.label.allowGuestDownload') },
    { key: 'ALLOW_GUEST_PUSH', label: t('admin.users.label.allowGuestPush') },
    { key: 'ALLOW_GUEST_UPLOAD', label: t('admin.users.label.allowGuestUpload') },
]);

const headers = computed(() => [
    { title: 'ID', key: 'id', sortable: true, width: 70, nowrap: true },
    { title: t('admin.users.label.username'), key: 'username', sortable: true, width: 120, nowrap: true },
    { title: t('admin.users.label.nickname'), key: 'name', sortable: false, width: 100, nowrap: true },
    { title: 'Email', key: 'email', sortable: true, width: 180, nowrap: true },
    { title: t('admin.users.label.registrationPlatform'), key: 'provider', sortable: false, width: 100, nowrap: true },
    { title: t('admin.users.label.registrationTime'), key: 'create_time', sortable: true, width: 175, nowrap: true },
    { title: t('admin.users.label.loginTime'), key: 'access_time', sortable: true, width: 175, nowrap: true },
    { title: t('admin.users.label.loginIp'), key: 'login_ip', sortable: false, width: 130, nowrap: true },
    { title: t('admin.users.label.detail'), key: 'detail', sortable: false, width: 260 },
    { title: t('admin.users.label.action'), key: 'actions', sortable: false, width: 110, nowrap: true },
]);

const permissions = computed(() => [
    { code: 'l', name: 'can_login', text: t('admin.users.label.permissionLogin') },
    { code: 'u', name: 'can_upload', text: t('admin.users.label.permissionUpload') },
    { code: 's', name: 'can_save', text: t('admin.users.label.permissionDownload') },
    { code: 'e', name: 'can_edit', text: t('admin.users.label.permissionEdit') },
    { code: 'd', name: 'can_delete', text: t('admin.users.label.permissionDelete') },
    { code: 'p', name: 'can_push', text: t('admin.users.label.permissionPush') },
    { code: 'r', name: 'can_read', text: t('admin.users.label.permissionRead') },
]);

// Convert permission object to permission string
const permissionsToString = (permsObj) => {
    let permStr = '';
    for (let perm of permissions.value) {
        if (permsObj[perm.name]) {
            permStr += perm.code.toLowerCase();
        } else {
            permStr += perm.code.toUpperCase();
        }
    }
    return permStr;
};

// Parse permission string to permission object
const permissionStringToObject = (permStr) => {
    const obj = {
        can_login: true,
        can_upload: true,
        can_save: true,
        can_edit: true,
        can_delete: true,
        can_push: true,
        can_read: true,
    };
    if (!permStr) return obj;
    for (let perm of permissions.value) {
        if (permStr.includes(perm.code.toLowerCase())) {
            obj[perm.name] = true;
        } else if (permStr.includes(perm.code.toUpperCase())) {
            obj[perm.name] = false;
        }
    }
    return obj;
};

const updateOptions = (newOptions) => {
    options.value = newOptions;
    // 同步更新 itemsPerPage，确保用户选择"全部"时能正确显示
    if (newOptions.itemsPerPage !== undefined) {
        itemsPerPage.value = newOptions.itemsPerPage;
    }
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

    const userData = {
        username: newUser.value.username,
        password: newUser.value.password,
        name: newUser.value.name,
        email: newUser.value.email,
        admin: newUser.value.admin,
        active: newUser.value.active,
        permission: permissionsToString(newUser.value.permissions),
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

const openDefaultPermissionDialog = () => {
    $backend('/admin/settings').then(rsp => {
        if (rsp.err === 'ok') {
            defaultUserPermissions.value = permissionStringToObject(rsp.settings.DEFAULT_USER_PERMISSION || '');
        }
        showDefaultPermissionDialog.value = true;
    });
};

const saveDefaultPermissions = () => {
    const permStr = permissionsToString(defaultUserPermissions.value);
    $backend('/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ DEFAULT_USER_PERMISSION: permStr })
    }).then((rsp) => {
        if (rsp.err != 'ok') {
            if ($alert) $alert('error', rsp.msg);
        } else {
            if ($alert) $alert('success', t('admin.users.message.defaultPermissionSaved'));
            showDefaultPermissionDialog.value = false;
        }
    });
};

const applyBatchPermissions = () => {
    const allDisabled = Object.values(batchPermissions.value).every(v => !v);
    if (allDisabled && !window.confirm(t('admin.users.message.batchPermissionAllDisabledWarning'))) {
        return;
    }
    batchLoading.value = true;
    const permStr = permissionsToString(batchPermissions.value);
    const ids = selectedUsers.value.map(u => (typeof u === 'object' ? u.id : u));

    $backend('/admin/users/batch', {
        method: 'POST',
        body: JSON.stringify({ ids, permission: permStr }),
    }).then((rsp) => {
        if (rsp.err != 'ok') {
            if ($alert) $alert('error', rsp.msg);
        } else {
            if ($alert) $alert('success', t('admin.users.message.batchPermissionSuccess', { count: rsp.updated }));
            showBatchPermissionDialog.value = false;
            selectedUsers.value = [];
            getDataFromApi();
        }
    }).finally(() => {
        batchLoading.value = false;
    });
};

onMounted(() => {
    // 获取访客权限和默认用户权限设置
    $backend('/admin/settings').then(rsp => {
        if (rsp.err === 'ok') {
            guestPermissions.value = {
                ALLOW_GUEST_READ: rsp.settings.ALLOW_GUEST_READ,
                ALLOW_GUEST_DOWNLOAD: rsp.settings.ALLOW_GUEST_DOWNLOAD,
                ALLOW_GUEST_PUSH: rsp.settings.ALLOW_GUEST_PUSH,
                ALLOW_GUEST_UPLOAD: rsp.settings.ALLOW_GUEST_UPLOAD,
            };
            defaultUserPermissions.value = permissionStringToObject(rsp.settings.DEFAULT_USER_PERMISSION || '');
        }
    });

    getDataFromApi();
});

useHead(() => ({
    title: t('admin.users.title')
}));
</script>

<style scoped>
/* 加宽分页选择器 */
:deep(.v-data-table-footer__items-per-page) {
    min-width: 120px;
}

:deep(.v-data-table-footer__items-per-page .v-field) {
    min-width: 100px;
}

/*
 * 强制表格使用固定列宽布局。
 * 默认的 table-layout: auto 会按内容自动分配列宽，而“详情”列内容不含空格，
 * 浏览器可在任意字符间换行，导致该列在空间不足时被压缩到单字宽度，
 * 其余内容被迫逐字换行、纵向堆叠。固定列宽后改为在 .v-table__wrapper 上出现横向滚动条。
 */
:deep(.v-table__wrapper > table) {
    table-layout: fixed;
}
</style>
