<template>
    <v-container class="book-verification">
        <v-card
            class="mx-auto"
            max-width="480"
            data-testid="book-captcha-page"
        >
            <v-card-title tag="h1" class="text-wrap">
                {{ t('captcha.title') }}
            </v-card-title>
            <v-card-text>
                <p class="mb-4">
                    {{ t(scene === 'download' ? 'captcha.downloadPrompt' : 'captcha.readPrompt') }}
                </p>
                <v-progress-linear
                    v-if="loading"
                    indeterminate
                    :aria-label="t('captcha.loading')"
                />
                <v-alert
                    v-if="error"
                    type="error"
                    variant="tonal"
                    role="alert"
                    class="mb-4"
                >
                    <span class="on-surface">
                        {{ error }}
                    </span>
                </v-alert>
                <CaptchaWidget
                    v-if="configuration"
                    ref="widget"
                    :scene="scene"
                    :configuration="configuration"
                    @verify="verified"
                    @error="invalidate"
                />
                <p
                    role="status"
                    class="verification-status mt-4"
                >
                    {{ verification ? t('captcha.ready') : '' }}
                </p>
            </v-card-text>
            <v-card-actions class="flex-wrap">
                <v-btn :to="`/book/${bookId}`">
                    {{ t('captcha.backToBook') }}
                </v-btn>
                <v-spacer />
                <v-btn
                    v-if="!configuration && !loading"
                    variant="text"
                    @click="loadConfig"
                >
                    {{ t('captcha.refresh') }}
                </v-btn>
                <v-btn
                    class="on-surface"
                    variant="tonal"
                    :disabled="!configuration || loading || submitting"
                    :loading="submitting"
                    @click="submit"
                >
                    {{ t('captcha.continue') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import CaptchaWidget from '~/components/CaptchaWidget.vue';
import { appendCaptchaData } from '~/utils/captcha';
import { bookCaptchaReturn, decodeBookCaptchaNext } from '~/utils/book-captcha';

const { t } = useI18n();
const { $backend } = useNuxtApp();
const route = useRoute();
const bookId = computed(() => String(route.params.bid));
const scene = computed(() => route.query.scene === 'download' ? 'download' : 'read');
const configuration = ref(null);
const verification = ref(null);
const widget = ref(null);
const loading = ref(true);
const submitting = ref(false);
const error = ref('');

const continueToBook = () => {
    const next = decodeBookCaptchaNext(route.query.next_b64);
    window.location.replace(bookCaptchaReturn(next, bookId.value, scene.value));
};
const verified = (data) => { verification.value = data; error.value = ''; };
const invalidate = () => { verification.value = null; };
const loadConfig = async () => {
    loading.value = true;
    error.value = '';
    try {
        const response = await $backend('/captcha/config');
        if (response.err !== 'ok') throw new Error(t('captcha.loadFailed'));
        const required = response.scenes?.[scene.value] ?? response.config?.scenes?.[scene.value];
        if (required === false) { continueToBook(); return; }
        if (!response.config?.enabled) throw new Error(t('captcha.unavailable'));
        configuration.value = response.config;
    } catch (err) {
        error.value = err.message || t('captcha.loadFailed');
    } finally {
        loading.value = false;
    }
};
const submit = async () => {
    if (submitting.value) return;
    if (!verification.value) {
        error.value = t('captcha.pleaseComplete');
        return;
    }
    submitting.value = true;
    const data = new URLSearchParams({ provider: verification.value.provider, scene: scene.value, book_id: bookId.value });
    appendCaptchaData(data, verification.value);
    try {
        const response = await $backend('/captcha/verify', { method: 'POST', body: data });
        if (response.err !== 'ok') throw new Error(response.msg || t('captcha.verifyFailed'));
        continueToBook();
    } catch (err) {
        error.value = err.message || t('captcha.verifyFailed');
        verification.value = null;
        widget.value?.reset();
    } finally {
        submitting.value = false;
    }
};
onMounted(loadConfig);
</script>

<style scoped>
.book-verification {
    padding-top: 32px;
}

.verification-status {
    min-height: 20px;
}

@media (prefers-reduced-motion: reduce) {
    :deep(.v-progress-linear__indeterminate) {
        animation: none !important;
        left: 0;
        width: 100%;
    }
    :deep(.v-progress-circular svg),
    :deep(.v-progress-circular__overlay) {
        animation: none !important;
    }
}
</style>
