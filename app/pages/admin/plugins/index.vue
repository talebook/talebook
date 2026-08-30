<template>
    <section class="plugin-page">
        <RoutePageToolbar
            class="plugin-page-toolbar"
            :description="t('pluginManagement.managementDescription')"
        >
            <template #actions>
                <v-btn
                    variant="outlined"
                    prepend-icon="mdi-history"
                    to="/admin/plugins/runs"
                >
                    {{ t('pluginManagement.runs') }}
                </v-btn>
            </template>
        </RoutePageToolbar>

        <section class="management-panel">
            <div class="management-layout">
                <div class="management-content">
                    <div
                        class="management-summary"
                        :aria-label="t('pluginManagement.statusSummary')"
                    >
                        <span>{{ t('pluginManagement.builtinPluginCount', { count: catalog.length }) }}</span>
                        <span><i class="summary-dot summary-dot--good" />{{ t('pluginManagement.enabledPluginCount', { count: enabledCount }) }}</span>
                        <span><i class="summary-dot summary-dot--warning" />{{ t('pluginManagement.attentionPluginCount', { count: attentionCount }) }}</span>
                        <span class="management-summary__note">{{ t('pluginManagement.noInstallAction') }}</span>
                    </div>

                    <div class="management-toolbar">
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

                    <v-skeleton-loader
                        v-if="loading"
                        type="list-item-two-line@6"
                    />
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
                            {{ t('pluginManagement.noResult') }}
                        </div>
                        <v-btn
                            variant="text"
                            class="mt-1"
                            @click="clearFilters"
                        >
                            {{ t('pluginManagement.clearFilters') }}
                        </v-btn>
                    </v-alert>
                    <div v-else>
                        <section
                            v-for="group in groupedPlugins"
                            :id="`plugin-group-${group.value}`"
                            :key="group.value"
                            :data-group="group.value"
                            class="management-group"
                        >
                            <div class="management-group__heading">
                                <div class="management-group__copy">
                                    <div class="management-group__title">
                                        <h2>{{ group.label }}</h2>
                                        <span>{{ group.plugins.length }}</span>
                                    </div>
                                    <p class="management-group__description">
                                        {{ group.description }}
                                    </p>
                                </div>
                                <v-btn
                                    v-if="group.value === 'meta'"
                                    size="small"
                                    variant="text"
                                    prepend-icon="mdi-tune-variant"
                                    @click="metadataSettings?.open()"
                                >
                                    {{ t('pluginManagement.metadataBehavior') }}
                                </v-btn>
                                <v-btn
                                    v-if="group.value === 'push'"
                                    size="small"
                                    variant="text"
                                    prepend-icon="mdi-devices"
                                    @click="globalDeviceSettings?.open()"
                                >
                                    {{ t('pluginManagement.globalDevices') }}
                                </v-btn>
                            </div>
                            <div class="management-list">
                                <article
                                    v-for="plugin in group.plugins"
                                    :key="plugin.plugin_key"
                                    class="management-row"
                                    :style="{ '--plugin-accent': group.color }"
                                >
                                    <PluginBrandIcon
                                        class="management-row__icon"
                                        :brand-icon="plugin.ui.brand_icon"
                                        :icon="plugin.ui.icon"
                                    />
                                    <div class="management-row__main">
                                        <div class="management-row__title">
                                            <strong>{{ plugin.name }}</strong>
                                            <span
                                                class="management-status"
                                                :data-tone="statusInfo(plugin).key"
                                            >{{ statusInfo(plugin).text }}</span>
                                            <span
                                                v-if="plugin.ui.deprecated"
                                                class="management-status"
                                                data-tone="deprecated"
                                            >{{ t('pluginManagement.deprecated') }}</span>
                                        </div>
                                        <p>{{ plugin.description }}</p>
                                    </div>
                                    <div class="management-row__actions">
                                        <v-btn
                                            v-if="!plugin.installation?.enabled"
                                            color="primary"
                                            size="small"
                                            variant="tonal"
                                            @click="toggleInstallation(plugin)"
                                        >
                                            {{ t('pluginManagement.enable') }}
                                        </v-btn>
                                        <v-btn
                                            v-else-if="hasConfigurationUi(plugin)"
                                            size="small"
                                            variant="text"
                                            @click="openConfiguration(plugin)"
                                        >
                                            {{ configurationActionLabel(plugin) }}
                                        </v-btn>
                                        <v-btn
                                            v-else-if="canExperience(plugin)"
                                            size="small"
                                            variant="text"
                                            @click="experiencePlugin(plugin)"
                                        >
                                            {{ t('pluginManagement.experience') }}
                                        </v-btn>
                                        <v-btn
                                            size="small"
                                            variant="text"
                                            append-icon="mdi-chevron-right"
                                            @click="openDetails(plugin)"
                                        >
                                            {{ t('pluginManagement.details') }}
                                        </v-btn>
                                    </div>
                                </article>
                            </div>
                        </section>
                    </div>
                </div>
                <nav
                    v-if="groupedPlugins.length"
                    class="plugin-category-nav"
                    :aria-label="t('pluginManagement.categoryNavigation')"
                >
                    <div class="plugin-category-nav__title">
                        {{ t('pluginManagement.categoryNavigation') }}
                    </div>
                    <button
                        v-for="group in groupedPlugins"
                        :key="group.value"
                        type="button"
                        class="plugin-category-nav__item"
                        :class="{ active: activeGroupKey === group.value }"
                        :data-navkey="group.value"
                        :aria-current="activeGroupKey === group.value ? 'location' : undefined"
                        @click="scrollToPluginGroup(group.value)"
                    >
                        <span>{{ group.label }}</span>
                        <small>{{ group.plugins.length }}</small>
                    </button>
                </nav>
            </div>
        </section>

        <v-dialog
            v-model="drawerOpen"
            max-width="520"
            scrollable
            class="plugin-drawer-dialog"
            aria-labelledby="plugin-details-dialog-title"
            @after-leave="restoreDetailFocus"
        >
            <v-card v-if="selectedPlugin">
                <div class="pa-4 d-flex align-center">
                    <div>
                        <h2
                            id="plugin-details-dialog-title"
                            class="text-h6"
                        >
                            {{ selectedPlugin.name }}
                        </h2>
                        <div class="text-caption text-medium-emphasis">
                            {{ selectedPlugin.plugin_key }} · v{{ selectedPlugin.version }}
                        </div>
                    </div>
                    <v-spacer />
                    <div class="plugin-details__actions d-flex align-center ga-1">
                        <v-btn
                            v-if="selectedPlugin.installation"
                            :color="selectedPlugin.installation.enabled ? 'warning' : 'primary'"
                            size="small"
                            variant="text"
                            :loading="toggleLoading"
                            @click="toggleInstallation(selectedPlugin)"
                        >
                            {{ selectedPlugin.installation.enabled ? t('pluginManagement.disable') : t('pluginManagement.enable') }}
                        </v-btn>
                        <v-btn
                            icon="mdi-close"
                            variant="text"
                            :aria-label="t('common.close')"
                            @click="closeDetails"
                        />
                    </div>
                </div>
                <v-divider />
                <div class="pa-4">
                    <p class="text-body-2">
                        {{ selectedPlugin.description }}
                    </p>
                    <v-alert
                        v-if="selectedPlugin.ui.catalog_access === 'public_free'"
                        type="success"
                        variant="tonal"
                        density="compact"
                        class="mt-4"
                    >
                        {{ t('pluginManagement.publicFreeCatalog') }}
                    </v-alert>
                    <v-alert
                        v-else-if="selectedPlugin.ui.catalog_access === 'rights_vary'"
                        type="info"
                        variant="tonal"
                        density="compact"
                        class="mt-4"
                    >
                        {{ t('pluginManagement.rightsVaryCatalog') }}
                    </v-alert>
                    <section
                        v-if="hasServiceToggle(selectedPlugin)"
                        class="opds-service-settings mt-5"
                    >
                        <h3 class="text-subtitle-1 mb-1">
                            {{ t('pluginManagement.opdsService') }}
                        </h3>
                        <p class="text-body-2 text-medium-emphasis mb-2">
                            {{ t('pluginManagement.opdsServiceDescription') }}
                        </p>
                        <v-switch
                            :model-value="opdsServiceEnabled"
                            :label="t('pluginManagement.opdsServiceEnabled')"
                            :loading="opdsServiceSaving"
                            :disabled="opdsServiceSaving"
                            color="primary"
                            inset
                            hide-details
                            @update:model-value="saveOpdsService"
                        />
                        <v-btn
                            class="mt-2"
                            variant="text"
                            size="small"
                            prepend-icon="mdi-open-in-new"
                            to="/library/apps#opds-guide"
                        >
                            {{ t('pluginManagement.opdsServiceGuide') }}
                        </v-btn>
                    </section>
                    <h3
                        v-if="hasConfigurationUi(selectedPlugin)"
                        class="text-subtitle-1 mt-5 mb-2"
                    >
                        {{ t('pluginManagement.settings') }}
                    </h3>
                    <v-alert
                        v-if="hasConfigurationUi(selectedPlugin) && connectionHealthIsActionable(selectedConnection)"
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
                        v-else-if="pluginNeedsConfiguration(selectedPlugin) && !connectionConfigured(selectedPlugin, selectedConnection)"
                        type="warning"
                        variant="tonal"
                        density="compact"
                    >
                        {{ t('pluginManagement.notConfigured') }}
                    </v-alert>

                    <div
                        v-if="hasConfigurationUi(selectedPlugin)"
                        class="d-flex flex-wrap ga-2 mt-3"
                    >
                        <v-btn
                            v-if="selectedPlugin.ui.manage_route"
                            variant="outlined"
                            prepend-icon="mdi-open-in-new"
                            :to="selectedPlugin.ui.manage_route"
                        >
                            {{ configurationActionLabel(selectedPlugin) }}
                        </v-btn>
                        <v-btn
                            v-else-if="selectedPlugin.ui.manage_dialog"
                            variant="outlined"
                            prepend-icon="mdi-cog-outline"
                            @click="openDeclaredManager(selectedPlugin)"
                        >
                            {{ configurationActionLabel(selectedPlugin) }}
                        </v-btn>
                        <v-btn
                            v-if="pluginNeedsConfiguration(selectedPlugin)"
                            variant="outlined"
                            prepend-icon="mdi-cog-outline"
                            @click="openConnectionForm"
                        >
                            {{ configurationActionLabel(selectedPlugin) }}
                        </v-btn>
                    </div>

                    <v-form
                        v-if="connectionFormOpen"
                        class="connection-form mt-4"
                        @submit.prevent="saveConnection"
                    >
                        <template
                            v-for="field in configFields"
                            :key="`config-${field.key}`"
                        >
                            <v-checkbox
                                v-if="field.schema.type === 'boolean'"
                                v-model="connectionConfig[field.key]"
                                :label="connectionFieldLabel(field.key)"
                                density="compact"
                                hide-details
                            />
                            <v-text-field
                                v-else
                                v-model="connectionConfig[field.key]"
                                :label="connectionFieldLabel(field.key)"
                                :required="field.required"
                                :name="field.key"
                                :type="field.schema.format === 'uri' ? 'url' : 'text'"
                                density="compact"
                                variant="outlined"
                            />
                        </template>
                        <v-text-field
                            v-for="field in credentialFields"
                            :key="`credential-${field.key}`"
                            v-model="connectionCredentials[field.key]"
                            :label="connectionFieldLabel(field.key)"
                            :required="field.required && !selectedConnection?.secret?.configured"
                            :name="field.key"
                            :type="credentialType(field.key)"
                            :autocomplete="credentialAutocomplete(field.key)"
                            spellcheck="false"
                            density="compact"
                            variant="outlined"
                        />
                        <div class="d-flex ga-2">
                            <v-btn
                                color="primary"
                                type="submit"
                                :loading="connectionSaving"
                            >
                                {{ t('common.save') }}
                            </v-btn>
                            <v-btn
                                variant="text"
                                @click="connectionFormOpen = false"
                            >
                                {{ t('common.cancel') }}
                            </v-btn>
                        </div>
                    </v-form>

                    <PluginCapabilityTester :plugin="selectedPlugin" />

                    <v-expansion-panels
                        class="plugin-permissions mt-5"
                        variant="accordion"
                    >
                        <v-expansion-panel>
                            <v-expansion-panel-title>
                                {{ t('pluginManagement.permissions') }}
                            </v-expansion-panel-title>
                            <v-expansion-panel-text>
                                <v-list density="compact">
                                    <v-list-item
                                        v-for="permission in selectedPlugin.permissions"
                                        :key="permission"
                                        prepend-icon="mdi-shield-check-outline"
                                        :title="permission"
                                    />
                                </v-list>
                            </v-expansion-panel-text>
                        </v-expansion-panel>
                    </v-expansion-panels>

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

        <OpdsImportDialog ref="opdsDialog" />
        <MetadataAutomationSettings ref="metadataSettings" />
        <GlobalDeviceSettings
            ref="globalDeviceSettings"
            :available-types="availablePushTypes"
        />
    </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import GlobalDeviceSettings from '~/components/GlobalDeviceSettings.vue';
