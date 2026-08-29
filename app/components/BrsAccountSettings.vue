<template>
    <section class="brs-account-settings">
        <v-alert
            v-if="installationDisabled"
            type="warning"
            variant="tonal"
            class="mb-4"
        >
            {{ t('brs.disabledByAdmin') }}
        </v-alert>

        <v-card
            class="brs-login-card"
            variant="outlined"
        >
            <v-card-title class="brs-login-card__title">
                <div>
                    <h2>{{ modeTitle }}</h2>
                    <p>{{ modeDescription }}</p>
                </div>
                <v-chip
                    v-if="connection?.secret?.configured"
                    color="success"
                    size="small"
                    variant="tonal"
                >
                    {{ t('brs.connected') }}
                </v-chip>
            </v-card-title>
            <v-divider />

            <v-form
                class="brs-login-card__form"
                @submit.prevent="submit"
            >
                <v-text-field
                    ref="endpointField"
                    v-model.trim="endpoint"
                    name="brs-endpoint"
                    :label="t('brs.endpoint')"
                    :hint="t('brs.endpointHint')"
                    :error-messages="fieldErrors.endpoint"
                    :aria-invalid="Boolean(fieldErrors.endpoint)"
                    prepend-inner-icon="mdi-server-network"
                    type="url"
                    autocomplete="url"
                    variant="outlined"
                    persistent-hint
                    :disabled="submitting || installationDisabled"
                    @update:model-value="fieldErrors.endpoint = ''"
                />
                <v-text-field
                    ref="emailField"
                    v-model.trim="email"
                    name="email"
                    :label="t('brs.email')"
                    :error-messages="fieldErrors.email"
                    :aria-invalid="Boolean(fieldErrors.email)"
                    prepend-inner-icon="mdi-email-outline"
                    type="email"
                    autocomplete="email"
                    variant="outlined"
                    :disabled="submitting || installationDisabled"
                    @update:model-value="fieldErrors.email = ''"
                />
                <v-text-field
                    v-if="mode === 'login'"
                    ref="passwordField"
                    v-model="password"
                    name="password"
                    :label="t('brs.password')"
                    :error-messages="fieldErrors.password"
                    :aria-invalid="Boolean(fieldErrors.password)"
                    prepend-inner-icon="mdi-lock-outline"
                    type="password"
                    autocomplete="current-password"
                    variant="outlined"
                    :disabled="submitting || installationDisabled"
                    @update:model-value="fieldErrors.password = ''"
                />
                <template v-else-if="mode === 'signup'">
                    <v-text-field
                        ref="nicknameField"
                        v-model.trim="nickname"
                        name="nickname"
                        :label="t('brs.nickname')"
                        :error-messages="fieldErrors.nickname"
                        :aria-invalid="Boolean(fieldErrors.nickname)"
                        prepend-inner-icon="mdi-account-outline"
                        autocomplete="nickname"
                        variant="outlined"
                        :disabled="submitting || installationDisabled"
                        @update:model-value="fieldErrors.nickname = ''"
                    />
                    <p class="brs-login-card__mail-hint">
                        <v-icon size="16">
                            mdi-email-fast-outline
                        </v-icon>
                        {{ t('brs.signupMailHint') }}
                    </p>
                </template>

                <v-alert
                    v-if="notice.message"
                    :type="notice.type"
                    variant="tonal"
                    density="compact"
                    role="alert"
                    class="mb-4"
                >
                    {{ notice.message }}
                </v-alert>

                <v-btn
                    color="primary"
                    type="submit"
                    :loading="submitting"
                    :disabled="installationDisabled"
                >
                    {{ submitLabel }}
                </v-btn>
            </v-form>

            <v-divider />
            <v-card-actions class="brs-login-card__actions">
                <v-btn
                    v-if="mode === 'login'"
                    variant="text"
                    size="small"
                    :disabled="submitting"
                    @click="setMode('reset')"
                >
                    {{ t('brs.forgotPassword') }}
                </v-btn>
                <v-btn
                    v-else
                    variant="text"
                    size="small"
                    :disabled="submitting"
                    @click="setMode('login')"
                >
                    {{ t('brs.backToLogin') }}
                </v-btn>
                <v-spacer />
                <v-btn
                    v-if="mode !== 'signup'"
                    variant="text"
                    size="small"
                    :disabled="submitting"
                    @click="setMode('signup')"
                >
                    {{ t('brs.quickSignup') }}
                </v-btn>
            </v-card-actions>
        </v-card>

        <p class="brs-account-settings__privacy">
            <v-icon size="16">
                mdi-shield-lock-outline
            </v-icon>
            {{ t('brs.privacyHint') }}
        </p>
    </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

