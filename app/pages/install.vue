
<template>
    <ClientOnly>
        <v-row
            align="center"
            justify="center"
        >
            <v-col
                cols="12"
                sm="8"
                md="4"
            >
                <v-card class="elevation-12">
                    <v-toolbar
                        dark
                        color="primary"
                    >
                        <v-toolbar-title>{{ $t('install.installTaleBook') }}</v-toolbar-title>
                        <v-spacer />
                        <!-- 多语言切换入口 -->
                        <v-menu
                            offset-y
                            right
                        >
                            <template #activator="{ props }">
                                <v-btn
                                    v-bind="props"
                                    icon
                                    variant="text"
                                    color="white"
                                >
                                    <v-icon>mdi-translate</v-icon>
                                </v-btn>
                            </template>
                            <v-list min-width="240">
                                <v-list-item
                                    v-for="localeItem in allLocales"
                                    :key="localeItem.code"
                                    :active="localeItem.code === locale"
                                    @click="setLocale(localeItem.code)"
                                >
                                    <template #prepend>
                                        <v-icon v-if="localeItem.code === locale">
                                            mdi-check
                                        </v-icon>
                                        <v-icon v-else>
                                            mdi-translate
                                        </v-icon>
                                    </template>
                                    <v-list-item-title>{{ localeItem.name }}</v-list-item-title>
                                </v-list-item>
                            </v-list>
                        </v-menu>
                    </v-toolbar>
                    <v-card-text>
                        <v-form
                            ref="form"
                            @submit.prevent="do_install"
                        >
                            <v-text-field
                                v-model="title"
                                required
                                prepend-icon="mdi-home"
                                :label="$t('install.websiteTitle')"
                                type="text"
                            />
                            <v-text-field
                                v-model="username"
                                required
                                prepend-icon="mdi-account"
                                :label="$t('install.adminUsername')"
                                type="text"
                                autocomplete="new-username"
                                :rules="[rules.user]"
                            />
                            <v-text-field
                                v-model="password"
                                required
                                prepend-icon="mdi-lock"
                                :label="$t('install.adminPassword')"
                                type="password"
                                autocomplete="new-password"
                                :rules="[rules.pass]"
                            />
                            <v-text-field
                                v-model="email"
                                required
                                prepend-icon="mdi-email"
                                :label="$t('install.adminEmail')"
                                type="text"
                                autocomplete="new-email"
                                :rules="[rules.email]"
                            />
                            <v-checkbox
                                v-model="invite"
                                :label="$t('install.enablePrivateLibrary')"
                            />
                            <template v-if="invite">
                                <v-text-field
                                    v-model="code"
                                    required
                                    prepend-icon="mdi-lock"
                                    :label="$t('install.accessCode')"
                                    type="text"
                                    autocomplete="new-code"
                                    :rules="[rules.code]"
                                />
                            </template>

                            <v-divider class="my-4" />
                            <div class="text-subtitle-2 mb-2">
                                {{ $t('install.dbConfig') }}
                            </div>
                            <v-select
                                v-model="db_type"
                                prepend-icon="mdi-database"
                                :label="$t('install.dbType')"
                                :items="dbTypeItems"
                                item-title="text"
                                item-value="value"
                                hide-details
                                class="mb-4"
                            />
                            <template v-if="db_type !== 'sqlite'">
                                <v-row dense>
                                    <v-col cols="9">
                                        <v-text-field
                                            v-model="db_host"
                                            prepend-icon="mdi-server"
                                            :label="$t('install.dbHost')"
                                            type="text"
                                        />
                                    </v-col>
                                    <v-col cols="3">
                                        <v-text-field
                                            v-model="db_port"
                                            :label="$t('install.dbPort')"
                                            type="number"
                                        />
                                    </v-col>
                                </v-row>
                                <v-text-field
                                    v-model="db_name"
                                    prepend-icon="mdi-database"
                                    :label="$t('install.dbName')"
                                    type="text"
                                />
                                <v-text-field
                                    v-model="db_user"
                                    prepend-icon="mdi-account"
                                    :label="$t('install.dbUser')"
                                    type="text"
                                    autocomplete="off"
                                />
                                <v-text-field
                                    v-model="db_pass"
                                    prepend-icon="mdi-lock"
                                    :label="$t('install.dbPass')"
                                    type="password"
                                    autocomplete="new-password"
                                />
                                <div class="mb-4">
                                    <v-btn
                                        variant="outlined"
                                        :loading="dbTesting"
                                        @click="testDbConnection"
                                    >
                                        <v-icon start>mdi-connection</v-icon>
                                        {{ $t('install.testConnection') }}
                                    </v-btn>
                                </div>
                            </template>

                            <div
                                align="center"
                                class="mt-4"
                            >
                                <v-btn
                                    type="submit"
                                    color="primary"
                                    :loading="loading"
                                >
                                    {{ $t('install.completeSetup') }}
                                </v-btn>
                            </div>
                        </v-form>
                        <v-alert
                            v-if="tips"
                            class="mt-4"
                            type="info"
                            v-html="tips"
                        />
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </ClientOnly>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMainStore } from '@/stores/main';
import { useI18n } from '#i18n';

