<template>
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

            <v-col cols="3">
                <div class="text-subtitle-2 text-medium-emphasis pa-0 float-right">
                    {{ t('user.detail.kindleAddress') }}
                </div>
            </v-col>
            <v-col cols="9">
                <v-text-field
                    v-model="user.kindle_email"
                    solo
                    :label="t('user.detail.kindle')"
                    type="text"
                    autocomplete="new-email"
                    :rules="[rules.email]"
                />
            </v-col>
            <v-col cols="12">
                <div class="text-center">
                    <v-btn
                        dark
                        large
                        rounded
                        color="orange"
                        @click="save"
                    >
                        {{ t('user.detail.save') }}
                    </v-btn>
                </div>
            </v-col>
        </v-row>
    </v-form>
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

const user = ref({});
const show_pass = ref(false);
const form = ref(null);

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
    const { valid } = await form.value.validate();
    if (!valid) {
        return false;
    }

    var d = {
        'password0': user.value.password0,
        'password1': user.value.password1,
        'password2': user.value.password2,
        'nickname': user.value.nickname,
        'kindle_email': user.value.kindle_email,
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

onMounted(() => {
    mainStore.setNavbar(true);
    $backend('/user/info?detail=1')
        .then(rsp => {
            rsp.user.password0 = '';
            rsp.user.password1 = '';
            rsp.user.password2 = '';
            user.value = rsp.user;
        });
});
</script>

<style></style>
