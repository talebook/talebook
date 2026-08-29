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
                        :data-status="statusInfo(plugin).key"
                    >
                        <v-card-item class="plugin-card__item">
                            <div class="plugin-card__header">
                                <v-avatar
                                    color="primary"
                                    variant="tonal"
                                    size="40"
                                >
                                    <v-icon>{{ plugin.ui.icon || 'mdi-power-plug-outline' }}</v-icon>
                                </v-avatar>
                                <div class="plugin-card__identity">
                                    <div class="plugin-card__title-row">
                                        <h3 class="text-subtitle-1 font-weight-medium">
                                            {{ plugin.name }}
                                        </h3>
                                        <v-chip
                                            class="plugin-card__status"
                                            size="x-small"
                                            :color="statusInfo(plugin).color"
                                            :variant="statusInfo(plugin).key === 'enabled' ? 'flat' : 'tonal'"
                                        >
                                            <v-icon
                                                start
                                                size="12"
                                            >
                                                {{ statusInfo(plugin).icon }}
                                            </v-icon>
                                            {{ statusInfo(plugin).text }}
                                        </v-chip>
                                    </div>
                                    <div class="plugin-card__tags">
                                        <v-chip
                                            v-for="capability in plugin.capabilities"
                                            :key="capability"
                                            size="x-small"
                                            variant="tonal"
                                        >
                                            {{ capabilityLabel(capability) }}
                                        </v-chip>
                                    </div>
                                </div>
                                <div class="plugin-card__actions">
                                    <v-btn
                                        color="primary"
                                        size="small"
                                        variant="tonal"
                                        @click="primaryAction(plugin)"
                                    >
                                        {{ primaryActionLabel(plugin) }}
                                    </v-btn>
                                </div>
                            </div>
                        </v-card-item>
                        <v-card-text class="pt-1">
                            <p class="plugin-description text-body-2">
                                {{ plugin.description }}
                            </p>
                        </v-card-text>
                        <v-card-actions class="plugin-card__footer">
                            <div
                                class="plugin-card__summary text-caption text-medium-emphasis"
                                :title="summary(plugin)"
                            >
                                {{ summary(plugin) }}
                            </div>
                            <v-spacer />
                            <v-btn
                                size="small"
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
                            to="/opds-readme"
                            target="_blank"
                            rel="noopener"
                        >
                            {{ t('pluginManagement.opdsServiceGuide') }}
                        </v-btn>
                    </section>
                    <section
                        v-if="!supportsInstanceConnection(selectedPlugin)"
                        class="personal-plugin-settings mt-5"
                    >
                        <h3 class="text-subtitle-1 mb-1">
                            {{ t('pluginManagement.personalConfiguration') }}
                        </h3>
                        <p class="text-body-2 text-medium-emphasis mb-3">
                            {{ t('pluginManagement.personalConfigurationDescription') }}
                        </p>
                        <v-btn
                            v-if="selectedPlugin.ui.manage_route"
                            color="primary"
                            variant="tonal"
                            prepend-icon="mdi-account-cog-outline"
                            :to="selectedPlugin.ui.manage_route"
                        >
                            {{ selectedPlugin.ui.manage_label_key ? t(selectedPlugin.ui.manage_label_key) : t('pluginManagement.managePersonalConfiguration') }}
                        </v-btn>
                    </section>
                    <h3
                        v-if="supportsInstanceConnection(selectedPlugin)"
                        class="text-subtitle-1 mt-5 mb-2"
                    >
                        {{ t('pluginManagement.connection') }}
                    </h3>
                    <v-alert
                        v-if="supportsInstanceConnection(selectedPlugin) && selectedConnection"
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
                        v-else-if="supportsInstanceConnection(selectedPlugin)"
                        type="warning"
                        variant="tonal"
                        density="compact"
                    >
                        {{ t('pluginManagement.notConfigured') }}
                    </v-alert>

                    <div
                        v-if="supportsInstanceConnection(selectedPlugin)"
                        class="d-flex flex-wrap ga-2 mt-3"
                    >
                        <v-btn
                            v-if="selectedPlugin.ui.manage_kind === 'book_source'"
                            variant="outlined"
                            prepend-icon="mdi-cog-outline"
                            @click="openConnectionForm"
                        >
                            {{ selectedConnection ? t('pluginManagement.editConnection') : t('pluginManagement.configureConnection') }}
                        </v-btn>
                        <v-btn
                            v-if="selectedPlugin.installation && supportsInstanceConnection(selectedPlugin) && selectedPlugin.ui.manage_kind !== 'book_source' && !selectedConnection"
                            color="primary"
                            variant="tonal"
                            prepend-icon="mdi-connection"
                            @click="openConnectionDialog"
                        >
                            {{ t('pluginManagement.createConnection') }}
                        </v-btn>
                    </div>

                    <v-form
                        v-if="connectionFormOpen"
                        class="connection-form mt-4"
                        @submit.prevent="saveConnection"
                    >
                        <v-text-field
                            v-model="connectionName"
                            :label="t('pluginManagement.connectionName')"
                            name="connection_name"
                            autocomplete="off"
                            density="compact"
                            variant="outlined"
                        />
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
                            :required="field.required && !selectedConnection"
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

                    <div class="d-flex flex-wrap ga-2 mt-3">
                        <v-btn
                            v-if="selectedConnection && selectedPlugin.actions.includes('test')"
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
                            {{ selectedPlugin.ui.manage_kind === 'book_source' ? t('pluginManagement.previewSource') : t('pluginManagement.preview') }}
                        </v-btn>
                        <v-btn
                            v-if="selectedConnection && selectedPlugin.actions.includes('run')"
                            color="primary"
                            variant="tonal"
                            :prepend-icon="selectedPlugin.ui.manage_kind === 'book_source' ? 'mdi-inbox-arrow-down-outline' : 'mdi-play-outline'"
                            :loading="actionLoading"
                            :disabled="!selectedPlugin.installation?.enabled || !selectedConnection.enabled"
                            @click="runAction(selectedConnection, 'run')"
                        >
                            {{ selectedPlugin.ui.manage_kind === 'book_source' ? t('pluginManagement.stageForReview') : t('pluginManagement.runNow') }}
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
            <v-card v-if="connectionPlugin">
                <v-card-title id="plugin-connection-dialog-title">
                    {{ t('pluginManagement.createConnectionFor', { name: connectionPlugin.name }) }}
                </v-card-title>
                <v-card-text>
                    <v-text-field
                        v-model="dialogConnectionName"
                        :label="t('pluginManagement.connectionName')"
                        variant="outlined"
                        autocomplete="off"
                    />
                    <template
                        v-for="field in dialogCredentialFields"
                        :key="field.key"
                    >
                        <v-textarea
                            v-if="field.key === 'content' || field.key === 'archive_base64'"
                            :id="credentialInputId(field.key)"
                            v-model="credentialValues[field.key]"
                            :label="field.schema.title || connectionFieldLabel(field.key)"
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
                            :label="field.schema.title || connectionFieldLabel(field.key)"
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
    { value: 'integrations', label: t('pluginManagement.tabIntegrations') },
    { value: 'metadata', label: t('pluginManagement.tabMetadata') },
    { value: 'annotations', label: t('pluginManagement.tabAnnotations') },
    { value: 'reviews', label: t('pluginManagement.tabReviews') },
    { value: 'book_sources', label: t('pluginManagement.tabBookSources') },
    { value: 'tools', label: t('pluginManagement.tabTools') },
    { value: 'push', label: t('pluginManagement.tabPush') },
]);
const PLUGIN_TYPE_TABS = Object.freeze({
    combo: 'integrations',
    meta: 'metadata',
    annotation: 'annotations',
    review: 'reviews',
    source: 'book_sources',
    tool: 'tools',
    push: 'push',
});
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
const opdsServiceSaving = ref(false);
const connectionSaving = ref(false);
const connectionFormOpen = ref(false);
const connectionName = ref('default');
const connectionConfig = ref({});
const connectionCredentials = ref({});
const connectionDialogOpen = ref(false);
const connectionPlugin = ref(null);
const dialogConnectionName = ref('default');
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
function pluginType(plugin) {
    const parts = String(plugin?.plugin_key || '').split('.');
    return parts[0] === 'talebook' ? parts[1] || '' : '';
}

