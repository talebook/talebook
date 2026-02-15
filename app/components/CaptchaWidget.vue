<template>
    <div class="captcha-container">
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
        <div
            v-else-if="error"
            class="captcha-error"
        >
            <v-alert
                type="error"
                density="compact"
            >
                {{ error }}
            </v-alert>
        </div>
        <div
            v-else-if="config"
            :id="containerId"
            class="captcha-box"
        />
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { $backend } = useNuxtApp();

const props = defineProps({
    // 验证场景: 'register', 'login', 'welcome'
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

// 极验实例
let geetestInstance = null;

// 生成唯一ID
const generateId = () => {
    return `captcha-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

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

        window.initGeetest4({
            captchaId: config.value.captchaId,
            product: 'popup',
            language: 'zho'
        }, (gt) => {
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
                    emit('error', t('captcha.verifyFailed'));
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

// 获取验证码配置
const fetchConfig = async () => {
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
    if (geetestInstance) {
        geetestInstance.reset();
    }
};

// 暴露方法给父组件
defineExpose({
    reset
});

onMounted(async () => {
    loading.value = true;
    error.value = '';

    const enabled = await fetchConfig();
    if (enabled) {
        await initGeetest();
    }

    loading.value = false;
});

onUnmounted(() => {
    if (geetestInstance) {
        geetestInstance.destroy();
    }
});
</script>

<style scoped>
.captcha-container {
    min-height: 50px;
    display: flex;
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
