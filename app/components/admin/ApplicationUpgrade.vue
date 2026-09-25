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
            v-if="!historyOpen"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            class="mb-3"
        >
            <p v-if="notice">
                {{ notice }}
            </p>
            <p>{{ reconnecting ? t('upgrade.reconnecting') : t(`upgrade.phase.${status.phase || 'idle'}`) }}</p>
            <v-progress-linear
                v-if="busy || pending"
                indeterminate
                class="mt-2"
                :aria-label="t('upgrade.progress')"
            />
        </div>
        <v-alert
            v-if="!historyOpen && (error || status.error)"
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
                v-if="status.releases"
                ref="historyTrigger"
                variant="outlined"
            >
                {{ t('upgrade.history') }}
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
            v-model="historyOpen"
            :activator="historyTrigger?.$el"
            :transition="false"
            scrollable
            max-width="880"
            aria-labelledby="upgrade-history-title"
        >
            <v-card>
                <v-card-title
                    id="upgrade-history-title"
                    class="text-wrap"
                >
                    {{ t('upgrade.history') }}
                </v-card-title>
                <v-card-text>
                    <div
                        role="status"
                        aria-live="polite"
                        class="mb-3"
                    >
                        <p v-if="notice">
                            {{ notice }}
                        </p>
                        <p>
                            {{ reconnecting ? t('upgrade.reconnecting') : t(`upgrade.phase.${status.phase}`) }}
                        </p>
                        <v-progress-linear
                            v-if="busy || pending"
                            indeterminate
                            :aria-label="t('upgrade.progress')"
                        />
                    </div>
                    <v-alert
                        v-if="error || status.error"
                        type="error"
                        variant="tonal"
                        role="alert"
                        class="mb-3"
                    >
                        {{ errorText(error || status.error) }}
                    </v-alert>
                    <section
                        v-if="status.releases"
                        class="upgrade-library"
                        :aria-label="t('upgrade.library')"
                    >
                        <h4 class="text-h6 mb-2">
                            {{ t('upgrade.library') }}
                        </h4>
                        <p class="mb-2 text-body-2">
                            {{ t('upgrade.rebuildRule') }}
                        </p>
                        <p class="mb-3 text-body-2">
                            {{ t(status.pinned ? 'upgrade.pinned' : 'upgrade.automatic') }}
                        </p>
                        <v-alert
                            v-if="status.cleanup_error"
                            type="warning"
                            variant="tonal"
                            class="mb-3"
                        >
                            {{ t('upgrade.cleanupFailed') }} {{ errorText(status.cleanup_error) }}
                        </v-alert>
                        <v-btn
                            ref="libraryTrigger"
                            variant="outlined"
                            :disabled="busy || pending || !!status.disabled"
                            class="mb-3"
                            aria-haspopup="dialog"
                            @click="openManagement('retention', null, $event)"
                        >
                            {{ t('upgrade.keep', { count: status.keep }) }}
                        </v-btn>
                        <ul class="upgrade-items">
                            <li
                                v-for="item in status.releases"
                                :key="item.id"
                                class="upgrade-item"
                            >
                                <h5 class="text-subtitle-1 font-weight-bold">
                                    {{ item.version || t('upgrade.unknownVersion') }}
                                </h5>
                                <p class="text-body-2 upgrade-identifier">
                                    {{ item.commit || item.id }}
                                </p>
                                <div class="d-flex flex-wrap ga-2 my-2">
                                    <v-chip
                                        v-if="item.current"
                                        size="small"
                                    >
                                        {{ t('upgrade.inUse') }}
                                    </v-chip>
                                    <v-chip
                                        v-if="item.builtin"
                                        size="small"
                                    >
                                        {{ t('upgrade.builtin') }}
                                    </v-chip>
                                    <v-chip
                                        v-if="item.protected"
                                        size="small"
                                    >
                                        {{ t('upgrade.protected') }}
                                    </v-chip>
                                    <span
                                        v-if="item.size"
                                        class="text-body-2"
                                    >{{ t('upgrade.installedSize', { size: Math.ceil(item.size / 1024 / 1024) }) }}</span>
                                </div>
                                <p
                                    v-if="item.incompatible"
                                    class="text-body-2 mb-2"
                                >
                                    {{ errorText(item.incompatible) }}
                                </p>
                                <div class="d-flex flex-wrap ga-2">
                                    <v-btn
                                        v-if="!item.current"
                                        variant="outlined"
                                        :disabled="!item.can_activate || busy || pending || !!status.disabled"
                                        :aria-label="t('upgrade.useVersion', { version: item.version || item.id })"
                                        aria-haspopup="dialog"
                                        @click="openManagement('activate', item, $event)"
                                    >
                                        {{ t('upgrade.use') }}
                                    </v-btn>
                                    <v-btn
                                        v-if="!item.builtin"
                                        variant="outlined"
                                        color="error"
                                        :disabled="!item.can_delete || busy || pending || !!status.disabled"
                                        :aria-label="t('upgrade.deleteVersion', { version: item.version || item.id })"
                                        aria-haspopup="dialog"
                                        @click="openManagement('delete', item, $event)"
                                    >
                                        {{ t('upgrade.delete') }}
                                    </v-btn>
                                </div>
                            </li>
                        </ul>
                        <h4 class="text-h6 mt-5 mb-2">
                            {{ t('upgrade.backups') }}
                        </h4>
                        <p class="text-body-2 mb-3">
                            {{ t('upgrade.databaseRule') }}
                        </p>
                        <p v-if="!status.backups?.length">
                            {{ t('upgrade.noBackups') }}
                        </p>
                        <ul
                            v-else
                            class="upgrade-items"
                        >
                            <li
                                v-for="item in status.backups"
                                :key="item.id"
                                class="upgrade-item"
                            >
                                <p class="font-weight-bold">
                                    {{ item.source?.version || t('upgrade.legacyBackup') }} → {{ item.target?.version || '—' }}
                                </p>
                                <p class="text-body-2">
                                    {{ formatDate(item.created_at) }} · {{ t('upgrade.databaseCount', { count: item.databases ?? '—' }) }}
                                </p>
                                <p class="text-body-2 upgrade-identifier">
                                    {{ item.id }}
                                </p>
                                <p
                                    v-if="item.database"
                                    class="text-body-2 upgrade-identifier"
                                >
                                    {{ t('upgrade.databaseFingerprint') }}: {{ item.database }}
                                </p>
                                <p
                                    v-if="item.legacy"
                                    class="text-body-2"
                                >
                                    {{ t('upgrade.legacyBackupHelp') }}
                                </p>
                                <v-chip
                                    v-if="item.protected"
                                    size="small"
                                    class="my-2"
                                >
                                    {{ t('upgrade.protected') }}
                                </v-chip>
                                <v-btn
                                    variant="outlined"
                                    color="error"
                                    class="mt-2"
                                    :disabled="item.protected || busy || pending || !!status.disabled"
                                    :aria-label="t('upgrade.deleteSnapshot', { id: item.id })"
                                    aria-haspopup="dialog"
                                    @click="openManagement('delete_backup', item, $event)"
                                >
                                    {{ t('upgrade.delete') }}
                                </v-btn>
                            </li>
                        </ul>
                    </section>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn @click="historyOpen = false">
                        {{ t('upgrade.closeHistory') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <v-dialog
            v-model="managementOpen"
            :transition="false"
            max-width="560"
            aria-labelledby="upgrade-management-title"
            @after-leave="restoreManagementFocus"
        >
            <v-card>
                <v-card-title
                    id="upgrade-management-title"
                    class="text-wrap"
                >
                    {{ t(`upgrade.manageTitle.${managementAction}`) }}
                </v-card-title>
                <v-card-text>
                    <p
                        v-if="managementItem"
                        class="mb-3 upgrade-identifier"
                    >
                        {{ managementItem.version || managementItem.source?.version || managementItem.id }}
                    </p>
                    <p class="mb-3">
                        {{ t(`upgrade.manageBody.${managementAction}`) }}
                    </p>
                    <v-text-field
                        v-if="managementAction === 'retention'"
                        ref="keepInput"
                        v-model="keepDraft"
                        type="number"
                        min="2"
                        max="20"
                        :label="t('upgrade.keepLabel')"
                        :hint="t('upgrade.keepHelp')"
                        persistent-hint
                        :error-messages="validKeep ? [] : [t('upgrade.error.retention')]"
                    />
                </v-card-text>
                <v-card-actions class="flex-wrap ga-2">
                    <v-spacer />
                    <v-btn @click="managementOpen = false">
                        {{ t('upgrade.cancel') }}
                    </v-btn>
                    <v-btn
                        :color="managementAction === 'activate' ? 'primary' : 'error'"
                        variant="flat"
                        :disabled="busy || pending"
                        @click="applyManagement"
                    >
                        {{ t(`upgrade.manageConfirm.${managementAction}`) }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
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
const historyOpen = ref(false);
const historyTrigger = ref(null);
const managementOpen = ref(false);
const managementAction = ref('activate');
const managementItem = ref(null);
const managementActivator = ref(null);
const libraryTrigger = ref(null);
const keepDraft = ref(3);
const keepInput = ref(null);
const notice = ref('');
const validKeep = computed(() => Number.isInteger(Number(keepDraft.value)) && Number(keepDraft.value) >= 2 && Number(keepDraft.value) <= 20);
const formatDate = value => new Date(value * 1000).toLocaleString();
const openManagement = (action, item, event) => {
    managementAction.value = action;
    managementItem.value = item;
    managementActivator.value = event.currentTarget;
    keepDraft.value = status.value.keep || 3;
    managementOpen.value = true;
};
const restoreManagementFocus = () => {
    const trigger = managementActivator.value;
    if (trigger?.isConnected && !trigger.disabled) trigger.focus();
    else libraryTrigger.value?.$el?.focus();
};
const applyManagement = async () => {
    const action = managementAction.value;
    if (action === 'retention' && !validKeep.value) {
        keepInput.value?.focus();
        return;
    }
    managementOpen.value = false;
    await command(action, { release: managementItem.value?.id, ...(action === 'retention' ? { keep: Number(keepDraft.value) } : {}) });
    await nextTick();
    if (action !== 'activate') libraryTrigger.value?.$el?.focus();
};
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
const command = async (action, values = {}) => {
    pending.value = true;
    error.value = '';
    notice.value = '';
    try {
        const rsp = await $backend('/admin/upgrade', {
            method: 'POST',
            quietMaintenance: true,
            headers: { 'Content-Type': 'application/json', 'X-Talebook-Upgrade': '1' },
            body: JSON.stringify({ action, release: status.value.candidate?.commit, ...values }),
        });
        if (rsp?.status) status.value = rsp.status;
        if (rsp?.err !== 'ok') error.value = rsp?.err || 'network';
        else if (['delete', 'delete_backup', 'retention'].includes(action)) notice.value = t(`upgrade.managed.${action}`);
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
.upgrade-library :deep(.v-btn) { max-width: 100%; height: auto; min-height: 36px; }
.upgrade-library :deep(.v-btn__content) { white-space: normal; }
.upgrade-items { list-style: none; padding: 0; display: grid; gap: 12px; }
.upgrade-item { padding: 16px; border: 1px solid rgba(var(--v-theme-on-surface), .25); border-radius: 8px; min-width: 0; }
.upgrade-identifier { overflow-wrap: anywhere; }
@media (prefers-reduced-motion: reduce) {
    :deep(.v-progress-linear__indeterminate) { animation: none !important; }
}
</style>
