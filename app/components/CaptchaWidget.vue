<template>
    <div class="captcha-container">
        <!-- 错误提示 -->
        <div
            v-if="error"
            class="captcha-error mb-2"
            role="alert"
        >
            <v-alert
                type="error"
                variant="tonal"
                class="ma-2"
            >
                <span class="on-surface">
                    {{ error }}
                </span>
            </v-alert>
            <v-btn
                variant="text"
                @click="initialize"
            >
                {{ t('captcha.refresh') }}
            </v-btn>
        </div>
        <div
            v-if="loading"
            class="captcha-loading"
        >
            <v-progress-circular
                indeterminate
                color="primary"
                size="24"
            />
            <span class="ml-2">{{ t('captcha.loading') }}</span>
        </div>
        <!-- 图形验证码 -->
        <ImageCaptchaWidget
            v-else-if="config && config.provider === 'image'"
            ref="imageCaptchaRef"
            @verify="onImageVerify"
            @error="onImageError"
        />
        <!-- 极验验证码 -->
        <div
            v-else-if="config && ['geetest', 'turnstile'].includes(config.provider)"
            :id="containerId"
            class="captcha-box"
        />
    </div>
</template>

<script setup>
import { useNuxtApp } from 'nuxt/app';
import { ref, nextTick, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { loadTurnstileSDK } from '~/utils/captcha';
import ImageCaptchaWidget from './ImageCaptchaWidget.vue';

const { t } = useI18n();
const { $backend } = useNuxtApp();

const props = defineProps({
    // 验证场景: register, login, welcome, reset, download, read
    configuration: { type: Object, default: null },
    scene: {
        type: String,
        required: true
    }
});

const emit = defineEmits(['verify', 'error']);

// 状态
const loading = ref(true);
const error = ref('');
const config = ref(null);
const containerId = `captcha-${Math.random().toString(36).substr(2, 9)}`;
const imageCaptchaRef = ref(null);

// 极验实例
let geetestInstance = null;
let turnstileId = null;
let disposed = false;

// 加载极验SDK
const loadGeetestSDK = () => {
    return new Promise((resolve, reject) => {
        if (window.initGeetest4) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://static.geetest.com/v4/gt4.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Geetest SDK'));
        document.head.appendChild(script);
    });
};

// 初始化极验
const initGeetest = async () => {
    try {
        await loadGeetestSDK();

        if (disposed) return;
        window.initGeetest4({
            captchaId: config.value.captchaId,
            product: 'popup',
            language: 'zho'
        }, (gt) => {
            if (disposed) { gt.destroy(); return; }
            geetestInstance = gt;

            gt.appendTo(`#${containerId}`)
                .onSuccess(() => {
                    const result = gt.getValidate();
                    emit('verify', {
                        provider: 'geetest',
                        lot_number: result.lot_number,
                        captcha_output: result.captcha_output,
                        pass_token: result.pass_token,
                        gen_time: result.gen_time
                    });
                })
                .onError(() => {
                    error.value = t('captcha.verifyFailed');
                    emit('error', error.value);
                })
                .onClose(() => {
                    // 用户关闭验证框
                });
        });
    } catch (err) {
        error.value = err.message || t('captcha.loadFailed');
        emit('error', error.value);
    }
};

const initTurnstile = async () => {
    await loadTurnstileSDK();
    if (disposed) return;
    turnstileId = window.turnstile.render(`#${containerId}`, {
        sitekey: config.value.siteKey,
        action: props.scene,
        theme: 'auto',
        size: 'compact',
        callback: (token) => {
            error.value = '';
            emit('verify', { provider: 'turnstile', turnstile_token: token });
        },
        'expired-callback': () => onImageError(t('captcha.expired')),
        'error-callback': () => onImageError(t('captcha.verifyFailed')),
        'timeout-callback': () => onImageError(t('captcha.verifyFailed')),
    });
};

// 图形验证码验证成功
const onImageVerify = (data) => {
    error.value = '';
    emit('verify', data);
};

// 图形验证码错误
const onImageError = (msg) => {
    if (msg) error.value = msg;
    emit('error', msg);
};

// 获取验证码配置
const fetchConfig = async () => {
    if (props.configuration) { config.value = props.configuration; return true; }
    try {
        const rsp = await $backend('/captcha/config');
        if (rsp.err === 'ok' && rsp.config && rsp.config.enabled) {
            config.value = rsp.config;
            return true;
        }
        return false;
    } catch (e) {
        console.error('Failed to fetch captcha config:', e);
        return false;
    }
};

// 重置验证码
const reset = () => {
    error.value = '';
    if (config.value && config.value.provider === 'image' && imageCaptchaRef.value) {
        imageCaptchaRef.value.reset();
    } else if (turnstileId !== null && window.turnstile) {
        window.turnstile.reset(turnstileId);
    } else if (geetestInstance) {
        geetestInstance.reset();
    }
};

// 显示错误信息
const showError = (msg) => {
    error.value = msg;
};

// 暴露方法给父组件
defineExpose({
    reset,
    showError
});

const initialize = async () => {
    loading.value = true;
    error.value = '';
    emit('error', '');
    if (turnstileId !== null && window.turnstile) {
        window.turnstile.remove(turnstileId);
        turnstileId = null;
    }
    if (geetestInstance) { geetestInstance.destroy(); geetestInstance = null; }
    const enabled = await fetchConfig();
    if (disposed) return;
    loading.value = false;
    await nextTick();
    try {
        if (!enabled) throw new Error(t('captcha.loadFailed'));
        if (config.value.provider === 'geetest') await initGeetest();
        if (config.value.provider === 'turnstile') await initTurnstile();
    } catch {
        onImageError(t('captcha.loadFailed'));
    }
};

onMounted(initialize);
onUnmounted(() => {
    disposed = true;
    if (geetestInstance) geetestInstance.destroy();
    if (turnstileId !== null && window.turnstile) window.turnstile.remove(turnstileId);
});

</script>

<style scoped>
.captcha-container {
    min-height: 50px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.captcha-loading {
    display: flex;
    align-items: center;
    color: #666;
}

.captcha-error {
    width: 100%;
}

.captcha-box {
    width: 100%;
    min-height: 50px;
}

:deep(.geetest_captcha) {
    margin: 0 auto;
}

@media (prefers-reduced-motion: reduce) {
    :deep(.v-progress-circular svg),
    :deep(.v-progress-circular__overlay) {
        animation: none !important;
    }
}
</style>

<style>
/* 确保极验弹窗不受父容器限制 */
.geetest_widget {
    z-index: 9999 !important;
}

.geetest_fullpage_click {
    z-index: 9999 !important;
}
</style>
