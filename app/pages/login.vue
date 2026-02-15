
<template>
    <div class="login-container">
        <v-row
            justify="center"
            class="mt-8"
        >
            <v-col
                cols="12"
                sm="8"
                md="4"
            >
                <v-card
                    v-if="show_login"
                    class="elevation-12"
                >
                    <v-toolbar
                        dark
                        color="primary"
                    >
                        <v-toolbar-title>{{ t('common.welcome') }}</v-toolbar-title>
                        <v-spacer />
                        <v-btn
                            v-if="allowRegister"
                            rounded
                            color="success"
                            variant="elevated"
                            to="/signup"
                            class="text-white mr-4"
                        >
                            {{ t('auth.signUp') }}
                        </v-btn>
                    </v-toolbar>
                    <v-card-text>
                        <v-form @submit.prevent="onLoginClick">
                            <v-text-field
                                v-model="username"
                                prepend-icon="mdi-account"
                                :label="t('auth.username')"
                                type="text"
                            />
                            <v-text-field
                                id="password"
                                v-model="password"
                                prepend-icon="mdi-lock"
                                :label="t('auth.password')"
                                type="password"
                            />
                            <p class="text-right">
                                <a
                                    class="press-content"
                                    href="javascript:void(0)"
                                    @click="show_login = !show_login"
                                > {{ t('auth.forgotPassword') }} </a>
                            </p>
                            <div align="center">
                                <v-btn
                                    type="submit"
                                    large
                                    rounded
                                    color="primary"
                                    :loading="loading"
                                >
                                    {{ t('auth.signIn') }}
                                </v-btn>
                            </div>
                        </v-form>
                    </v-card-text>

                    <v-card-text v-if="socials && socials.length > 0">
                        <v-divider />
                        <div align="center">
                            <br>
                            <small>{{ t('auth.socialLogin') }}</small>
                            <br>
                            <template
                                v-for="s in socials"
                                :key="s.text"
                            >
                                <v-btn
                                    small
                                    outlined
                                    :href="'/auth/login/' + s.value"
                                    class="ma-1"
                                >
                                    {{ s.text }}
                                </v-btn>
                            </template>
                        </div>
                    </v-card-text>
                    <v-alert
                        v-if="alert.msg"
                        :type="alert.type"
                        class="ma-2"
                    >
                        {{ alert.msg }}
                    </v-alert>
                </v-card>

                <v-card
                    v-else
                    class="elevation-12"
                >
                    <v-toolbar
                        dark
                        color="red"
                    >
                        <v-toolbar-title>{{ t('auth.resetPassword') }}</v-toolbar-title>
                    </v-toolbar>
                    <v-card-text>
                        <v-form @submit.prevent="do_reset">
                            <v-text-field
                                v-model="username"
                                prepend-icon="mdi-account"
                                :label="t('auth.username')"
                                type="text"
                            />
                            <v-text-field
                                v-model="email"
                                prepend-icon="mdi-email"
                                :label="t('auth.email')"
                                type="text"
                                autocomplete="old-email"
                            />
                            <div
                                align="center"
                                class="mt-4"
                            >
                                <v-btn
                                    rounded
                                    color=""
                                    class="mr-5"
                                    @click="show_login = !show_login"
                                >
                                    {{ t('common.back') }}
                                </v-btn>
                                <v-btn
                                    rounded
                                    dark
                                    color="red"
                                    type="submit"
                                    :loading="loading"
                                >
                                    {{ t('auth.resetPassword') }}
                                </v-btn>
                            </div>
                        </v-form>
                    </v-card-text>
                    <v-alert
                        v-if="alert.msg"
                        :type="alert.type"
                        class="ma-2"
                    >
                        {{ alert.msg }}
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
                        scene="login"
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
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMainStore } from '@/stores/main';
import { useI18n } from 'vue-i18n';
import CaptchaWidget from '~/components/CaptchaWidget.vue';

const router = useRouter();
const store = useMainStore();
const { t } = useI18n();
const { $backend } = useNuxtApp();

