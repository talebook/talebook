
<template>
    <div class="signup-container">
        <v-row
            justify="center"
            class="mt-8"
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
                        <v-toolbar-title>{{ t('auth.signupFormTitle') }}</v-toolbar-title>
                        <v-spacer />
                        <v-btn
                            rounded
                            color="success"
                            variant="elevated"
                            to="/login"
                            class="text-white mr-4"
                        >
                            {{ t('auth.signIn') }}
                        </v-btn>
                    </v-toolbar>
                    <v-card-text>
                        <v-form
                            ref="form"
                            @submit.prevent="onSignupClick"
                        >
                            <v-text-field
                                v-model="username"
                                required
                                prepend-icon="mdi-account"
                                :label="t('auth.username')"
                                type="text"
                                autocomplete="new-username"
                                :rules="[rules.user]"
                            />
                            <v-text-field
                                v-model="password"
                                required
                                prepend-icon="mdi-lock"
                                :label="t('auth.password')"
                                type="password"
                                autocomplete="new-password"
                                :rules="[rules.pass]"
                            />
                            <v-text-field
                                v-model="password2"
                                required
                                prepend-icon="mdi-lock"
                                :label="t('messages.confirmPassword')"
                                type="password"
                                autocomplete="new-password2"
                                :rules="[validPwd]"
                            />
                            <v-text-field
                                v-model="nickname"
                                required
                                prepend-icon="mdi-face-man"
                                :label="t('messages.nickname')"
                                type="text"
                                autocomplete="new-nickname"
                                :rules="[rules.nick]"
                            />
                            <v-text-field
                                v-model="email"
                                required
                                prepend-icon="mdi-email"
                                :label="t('auth.email')"
                                type="text"
                                autocomplete="new-email"
                                :rules="[rules.email]"
                            />
                            <div
                                align="center"
                                class="mt-4"
                            >
                                <v-btn
                                    dark
                                    large
                                    rounded
                                    color="red"
                                    type="submit"
                                    :loading="loading"
                                >
                                    {{ t('auth.signUp') }}
                                </v-btn>
                            </div>
                        </v-form>
                    </v-card-text>

                    <v-alert
                        v-if="failmsg"
                        type="error"
                        class="ma-2"
                    >
                        {{ failmsg }}
                    </v-alert>
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
                        scene="register"
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
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMainStore } from '@/stores/main';
import { useI18n } from 'vue-i18n';
import CaptchaWidget from '~/components/CaptchaWidget.vue';

const router = useRouter();
const store = useMainStore();
const { t } = useI18n();
const { $backend } = useNuxtApp();

const form = ref(null);
const username = ref('');
const password = ref('');
const password2 = ref('');
const nickname = ref('');
const email = ref('');
const failmsg = ref('');
const loading = ref(false);

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

// 控制是否显示导航栏（可作为开关使用）
const showNavbar = true; // 后期可通过配置或环境变量控制
store.setNavbar(showNavbar);

// 与后端保持一致的验证规则
const RE_USERNAME = /^[a-z][a-z0-9_]*$/;
const RE_PASSWORD = /^[-a-zA-Z0-9!@#$%^&*()_+=[\]{};':",./<>?|]*$/;
const RE_EMAIL = /^[^@]+@[^@]+\.[^@]+$/;

const rules = {
    user: v => {
        if (!v || v.length < 5 || v.length > 20) return t('validation.usernameLength');
        if (!RE_USERNAME.test(v)) return t('validation.usernameFormat');
        return true;
    },
    pass: v => {
        if (!v || v.length < 8 || v.length > 20) return t('validation.passwordLength');
        if (!RE_PASSWORD.test(v)) return t('validation.passwordFormat');
        return true;
    },
    nick: v => (v && v.length >= 2) || t('validation.nickLength'),
    email: v => {
        if (!v) return t('validation.emailInvalid');
        return RE_EMAIL.test(v) || t('validation.emailInvalid');
    },
};

const validPwd = (v) => {
    if ( v.length < 8 ) {
        return t('validation.passwordLength');
    }
    return v == password.value || t('validation.passwordMismatch');
};

onMounted(async () => {
    // Check if registration is allowed
    try {
        const rsp = await $backend('/user/info');
        if (rsp.err === 'ok' && !rsp.sys.allow.register) {
            router.push('/login');
        }
    } catch (e) {
        console.error(e);
    }
    // 检查是否启用了验证码
    checkCaptchaEnabled();
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

// 点击注册按钮
const onSignupClick = async () => {
    const { valid } = await form.value.validate();
    if (!valid) return;

    if (captchaEnabled.value && captchaScenes.value.register) {
        // 显示验证码弹窗
        captchaVerified.value = false;
        captchaData.value = null;
        showCaptchaDialog.value = true;
    } else {
        // 直接注册
        signup();
    }
};

// 关闭验证码弹窗
const closeCaptchaDialog = () => {
    showCaptchaDialog.value = false;
    // 取消时不重置验证码，避免不必要的刷新
};

// 验证码验证成功回调
const onCaptchaVerify = (data) => {
    captchaData.value = data;
    captchaVerified.value = true;
    showCaptchaDialog.value = false;
    // 执行注册
    signup();
};

// 验证码错误回调
const onCaptchaError = (msg) => {
    captchaVerified.value = false;
    failmsg.value = msg;
};

const signup = async () => {
    loading.value = true;
    failmsg.value = '';

    var data = new URLSearchParams();
    data.append('username', username.value);
    data.append('password', password.value);
    data.append('nickname', nickname.value);
    data.append('email', email.value);

    // 添加验证码参数
    if (captchaEnabled.value && captchaData.value) {
        if (captchaData.value.provider === 'image') {
            // 图形验证码
            data.append('captcha_code', captchaData.value.captcha_code);
        } else {
            // 极验验证码
            data.append('lot_number', captchaData.value.lot_number);
            data.append('captcha_output', captchaData.value.captcha_output);
            data.append('pass_token', captchaData.value.pass_token);
            data.append('gen_time', captchaData.value.gen_time);
        }
    }
    
    try {
        const rsp = await $backend('/user/sign_up', {
            method: 'POST',
            body: data,
        });
        
        if ( rsp.err != 'ok' ) {
            failmsg.value = rsp.msg;
            // 如果是验证码错误，在验证码组件内显示错误
            if (captchaEnabled.value && captchaRef.value && rsp.err === 'captcha.invalid') {
                captchaRef.value.showError(rsp.msg);
                captchaVerified.value = false;
                captchaData.value = null;
            } else if (captchaEnabled.value && captchaRef.value) {
                // 其他错误只重置验证码
                captchaRef.value.reset();
                captchaVerified.value = false;
                captchaData.value = null;
            }
        } else {
            store.setNavbar(true);
            router.push('/');
        }
    } catch (e) {
        failmsg.value = t('errors.networkError');
    } finally {
        loading.value = false;
    }
};

useHead(() => ({
    title: t('auth.signUp')
}));
</script>

<style scoped>
.signup-container {
    min-height: calc(100vh - 120px);
}
</style>