import MetadataAutomationSettings from '~/components/MetadataAutomationSettings.vue';
import OpdsImportDialog from '~/components/OpdsImportDialog.vue';
import PluginCapabilityTester from '~/components/PluginCapabilityTester.vue';
import RoutePageToolbar from '@/components/RoutePageToolbar.vue';
import { useMainStore } from '@/stores/main';

const { t } = useI18n();
const { $backend, $alert } = useNuxtApp();
const route = useRoute();
const router = useRouter();
const store = useMainStore();
store.setNavbar(true);

const groupDefinitions = computed(() => ({
    combo: {
        value: 'combo',
        label: t('pluginManagement.tabIntegrations'),
        description: t('pluginManagement.categoryDescriptionIntegrations'),
        color: '#5271c8',
        order: 1,
    },
    meta: {
        value: 'meta',
        label: t('pluginManagement.tabMetadata'),
        description: t('pluginManagement.categoryDescriptionMetadata'),
        color: '#347f76',
        order: 2,
    },
    annotation: {
        value: 'annotation',
        label: t('pluginManagement.tabAnnotations'),
        description: t('pluginManagement.categoryDescriptionAnnotations'),
        color: '#a45c83',
        order: 3,
    },
    review: {
        value: 'review',
        label: t('pluginManagement.tabReviews'),
        description: t('pluginManagement.categoryDescriptionReviews'),
        color: '#8a66a8',
        order: 4,
    },
    source: {
        value: 'source',
        label: t('pluginManagement.tabBookSources'),
        description: t('pluginManagement.categoryDescriptionBookSources'),
        color: '#47719d',
        order: 5,
    },
    tool: {
        value: 'tool',
        label: t('pluginManagement.tabTools'),
        description: t('pluginManagement.categoryDescriptionTools'),
        color: '#9a6a35',
        order: 6,
    },
    push: {
        value: 'push',
        label: t('pluginManagement.tabPush'),
        description: t('pluginManagement.categoryDescriptionPush'),
        color: '#687384',
        order: 7,
    },
}));
const definitions = ref([]);
const installations = ref([]);
const connections = ref([]);
const runs = ref([]);
const builtinState = ref({});
const loading = ref(true);
const error = ref(false);
const search = ref(typeof route.query.q === 'string' ? route.query.q : '');
const statusFilter = ref(typeof route.query.status === 'string' ? route.query.status : 'all');
const toggleLoading = ref(false);
const opdsServiceSaving = ref(false);
const connectionSaving = ref(false);
const connectionFormOpen = ref(false);
const connectionConfig = ref({});
const connectionCredentials = ref({});
const opdsDialog = ref(null);
const metadataSettings = ref(null);
const globalDeviceSettings = ref(null);
const selectedPluginKey = ref(typeof route.query.plugin === 'string' ? route.query.plugin : '');
const activeGroupKey = ref('');
let filterTimer = null;
let groupScrollRaf = 0;
let groupNavigationLocked = false;
let groupNavigationLockTimer = null;
let detailTrigger = null;

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
function pluginType(plugin) {
    const parts = String(plugin?.plugin_key || '').split('.');
    return parts[0] === 'talebook' ? parts[1] || '' : '';
}

