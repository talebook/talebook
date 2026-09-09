<template>
    <section
        class="pa-2"
        :aria-label="t('upgrade.title')"
    >
        <h3 class="text-h6 mb-3">
            {{ t('upgrade.title') }}
        </h3>
        <p class="mb-3">
            {{ t('upgrade.current', { version: status.current?.version || currentVersion || '—' }) }}
        </p>
        <v-alert
            type="info"
            variant="tonal"
            class="mb-3"
        >
            {{ t('upgrade.firstImage') }}
        </v-alert>
        <v-alert
            v-if="status.disabled"
            type="warning"
            variant="tonal"
            class="mb-3"
        >
            {{ errorText(status.disabled) }}
        </v-alert>
        <p
            v-if="!status.domestic_configured"
            class="text-body-2 mb-3"
        >
            {{ t('upgrade.noDomestic') }}
        </p>
        <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            class="mb-3"
        >
            <p>{{ reconnecting ? t('upgrade.reconnecting') : t(`upgrade.phase.${status.phase || 'idle'}`) }}</p>
            <v-progress-linear
                v-if="busy || pending"
                indeterminate
                class="mt-2"
                :aria-label="t('upgrade.progress')"
            />
        </div>
        <v-alert
            v-if="error || status.error"
            type="error"
            variant="tonal"
            class="mb-3"
            role="alert"
        >
            {{ errorText(error || status.error) }}
        </v-alert>
        <template v-if="status.candidate">
            <h4 class="text-subtitle-1 mb-2">
                {{ t('upgrade.candidate', { version: status.candidate.version }) }}
            </h4>
            <p class="text-body-2 mb-2">
                {{ t('upgrade.size', { size: Math.ceil(status.candidate.size / 1024 / 1024) }) }}
            </p>
            <pre class="upgrade-notes mb-3">{{ status.candidate.notes || t('upgrade.noNotes') }}</pre>
            <v-alert
                v-if="status.incompatible"
                type="warning"
                variant="tonal"
                class="mb-3"
            >
                {{ errorText(status.incompatible) }}
            </v-alert>
        </template>
        <p
            v-if="sourceWarning"
            class="text-body-2 mb-3"
        >
            {{ t('upgrade.sourceWarning') }}
        </p>
        <div class="d-flex flex-wrap ga-3">
            <v-btn
                variant="outlined"
                :disabled="busy || pending || !!status.disabled"
                @click="command('check')"
            >
                {{ t('upgrade.check') }}
            </v-btn>
            <v-btn
                v-if="canInstall"
                id="application-upgrade-install"
                ref="installTrigger"
                color="primary"
                :disabled="busy || pending"
            >
                {{ t('upgrade.install') }}
            </v-btn>
            <v-btn
                v-if="reconnecting"
                variant="outlined"
                :disabled="pending"
                @click="poll"
            >
                {{ t('upgrade.retry') }}
            </v-btn>
            <v-btn
                v-if="status.phase === 'succeeded' || status.phase === 'rolled_back'"
                variant="outlined"
                @click="reload"
            >
                {{ t('upgrade.reload') }}
            </v-btn>
        </div>
        <div
            v-if="status.disabled"
            class="mt-4"
        >
            <v-btn
                variant="outlined"
                :disabled="pending"
                @click="checkImage"
            >
                {{ t('upgrade.checkImage') }}
            </v-btn>
            <p
                v-if="imageRelease"
                class="mt-2"
            >
                {{ t('upgrade.imageRelease', { version: imageRelease }) }}
            </p>
            <a
                v-if="imageRelease"
                href="https://github.com/talebook/talebook/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
            >{{ t('upgrade.imageDetails') }}</a>
        </div>
        <v-dialog
            v-model="confirm"
            :activator="installTrigger?.$el"
            :transition="false"
            max-width="540"
            aria-labelledby="upgrade-confirm-title"
        >
            <v-card>
                <v-card-title
                    id="upgrade-confirm-title"
                    class="text-wrap"
                >
                    {{ t('upgrade.confirmTitle', { version: status.candidate?.version }) }}
                </v-card-title>
                <v-card-text>{{ t('upgrade.confirmBody') }}</v-card-text>
                <v-card-actions class="flex-wrap ga-2">
                    <v-spacer />
                    <v-btn
                        variant="text"
                        @click="confirm = false"
                    >
                        {{ t('upgrade.cancel') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        variant="flat"
                        :disabled="busy || pending"
                        @click="install"
                    >
                        {{ t('upgrade.confirm') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';


const props = defineProps({ currentVersion: { type: String, default: '' }, backend: { type: Function, default: null } });
const { t, te } = useI18n();
const $backend = props.backend || useNuxtApp().$backend;
const status = ref({ phase: 'idle' });
const pending = ref(false);
const error = ref('');
const imageRelease = ref('');
const confirm = ref(false);
const installTrigger = ref(null);
const reconnecting = ref(false);
let timer;
let disposed = false;
const terminal = ['idle', 'available', 'current', 'succeeded', 'failed', 'rolled_back', 'recovery_failed'];
const busy = computed(() => !terminal.includes(status.value.phase));
const canInstall = computed(() => status.value.candidate && !status.value.disabled && !status.value.incompatible
    && status.value.candidate.sequence > (status.value.current?.sequence || 0));
const sourceWarning = computed(() => status.value.sources?.some(source => source.error
    || source.sequence < (status.value.candidate?.sequence || 0)));
const errorText = code => te(`upgrade.error.${code}`) ? t(`upgrade.error.${code}`) : t('upgrade.error.internal');
const reload = () => window.location.reload();
const schedule = () => {
    clearTimeout(timer);
    if (!disposed && (busy.value || reconnecting.value)) timer = setTimeout(poll, 3000);
};
const poll = async () => {
    if (pending.value) return;
    pending.value = true;
    try {
        const rsp = await $backend('/admin/upgrade', { quietMaintenance: true });
        if (rsp?.status) {
            status.value = rsp.status;
            reconnecting.value = false;
        } else {
            reconnecting.value = true;
        }
    } catch {
        reconnecting.value = true;
    } finally {
        pending.value = false;
        schedule();
    }
};
const command = async (action) => {
    pending.value = true;
    error.value = '';
    try {
        const rsp = await $backend('/admin/upgrade', {
            method: 'POST',
            quietMaintenance: true,
            headers: { 'Content-Type': 'application/json', 'X-Talebook-Upgrade': '1' },
            body: JSON.stringify({ action, release: status.value.candidate?.commit }),
        });
        if (rsp?.status) status.value = rsp.status;
        if (rsp?.err !== 'ok') error.value = rsp?.err || 'network';
    } catch {
        // An install response may be lost as maintenance closes admission. Poll persisted state.
        reconnecting.value = true;
    } finally {
        pending.value = false;
        schedule();
    }
};
const checkImage = async () => {
    pending.value = true;
    error.value = '';
    try {
        const rsp = await $backend('/admin/update', { method: 'POST' });
        if (rsp?.err !== 'ok' || rsp.status?.check_error) error.value = 'network';
        else imageRelease.value = rsp.status?.latest_version || '';
    } catch {
        error.value = 'network';
    } finally {
        pending.value = false;
    }
};
const install = () => {
    confirm.value = false;
    command('install');
};
onMounted(poll);
onBeforeUnmount(() => { disposed = true; clearTimeout(timer); });
</script>

<style scoped>
:deep(.v-alert__content) { color: rgb(var(--v-theme-on-surface)); }
:deep(.v-btn:focus-visible) { outline: 2px solid rgb(var(--v-theme-on-surface)); outline-offset: 3px; }
a { color: rgb(var(--v-theme-on-surface)); text-decoration: underline; }
.upgrade-notes { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; max-height: 20rem; overflow-y: auto; }
@media (prefers-reduced-motion: reduce) {
    :deep(.v-progress-linear__indeterminate) { animation: none !important; }
}
</style>