const username = ref('');
const password = ref('');
const email = ref('');
const show_login = ref(true);
const loading = ref(false);
const alert = ref({
    type: 'error',
    msg: '',
});

// 人机验证相关
const captchaRef = ref(null);
const captchaEnabled = ref(false);
const captchaVerified = ref(false);
const captchaData = ref(null);
const showCaptchaDialog = ref(false);

// 控制是否显示导航栏（可作为开关使用）
const showNavbar = true; // 后期可通过配置或环境变量控制
store.setNavbar(showNavbar);

// Fetch user info on mount/creation to check login status
// Note: In Nuxt 3, useAsyncData is preferred for SSR, but client-side is fine for login check
onMounted(async () => {
    try {
        const rsp = await $backend('/user/info');
        store.login(rsp);
        if (rsp.user && rsp.user.is_login) {
            router.push('/');
        }
        // 检查是否启用了验证码
        checkCaptchaEnabled();
    } catch (e) {
        // ignore error
        checkCaptchaEnabled();
    }
});

// 检查是否启用了验证码
const checkCaptchaEnabled = async () => {
    try {
        const rsp = await $backend('/captcha/config');
        captchaEnabled.value = rsp.config && rsp.config.enabled;
    } catch (e) {
        captchaEnabled.value = false;
    }
};

// 点击登录按钮
const onLoginClick = () => {
    if (!username.value || !password.value) {
        alert.value.type = 'error';
        alert.value.msg = t('errors.networkError');
        return;
    }
    
    if (captchaEnabled.value) {
        // 显示验证码弹窗
        captchaVerified.value = false;
        captchaData.value = null;
        showCaptchaDialog.value = true;
    } else {
        // 直接登录
        do_login();
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
    do_login();
};

// 验证码错误回调
const onCaptchaError = (msg) => {
    captchaVerified.value = false;
    alert.value.type = 'error';
    alert.value.msg = msg;
};

const socials = computed(() => store.sys.socials || []);
const allowRegister = computed(() => store.sys.allow ? store.sys.allow.register : false);

const do_login = async () => {
    loading.value = true;
    alert.value.msg = '';
    
    var data = new URLSearchParams();
    data.append('username', username.value);
    data.append('password', password.value);
    
    // 添加验证码参数
    if (captchaEnabled.value && captchaData.value) {
        data.append('lot_number', captchaData.value.lot_number);
        data.append('captcha_output', captchaData.value.captcha_output);
        data.append('pass_token', captchaData.value.pass_token);
        data.append('gen_time', captchaData.value.gen_time);
    }
    
    try {
        const rsp = await $backend('/user/sign_in', {
            method: 'POST',
            body: data,
        });
        
        if (rsp.err != 'ok') {
            alert.value.type = 'error';
            alert.value.msg = rsp.msg;
            // 重置验证码
            if (captchaEnabled.value && captchaRef.value) {
                captchaRef.value.reset();
                captchaVerified.value = false;
                captchaData.value = null;
            }
        } else {
            store.setNavbar(true);
            // Refresh user info
            const info = await $backend('/user/info');
            store.login(info);
            router.push('/');
        }
    } catch (e) {
        alert.value.type = 'error';
        alert.value.msg = t('errors.networkError');
    } finally {
        loading.value = false;
    }
};

const do_reset = async () => {
    loading.value = true;
    alert.value.msg = '';
    
    var data = new URLSearchParams();
    data.append('username', username.value);
    data.append('email', email.value);
    
    try {
        const rsp = await $backend('/user/reset', {
            method: 'POST',
            body: data,
        });
        
        if (rsp.err == 'ok') {
            alert.value.type = 'success';
            alert.value.msg = t('auth.resetSuccess');
        } else {
            alert.value.type = 'error';
            alert.value.msg = rsp.msg;
        }
    } catch (e) {
        alert.value.type = 'error';
        alert.value.msg = t('errors.networkError');
    } finally {
        loading.value = false;
    }
};

useHead(() => ({
    title: t('auth.signIn')
}));
</script>

<style scoped>
.login-container {
    min-height: calc(100vh - 120px);
}
</style>