const filteredPlugins = computed(() => {
    const needle = (search.value || '').trim().toLowerCase();
    return catalog.value.filter((plugin) => {
        const matchesText = !needle || [plugin.name, plugin.description, ...plugin.capabilities]
            .join(' ').toLowerCase().includes(needle);
        const status = statusInfo(plugin).key;
        const matchesStatus = statusFilter.value === 'all'
            || (statusFilter.value === 'attention' && ['uninstalled', 'unconfigured', 'disabled', 'unhealthy'].includes(status))
            || status === statusFilter.value;
        return matchesText && matchesStatus;
    });
});
const groupedPlugins = computed(() => {
    const groups = new Map();
    for (const plugin of filteredPlugins.value) {
        const type = pluginType(plugin);
        const definition = groupDefinitions.value[type]
            || { value: type || 'other', label: type || 'Other', color: '#687384', order: 99 };
        if (!groups.has(definition.value)) groups.set(definition.value, { ...definition, plugins: [] });
        groups.get(definition.value).plugins.push(plugin);
    }
    return [...groups.values()].sort((left, right) => left.order - right.order);
});
const enabledCount = computed(() => catalog.value.filter(plugin => plugin.installation?.enabled).length);
const attentionCount = computed(() => catalog.value.filter(plugin => statusInfo(plugin).key !== 'enabled').length);
const availablePushTypes = computed(() => catalog.value
    .filter(plugin => pluginType(plugin) === 'push' && plugin.installation?.enabled && plugin.ui.device_type)
    .map(plugin => ({
        name: plugin.name,
        value: plugin.ui.device_type,
        defaultPort: Number(plugin.ui.default_port || 12121),
    })));
