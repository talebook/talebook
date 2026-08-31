<template>
    <section class="personal-plugins">
        <div class="personal-toolbar">
            <div>
                <h2
                    v-if="!embedded"
                    class="text-h6"
                >
                    {{ t('pluginManagement.personalConfiguration') }}
                </h2>
                <p
                    v-if="!embedded"
                    class="text-body-2 text-medium-emphasis"
                >
                    {{ t('pluginManagement.personalCenterDescription') }}
                </p>
            </div>
            <v-text-field
                v-model="search"
                :label="t('pluginManagement.searchPersonal')"
                prepend-inner-icon="mdi-magnify"
                density="compact"
                variant="outlined"
                clearable
                hide-details
                class="personal-search"
            />
        </div>

        <v-skeleton-loader
            v-if="loading"
            type="list-item-two-line@4"
        />
        <v-alert
            v-else-if="loadError"
            type="error"
            variant="tonal"
        >
            {{ t('pluginManagement.personalLoadError') }}
            <v-btn
                variant="text"
                class="ms-2"
                @click="load"
            >
                {{ t('common.retry') }}
            </v-btn>
        </v-alert>
        <v-alert
            v-else-if="groupedPlugins.length === 0"
            type="info"
            variant="tonal"
        >
            {{ t('pluginManagement.personalEmpty') }}
        </v-alert>
        <div v-else>
            <section
                v-for="group in groupedPlugins"
                :key="group.key"
                class="personal-group"
            >
                <div class="personal-group__heading">
                    <h3>{{ group.label }}</h3>
                    <span>{{ group.plugins.length }}</span>
                </div>
                <div class="personal-list">
                    <article
                        v-for="plugin in group.plugins"
                        :key="plugin.plugin_key"
                        class="personal-row"
                        :style="{ '--plugin-accent': group.color }"
                    >
                        <PluginBrandIcon
                            class="personal-row__icon"
                            :brand-icon="plugin.ui?.brand_icon"
                            :icon="plugin.ui?.icon"
                        />
                        <div class="personal-row__main">
                            <div class="personal-row__title">
                                <strong>{{ plugin.name }}</strong>
                                <span
                                    class="personal-status"
                                    :data-tone="personalStatus(plugin).tone"
                                >
                                    {{ personalStatus(plugin).label }}
                                </span>
                            </div>
                            <p>{{ plugin.description }}</p>
                            <div class="personal-row__meta">
                                <span>{{ t('pluginManagement.currentAccount') }}</span>
                                <span v-if="personalSummary(plugin)">
                                    {{ personalSummary(plugin) }}
                                </span>
                            </div>
                        </div>
                        <div class="personal-row__actions">
                            <v-btn
                                v-if="plugin.installation.enabled && plugin.installation.status === 'active'"
                                color="primary"
                                variant="text"
                                size="small"
                                append-icon="mdi-chevron-right"
                                @click="manage(plugin)"
                            >
                                {{ t('pluginManagement.personalSettings') }}
                            </v-btn>
                            <span
                                v-else
                                class="personal-disabled-hint"
                            >
                                {{ t('pluginManagement.disabledByAdminHint') }}
                            </span>
                        </div>
                    </article>
                </div>
            </section>
        </div>

        <v-dialog
            v-model="dialogOpen"
            max-width="640"
            persistent
            aria-labelledby="personal-plugin-dialog-title"
        >
            <v-card v-if="selectedPlugin">
                <v-card-title
                    id="personal-plugin-dialog-title"
                    class="d-flex align-center"
                >
                    <span>{{ t('pluginManagement.configurePersonalPlugin', { name: selectedPlugin.name }) }}</span>
                    <v-spacer />
                    <v-btn
                        icon="mdi-close"
                        variant="text"
                        :aria-label="t('common.close')"
                        @click="dialogOpen = false"
                    />
                </v-card-title>
                <v-card-text>
                    <p class="text-body-2 text-medium-emphasis mb-4">
                        {{ t('pluginManagement.personalSecretHint') }}
                    </p>
                    <template
                        v-for="field in configFields"
                        :key="`config-${field.key}`"
                    >
                        <v-checkbox
                            v-if="field.schema.type === 'boolean'"
                            v-model="configValues[field.key]"
                            :label="fieldLabel(field)"
                            density="compact"
                            hide-details
                        />
                        <v-textarea
                            v-else-if="field.schema.type === 'object' || field.schema.type === 'array'"
                            v-model="configValues[field.key]"
                            :label="fieldLabel(field)"
                            :required="field.required"
                            variant="outlined"
                            rows="4"
                            spellcheck="false"
                        />
                        <v-text-field
                            v-else
                            v-model="configValues[field.key]"
                            :label="fieldLabel(field)"
                            :required="field.required"
                            :type="field.schema.format === 'uri' ? 'url' : 'text'"
                            variant="outlined"
                            density="compact"
                        />
                    </template>
                    <v-text-field
                        v-for="field in credentialFields"
                        :key="`credential-${field.key}`"
                        v-model="credentialValues[field.key]"
                        :label="fieldLabel(field)"
                        :required="field.required && !selectedConnection?.secret?.configured"
                        type="password"
                        autocomplete="new-password"
                        spellcheck="false"
                        variant="outlined"
                        density="compact"
                    />
                    <v-alert
                        v-if="formError"
                        type="error"
                        variant="tonal"
                        density="compact"
                        role="alert"
                    >
                        {{ formError }}
                    </v-alert>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        variant="text"
                        :disabled="saving"
                        @click="dialogOpen = false"
                    >
                        {{ t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        variant="tonal"
                        :loading="saving"
                        @click="save"
                    >
                        {{ t('common.save') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

type Schema = {
    type?: string;
    format?: string;
    title?: string;
    default?: unknown;
    properties?: Record<string, Schema>;
    required?: string[];
};

type PluginConnection = {
    id: number;
    health: string;
    health_message?: string;
    enabled: boolean;
    config: Record<string, unknown>;
    secret?: { configured?: boolean; mask?: string };
};

type PersonalPlugin = {
    plugin_key: string;
    name: string;
    description: string;
    auth_schema?: Schema;
    config_schema?: Schema;
    categories: string[];
    ui?: { icon?: string; manage_route?: string };
    installation: { id: number; enabled: boolean; status: string };
    connections: PluginConnection[];
    latest_run?: { status?: string; created_at?: string } | null;
};

type SchemaField = { key: string; schema: Schema; required: boolean };

const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });
const embedded = computed(() => props.embedded);
const { t } = useI18n();
const { $backend, $alert } = useNuxtApp();

const plugins = ref<PersonalPlugin[]>([]);
const search = ref('');
const loading = ref(true);
const loadError = ref(false);
const dialogOpen = ref(false);
const selectedPlugin = ref<PersonalPlugin | null>(null);
const configValues = ref<Record<string, string | boolean>>({});
const credentialValues = ref<Record<string, string>>({});
const formError = ref('');
const saving = ref(false);

const groupDefinitions = computed(() => ({
    combo: { label: t('pluginManagement.tabIntegrations'), color: '#5271c8', order: 1 },
    annotation: { label: t('pluginManagement.tabAnnotations'), color: '#a45c83', order: 2 },
    review: { label: t('pluginManagement.tabReviews'), color: '#8a66a8', order: 3 },
    push: { label: t('pluginManagement.tabPush'), color: '#687384', order: 4 },
}));

const filteredPlugins = computed(() => {
    const needle = search.value.trim().toLowerCase();
    if (!needle) return plugins.value;
    return plugins.value.filter(plugin => [plugin.name, plugin.description, plugin.plugin_key]
        .join(' ').toLowerCase().includes(needle));
});

const groupedPlugins = computed(() => {
    const groups = new Map<string, { key: string; label: string; color: string; order: number; plugins: PersonalPlugin[] }>();
    for (const plugin of filteredPlugins.value) {
        const type = plugin.plugin_key.split('.')[1] || 'combo';
        const definition = groupDefinitions.value[type as keyof typeof groupDefinitions.value]
            || { label: type, color: '#687384', order: 99 };
        if (!groups.has(type)) groups.set(type, { key: type, ...definition, plugins: [] });
        groups.get(type)?.plugins.push(plugin);
    }
    return [...groups.values()].sort((left, right) => left.order - right.order);
});

const selectedConnection = computed(() => selectedPlugin.value?.connections?.[0] || null);
const configFields = computed(() => schemaFields(selectedPlugin.value?.config_schema));
const credentialFields = computed(() => schemaFields(selectedPlugin.value?.auth_schema));

function schemaFields(schema?: Schema): SchemaField[] {
    const required = new Set(schema?.required || []);
    return Object.entries(schema?.properties || {}).map(([key, field]) => ({ key, schema: field, required: required.has(key) }));
}

function personalStatus(plugin: PersonalPlugin) {
    if (!plugin.installation.enabled || plugin.installation.status !== 'active') {
        return { label: t('pluginManagement.disabledByAdmin'), tone: 'muted' };
    }
    const connection = plugin.connections?.[0];
    if (!connection) return { label: t('pluginManagement.personalUnconfigured'), tone: 'warning' };
    if (connection.health === 'unauthorized') return { label: t('pluginManagement.unauthorized'), tone: 'danger' };
    if (connection.health === 'degraded') return { label: t('pluginManagement.unhealthy'), tone: 'warning' };
    return { label: t('pluginManagement.personalConfigured'), tone: 'good' };
}

function personalSummary(plugin: PersonalPlugin) {
    const connection = plugin.connections?.[0];
    if (!plugin.installation.enabled) return t('pluginManagement.configurationRetained');
    if (!connection) return t('pluginManagement.noPersonalConnection');
    if (connection.health_message) return connection.health_message;
    if (connection.secret?.configured) return t('pluginManagement.secretSaved', { mask: connection.secret.mask || '' });
    if (connection.health && connection.health !== 'unknown') return t(`pluginManagement.health_${connection.health}`);
    return '';
}

function fieldLabel(field: SchemaField) {
    const key = `pluginManagement.field_${field.key}`;
    const translated = t(key);
    return field.schema.title || (translated === key ? field.key : translated);
}

function manage(plugin: PersonalPlugin) {
    if (plugin.ui?.manage_route) {
        navigateTo(plugin.ui.manage_route);
        return;
    }
    selectedPlugin.value = plugin;
    const connection = plugin.connections?.[0];
    configValues.value = Object.fromEntries(schemaFields(plugin.config_schema).map((field) => {
        const value = connection?.config?.[field.key] ?? field.schema.default ?? '';
        if (field.schema.type === 'object' || field.schema.type === 'array') {
            return [field.key, value === '' ? '' : JSON.stringify(value, null, 2)];
        }
        return [field.key, typeof value === 'boolean' ? value : String(value)];
    }));
    credentialValues.value = Object.fromEntries(schemaFields(plugin.auth_schema).map(field => [field.key, '']));
    formError.value = '';
    dialogOpen.value = true;
}

function parsedConfig() {
    return Object.fromEntries(configFields.value.map((field) => {
        const value = configValues.value[field.key];
        if (field.schema.type === 'object' || field.schema.type === 'array') {
            return [field.key, value === '' ? (field.schema.type === 'array' ? [] : {}) : JSON.parse(String(value))];
        }
        if (field.schema.type === 'integer' || field.schema.type === 'number') return [field.key, Number(value)];
        return [field.key, value];
    }));
}

async function save() {
    if (!selectedPlugin.value) return;
    formError.value = '';
    let config: Record<string, unknown>;
    try {
        config = parsedConfig();
    } catch {
        formError.value = t('pluginManagement.personalConfigInvalid');
        return;
    }
    const missing = credentialFields.value.find(field => field.required
        && !credentialValues.value[field.key]
        && !selectedConnection.value?.secret?.configured);
    if (missing) {
        formError.value = t('pluginManagement.credentialRequired', { field: fieldLabel(missing) });
        return;
    }
    saving.value = true;
    try {
        const credentials = Object.fromEntries(Object.entries(credentialValues.value).filter(([, value]) => value));
        const rsp = await $backend('/plugins/connections', {
            method: 'POST',
            body: JSON.stringify({
                plugin_key: selectedPlugin.value.plugin_key,
                role: 'default',
                name: selectedPlugin.value.name,
                config,
                credentials: Object.keys(credentials).length ? credentials : undefined,
            }),
        });
        if (rsp.err !== 'ok') {
            formError.value = rsp.msg || rsp.err;
            return;
        }
        dialogOpen.value = false;
        $alert?.('success', t('pluginManagement.personalConfigurationSaved'));
        await load();
    } finally {
        saving.value = false;
    }
}

async function load() {
    loading.value = true;
    loadError.value = false;
    try {
        const rsp = await $backend('/plugins');
        if (rsp.err !== 'ok') throw new Error(rsp.err);
        plugins.value = rsp.plugins || [];
    } catch {
        loadError.value = true;
    } finally {
        loading.value = false;
    }
}

onMounted(load);
</script>

<style scoped>
.personal-plugins { --personal-line: rgba(var(--v-theme-on-surface), .13); }
.personal-toolbar { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; margin-bottom:24px; }
.personal-toolbar h2,.personal-toolbar p { margin:0; }
.personal-toolbar p { margin-top:5px; }
.personal-search { width:min(380px,100%); flex:0 1 380px; }
.personal-group { margin-bottom:28px; }
.personal-group__heading { display:flex; align-items:center; justify-content:space-between; padding:0 4px 9px; border-bottom:1px solid var(--personal-line); }
.personal-group__heading h3 { margin:0; font-size:13px; font-weight:700; }
.personal-group__heading span { color:rgba(var(--v-theme-on-surface),.62); font:12px ui-monospace,SFMono-Regular,Consolas,monospace; }
.personal-list { border-bottom:1px solid var(--personal-line); }
.personal-row { position:relative; display:grid; grid-template-columns:30px minmax(0,1fr) auto; gap:14px; align-items:center; min-height:92px; padding:14px 8px 14px 13px; border-bottom:1px solid var(--personal-line); }
.personal-row:last-child { border-bottom:0; }
.personal-row::before { content:""; position:absolute; inset:18px auto 18px 0; width:3px; border-radius:2px; background:var(--plugin-accent); }
.personal-row__icon { color:var(--plugin-accent); }
.personal-row__main { min-width:0; }
.personal-row__title { display:flex; align-items:center; gap:10px; }
.personal-row__title strong { font-size:15px; }
.personal-row__main p { margin:4px 0 7px; color:rgba(var(--v-theme-on-surface),.64); font-size:13px; line-height:1.45; }
.personal-row__meta { display:flex; gap:14px; color:rgba(var(--v-theme-on-surface),.62); font-size:12px; }
.personal-row__meta span+span::before { content:"·"; margin-inline-end:14px; }
.personal-row__actions { display:flex; align-items:center; justify-content:flex-end; }
.personal-status { display:inline-flex; align-items:center; min-height:20px; padding:2px 7px; border-radius:5px; font-size:12px; font-weight:650; line-height:1; white-space:nowrap; }
.personal-status[data-tone="good"],.personal-status[data-tone="warning"],.personal-status[data-tone="danger"] { color:rgba(var(--v-theme-on-surface),.78); }
.personal-status[data-tone="good"] { background:rgba(45,139,98,.11); }
.personal-status[data-tone="warning"] { background:rgba(192,122,20,.13); }
.personal-status[data-tone="danger"] { background:rgba(190,55,55,.12); }
.personal-status[data-tone="muted"] { color:rgba(var(--v-theme-on-surface),.62); background:rgba(var(--v-theme-on-surface),.06); }
.personal-disabled-hint { color:rgba(var(--v-theme-on-surface),.62); font-size:12px; }
@media (max-width:700px) {
    .personal-toolbar { align-items:stretch; flex-direction:column; gap:14px; }
    .personal-search { width:100%; flex:none; }
    .personal-row { grid-template-columns:26px minmax(0,1fr); }
    .personal-row__actions { grid-column:2; justify-content:flex-start; }
}
</style>
