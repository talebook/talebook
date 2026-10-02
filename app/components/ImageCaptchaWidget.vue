<template>
    <div class="image-captcha-widget">
        <div class="captcha-image-container">
            <button
                v-if="imageUrl"
                type="button"
                class="captcha-image-button"
                :aria-label="t('captcha.refresh')"
                @click="refreshCaptcha"
            >
                <img
                    :src="imageUrl"
                    alt=""
                    class="captcha-image"
                >
            </button>
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
import { useNuxtApp } from 'nuxt/app';
import { ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { $backend } = useNuxtApp();

const emit = defineEmits(['verify', 'error']);

// 状态
const imageUrl = ref('');
const captchaId = ref('');
const inputCode = ref('');
watch(inputCode, () => emit('error', ''));

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
    emit('error', '');
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

.captcha-image-container:focus-within {
    outline: 2px solid rgb(var(--v-theme-on-surface));
    outline-offset: 2px;
}

.captcha-image {
    display: block;
    width: 120px;
    height: 40px;
}

.captcha-image-button {
    display: block;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
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