const selectedPlugin = computed(() => catalog.value.find(item => item.plugin_key === selectedPluginKey.value) || null);
const drawerOpen = computed({
    get: () => Boolean(selectedPlugin.value),
    set: value => { if (!value) closeDetails(); },
});
const selectedConnection = computed(() => {
    const installationId = selectedPlugin.value?.installation?.id;
    return connections.value.find(item => item.installation_id === installationId) || null;
});
const configFields = computed(() => schemaFields(selectedPlugin.value?.config_schema));
const credentialFields = computed(() => schemaFields(selectedPlugin.value?.auth_schema));
function hasServiceToggle(plugin) {
    return plugin?.ui?.service_toggle === 'opds';
}
const opdsServiceEnabled = computed(() => Boolean(
    builtinState.value[selectedPlugin.value?.plugin_key]?.service_enabled
));

function connectionFor(plugin) {
    return connections.value.find(item => item.installation_id === plugin.installation?.id) || null;
}

function supportsInstanceConnection(plugin) {
    return (plugin?.connection_owners || []).includes('instance');
}

function configurationActionLabel(plugin) {
    return supportsInstanceConnection(plugin)
        ? t('pluginManagement.globalConfiguration')
        : t('pluginManagement.personalSettings');
}

function pluginNeedsConfiguration(plugin) {
    return supportsInstanceConnection(plugin) && plugin?.ui?.configuration_mode === 'form';
}