type Mode = 'login' | 'signup' | 'reset';
type Connection = {
    config?: Record<string, unknown>;
    secret?: { configured?: boolean; mask?: string };
};
type PluginState = {
    plugin?: {
        config_schema?: {
            properties?: { endpoint?: { default?: string } };
        };
    };
    installation?: { enabled?: boolean; status?: string } | null;
    connections?: Connection[];
};
type BrsResponse = { err?: string; msg?: string; data?: unknown };
type BackendResponse = PluginState & { err?: string; msg?: string; connection?: Connection };
type Backend = (url: string, options?: Record<string, unknown>) => Promise<BackendResponse>;

const props = defineProps<{ backend: Backend }>();
const { t } = useI18n();

const mode = ref<Mode>('login');
const endpoint = ref('');
const email = ref('');
const password = ref('');
const nickname = ref('');
const submitting = ref(false);
const connection = ref<Connection | null>(null);
const installation = ref<PluginState['installation']>(null);
const notice = reactive<{ type: 'error' | 'success' | 'info'; message: string }>({ type: 'info', message: '' });
const fieldErrors = reactive({ endpoint: '', email: '', password: '', nickname: '' });
const endpointField = ref<{ focus?: () => void } | null>(null);
const emailField = ref<{ focus?: () => void } | null>(null);
const passwordField = ref<{ focus?: () => void } | null>(null);
const nicknameField = ref<{ focus?: () => void } | null>(null);

const installationDisabled = computed(() => Boolean(
    installation.value && (!installation.value.enabled || installation.value.status !== 'active'),
));
const modeTitle = computed(() => t(`brs.${mode.value}Title`));
const modeDescription = computed(() => t(`brs.${mode.value}Description`));
const submitLabel = computed(() => t(`brs.${mode.value}Submit`));

function setNotice(type: 'error' | 'success' | 'info', message: string) {
    notice.type = type;
    notice.message = message;
}

function setMode(value: Mode) {
    mode.value = value;
    password.value = '';
    nickname.value = '';
    notice.message = '';
    Object.assign(fieldErrors, { endpoint: '', email: '', password: '', nickname: '' });
}

function normalizedEndpoint() {
    const raw = endpoint.value.trim().replace(/\/+$/, '');
    try {
        const parsed = new URL(raw);
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error();
        return raw;
    } catch {
        throw new Error(t('brs.endpointInvalid'));
    }
}

function validateInput() {
    Object.assign(fieldErrors, { endpoint: '', email: '', password: '', nickname: '' });
    let target = '';
    try {
        target = normalizedEndpoint();
    } catch (reason) {
        fieldErrors.endpoint = reason instanceof Error ? reason.message : t('brs.endpointInvalid');
    }
    if (!/^\S+@\S+\.\S+$/.test(email.value)) fieldErrors.email = t('brs.emailInvalid');
    if (mode.value === 'login' && !password.value) fieldErrors.password = t('brs.passwordRequired');
    if (mode.value === 'signup' && nickname.value.length < 2) fieldErrors.nickname = t('brs.nicknameInvalid');

    const firstInvalid = (['endpoint', 'email', 'password', 'nickname'] as const)
        .find(field => fieldErrors[field]);
    if (!firstInvalid) return target;
    const fields = { endpoint: endpointField, email: emailField, password: passwordField, nickname: nicknameField };
    nextTick(() => fields[firstInvalid].value?.focus?.());
    return '';
}

