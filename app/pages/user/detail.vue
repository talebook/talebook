<template>
    <div>
        <!-- Tab navigation -->
        <v-tabs
            v-model="activeTab"
            class="mb-4"
        >
            <v-tab>{{ t('user.basicInfo') }}</v-tab>
            <v-tab>{{ t('user.deviceMgt') }}</v-tab>
        </v-tabs>

        <v-tabs-window v-model="activeTab">
            <!-- Tab 1: Basic Info -->
            <v-tabs-window-item>
                <v-form
                    ref="form"
                    @submit.prevent="save"
                >
                    <v-row align="start">
                        <v-col cols="3">
                            <div class="text-subtitle-2 text-medium-emphasis pa-0 float-right">
                                {{ t('user.detail.avatar') }}
                            </div>
                        </v-col>
                        <v-col cols="9">
                            <div class="d-flex flex-column align-start">
                                <div class="text-subtitle-2 text-medium-emphasis mb-1">
                                    <a
                                        href="https://cravatar.com/"
                                        target="_blank"
                                        class="press-content"
                                    >{{ t('user.detail.changeAvatar') }}</a>
                                </div>
                                <v-img
                                    class="mr-3"
                                    height="80"
                                    width="60"
                                    contain
                                    :src="user.avatar"
                                    :alt="t('user.detail.avatar')"
                                />
                            </div>
                        </v-col>

                        <v-col cols="3">
                            <div class="text-subtitle-2 text-medium-emphasis pa-0 float-right">
                                {{ t('user.detail.username') }}
                            </div>
                        </v-col>
                        <v-col cols="9">
                            <p class="pt-3 mb-0">
                                {{ user.username }}
                            </p>
                        </v-col>

                        <v-col cols="3">
                            <div class="text-subtitle-2 text-medium-emphasis pa-0 float-right">
                                {{ t('user.detail.email') }}
                            </div>
                        </v-col>
                        <v-col cols="9">
                            <p class="pt-3 mb-0">
                                {{ user.email }}
                                <a
                                    v-if="!user.is_active"
                                    href="#"
                                    class="press-content"
                                    @click.prevent="send_active_email"
                                >{{ t('user.detail.resendActivationEmail') }}</a>
                            </p>
                        </v-col>

                        <v-col cols="3">
                            <div class="text-subtitle-2 text-medium-emphasis pa-0 float-right">
                                {{ t('user.detail.password') }}
                            </div>
                        </v-col>
                        <v-col cols="9">
                            <div class="text-subtitle-2 text-medium-emphasis pa-0">
                                <a
                                    href="#"
                                    class="press-content"
                                    @click.stop.prevent="show_pass = !show_pass"
                                >{{ t('user.detail.changePassword') }}</a>
                            </div>
                            <div v-if="show_pass">
                                <v-text-field
                                    v-model="user.password0"
                                    solo
                                    :label="t('user.detail.currentPassword')"
                                    type="password"
                                    autocomplete="new-password0"
                                    :rules="[rules.pass]"
                                />
                                <v-text-field
                                    v-model="user.password1"
                                    solo
                                    :label="t('user.detail.newPassword')"
                                    type="password"
                                    autocomplete="new-password1"
                                    :rules="[rules.pass]"
                                />
                                <v-text-field
                                    v-model="user.password2"
                                    solo
                                    :label="t('user.detail.confirmPassword')"
                                    type="password"
                                    autocomplete="new-password2"
                                    :rules="[valid]"
                                />
                            </div>
                        </v-col>

                        <v-col cols="3">
                            <div class="text-subtitle-2 text-medium-emphasis pa-0 float-right">
                                {{ t('user.detail.nickname') }}
                            </div>
                        </v-col>
                        <v-col cols="9">
                            <v-text-field
                                v-model="user.nickname"
                                solo
                                :label="t('user.detail.nickname')"
                                type="text"
                                autocomplete="new-nickname"
                                :rules="[rules.nick]"
                            />
                        </v-col>

                        <v-col cols="12">
                            <div class="text-center">
                                <v-btn
                                    dark
                                    large
                                    rounded
                                    color="orange"
                                    type="submit"
                                >
                                    {{ t('user.detail.save') }}
                                </v-btn>
                            </div>
                        </v-col>
                    </v-row>
                </v-form>
            </v-tabs-window-item>

            <!-- Tab 2: Reading Devices -->
            <v-tabs-window-item>
                <v-card
                    flat
                    class="pa-2"
                >
                    <div class="text-center text-body-2 text-medium-emphasis pb-6">
                        {{ t('user.deviceMgtDescription') }}
                    </div>

                    <v-row
                        v-for="(device, idx) in userDevices"
                        :key="'udev-' + idx"
                    >
                        <v-col
                            class="py-0"
                            cols="2"
                        >
                            <v-text-field
                                v-model="device.name"
                                :label="t('settings.deviceName')"
                                type="text"
                                variant="underlined"
                                density="compact"
                                hide-details
                                maxlength="64"
                            />
                        </v-col>
                        <v-col
                            class="py-0"
                            cols="2"
                        >
                            <v-select
                                v-model="device.type"
                                :items="deviceTypes"
                                item-title="text"
                                item-value="value"
                                :label="t('settings.deviceType')"
                                variant="underlined"
                                density="compact"
                                hide-details
                            />
                        </v-col>
                        <template v-if="device.type === 'kindle'">
                            <v-col
                                class="py-0"
                                cols="6"
                            >
                                <v-text-field
                                    v-model="device.mailbox"
                                    :label="t('settings.deviceMailbox')"
                                    type="email"
                                    variant="underlined"
                                    density="compact"
                                    hide-details
                                    placeholder="user@kindle.com"
                                />
                            </v-col>
                        </template>
                        <template v-else>
                            <v-col
                                class="py-0"
                                cols="2"
                            >
                                <v-text-field
                                    v-model="device.ip"
                                    :label="t('settings.deviceIp')"
                                    type="text"
                                    variant="underlined"
                                    density="compact"
                                    hide-details
                                />
                            </v-col>
                            <v-col
                                class="py-0"
                                cols="2"
                            >
                                <v-text-field
                                    v-model.number="device.port"
                                    :label="t('settings.devicePort')"
                                    type="number"
                                    variant="underlined"
                                    density="compact"
                                    hide-details
                                />
                            </v-col>
                            <v-col
                                class="py-0"
                                cols="2"
                            >
                                <v-select
                                    v-model="device.schema"
                                    :items="deviceSchemas"
                                    :label="t('settings.deviceSchema')"
                                    variant="underlined"
                                    density="compact"
                                    hide-details
                                />
                            </v-col>
                        </template>
                        <v-col
                            class="py-0"
                            cols="1"
                            align-self="end"
                        >
                            <v-btn
                                icon
                                size="small"
                                @click="userDevices.splice(idx, 1)"
                            >
                                <v-icon>mdi-delete</v-icon>
                            </v-btn>
                        </v-col>
                    </v-row>

                    <v-row>
                        <v-col align="center">
                            <v-btn
                                color="primary"
                                @click="userDevices.push({
                                    name: t('settings.defaultReaderName'),
                                    type: 'duokan',
                                    ip: '',
                                    port: 12121,
                                    schema: 'http',
                                    mailbox: '',
                                })"
                            >
                                <v-icon start>
                                    mdi-plus
                                </v-icon>
                                {{ t('settings.add') }}
                            </v-btn>
                        </v-col>
                    </v-row>

                    <v-row class="mt-4">
                        <v-col
                            cols="12"
                            class="text-center"
                        >
                            <v-btn
                                dark
                                large
                                rounded
                                color="orange"
                                :loading="savingDevices"
                                @click="saveDevices"
                            >
                                {{ t('user.detail.save') }}
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-card>
            </v-tabs-window-item>
        </v-tabs-window>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMainStore } from '@/stores/main';