function hasConfigurationUi(plugin) {
    return Boolean(plugin?.ui?.manage_route || plugin?.ui?.manage_dialog) || pluginNeedsConfiguration(plugin);
}

function canExperience(plugin) {
    return plugin?.ui?.primary_action === 'preview'
        && supportsInstanceConnection(plugin)
        && (plugin?.capabilities || []).some(capability => [
            'metadata.lookup',
            'book_sources.search',
            'reviews.lookup',
        ].includes(capability));
}

function connectionConfigured(plugin, connection) {
    if (!connection) return false;
    const requiredConfig = plugin.config_schema?.required || [];
    if (requiredConfig.some(key => connection.config?.[key] === undefined || connection.config?.[key] === '')) return false;
    const requiredCredentials = plugin.auth_schema?.required || [];
    if (requiredCredentials.length && !connection.secret?.configured) return false;
    return true;
}

function statusInfo(plugin) {
    if (!plugin.installation) return { key: 'uninstalled', text: t('pluginManagement.uninstalled'), color: 'grey', icon: 'mdi-download-outline' };
    if (!plugin.installation.enabled) return { key: 'disabled', text: t('pluginManagement.disabled'), color: 'grey', icon: 'mdi-pause-circle-outline' };
    const connection = connectionFor(plugin);
    const selfReported = builtinState.value[plugin.plugin_key];
    if (pluginNeedsConfiguration(plugin) && !selfReported && !connectionConfigured(plugin, connection)) {
        return { key: 'unconfigured', text: t('pluginManagement.unconfigured'), color: 'warning', icon: 'mdi-cog-outline' };
    }
    if (connection?.health === 'unauthorized') return { key: 'unhealthy', text: t('pluginManagement.unauthorized'), color: 'error', icon: 'mdi-key-alert-outline' };
    if (connection?.health === 'degraded') return { key: 'unhealthy', text: t('pluginManagement.unhealthy'), color: 'warning', icon: 'mdi-alert-outline' };
    return { key: 'enabled', text: t('pluginManagement.enabled'), color: 'green-darken-3', icon: 'mdi-check-circle-outline' };
}

function healthLabel(value) {
    return t(`pluginManagement.health_${value}`);
}

function connectionHealthIsActionable(connection) {
    return connection && ['unauthorized', 'degraded'].includes(connection.health);
}

