
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
                                />
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
const { locale, locales, setLocale } = useI18n();

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
let retry = 20;

const rules = {
    user: v => ( v && 20 >= v.length && v.length >= 5) || $t('install.userRule'),
    pass: v => ( v && 20 >= v.length && v.length >= 8) || $t('install.passRule'),
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