function pluginTab(plugin) {
    return PLUGIN_TYPE_TABS[pluginType(plugin)] || '';
}

const tabPlugins = computed(() => catalog.value.filter(plugin => pluginTab(plugin) === activeTab.value));
const filteredPlugins = computed(() => {
    const needle = (search.value || '').trim().toLowerCase();
    return tabPlugins.value.filter((plugin) => {
        const matchesText = !needle || [plugin.name, plugin.description, ...plugin.capabilities]
            .join(' ').toLowerCase().includes(needle);
        const status = statusInfo(plugin).key;
        const matchesStatus = statusFilter.value === 'all'
            || (statusFilter.value === 'attention' && ['uninstalled', 'unconfigured', 'disabled', 'unhealthy'].includes(status))
            || status === statusFilter.value;
        return matchesText && matchesStatus;
    });
});
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
const dialogCredentialFields = computed(() => schemaFields(connectionPlugin.value?.auth_schema));
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

function statusInfo(plugin) {
    if (!plugin.installation) return { key: 'uninstalled', text: t('pluginManagement.uninstalled'), color: 'grey', icon: 'mdi-download-outline' };
    if (!plugin.installation.enabled) return { key: 'disabled', text: t('pluginManagement.disabled'), color: 'grey', icon: 'mdi-pause-circle-outline' };
    const connection = connectionFor(plugin);
    const selfReported = builtinState.value[plugin.plugin_key];
    if (!connection && supportsInstanceConnection(plugin) && plugin.ui.primary_action === 'configure' && !selfReported) {
        return { key: 'unconfigured', text: t('pluginManagement.unconfigured'), color: 'warning', icon: 'mdi-cog-outline' };
    }
    if (connection?.health === 'unauthorized') return { key: 'unhealthy', text: t('pluginManagement.unauthorized'), color: 'error', icon: 'mdi-key-alert-outline' };
    if (connection?.health === 'degraded') return { key: 'unhealthy', text: t('pluginManagement.unhealthy'), color: 'warning', icon: 'mdi-alert-outline' };
    return { key: 'enabled', text: t('pluginManagement.enabled'), color: 'green-darken-3', icon: 'mdi-check-circle-outline' };
}