// 插件自己声明管理入口，前端不再按 plugin_key 写专属分支。
const MANAGE_DIALOGS = {
    opds: () => opdsDialog.value?.open(),
};

function openDeclaredManager(plugin) {
    MANAGE_DIALOGS[plugin.ui.manage_dialog]?.();
}

async function openConfiguration(plugin) {
    if (plugin.ui.manage_route) {
        await navigateTo(plugin.ui.manage_route);
        return;
    }
    if (plugin.ui.manage_dialog) {
        openDeclaredManager(plugin);
        return;
    }
    if (pluginNeedsConfiguration(plugin)) {
        openDetails(plugin);
        await nextTick();
        openConnectionForm();
        return;
    }
    openDetails(plugin);
}

function experiencePlugin(plugin) {
    openDetails(plugin);
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

async function saveOpdsService(enabled) {
    opdsServiceSaving.value = true;
    try {
        const rsp = await $backend('/admin/plugins/opds-service', {
            method: 'POST', body: JSON.stringify({ enabled }),
        });
        if (rsp.err === 'ok') {
            const key = selectedPlugin.value?.plugin_key;
            builtinState.value = {
                ...builtinState.value,
                [key]: { ...builtinState.value[key], service_enabled: rsp.enabled },
            };
            $alert?.('success', t('pluginManagement.opdsServiceSaved'));
        } else $alert?.('error', rsp.msg || rsp.err);
    } finally {
        opdsServiceSaving.value = false;
    }
}

function schemaFields(schema) {
    const required = new Set(schema?.required || []);
    return Object.entries(schema?.properties || {}).map(([key, value]) => ({ key, schema: value, required: required.has(key) }));
}

function connectionFieldLabel(key) {
    const translationKey = `pluginManagement.field_${key}`;
    const translated = t(translationKey);
    return translated === translationKey ? key : translated;
}

function credentialAutocomplete(key) {
    if (key === 'username') return 'username';
    if (key === 'password') return 'current-password';
    return 'off';
}

function credentialType(key) {
    return key === 'username' ? 'text' : 'password';
}

function openConnectionForm() {
    const existing = selectedConnection.value;
    const config = {};
    for (const field of configFields.value) {
        const value = existing?.config?.[field.key] ?? field.schema.default ?? (field.schema.type === 'boolean' ? false : '');
        config[field.key] = Array.isArray(value) ? value.join(', ') : value;
    }
    connectionConfig.value = config;
    connectionCredentials.value = Object.fromEntries(credentialFields.value.map(field => [field.key, '']));
    connectionFormOpen.value = true;
}

async function saveConnection() {
    connectionSaving.value = true;
    try {
        const config = {};
        for (const field of configFields.value) {
            const value = connectionConfig.value[field.key];
            config[field.key] = field.schema.type === 'array'
                ? String(value || '').split(',').map(item => item.trim()).filter(Boolean)
                : value;
        }
        const credentials = Object.fromEntries(Object.entries(connectionCredentials.value).filter(([, value]) => value));
        const rsp = await $backend('/admin/plugins/connections', {
            method: 'POST',
            body: JSON.stringify({
                installation_id: selectedPlugin.value.installation.id,
                name: selectedConnection.value?.name || selectedPlugin.value.name,
                role: selectedConnection.value?.role || 'default',
                config,
                credentials: Object.keys(credentials).length ? credentials : undefined,
            }),
        });
        if (rsp.err === 'ok') {
            connectionFormOpen.value = false;
            $alert?.('success', t('pluginManagement.connectionSaved'));
            await load();
        } else $alert?.('error', rsp.msg || rsp.err);
    } finally {
        connectionSaving.value = false;
    }
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

function computeActivePluginGroup() {
    if (!import.meta.client || groupNavigationLocked) return;
    const groups = groupedPlugins.value;
    if (!groups.length) {
        activeGroupKey.value = '';
        return;
    }
    const navigation = document.querySelector('.plugin-category-nav');
    const activationTop = (navigation ? Number.parseFloat(getComputedStyle(navigation).top) : 108) + 24;
    let current = groups[0].value;
    for (const group of groups) {
        const element = document.getElementById(`plugin-group-${group.value}`);
        if (element?.getBoundingClientRect().top <= activationTop) current = group.value;
        else break;
    }
    activeGroupKey.value = current;
}

function onPluginPageScroll() {
    if (groupScrollRaf || groupNavigationLocked) return;
    groupScrollRaf = requestAnimationFrame(() => {
        groupScrollRaf = 0;
        computeActivePluginGroup();
    });
}

function scrollToPluginGroup(key) {
    if (!import.meta.client || !key) return;
    activeGroupKey.value = key;
    groupNavigationLocked = true;
    clearTimeout(groupNavigationLockTimer);
    groupNavigationLockTimer = setTimeout(() => {
        groupNavigationLocked = false;
        computeActivePluginGroup();
    }, 700);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(`plugin-group-${key}`)?.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
    });
}