async function callBrs(target: string, action: Mode): Promise<BrsResponse> {
    const path = action === 'login' ? 'sign_in' : action === 'signup' ? 'sign_up' : 'reset';
    const body = new URLSearchParams({ email: email.value });
    if (action === 'login') body.set('password', password.value);
    if (action === 'signup') body.set('nickname', nickname.value);
    let response: Response;
    try {
        response = await fetch(`${target}/api/user/${path}`, {
            method: 'POST',
            mode: 'cors',
            credentials: 'include',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body,
        });
    } catch {
        throw new Error(t('brs.networkError'));
    }
    try {
        return await response.json() as BrsResponse;
    } catch {
        throw new Error(t('brs.invalidResponse'));
    }
}

async function saveConnection(target: string) {
    const config = { ...(connection.value?.config || {}), endpoint: target };
    const response = await props.backend('/plugins/connections', {
        method: 'POST',
        body: JSON.stringify({
            plugin_key: 'talebook.annotation.brs',
            role: 'default',
            name: 'talebook-brs',
            config,
            credentials: { email: email.value, password: password.value },
        }),
    });
    if (response.err !== 'ok') throw new Error(response.msg || response.err);
    connection.value = response.connection || null;
}

async function submit() {
    notice.message = '';
    const target = validateInput();
    if (!target) return;

    submitting.value = true;
    try {
        const response = await callBrs(target, mode.value);
        if (response.err !== 'ok') throw new Error(response.msg || response.err || t('brs.failed'));
        if (mode.value === 'login') {
            await saveConnection(target);
            password.value = '';
            setNotice('success', t('brs.loginSuccess'));
        } else if (mode.value === 'signup') {
            setMode('login');
            setNotice('success', t('brs.signupSuccess'));
        } else {
            setNotice('success', t('brs.resetSuccess'));
        }
    } catch (reason) {
        setNotice('error', reason instanceof Error ? reason.message : t('brs.failed'));
    } finally {
        submitting.value = false;
    }
}

onMounted(async () => {
    try {
        const response = await props.backend('/plugins/talebook.annotation.brs');
        if (response.err !== 'ok') throw new Error(response.msg || response.err);
        installation.value = response.installation || null;
        connection.value = (response.connections || []).find((item: { role?: string }) => item.role === 'default')
            || response.connections?.[0]
            || null;
        endpoint.value = String(
            connection.value?.config?.endpoint
            || response.plugin?.config_schema?.properties?.endpoint?.default
            || '',
        );
    } catch (reason) {
        setNotice('error', reason instanceof Error ? reason.message : t('brs.loadFailed'));
    }
});
</script>

<style scoped>
.brs-account-settings { width:min(660px,100%); }
.brs-login-card { overflow:hidden; border-color:rgba(var(--v-theme-on-surface),.14); box-shadow:0 14px 36px rgba(30,43,65,.08); }
.brs-login-card__title { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; padding:22px 24px 18px; }
.brs-login-card__title h2 { margin:0; font-size:20px; line-height:1.25; }
.brs-login-card__title p { margin:5px 0 0; color:rgba(var(--v-theme-on-surface),.62); font-size:13px; font-weight:400; white-space:normal; }
.brs-login-card__form { padding:24px; }
.brs-login-card__mail-hint { display:flex; align-items:center; gap:7px; margin:-4px 0 18px; color:rgba(var(--v-theme-on-surface),.62); font-size:12px; }
.brs-login-card__actions { min-height:56px; padding:8px 16px; }
.brs-account-settings__privacy { display:flex; align-items:flex-start; gap:7px; margin:14px 4px 0; color:rgba(var(--v-theme-on-surface),.56); font-size:12px; line-height:1.5; }
@media (max-width:600px) {
    .brs-login-card__title { padding:18px 18px 15px; }
    .brs-login-card__form { padding:20px 18px; }
}
</style>