function healthLabel(value) {
    return t(`pluginManagement.health_${value || 'unknown'}`);
}

function capabilityLabel(value) {
    const labels = {
        'metadata.lookup': t('pluginManagement.capMetadata'),
        'integrations.search': t('pluginManagement.capSearch'),
        'integrations.books': t('pluginManagement.capBooks'),
        'integrations.shelf': t('pluginManagement.capShelf'),
        'integrations.statistics': t('pluginManagement.capStatistics'),
        'integrations.community': t('pluginManagement.capCommunity'),
        'integrations.recommendations': t('pluginManagement.capRecommendations'),
        'annotations.import': t('pluginManagement.capAnnotationsImport'),
        'annotations.push': t('pluginManagement.capAnnotationsPush'),
        'annotations.chapter_reviews': t('pluginManagement.capChapterReviews'),
        'reviews.import': t('pluginManagement.capReviewsImport'),
        'reviews.lookup': t('pluginManagement.capReviewsLookup'),
        'book_sources.browse': t('pluginManagement.capBrowse'),
        'book_sources.search': t('pluginManagement.capSearch'),
        'book_sources.acquire': t('pluginManagement.capAcquire'),
        'integrations.tool': t('pluginManagement.capTool'),
        'integrations.push': t('pluginManagement.capPush'),
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
    return catalog.value.filter(plugin => pluginTab(plugin) === tab && statusInfo(plugin).key !== 'enabled').length;
}

// 插件自己声明管理入口，前端不再为每个插件写一条分支。
const MANAGE_DIALOGS = {
    opds: () => opdsDialog.value?.open(),
    legado: () => openLegado(),
};

function primaryActionLabel(plugin) {
    if (!plugin.installation) return t('pluginManagement.install');
    if (!plugin.installation.enabled) return t('pluginManagement.enable');
    if (plugin.ui.manage_label_key) return t(plugin.ui.manage_label_key);
    if (!connectionFor(plugin)) return t('pluginManagement.configure');
    return t('pluginManagement.details');
}

async function primaryAction(plugin) {
    if (!plugin.installation) return install(plugin);
    if (!plugin.installation.enabled) return toggleInstallation(plugin);
    if (plugin.ui.manage_route) return navigateTo(plugin.ui.manage_route);
    if (MANAGE_DIALOGS[plugin.ui.manage_dialog]) return MANAGE_DIALOGS[plugin.ui.manage_dialog]();
    if (!connectionFor(plugin)) {
        if (plugin.ui.manage_kind === 'book_source') {
            openDetails(plugin);
            await nextTick();
            openConnectionForm();
        } else openConnectionDialog(plugin);
        return;
    }
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

async function runAction(connection, action) {
    actionLoading.value = true;
    try {
        const rsp = await $backend(`/admin/plugins/connections/${connection.id}/${action}`, {
            method: 'POST', body: JSON.stringify({ trigger: 'manual' }),
        });
        if (rsp.err === 'ok') {
            $alert?.('success', t('pluginManagement.actionStarted'));
            if (action === 'test' || selectedPlugin.value?.ui.manage_kind !== 'book_source') await load();
            else navigateTo(`/admin/plugins/runs/${rsp.run.id}`);
        } else $alert?.('error', rsp.msg || rsp.err);
    } finally {
        actionLoading.value = false;
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
    connectionName.value = existing?.name || 'default';
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
                name: connectionName.value || 'default',
                config,
                credentials,
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

function openConnectionDialog(plugin = selectedPlugin.value) {
    if (!supportsInstanceConnection(plugin)) return;
    connectionTrigger = document.activeElement;
    connectionPlugin.value = plugin;
    dialogConnectionName.value = 'default';
    connectionConfigText.value = '{}';
    credentialValues.value = Object.fromEntries(dialogCredentialFields.value.map(field => [field.key, '']));
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
    const missing = dialogCredentialFields.value.find(field => field.required && !credentials[field.key]);
    if (missing) {
        credentialFieldErrors.value = {
            [missing.key]: [t('pluginManagement.credentialRequired', {
                field: missing.schema.title || connectionFieldLabel(missing.key),
            })],
        };
        await nextTick();
        document.getElementById(credentialInputId(missing.key))?.focus();
        return;
    }
    connectionSaving.value = true;
    try {
        const plugin = connectionPlugin.value;
        const rsp = await $backend('/admin/plugins/connections', {
            method: 'POST',
            body: JSON.stringify({
                installation_id: plugin.installation.id,
                owner_type: 'instance',
                name: dialogConnectionName.value || 'default',
                credentials,
                config,
                scopes: plugin.permissions,
            }),
        });
        if (rsp.err === 'ok') {
            connectionDialogOpen.value = false;
            $alert?.('success', t('pluginManagement.connectionSaved'));
            await load();
            detailTrigger = connectionTrigger;
            selectedPluginKey.value = plugin.plugin_key;
            router.replace({ query: { ...route.query, plugin: plugin.plugin_key } });
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
    connectionPlugin.value = null;
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
    } catch {
        error.value = true;
    } finally {
        loading.value = false;
    }
}

watch(() => route.query.manage, value => { showLegado.value = value === 'legado'; }, { immediate: true });
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
onMounted(load);
onBeforeUnmount(() => clearTimeout(filterTimer));
useHead(() => ({ title: t('pluginManagement.title') }));
</script>

<style scoped>
.plugin-search { flex: 1 1 320px; max-width: 520px; }
.plugin-filter { flex: 0 1 220px; }
.plugin-page-header { white-space: normal; }
.plugin-page-header__copy { flex: 1 1 320px; min-width: 0; }
.plugin-card {
    display: flex;
    flex-direction: column;
    box-shadow: 0 6px 18px rgba(var(--v-theme-on-surface), .12);
    transition: box-shadow .18s ease, transform .18s ease;
}
.plugin-card:hover {
    box-shadow: 0 10px 24px rgba(var(--v-theme-on-surface), .16);
    transform: translateY(-1px);
}
.plugin-card__header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: start;
    gap: 12px;
}
.plugin-card__identity { min-width: 0; }
.plugin-card__title-row, .plugin-card__tags, .plugin-card__actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
}
.plugin-card__title-row h3 { min-width: 0; overflow-wrap: anywhere; }
.plugin-card__status { font-size: .6875rem; letter-spacing: .01em; }
.plugin-card__tags { margin-top: 6px; }
.plugin-card__actions { justify-content: flex-end; }
.plugin-card__footer { margin-top: auto; align-items: center; flex-wrap: nowrap; }
.plugin-card__summary { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.plugin-card__footer .v-btn { flex: 0 0 auto; }
.plugin-card[data-status="enabled"] {
    border-color: rgba(var(--v-theme-success), .42);
    background-color: rgb(var(--v-theme-surface));
    background-image: linear-gradient(rgba(var(--v-theme-success), .11), rgba(var(--v-theme-success), .11));
}
.plugin-description { min-height: 2.8em; }
@media (max-width: 767px) {
    .plugin-search, .plugin-filter { max-width: none; flex-basis: 100%; }
    .plugin-card__header { grid-template-columns: auto minmax(0, 1fr); }
    .plugin-card__actions { grid-column: 1 / -1; justify-self: end; }
}
@media (prefers-reduced-motion: reduce) {
    .plugin-card { transition: none; }
    .plugin-card:hover { transform: none; }
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
.opds-service-settings, .personal-plugin-settings { padding: 14px; border: 1px solid rgb(var(--v-theme-outline-variant)); border-radius: 10px; }
</style>