function openDetails(plugin) {
    detailTrigger = document.activeElement;
    selectedPluginKey.value = plugin.plugin_key;
    router.replace({ query: { ...route.query, plugin: plugin.plugin_key } });
}

function closeDetails() {
    connectionFormOpen.value = false;
    selectedPluginKey.value = '';
    const query = { ...route.query };
    delete query.plugin;
    router.replace({ query });
}

function restoreDetailFocus() {
    detailTrigger?.focus();
    detailTrigger = null;
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
    } catch {
        error.value = true;
    } finally {
        loading.value = false;
    }
}

watch(() => route.query.plugin, value => { selectedPluginKey.value = typeof value === 'string' ? value : ''; });
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
watch(groupedPlugins, (groups) => {
    if (!groups.some(group => group.value === activeGroupKey.value)) {
        activeGroupKey.value = groups[0]?.value || '';
    }
    nextTick(computeActivePluginGroup);
}, { immediate: true });
onMounted(() => {
    load();
    window.addEventListener('scroll', onPluginPageScroll, { passive: true });
});
onBeforeUnmount(() => {
    clearTimeout(filterTimer);
    clearTimeout(groupNavigationLockTimer);
    if (groupScrollRaf) cancelAnimationFrame(groupScrollRaf);
    window.removeEventListener('scroll', onPluginPageScroll);
});
useHead(() => ({ title: t('pluginManagement.title') }));
</script>

