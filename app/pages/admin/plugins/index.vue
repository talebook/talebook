<template>
    <v-card class="plugin-page">
        <v-card-title class="plugin-page-header d-flex align-center flex-wrap ga-2 px-4 pt-4">
            <div class="plugin-page-header__copy">
                <h1 class="text-h6">
                    {{ t('pluginManagement.title') }}
                </h1>
                <div class="text-body-2 text-medium-emphasis font-weight-regular mt-1">
                    {{ t('pluginManagement.description') }}
                </div>
            </div>
            <v-spacer />
            <v-btn
                variant="outlined"
                prepend-icon="mdi-history"
                to="/admin/plugins/runs"
            >
                {{ t('pluginManagement.runs') }}
            </v-btn>
        </v-card-title>

        <v-tabs
            v-model="activeTab"
            density="compact"
            class="px-2 mt-2 plugin-tabs"
            show-arrows
        >
            <v-tab
                v-for="tab in tabs"
                :key="tab.value"
                :value="tab.value"
            >
                {{ tab.label }}
                <v-chip
                    v-if="attentionCount(tab.value)"
                    size="x-small"
                    color="warning"
                    variant="tonal"
                    class="ml-2"
                >
                    {{ attentionCount(tab.value) }}
                </v-chip>
            </v-tab>
        </v-tabs>
        <v-divider />

        <v-card-text>
            <div class="d-flex flex-wrap ga-3 align-center mb-4">
                <v-text-field
                    v-model="search"
                    :label="t('pluginManagement.search')"
                    prepend-inner-icon="mdi-magnify"
                    density="compact"
                    variant="outlined"
                    clearable
                    hide-details
                    class="plugin-search"
                />
                <v-select
                    v-model="statusFilter"
                    :items="statusOptions"
                    item-title="title"
                    item-value="value"
                    :label="t('pluginManagement.statusFilter')"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="plugin-filter"
                />
            </div>

            <template v-if="loading">
                <v-row>
                    <v-col
                        v-for="n in 4"
                        :key="n"
                        cols="12"
                        lg="6"
                    >
                        <v-skeleton-loader type="article, actions" />
                    </v-col>
                </v-row>
            </template>
            <v-alert
                v-else-if="error"
                type="error"
                variant="tonal"
            >
                {{ t('pluginManagement.loadError') }}
                <v-btn
                    variant="text"
                    class="ml-2"
                    @click="load"
                >
                    {{ t('common.retry') }}
                </v-btn>
            </v-alert>
            <v-alert
                v-else-if="filteredPlugins.length === 0"
                type="info"
                variant="tonal"
            >
                <div class="font-weight-medium">
                    {{ tabPlugins.length ? t('pluginManagement.noResult') : t('pluginManagement.emptyCategory') }}
                </div>
                <v-btn
                    v-if="tabPlugins.length"
                    variant="text"
                    class="mt-1"
                    @click="clearFilters"
                >
                    {{ t('pluginManagement.clearFilters') }}
                </v-btn>
            </v-alert>
            <v-row v-else>
                <v-col
                    v-for="plugin in filteredPlugins"
                    :key="plugin.plugin_key"
                    cols="12"
                    lg="6"
                >
                    <v-card
                        variant="outlined"
                        class="plugin-card h-100"
                    >
                        <v-card-item>
                            <template #prepend>
                                <v-avatar
                                    color="primary"
                                    variant="tonal"
                                    size="40"
                                >
                                    <v-icon>{{ plugin.ui.icon || 'mdi-power-plug-outline' }}</v-icon>
                                </v-avatar>
                            </template>
                            <v-card-title class="text-subtitle-1">
                                {{ plugin.name }}
                            </v-card-title>
                            <v-card-subtitle>
                                {{ plugin.runtime_kind === 'builtin' ? t('pluginManagement.builtin') : plugin.runtime_kind }}
                            </v-card-subtitle>
                            <template #append>
                                <v-chip
                                    size="small"
                                    :color="statusInfo(plugin).color"
                                    variant="tonal"
                                >
                                    <v-icon
                                        start
                                        size="small"
                                    >
                                        {{ statusInfo(plugin).icon }}
                                    </v-icon>
                                    {{ statusInfo(plugin).text }}
                                </v-chip>
                            </template>
                        </v-card-item>
                        <v-card-text class="pt-1">
                            <p class="plugin-description text-body-2">
                                {{ plugin.description }}
                            </p>
                            <div class="d-flex flex-wrap ga-2 mt-3">
                                <v-chip
                                    v-for="capability in plugin.capabilities"
                                    :key="capability"
                                    size="x-small"
                                    variant="outlined"
                                >
                                    {{ capabilityLabel(capability) }}
                                </v-chip>
                            </div>
                            <div class="text-caption text-medium-emphasis mt-3">
                                {{ summary(plugin) }}
                            </div>
                        </v-card-text>
                        <v-card-actions>
                            <v-btn
                                color="primary"
                                variant="tonal"
                                @click="primaryAction(plugin)"
                            >
                                {{ primaryActionLabel(plugin) }}
                            </v-btn>
                            <v-spacer />
                            <v-btn
                                variant="text"
                                @click="openDetails(plugin)"
                            >
                                {{ t('pluginManagement.details') }}
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </v-col>
            </v-row>

            <section
                v-if="showLegado"
                ref="legadoPanel"
                class="mt-6"
                tabindex="-1"
            >
                <div class="d-flex align-center mb-2">
                    <h2 class="text-h6">
                        {{ t('pluginManagement.legadoManager') }}
                    </h2>
                    <v-spacer />
                    <v-btn
                        variant="text"
                        prepend-icon="mdi-close"
                        @click="closeLegado"
                    >
                        {{ t('common.close') }}
                    </v-btn>
                </div>
                <EmbeddedBookSources embedded />
            </section>
        </v-card-text>

        <v-dialog
            :model-value="drawerOpen"
            max-width="520"
            scrollable
            class="plugin-drawer-dialog"
            @update:model-value="updateDrawerOpen"
            @after-leave="restoreDetailFocus"
        >
            <v-card v-if="selectedPlugin">
                <div class="pa-4 d-flex align-center">
                    <div>
                        <h2 class="text-h6">
                            {{ selectedPlugin.name }}
                        </h2>
                        <div class="text-caption text-medium-emphasis">
                            {{ selectedPlugin.plugin_key }} · v{{ selectedPlugin.version }}
                        </div>
                    </div>
                    <v-spacer />
                    <v-btn
                        icon="mdi-close"
                        variant="text"
                        :aria-label="t('common.close')"
                        @click="closeDetails"
                    />
                </div>
                <v-divider />
                <div class="pa-4">
                    <p class="text-body-2">
                        {{ selectedPlugin.description }}
                    </p>
                    <h3 class="text-subtitle-1 mt-5 mb-2">
                        {{ t('pluginManagement.connection') }}
                    </h3>
                    <v-alert
                        v-if="selectedConnection"
                        :type="selectedConnection.health === 'unauthorized' ? 'error' : 'info'"
                        variant="tonal"
                        density="compact"
                    >
                        <div>{{ selectedConnection.name }} · {{ healthLabel(selectedConnection.health) }}</div>
                        <div
                            v-if="selectedConnection.health_message"
                            class="text-caption mt-1"
                        >
                            {{ selectedConnection.health_message }}
                        </div>
                    </v-alert>
                    <v-alert
                        v-else
                        type="warning"
                        variant="tonal"
                        density="compact"
                    >
                        {{ t('pluginManagement.notConfigured') }}
                    </v-alert>

                    <div class="d-flex flex-wrap ga-2 mt-3">
                        <v-btn
                            v-if="selectedPlugin.installation && !selectedConnection"
                            color="primary"
                            variant="tonal"
                            prepend-icon="mdi-connection"
                            @click="openConnectionForm"
                        >
                            {{ t('pluginManagement.createConnection') }}
                        </v-btn>
                        <v-btn
                            v-if="selectedConnection"
                            variant="outlined"
                            prepend-icon="mdi-connection"
                            :loading="actionLoading"
                            :disabled="!selectedPlugin.installation?.enabled || !selectedConnection.enabled"
                            @click="runAction(selectedConnection, 'test')"
                        >
                            {{ t('pluginManagement.testConnection') }}
                        </v-btn>
                        <v-btn
                            v-if="selectedConnection && selectedPlugin.actions.includes('preview')"
                            variant="outlined"
                            prepend-icon="mdi-eye-outline"
                            :loading="actionLoading"
                            :disabled="!selectedPlugin.installation?.enabled || !selectedConnection.enabled"
                            @click="runAction(selectedConnection, 'preview')"
                        >
                            {{ t('pluginManagement.preview') }}
                        </v-btn>
                        <v-btn
                            v-if="selectedConnection && selectedPlugin.actions.includes('run')"
                            color="primary"
                            variant="tonal"
                            prepend-icon="mdi-play-outline"
                            :loading="actionLoading"
                            :disabled="!selectedPlugin.installation?.enabled || !selectedConnection.enabled"
                            @click="runAction(selectedConnection, 'run')"
                        >
                            {{ t('pluginManagement.runNow') }}
                        </v-btn>
                        <v-btn
                            v-if="selectedPlugin.installation"
                            :color="selectedPlugin.installation.enabled ? 'warning' : 'primary'"
                            variant="text"
                            :loading="toggleLoading"
                            @click="toggleInstallation(selectedPlugin)"
                        >
                            {{ selectedPlugin.installation.enabled ? t('pluginManagement.disable') : t('pluginManagement.enable') }}
                        </v-btn>
                    </div>

                    <h3 class="text-subtitle-1 mt-6 mb-2">
                        {{ t('pluginManagement.permissions') }}
                    </h3>
                    <v-list density="compact">
                        <v-list-item
                            v-for="permission in selectedPlugin.permissions"
                            :key="permission"
                            prepend-icon="mdi-shield-check-outline"
                            :title="permission"
                        />
                    </v-list>

                    <h3 class="text-subtitle-1 mt-5 mb-2">
                        {{ t('pluginManagement.recentRuns') }}
                    </h3>
                    <v-list
                        v-if="pluginRuns(selectedPlugin).length"
                        density="compact"
                    >
                        <v-list-item
                            v-for="run in pluginRuns(selectedPlugin).slice(0, 5)"
                            :key="run.id"
                            :to="`/admin/plugins/runs/${run.id}`"
                            :title="`${actionLabel(run.action)} · ${runStatusLabel(run.status)}`"
                            :subtitle="formatDate(run.created_at)"
                        />
                    </v-list>
                    <div
                        v-else
                        class="text-body-2 text-medium-emphasis"
                    >
                        {{ t('pluginManagement.noRuns') }}
                    </div>
                </div>
            </v-card>
        </v-dialog>

        <v-dialog
            v-model="connectionDialogOpen"
            max-width="680"
            persistent
            aria-labelledby="plugin-connection-dialog-title"
            @after-leave="restoreConnectionFocus"
        >
            <v-card v-if="selectedPlugin">
                <v-card-title id="plugin-connection-dialog-title">
                    {{ t('pluginManagement.createConnectionFor', { name: selectedPlugin.name }) }}
                </v-card-title>
                <v-card-text>
                    <v-text-field
                        v-model="connectionName"
                        :label="t('pluginManagement.connectionName')"
                        variant="outlined"
                        autocomplete="off"
                    />
                    <template
                        v-for="field in credentialFields"
                        :key="field.key"
                    >
                        <v-textarea
                            v-if="field.key === 'content' || field.key === 'archive_base64'"
                            :id="credentialInputId(field.key)"
                            v-model="credentialValues[field.key]"
                            :label="field.title"
                            variant="outlined"
                            rows="5"
                            :required="field.required"
                            :error-messages="credentialFieldErrors[field.key] || []"
                            :aria-invalid="Boolean(credentialFieldErrors[field.key])"
                            autocomplete="off"
                        />
                        <v-text-field
                            v-else
                            :id="credentialInputId(field.key)"
                            v-model="credentialValues[field.key]"
                            :label="field.title"
                            variant="outlined"
                            type="password"
                            :required="field.required"
                            :error-messages="credentialFieldErrors[field.key] || []"
                            :aria-invalid="Boolean(credentialFieldErrors[field.key])"
                            autocomplete="new-password"
                        />
                    </template>
                    <v-textarea
                        id="plugin-public-config"
                        v-model="connectionConfigText"
                        :label="t('pluginManagement.publicConfigJson')"
                        :hint="t('pluginManagement.publicConfigHint')"
                        persistent-hint
                        :error-messages="connectionConfigError ? [connectionConfigError] : []"
                        :aria-invalid="Boolean(connectionConfigError)"
                        variant="outlined"
                        rows="8"
                        spellcheck="false"
                        class="connection-config-json"
                    />
                    <v-alert
                        v-if="connectionFormError"
                        ref="connectionErrorAlert"
                        type="error"
                        variant="tonal"
                        density="compact"
                        role="alert"
                        tabindex="-1"
                    >
                        {{ connectionFormError }}
                    </v-alert>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        variant="text"
                        :disabled="connectionSaving"
                        @click="connectionDialogOpen = false"
                    >
                        {{ t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        variant="tonal"
                        :loading="connectionSaving"
                        @click="savePluginConnection"
                    >
                        {{ t('common.save') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <OpdsImportDialog ref="opdsDialog" />
    </v-card>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import EmbeddedBookSources from '~/pages/admin/booksources.vue';
import OpdsImportDialog from '~/components/OpdsImportDialog.vue';
import { useMainStore } from '@/stores/main';

const { t } = useI18n();
const { $backend, $alert } = useNuxtApp();
const route = useRoute();
const router = useRouter();
const store = useMainStore();
store.setNavbar(true);

const tabs = computed(() => [
    { value: 'metadata', label: t('pluginManagement.tabMetadata') },
    { value: 'annotations', label: t('pluginManagement.tabAnnotations') },
    { value: 'reviews', label: t('pluginManagement.tabReviews') },
    { value: 'book_sources', label: t('pluginManagement.tabBookSources') },
]);
const activeTab = computed({
    get: () => tabs.value.some(tab => tab.value === route.query.tab) ? route.query.tab : 'metadata',
    set: value => router.replace({ query: { ...route.query, tab: value } }),
});
const definitions = ref([]);
const installations = ref([]);
const connections = ref([]);
const runs = ref([]);
const builtinState = ref({});
const loading = ref(true);
const error = ref(false);
const search = ref(typeof route.query.q === 'string' ? route.query.q : '');
const statusFilter = ref(typeof route.query.status === 'string' ? route.query.status : 'all');
const actionLoading = ref(false);
const toggleLoading = ref(false);
const connectionDialogOpen = ref(false);
const connectionSaving = ref(false);
const connectionName = ref('default');
const connectionConfigText = ref('{}');
const connectionFormError = ref('');
const connectionConfigError = ref('');
const credentialFieldErrors = ref({});
const credentialValues = ref({});
const connectionErrorAlert = ref(null);
const showLegado = ref(false);
const legadoPanel = ref(null);
const opdsDialog = ref(null);
const selectedPluginKey = ref(typeof route.query.plugin === 'string' ? route.query.plugin : '');
const drawerOpen = ref(false);
let filterTimer = null;
let detailTrigger = null;
let connectionTrigger = null;

const statusOptions = computed(() => [
    { title: t('pluginManagement.statusAll'), value: 'all' },
    { title: t('pluginManagement.statusAttention'), value: 'attention' },
    { title: t('pluginManagement.statusEnabled'), value: 'enabled' },
    { title: t('pluginManagement.statusDisabled'), value: 'disabled' },
]);
const catalog = computed(() => definitions.value
    .filter(item => !item.ui?.hidden)
    .map((definition) => ({
        ...definition,
        ui: definition.ui || {},
        installation: installations.value.find(item => item.plugin_key === definition.plugin_key) || null,
    })));
const tabPlugins = computed(() => catalog.value.filter(plugin => plugin.categories.includes(activeTab.value)));
const filteredPlugins = computed(() => {
    const needle = (search.value || '').trim().toLowerCase();
    return tabPlugins.value.filter((plugin) => {
        const matchesText = !needle || [plugin.name, plugin.description, ...plugin.capabilities]
            .join(' ').toLowerCase().includes(needle);
        const status = statusInfo(plugin).key;
        const matchesStatus = statusFilter.value === 'all'
            || (statusFilter.value === 'attention' && ['uninstalled', 'disabled', 'unhealthy'].includes(status))
            || status === statusFilter.value;
        return matchesText && matchesStatus;
    });
});
const selectedPlugin = computed(() => catalog.value.find(item => item.plugin_key === selectedPluginKey.value) || null);
const selectedConnection = computed(() => {
    const installationId = selectedPlugin.value?.installation?.id;
    return connections.value.find(item => item.installation_id === installationId) || null;
});
const credentialFields = computed(() => {
    const schema = selectedPlugin.value?.auth_schema || {};
    const required = new Set(schema.required || []);
    return Object.entries(schema.properties || {}).map(([key, value]) => ({
        key,
        title: value.title || key,
        required: required.has(key),
    }));
});

function statusInfo(plugin) {
    if (!plugin.installation) return { key: 'uninstalled', text: t('pluginManagement.uninstalled'), color: 'grey', icon: 'mdi-download-outline' };
    if (!plugin.installation.enabled) return { key: 'disabled', text: t('pluginManagement.disabled'), color: 'grey', icon: 'mdi-pause-circle-outline' };
    const connection = connections.value.find(item => item.installation_id === plugin.installation.id);
    if (connection?.health === 'unauthorized') return { key: 'unhealthy', text: t('pluginManagement.unauthorized'), color: 'error', icon: 'mdi-key-alert-outline' };
    if (connection?.health === 'degraded') return { key: 'unhealthy', text: t('pluginManagement.unhealthy'), color: 'warning', icon: 'mdi-alert-outline' };
    return { key: 'enabled', text: t('pluginManagement.enabled'), color: 'success', icon: 'mdi-check-circle-outline' };
}

function healthLabel(value) {
    return t(`pluginManagement.health_${value || 'unknown'}`);
}

function capabilityLabel(value) {
    const labels = {
        'metadata.lookup': t('pluginManagement.capMetadata'),
        'book_sources.browse': t('pluginManagement.capBrowse'),
        'book_sources.search': t('pluginManagement.capSearch'),
        'book_sources.acquire': t('pluginManagement.capAcquire'),
    };
    return labels[value] || value;
}

function summary(plugin) {
    const state = builtinState.value[plugin.plugin_key];
    if (state) return t('pluginManagement.sourceSummary', { configured: state.configured, enabled: state.enabled });
    const latest = pluginRuns(plugin)[0];
    return latest
        ? t('pluginManagement.lastRun', { status: runStatusLabel(latest.status), date: formatDate(latest.created_at) })
        : t('pluginManagement.neverRun');
}

function attentionCount(tab) {
    return catalog.value.filter(plugin => plugin.categories.includes(tab) && statusInfo(plugin).key !== 'enabled').length;
}

function primaryActionLabel(plugin) {
    if (!plugin.installation) return t('pluginManagement.install');
    if (!plugin.installation.enabled) return t('pluginManagement.enable');
    if (!connections.value.some(item => item.installation_id === plugin.installation.id)) return t('pluginManagement.configure');
    if (plugin.ui.manage_kind === 'opds') return t('pluginManagement.browse');
    if (plugin.ui.manage_kind === 'legado') return t('pluginManagement.manage');
    if (plugin.ui.manage_kind === 'metadata') return t('pluginManagement.configure');
    return t('pluginManagement.details');
}

async function primaryAction(plugin) {
    if (!plugin.installation) return install(plugin);
    if (!plugin.installation.enabled) return toggleInstallation(plugin);
    if (!connections.value.some(item => item.installation_id === plugin.installation.id)) {
        selectedPluginKey.value = plugin.plugin_key;
        openConnectionForm();
        return;
    }
    if (plugin.ui.manage_kind === 'opds') return opdsDialog.value?.open();
    if (plugin.ui.manage_kind === 'legado') return openLegado();
    if (plugin.ui.manage_kind === 'metadata') return navigateTo('/admin/settings#metadata');
    openDetails(plugin);
}

async function install(plugin) {
    const rsp = await $backend('/admin/plugins/install', {
        method: 'POST',
        body: JSON.stringify({ plugin_key: plugin.plugin_key }),
    });
    if (rsp.err === 'ok') await load();
    else $alert?.('error', rsp.msg || rsp.err);
}

async function toggleInstallation(plugin) {
    const enabled = !plugin.installation.enabled;
    if (!enabled && !confirm(t('pluginManagement.disableConfirm', { name: plugin.name }))) return;
    toggleLoading.value = true;
    try {
        const rsp = await $backend(`/admin/plugins/installations/${plugin.installation.id}/state`, {
            method: 'POST', body: JSON.stringify({ enabled }),
        });
        if (rsp.err === 'ok') await load();
        else $alert?.('error', rsp.msg || rsp.err);
    } finally {
        toggleLoading.value = false;
    }
}

async function runAction(connection, action) {
    actionLoading.value = true;
    try {
        const rsp = await $backend(`/admin/plugins/connections/${connection.id}/${action}`, {
            method: 'POST', body: JSON.stringify({ trigger: 'manual' }),
        });
        if (rsp.err === 'ok') {
            $alert?.('success', t('pluginManagement.actionStarted'));
            await load();
        } else $alert?.('error', rsp.msg || rsp.err);
    } finally {
        actionLoading.value = false;
    }
}

function openConnectionForm() {
    connectionTrigger = document.activeElement;
    connectionName.value = 'default';
    connectionConfigText.value = '{}';
    credentialValues.value = Object.fromEntries(credentialFields.value.map(field => [field.key, '']));
    credentialFieldErrors.value = {};
    connectionConfigError.value = '';
    connectionFormError.value = '';
    connectionDialogOpen.value = true;
}

async function savePluginConnection() {
    connectionFormError.value = '';
    connectionConfigError.value = '';
    credentialFieldErrors.value = {};
    let config;
    try {
        config = JSON.parse(connectionConfigText.value || '{}');
        if (!config || Array.isArray(config) || typeof config !== 'object') throw new Error();
    } catch {
        connectionConfigError.value = t('pluginManagement.publicConfigInvalid');
        await nextTick();
        document.getElementById('plugin-public-config')?.focus();
        return;
    }
    const credentials = Object.fromEntries(
        Object.entries(credentialValues.value).filter(([, value]) => typeof value === 'string' && value.length),
    );
    const missing = credentialFields.value.find(field => field.required && !credentials[field.key]);
    if (missing) {
        credentialFieldErrors.value = {
            [missing.key]: [t('pluginManagement.credentialRequired', { field: missing.title })],
        };
        await nextTick();
        document.getElementById(credentialInputId(missing.key))?.focus();
        return;
    }
    connectionSaving.value = true;
    try {
        const rsp = await $backend('/admin/plugins/connections', {
            method: 'POST',
            body: JSON.stringify({
                installation_id: selectedPlugin.value.installation.id,
                owner_type: 'instance',
                name: connectionName.value || 'default',
                credentials,
                config,
                scopes: selectedPlugin.value.permissions,
            }),
        });
        if (rsp.err === 'ok') {
            connectionDialogOpen.value = false;
            $alert?.('success', t('pluginManagement.connectionSaved'));
            await load();
        } else {
            connectionFormError.value = rsp.msg || rsp.err;
            await nextTick();
            connectionErrorAlert.value?.$el?.focus?.();
        }
    } finally {
        connectionSaving.value = false;
    }
}

function credentialInputId(key) {
    return `plugin-credential-${String(key).replace(/[^a-z0-9_-]/gi, '-')}`;
}

function restoreConnectionFocus() {
    connectionTrigger?.focus();
    connectionTrigger = null;
}

function pluginRuns(plugin) {
    const ids = new Set(connections.value
        .filter(item => item.installation_id === plugin.installation?.id)
        .map(item => item.id));
    return runs.value.filter(run => ids.has(run.connection_id));
}

function actionLabel(value) { return t(`pluginManagement.action_${value}`); }
function runStatusLabel(value) { return t(`pluginManagement.run_${value}`); }
function formatDate(value) { return value ? new Date(value).toLocaleString() : '—'; }

function clearFilters() {
    search.value = '';
    statusFilter.value = 'all';
}

function openDetails(plugin) {
    detailTrigger = document.activeElement;
    selectedPluginKey.value = plugin.plugin_key;
    drawerOpen.value = true;
    router.replace({ query: { ...route.query, plugin: plugin.plugin_key } });
}

function closeDetails() {
    drawerOpen.value = false;
    selectedPluginKey.value = '';
    const query = { ...route.query };
    delete query.plugin;
    router.replace({ query });
}

function updateDrawerOpen(value) {
    if (value) drawerOpen.value = true;
    else if (drawerOpen.value) closeDetails();
}

function restoreDetailFocus() {
    detailTrigger?.focus();
    detailTrigger = null;
}

async function openLegado() {
    showLegado.value = true;
    await router.replace({ query: { ...route.query, tab: 'book_sources', manage: 'legado' } });
    await nextTick();
    legadoPanel.value?.focus();
}

function closeLegado() {
    showLegado.value = false;
    const query = { ...route.query };
    delete query.manage;
    router.replace({ query });
}

async function load() {
    loading.value = true;
    error.value = false;
    try {
        const [catalogRsp, connectionRsp, runRsp] = await Promise.all([
            $backend('/admin/plugins'),
            $backend('/admin/plugins/connections'),
            $backend('/admin/plugins/runs'),
        ]);
        if ([catalogRsp, connectionRsp, runRsp].some(rsp => rsp.err !== 'ok')) throw new Error('plugin catalog failed');
        definitions.value = catalogRsp.definitions || [];
        installations.value = catalogRsp.installations || [];
        builtinState.value = catalogRsp.builtin_state || {};
        connections.value = connectionRsp.connections || [];
        runs.value = runRsp.runs || [];
        drawerOpen.value = Boolean(selectedPlugin.value);
    } catch {
        error.value = true;
    } finally {
        loading.value = false;
    }
}

watch(() => route.query.manage, value => { showLegado.value = value === 'legado'; }, { immediate: true });
watch(() => route.query.plugin, (value) => {
    selectedPluginKey.value = typeof value === 'string' ? value : '';
    drawerOpen.value = Boolean(selectedPlugin.value);
});
watch(() => route.query.q, value => {
    const next = typeof value === 'string' ? value : '';
    if (next !== search.value) search.value = next;
});
watch(() => route.query.status, value => {
    const next = typeof value === 'string' ? value : 'all';
    if (next !== statusFilter.value) statusFilter.value = next;
});
watch([search, statusFilter], () => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => {
        const query = { ...route.query };
        if (search.value) query.q = search.value;
        else delete query.q;
        if (statusFilter.value !== 'all') query.status = statusFilter.value;
        else delete query.status;
        router.replace({ query });
    }, 300);
});
onMounted(load);
onBeforeUnmount(() => clearTimeout(filterTimer));
useHead(() => ({ title: t('pluginManagement.title') }));
</script>

<style scoped>
.plugin-search { flex: 1 1 320px; max-width: 520px; }
.plugin-filter { flex: 0 1 220px; }
.plugin-page-header { white-space: normal; }
.plugin-page-header__copy { flex: 1 1 320px; min-width: 0; }
.plugin-card { display: flex; flex-direction: column; }
.plugin-card :deep(.v-card-actions) { margin-top: auto; }
.plugin-description { min-height: 2.8em; }
@media (max-width: 767px) {
    .plugin-search, .plugin-filter { max-width: none; flex-basis: 100%; }
}
:deep(.plugin-drawer-dialog .v-overlay__content) {
    height: 100%;
    max-height: 100%;
    margin: 0 0 0 auto;
}
:deep(.plugin-drawer-dialog .text-caption) { overflow-wrap: anywhere; }
</style>
