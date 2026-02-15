<template>
    <div class="image-captcha-widget">
        <div class="captcha-image-container">
            <img
                v-if="imageUrl"
                :src="imageUrl"
                alt="验证码"
                class="captcha-image"
                @click="refreshCaptcha"
            >
            <v-skeleton-loader
                v-else
                type="image"
                width="120"
                height="40"
            />
        </div>
        <v-text-field
            v-model="inputCode"
            :label="t('captcha.inputCode')"
            :placeholder="t('captcha.inputPlaceholder')"
            maxlength="6"
            class="captcha-input"
            @keyup.enter="submitCaptcha"
        />
        <div class="captcha-actions">
            <v-btn
                small
                color="primary"
                :disabled="!inputCode"
                @click="submitCaptcha"
            >
                {{ t('common.confirm') }}
            </v-btn>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { $backend } = useNuxtApp();

const emit = defineEmits(['verify', 'error']);

// 状态
const imageUrl = ref('');
const captchaId = ref('');
const inputCode = ref('');

// 获取验证码图片
const fetchCaptcha = async () => {
    try {
        const rsp = await $backend('/captcha/image');
        if (rsp.err === 'ok') {
            imageUrl.value = rsp.image;
            captchaId.value = rsp.captcha_id;
            inputCode.value = '';
        } else {
            emit('error', rsp.msg || t('captcha.loadFailed'));
        }
    } catch (e) {
        emit('error', t('captcha.loadFailed'));
    }
};

// 刷新验证码
const refreshCaptcha = () => {
    imageUrl.value = '';
    fetchCaptcha();
};

// 提交验证码
const submitCaptcha = async () => {
    if (!inputCode.value) {
        return;
    }

    try {
        const rsp = await $backend('/captcha/verify', {
            method: 'POST',
            body: new URLSearchParams({
                provider: 'image',
                captcha_code: inputCode.value.toUpperCase()
            })
        });

        if (rsp.err === 'ok') {
            emit('verify', {
                provider: 'image',
                captcha_code: inputCode.value.toUpperCase()
            });
        } else {
            emit('error', rsp.msg || t('captcha.verifyFailed'));
            refreshCaptcha();
        }
    } catch (e) {
        emit('error', t('captcha.verifyFailed'));
        refreshCaptcha();
    }
};

// 重置
const reset = () => {
    inputCode.value = '';
    refreshCaptcha();
};

// 暴露方法给父组件
defineExpose({
    reset,
    refreshCaptcha
});

onMounted(() => {
    fetchCaptcha();
});
</script>

<style scoped>
.image-captcha-widget {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 16px;
}

.captcha-image-container {
    cursor: pointer;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
}

.captcha-image {
    display: block;
    width: 120px;
    height: 40px;
}

.captcha-input {
    width: 100%;
    min-width: 200px;
    margin-bottom: -10px;
}

.captcha-actions {
    display: flex;
    gap: 8px;
    justify-content: center;
    margin-top: -10px;
}
</style>