import { useI18n } from 'vue-i18n';

const { $backend, $alert } = useNuxtApp();
const router = useRouter();
const mainStore = useMainStore();
const { t } = useI18n();

const activeTab = ref(0);
const user = ref({});
const show_pass = ref(false);
const form = ref(null);

// Device management
const userDevices = ref([]);
const savingDevices = ref(false);
const deviceTypes = ref([]);
const deviceSchemas = ref(['http', 'https']);

useHead({
    title: t('user.detail.pageTitle'),
});

const rules = {
    pass: v => v == undefined || v.length == 0 || v.length >= 8 || t('user.detail.passwordMinLength'),
    nick: v => v == undefined || v.length == 0 || v.length >= 2 || t('user.detail.nicknameMinLength'),
    email: function (email) {
        var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return email == undefined || email.length == 0 || re.test(email) || t('user.detail.invalidEmailFormat');
    },
};

const valid = (v) => {
    return v == user.value.password1 || t('user.detail.passwordsNotSame');
};

const save = async () => {
    const { valid: isValid } = await form.value.validate();
    if (!isValid) {
        return false;
    }

    var d = {
        'password0': user.value.password0,
        'password1': user.value.password1,
        'password2': user.value.password2,
        'nickname': user.value.nickname,
    };

    $backend('/user/update', {
        method: 'POST',
        body: JSON.stringify(d),
    })
        .then(rsp => {
            if (rsp.err != 'ok') {
                $alert('error', rsp.msg);
            } else {
                mainStore.setNavbar(true);
                router.push('/');
            }
        });
};

const send_active_email = () => {
    $backend('/user/active/send')
        .then(rsp => {
            if (rsp.err == 'ok') {
                $alert('success', t('user.detail.activationEmailSent'));
            } else {
                $alert('error', rsp.msg);
            }
        });
};

const saveDevices = async () => {
    savingDevices.value = true;
    try {
        const rsp = await $backend('/user/devices', {
            method: 'POST',
            body: JSON.stringify({ devices: userDevices.value }),
        });
        if (rsp.err === 'ok') {
            $alert('success', rsp.msg);
        } else {
            $alert('error', rsp.msg);
        }
    } catch (e) {
        $alert('error', '保存失败');
    } finally {
        savingDevices.value = false;
    }
};

const loadDevices = async () => {
    try {
        const rsp = await $backend('/user/devices');
        if (rsp.err === 'ok') {
            userDevices.value = rsp.devices || [];
        }
    } catch (e) {
        console.error(e);
    }
};

onMounted(() => {
    mainStore.setNavbar(true);
    deviceTypes.value = [
        { text: t('settings.deviceTypeDuokan'), value: 'duokan' },
        { text: t('settings.deviceTypeIreader'), value: 'ireader' },
        { text: t('settings.deviceTypeHanwang'), value: 'hanwang' },
        { text: t('settings.deviceTypeBoox'), value: 'boox' },
        { text: t('settings.deviceTypeDangdang'), value: 'dangdang' },
        { text: t('common.kindle') || 'Kindle', value: 'kindle' },
        { text: 'PureLibro', value: 'purelibro' },
    ];

    $backend('/user/info?detail=1')
        .then(rsp => {
            rsp.user.password0 = '';
            rsp.user.password1 = '';
            rsp.user.password2 = '';
            user.value = rsp.user;
        });

    loadDevices();
});
</script>

<style></style>