const router = useRouter();
const store = useMainStore();
const { $backend, $alert } = useNuxtApp();
const { locale, locales, setLocale, t } = useI18n();

// 多语言相关
const allLocales = computed(() => {
    return locales.value || [];
});

definePageMeta({
    layout: 'blank'
});

const form = ref(null);
const username = ref('admin');
const password = ref('');
const email = ref('');
const code = ref('');
const invite = ref(false);
const title = ref('TaleBook');
const tips = ref('');
const loading = ref(false);
const dbTesting = ref(false);
const db_type = ref('sqlite');
const db_host = ref('localhost');
const db_port = ref(3306);
const db_name = ref('talebook');
const db_user = ref('');
const db_pass = ref('');
let retry = 20;

const dbTypeItems = computed(() => [
    { text: t('install.dbTypeSqlite'), value: 'sqlite' },
    { text: t('install.dbTypeMysql'), value: 'mysql' },
]);

const rules = {
    user: v => ( v && 20 >= v.length && v.length >= 5) || $t('install.userRule'),
    pass: v => ( v && 20 >= v.length && v.length >= 8) || $t('install.passRule'),
    code: v => (invite.value && v && v.trim()) || $t('install.codeRule'),
    email: function (email) {
        var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email) || $t('install.emailRule');
    },
};

const check_install = () => {
    fetch('/api/index').then( rsp => {
        if ( rsp.status == 200 ) {
            tips.value += `<br/>${$t('install.apiServiceNormal')}<br/>${$t('install.installSuccessRedirect')}`;
            
            // force refresh index.html logic equivalent
            // Fetching random param to bypass cache not strictly needed if we just nav
            // But let's follow logic: reload user/sys info then push
            setTimeout(() => {
                store.setNavbar(true);
                // We might need to reload sys info in store
                window.location.href = '/';
            }, 1000);
        } else {
            retry -= 1;
            if ( retry > 0 ) {
                setTimeout( () => {
                    check_install();
                }, 1000);
            } else {
                tips.value += `<br/>${$t('install.timeoutRefresh')}`;
                loading.value = false;
            }
        }
    });
};

const testDbConnection = async () => {
    dbTesting.value = true;
    var data = new URLSearchParams();
    data.append('db_type', db_type.value);
    data.append('db_host', db_host.value);
    data.append('db_port', db_port.value);
    data.append('db_name', db_name.value);
    data.append('db_user', db_user.value);
    data.append('db_pass', db_pass.value);
    try {
        const rsp = await $backend('/admin/testdb', { method: 'POST', body: data });
        if (rsp.err === 'ok') {
            if ($alert) $alert('success', $t('install.dbConnectSuccess'));
        } else {
            if ($alert) $alert('error', rsp.msg || $t('install.dbConnectFailed'));
        }
    } catch (e) {
        if ($alert) $alert('error', $t('install.networkError'));
    } finally {
        dbTesting.value = false;
    }
};

const do_install = async () => {
    const { valid } = await form.value.validate();
    if (!valid) return;

    loading.value = true;
    var data = new URLSearchParams();
    data.append('username', username.value);
    data.append('password', password.value);
    data.append('email', email.value);
    data.append('code', code.value);
    data.append('invite', invite.value);
    data.append('title', title.value);
    data.append('db_type', db_type.value);
    if (db_type.value !== 'sqlite') {
        data.append('db_host', db_host.value);
        data.append('db_port', db_port.value);
        data.append('db_name', db_name.value);
        data.append('db_user', db_user.value);
        data.append('db_pass', db_pass.value);
    }

    tips.value = $t('install.writingConfig');

    try {
        const rsp = await $backend('/admin/install', {
            method: 'POST',
            body: data,
        });

        if ( rsp.err != 'ok' ) {
            if ($alert) $alert('error', rsp.msg);
            loading.value = false;
        } else {
            tips.value += `<br/>${$t('install.configWriteSuccess')}<br/>${$t('install.checkingServer')}`;
            setTimeout( () => {
                check_install();
            }, 5000);
        }
    } catch (e) {
        console.error(e);
        loading.value = false;
        if ($alert) $alert('error', $t('install.networkError'));
    }
};

useHead({
    title: $t('install.installTaleBook')
});
</script>