<style scoped>
.plugin-page { --management-line:rgba(var(--v-theme-on-surface),.13); --plugin-sticky-top:calc(var(--v-layout-top, 92px) + 16px); }
.management-panel { padding-top:0; }
.management-layout { display:flex; align-items:flex-start; }
.management-content { flex:1 1 auto; min-width:0; padding-inline-end:24px; border-inline-end:1px solid var(--management-line); }
.plugin-category-nav { position:sticky; top:var(--plugin-sticky-top); flex:0 0 172px; width:172px; max-height:calc(100vh - var(--plugin-sticky-top) - 32px); overflow-y:auto; padding-inline-start:24px; }
.plugin-category-nav__title { margin:0 10px 8px; padding:0 0 6px; border-bottom:1px solid var(--management-line); color:rgba(var(--v-theme-on-surface),.72); font-size:12px; font-weight:800; letter-spacing:.04em; }
.plugin-category-nav__item { display:flex; align-items:center; justify-content:space-between; width:100%; margin:0 0 1px; padding:5px 10px; border:0; border-radius:6px; background:transparent; color:inherit; font:inherit; font-size:13px; line-height:1.4; text-align:start; cursor:pointer; transition:background-color .15s ease,color .15s ease; }
.plugin-category-nav__item:hover { background:rgba(var(--v-theme-on-surface),.06); }
.plugin-category-nav__item.active { background:rgba(var(--v-theme-primary),.12); color:rgb(var(--v-theme-primary)); font-weight:600; }
.plugin-category-nav__item small { color:currentColor; font-size:12px; opacity:.72; }
.management-summary { display:flex; align-items:center; flex-wrap:wrap; gap:8px 22px; min-height:44px; padding:10px 14px; border:1px solid var(--management-line); border-radius:9px; background:rgba(var(--v-theme-on-surface),.025); color:rgba(var(--v-theme-on-surface),.7); font-size:12px; }
.management-summary span { display:inline-flex; align-items:center; gap:7px; }
.management-summary__note { margin-inline-start:auto; color:rgba(var(--v-theme-on-surface),.62); }
.summary-dot { width:7px; height:7px; border-radius:50%; background:currentColor; }
.summary-dot--good { color:#2d8b62; }
.summary-dot--warning { color:#c07a14; }
.management-toolbar { display:flex; align-items:center; gap:12px; margin:18px 0 28px; }
.plugin-search { flex:1 1 320px; max-width:520px; }
.plugin-filter { flex:0 1 220px; }
.management-group { scroll-margin-top:var(--plugin-sticky-top); margin-bottom:30px; }
.management-group__heading { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; padding:0 4px 10px; border-bottom:1px solid var(--management-line); }
.management-group__copy { min-width:0; }
.management-group__title { display:flex; align-items:center; gap:8px; }
.management-group__heading h2 { margin:0; font-size:13px; font-weight:700; letter-spacing:.01em; }
.management-group__title > span { color:rgba(var(--v-theme-on-surface),.62); font:12px ui-monospace,SFMono-Regular,Consolas,monospace; }
.management-group__description { max-width:760px; margin:4px 0 0; color:rgba(var(--v-theme-on-surface),.6); font-size:12px; line-height:1.55; text-wrap:pretty; }
.management-list { border-bottom:1px solid var(--management-line); }
.management-row { position:relative; display:grid; grid-template-columns:30px minmax(0,1fr) auto; gap:12px; align-items:center; min-height:72px; padding:9px 8px 9px 13px; border-bottom:1px solid var(--management-line); }
.management-row:last-child { border-bottom:0; }
.management-row::before { content:""; position:absolute; inset:12px auto 12px 0; width:3px; border-radius:2px; background:var(--plugin-accent); }
.management-row__icon { color:var(--plugin-accent); }
.management-row__main { min-width:0; }
.management-row__title { display:flex; align-items:center; flex-wrap:wrap; gap:10px; }
.management-row__title strong { font-size:15px; }
.management-row__main p { margin:2px 0 0; color:rgba(var(--v-theme-on-surface),.64); font-size:13px; line-height:1.4; }
.management-row__actions { display:flex; align-items:center; justify-content:flex-end; gap:2px; }
.management-status { display:inline-flex; align-items:center; min-height:20px; padding:2px 7px; border-radius:5px; font-size:12px; font-weight:650; line-height:1; white-space:nowrap; }
.management-status[data-tone="enabled"],
.management-status[data-tone="unconfigured"],
.management-status[data-tone="unhealthy"],
.management-status[data-tone="deprecated"] { color:rgba(var(--v-theme-on-surface),.78); }
.management-status[data-tone="enabled"] { background:rgba(45,139,98,.11); }
.management-status[data-tone="unconfigured"] { background:rgba(192,122,20,.13); }
.management-status[data-tone="unhealthy"] { background:rgba(190,55,55,.12); }
.management-status[data-tone="deprecated"] { background:rgba(151,111,48,.12); }
.management-status[data-tone="disabled"],.management-status[data-tone="uninstalled"] { color:rgba(var(--v-theme-on-surface),.62); background:rgba(var(--v-theme-on-surface),.06); }
.plugin-permissions :deep(.v-expansion-panel) { border:1px solid rgba(var(--v-theme-on-surface),.11); border-radius:7px!important; background:transparent; box-shadow:none!important; }
.plugin-permissions :deep(.v-expansion-panel-title) { min-height:40px; padding:0 12px; color:rgba(var(--v-theme-on-surface),.62); font-size:13px; font-weight:500; }
.plugin-permissions :deep(.v-expansion-panel-text__wrapper) { padding:0 4px 8px; }
@media (max-width:960px) {
    .plugin-category-nav { display:none; }
    .management-content { padding-inline-end:0; border-inline-end:0; }
}
@media (max-width:700px) {
    .management-toolbar { align-items:stretch; flex-direction:column; }
    .plugin-search,.plugin-filter { width:100%; max-width:none; flex:none; }
    .management-summary__note { width:100%; margin-inline-start:0; }
    .management-group__heading { flex-direction:column; gap:4px; }
    .management-row { grid-template-columns:26px minmax(0,1fr); }
    .management-row__actions { grid-column:2; justify-content:flex-start; }
}
:deep(.plugin-drawer-dialog .v-overlay__content) {
    height: 100%;
    max-height: 100%;
    margin: 0 0 0 auto;
}
:deep(.plugin-drawer-dialog .v-card) {
    background: rgb(var(--v-theme-surface));
    overscroll-behavior: contain;
}
:deep(.plugin-drawer-dialog .text-caption) { overflow-wrap: anywhere; }
.connection-form { padding: 14px; border: 1px solid rgb(var(--v-theme-outline-variant)); border-radius: 10px; }
.opds-service-settings { padding:14px; border:1px solid rgb(var(--v-theme-outline-variant)); border-radius:10px; }
</style>
