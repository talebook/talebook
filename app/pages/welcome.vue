
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
                    <p class="py-6 body-3 text-center">
                        {{ welcome }}
                    </p>
                    <v-form @submit.prevent="onWelcomeClick">
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
                        @click="onWelcomeClick"
                    >
                        {{ t('common.login') }}
                    </v-btn>
                    <v-spacer />
                </v-card-actions>
            </v-card>
        </v-col>
    </v-row>
    
    <!-- 验证码弹窗 -->
    <v-dialog
        v-model="showCaptchaDialog"
        max-width="500"
        persistent
    >
        <v-card>
            <v-toolbar
                dark
                color="primary"
            >
                <v-toolbar-title>{{ t('captcha.title') }}</v-toolbar-title>
            </v-toolbar>
            <v-card-text>
                <CaptchaWidget
                    ref="captchaRef"
                    scene="welcome"
                    @verify="onCaptchaVerify"
                    @error="onCaptchaError"
                />
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn
                    color="secondary"
                    @click="closeCaptchaDialog"
                >
                    {{ t('common.cancel') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAsyncData, useNuxtApp } from 'nuxt/app';
import { useMainStore } from '@/stores/main';
import { useI18n } from 'vue-i18n';
import CaptchaWidget from '~/components/CaptchaWidget.vue';

const router = useRouter();
const route = useRoute();
const store = useMainStore();
const { t, locale, locales, setLocale } = useI18n();
const { $backend } = useNuxtApp();

// 多语言相关
const allLocales = computed(() => {
    return locales.value || [];
});

definePageMeta({
    layout: 'blank'
});

const is_err = ref(false);
const msg = ref('');
const welcome = ref(t('welcomePage.welcomeText'));
const loading = ref(false);
const invite_code = ref('');

// 人机验证相关
const captchaRef = ref(null);
const captchaEnabled = ref(false);
const captchaScenes = ref({
    register: false,
    login: false,
    welcome: false
});
const captchaVerified = ref(false);
const captchaData = ref(null);
const showCaptchaDialog = ref(false);

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

// 检查是否启用了验证码
const checkCaptchaEnabled = async () => {
    try {
        const rsp = await $backend('/captcha/config');
        captchaEnabled.value = rsp.config && rsp.config.enabled;
        if (rsp.config && rsp.config.scenes) {
            captchaScenes.value = rsp.config.scenes;
        }
    } catch (e) {
        captchaEnabled.value = false;
    }
};

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
        // 检查是否启用了验证码
        checkCaptchaEnabled();
    }
}, { immediate: true });

// 点击欢迎页登录按钮
const onWelcomeClick = () => {
    if (!invite_code.value.trim()) {
        is_err.value = true;
        msg.value = t('welcomePage.inputPrompt');
        return;
    }

    if (captchaEnabled.value && captchaScenes.value.welcome) {
        // 显示验证码弹窗
        captchaVerified.value = false;
        captchaData.value = null;
        showCaptchaDialog.value = true;
    } else {
        // 直接登录
        welcome_login();
    }
};

// 关闭验证码弹窗
const closeCaptchaDialog = () => {
    showCaptchaDialog.value = false;
    if (captchaRef.value) {
        captchaRef.value.reset();
    }
};

// 验证码验证成功回调
const onCaptchaVerify = (data) => {
    captchaData.value = data;
    captchaVerified.value = true;
    showCaptchaDialog.value = false;
    // 执行登录
    welcome_login();
};

// 验证码错误回调
const onCaptchaError = (errorMsg) => {
    captchaVerified.value = false;
    is_err.value = true;
    msg.value = errorMsg;
};

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
    
    // 添加验证码参数
    if (captchaEnabled.value && captchaData.value) {
        data.append('lot_number', captchaData.value.lot_number);
        data.append('captcha_output', captchaData.value.captcha_output);
        data.append('pass_token', captchaData.value.pass_token);
        data.append('gen_time', captchaData.value.gen_time);
    }
    
    try {
        const rsp = await $backend('/welcome', {
            method: 'POST',
            body: data,
        });
        
        if (rsp.err !== 'ok') {
            is_err.value = true;
            msg.value = rsp.msg || t('welcomePage.invalidCode');
            // 重置验证码
            if (captchaEnabled.value && captchaRef.value) {
                captchaRef.value.reset();
                captchaVerified.value = false;
                captchaData.value = null;
            }
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

