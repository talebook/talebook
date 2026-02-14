
<template>
    <v-row
        justify="center"
        class="fill-center"
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
                    <v-toolbar-title align-center>
                        {{ t('welcomePage.inputTitle') }}
                    </v-toolbar-title>
                </v-toolbar>
                <v-card-text>
                    <p class="py-6 body-3 text-center">
                        {{ welcome }}
                    </p>
                    <v-form @submit.prevent="welcome_login">
                        <v-text-field
                            v-model="invite_code"
                            prepend-icon="mdi-lock"
                            required
                            :label="t('welcomePage.inputLabel')"
                            type="password"
                            :error="is_err"
                            :error-messages="is_err ? msg : ''"
                            :loading="loading"
                        />
                        <p
                            v-if="!is_err && msg"
                            class="text-success text-center mt-2"
                        >
                            {{ msg }}
                        </p>
                    </v-form>
                </v-card-text>

                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        color="primary"
                        @click="welcome_login"
                    >
                        {{ t('common.login') }}
                    </v-btn>
                    <v-spacer />
                </v-card-actions>
            </v-card>
        </v-col>
    </v-row>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAsyncData, useNuxtApp } from 'nuxt/app';
import { useMainStore } from '@/stores/main';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const route = useRoute();
const store = useMainStore();
const { t } = useI18n();
const { $backend } = useNuxtApp();

definePageMeta({
    layout: 'blank'
});

const is_err = ref(false);
const msg = ref('');
const welcome = ref(t('welcomePage.welcomeText'));
const loading = ref(false);
const invite_code = ref('');

// 修复1: 移除 await，正确使用 useAsyncData
const { data: welcomeData } = useAsyncData('welcome', async () => {
    try {
        const response = await $backend('/welcome');
        return response;
    } catch (error) {
        console.error('获取欢迎页数据失败:', error);
        return { err: 'error', msg: '网络错误' };
    }
});

// 修复2: 使用 watch 监听数据变化
watch(welcomeData, (newData) => {
    if (newData) {
        if (newData.welcome) {
            welcome.value = newData.welcome;
        }
        if (newData.err === 'free') {
            router.push(route.query.next || '/');
        } else if (newData.err === 'not_installed') {
            router.push('/install');
        }
    }
}, { immediate: true });

const welcome_login = async () => {
    if (!invite_code.value.trim()) {
        is_err.value = true;
        msg.value = t('welcomePage.inputPrompt');
        return;
    }
    
    loading.value = true;
    is_err.value = false;
    msg.value = '';
    
    const data = new URLSearchParams();
    data.append('invite_code', invite_code.value);
    
    try {
        const rsp = await $backend('/welcome', {
            method: 'POST',
            body: data,
        });
        
        if (rsp.err !== 'ok') {
            is_err.value = true;
            msg.value = rsp.msg || t('welcomePage.invalidCode');
        } else {
            is_err.value = false;
            msg.value = t('welcomePage.successRedirect');
            // 使用 router 跳转而不是 reload，更好的用户体验
            setTimeout(() => {
                router.push(route.query.next || '/');
            }, 1000);
        }
    } catch (error) {
        console.error('登录失败:', error);
        is_err.value = true;
        msg.value = t('welcomePage.networkError');
    } finally {
        loading.value = false;
    }
};

useHead(() => ({
    title: t('welcomePage.pageTitle')
}));
</script>

<style scoped>
.fill-center {
    margin-top: 100px;
}
</style>