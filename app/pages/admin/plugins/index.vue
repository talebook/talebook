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
                                    class="plugin-card-avatar"
                                    color="primary"
                                    variant="tonal"
                                    size="40"
                                >
                                    <v-icon>{{ plugin.ui.icon || 'mdi-power-plug-outline' }}</v-icon>
                                </v-avatar>
                            </template>
                            <v-card-title class="plugin-card-title text-subtitle-1">
                                <span>{{ plugin.name }}</span>
                                <v-chip
                                    size="small"
                                    :color="statusInfo(plugin).color"
                                    variant="tonal"
                                >
                                    {{ statusInfo(plugin).text }}
                                </v-chip>
                            </v-card-title>
                            <v-card-subtitle class="plugin-card-tags d-flex flex-wrap ga-1 mt-1">
                                <v-chip
                                    v-for="tag in pluginTags(plugin)"
                                    :key="tag"
                                    size="x-small"
                                    variant="outlined"
                                >
                                    {{ tag }}
                                </v-chip>
                            </v-card-subtitle>
                            <template #append>
                                <div class="plugin-card-actions d-flex align-center ga-1">
                                    <v-btn
                                        color="primary"
                                        variant="tonal"
                                        size="small"
                                        :loading="primaryActionLoading === plugin.plugin_key"
                                        @click="primaryAction(plugin)"
                                    >
                                        {{ primaryActionLabel(plugin) }}
                                    </v-btn>
                                    <v-btn
                                        icon="mdi-dots-horizontal"
                                        variant="text"
                                        size="small"
                                        :aria-label="t('pluginManagement.details')"
                                        @click="openDetails(plugin)"
                                    />
                                </div>
                            </template>
                        </v-card-item>
                        <v-card-text class="pt-1">
                            <p class="plugin-description text-body-2">
                                {{ plugin.description }}
                            </p>
                            <div class="text-caption text-medium-emphasis mt-3">
                                {{ summary(plugin) }}
                            </div>
                        </v-card-text>
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
                        v-if="selectedPlugin.installation"
                        :color="selectedPlugin.installation.enabled ? 'warning' : 'primary'"
                        variant="text"
                        size="small"
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
                <v-divider />
                <div class="pa-4">
                    <p class="text-body-2">
                        {{ selectedPlugin.description }}
                    </p>
                    <section
                        v-if="selectedPlugin.ui.manage_kind === 'opds'"
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
                            v-if="selectedPlugin.ui.manage_kind === 'book_source'"
                            variant="outlined"
                            prepend-icon="mdi-cog-outline"
                            @click="openConnectionForm"
                        >
                            {{ selectedConnection ? t('pluginManagement.editConnection') : t('pluginManagement.configureConnection') }}
                        </v-btn>
                        <v-btn
                            v-if="selectedPlugin.installation && selectedPlugin.ui.manage_kind !== 'book_source' && selectedPlugin.ui.manage_kind !== 'metadata' && selectedPlugin.ui.manage_kind !== 'weread'"
                            color="primary"
                            variant="tonal"
                            prepend-icon="mdi-connection"
                            @click="openConnectionDialog(selectedPlugin)"
                        >
                            {{ selectedConnection ? t('pluginManagement.editConnection') : t('pluginManagement.createConnection') }}
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
                    <v-alert
                        v-if="connectionGuide"
                        type="info"
                        variant="tonal"
                        density="compact"
                        class="mb-4"
                    >
                        <div class="font-weight-medium">
                            {{ connectionGuide.title }}
                        </div>
                        <div class="text-body-2 mt-1">
                            {{ connectionGuide.body }}
                        </div>
                        <a
                            v-if="connectionGuide.url"
                            :href="connectionGuide.url"
                            target="_blank"
                            rel="noopener"
                            class="text-body-2 d-inline-block mt-2"
                        >{{ t('pluginManagement.viewOfficialGuide') }}</a>
                    </v-alert>
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
                            :label="dialogFieldLabel(field)"
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
                            :label="dialogFieldLabel(field)"
                            variant="outlined"
                            :type="credentialType(field.key)"
                            :required="field.required"
                            :error-messages="credentialFieldErrors[field.key] || []"
                            :aria-invalid="Boolean(credentialFieldErrors[field.key])"
                            :autocomplete="credentialAutocomplete(field.key)"
                        />
                    </template>
                    <v-divider
                        v-if="dialogConfigFields.length"
                        class="mb-4"
                    />
                    <template
                        v-for="field in dialogConfigFields"
                        :key="`dialog-config-${field.key}`"
                    >
                        <v-checkbox
                            v-if="field.schema.type === 'boolean'"
                            v-model="dialogConfigValues[field.key]"
                            :label="dialogFieldLabel(field)"
                            color="primary"
                            density="compact"
                        />
                        <v-select
                            v-else-if="field.schema.enum"
                            v-model="dialogConfigValues[field.key]"
                            :items="fieldItems(field)"
                            :label="dialogFieldLabel(field)"
                            variant="outlined"
                            density="compact"
                        />
                        <v-combobox
                            v-else-if="field.schema.type === 'array'"
                            v-model="dialogConfigValues[field.key]"
                            :items="fieldOptions(field)"
                            :label="dialogFieldLabel(field)"
                            :hint="dialogFieldHint(field)"
                            persistent-hint
                            multiple
                            chips
                            closable-chips
                            variant="outlined"
                            density="compact"
                        />
                        <v-textarea
                            v-else-if="field.schema.type === 'object'"
                            v-model="dialogConfigValues[field.key]"
                            :label="dialogFieldLabel(field)"
                            :hint="t('pluginManagement.mappingHint')"
                            persistent-hint
                            variant="outlined"
                            rows="3"
                        />
                        <v-text-field
                            v-else
                            v-model="dialogConfigValues[field.key]"
                            :label="dialogFieldLabel(field)"
                            :hint="dialogFieldHint(field)"
                            :persistent-hint="Boolean(dialogFieldHint(field))"
                            :type="['integer', 'number'].includes(field.schema.type) ? 'number' : field.schema.format === 'uri' ? 'url' : 'text'"
                            :required="field.required"
                            variant="outlined"
                        />
                    </template>
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

        <v-dialog
            v-model="metadataSearchOpen"
            max-width="720"
            scrollable
        >
            <v-card>
                <v-card-title class="d-flex align-center">
                    <span>{{ t('pluginManagement.metadataSearchTitle', { name: metadataSearchPlugin?.name || '' }) }}</span>
                    <v-spacer />
                    <v-btn
                        icon="mdi-close"
                        variant="text"
                        :aria-label="t('common.close')"
                        @click="metadataSearchOpen = false"
                    />
                </v-card-title>
                <v-divider />
                <v-card-text>
                    <v-form @submit.prevent="searchMetadataPlugin">
                        <div class="d-flex align-start ga-2">
                            <v-text-field
                                v-model="metadataKeyword"
                                :label="t('pluginManagement.metadataKeyword')"
                                :placeholder="t('pluginManagement.metadataKeywordPlaceholder')"
                                prepend-inner-icon="mdi-magnify"
                                variant="outlined"
                                density="compact"
                                autofocus
                                clearable
                                hide-details
                            />
                            <v-btn
                                color="primary"
                                type="submit"
                                :loading="metadataSearchLoading"
                                :disabled="!metadataKeyword.trim()"
                            >
                                {{ t('pluginManagement.searchAction') }}
                            </v-btn>
                        </div>
                    </v-form>
                    <v-alert
                        v-if="metadataSearchError"
                        type="error"
                        variant="tonal"
                        density="compact"
                        class="mt-4"
                    >
                        {{ metadataSearchError }}
                    </v-alert>
                    <v-alert
                        v-else-if="metadataSearchDone && metadataSearchResults.length === 0"
                        type="info"
                        variant="tonal"
                        density="compact"
                        class="mt-4"
                    >
                        {{ t('pluginManagement.metadataNoResults') }}
                    </v-alert>
                    <v-list
                        v-else-if="metadataSearchResults.length"
                        class="metadata-search-results mt-3"
                        lines="three"
                    >
                        <v-list-item
                            v-for="(book, index) in metadataSearchResults"
                            :key="`${book.title}-${index}`"
                            :title="book.title"
                            :subtitle="[book.author, book.publisher, book.source].filter(Boolean).join(' · ')"
                        >
                            <template #prepend>
                                <v-avatar
                                    rounded="sm"
                                    size="48"
                                    color="surface-variant"
                                >
                                    <v-img
                                        v-if="book.cover_url"
                                        :src="book.cover_url"
                                        cover
                                    />
                                    <v-icon v-else>
                                        mdi-book-outline
                                    </v-icon>
                                </v-avatar>
                            </template>
                        </v-list-item>
                    </v-list>
                </v-card-text>
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
const primaryActionLoading = ref('');
const metadataSearchOpen = ref(false);
const metadataSearchPlugin = ref(null);
const metadataKeyword = ref('');
const metadataSearchResults = ref([]);
const metadataSearchLoading = ref(false);
const metadataSearchError = ref('');
const metadataSearchDone = ref(false);
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
const connectionFormError = ref('');
const credentialFieldErrors = ref({});
const credentialValues = ref({});
const dialogConfigValues = ref({});
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
const tabPlugins = computed(() => catalog.value.filter(plugin => plugin.categories.includes(activeTab.value)));
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
const dialogCredentialFields = computed(() => {
    const fields = schemaFields(connectionPlugin.value?.auth_schema);
    if (connectionPlugin.value?.plugin_key !== 'talebook.annotations.brs') return fields;
    const mode = dialogConfigValues.value.account_mode || 'login';
    return fields.filter(field => mode === 'register' ? field.key !== 'password' : field.key !== 'nickname');
});
const dialogConfigFields = computed(() => schemaFields(connectionPlugin.value?.config_schema));
const connectionGuide = computed(() => {
    const key = connectionPlugin.value?.plugin_key;
    if (key === 'talebook.metadata.open-library') {
        return {
            title: t('pluginManagement.openLibraryGuideTitle'),
            body: t('pluginManagement.openLibraryGuideBody'),
            url: 'https://openlibrary.org/developers/api',
        };
    }
    if (key === 'talebook.annotations.brs') {
        return {
            title: t('pluginManagement.brsGuideTitle'),
            body: t('pluginManagement.brsGuideBody'),
            url: 'https://github.com/talebook/candle-reader',
        };
    }
    if (key?.startsWith('talebook.reviews.')) {
        return {
            title: t('pluginManagement.reviewGuideTitle'),
            body: t('pluginManagement.reviewGuideBody'),
        };
    }
    return null;
});
const opdsServiceEnabled = computed(() => Boolean(
    builtinState.value['talebook.book-source.opds']?.service_enabled
));

function connectionFor(plugin) {
    return connections.value.find(item => item.installation_id === plugin.installation?.id) || null;
}

function statusInfo(plugin) {
    if (!plugin.installation) return { key: 'uninstalled', text: t('pluginManagement.uninstalled'), color: 'grey', icon: 'mdi-download-outline' };
    if (!plugin.installation.enabled) return { key: 'disabled', text: t('pluginManagement.disabled'), color: 'grey', icon: 'mdi-pause-circle-outline' };
    const connection = connectionFor(plugin);
    if (!connection && plugin.ui.primary_action === 'configure' && plugin.ui.manage_kind !== 'metadata') {
        return { key: 'unconfigured', text: t('pluginManagement.unconfigured'), color: 'warning', icon: 'mdi-cog-outline' };
    }
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
        'integrations.search': t('pluginManagement.capSearch'),
        'integrations.books': t('pluginManagement.capBooks'),
        'integrations.shelf': t('pluginManagement.capShelf'),
        'integrations.statistics': t('pluginManagement.capStatistics'),
        'integrations.community': t('pluginManagement.capCommunity'),
        'integrations.recommendations': t('pluginManagement.capRecommendations'),
        'annotations.import': t('pluginManagement.capAnnotationsImport'),
        'annotations.chapter_reviews': t('pluginManagement.capChapterReviews'),
        'reviews.lookup': t('pluginManagement.capReviews'),
        'book_sources.browse': t('pluginManagement.capBrowse'),
        'book_sources.search': t('pluginManagement.capSearch'),
        'book_sources.acquire': t('pluginManagement.capAcquire'),
    };
    return labels[value] || value;
}

function pluginTags(plugin) {
    const categoryLabels = {
        integrations: t('pluginManagement.tagIntegration'),
        metadata: t('pluginManagement.tagMetadata'),
        annotations: t('pluginManagement.tagAnnotations'),
        reviews: t('pluginManagement.tagReviews'),
        book_sources: t('pluginManagement.tagBookSources'),
    };
    const publicSources = new Set([
        'talebook.book-source.gutenberg',
        'talebook.book-source.internet-archive',
    ]);
    return [...new Set([
        ...(publicSources.has(plugin.plugin_key) ? [t('pluginManagement.tagPublicFree')] : []),
        ...plugin.categories.map(category => categoryLabels[category] || category),
        ...plugin.capabilities.slice(0, 2).map(capabilityLabel),
    ])].slice(0, 4);
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
    const action = plugin.ui.primary_action || plugin.ui.manage_kind;
    const labels = {
        browse: 'browse',
        manage: 'manage',
        metadata: 'configure',
        configure: 'configure',
        test: 'test',
        workbench: 'openWorkbench',
        weread: 'openWorkbench',
    };
    return t(`pluginManagement.${labels[action] || 'configure'}`);
}

async function primaryAction(plugin) {
    if (!plugin.installation) return install(plugin);
    if (!plugin.installation.enabled) return toggleInstallation(plugin);
    const action = plugin.ui.primary_action || plugin.ui.manage_kind;
    if (plugin.ui.manage_kind === 'metadata_source') return openMetadataSearch(plugin);
    if (plugin.ui.manage_kind === 'metadata') return navigateTo('/admin/plugins/metadata');
    if (action === 'workbench' || plugin.ui.manage_kind === 'weread') return navigateTo('/plugins/weread');
    if (action === 'browse') return opdsDialog.value?.open();
    if (action === 'manage') return openLegado();
    if (action === 'test') return testPlugin(plugin);
    if (!connectionFor(plugin)) {
        if (plugin.ui.manage_kind === 'book_source') {
            openDetails(plugin);
            await nextTick();
            openConnectionForm();
        } else openConnectionDialog(plugin);
        return;
    }
    if (plugin.ui.manage_kind === 'book_source') openDetails(plugin);
    else openConnectionDialog(plugin);
}

function openMetadataSearch(plugin) {
    metadataSearchPlugin.value = plugin;
    metadataKeyword.value = '';
    metadataSearchResults.value = [];
    metadataSearchError.value = '';
    metadataSearchDone.value = false;
    metadataSearchOpen.value = true;
}

async function searchMetadataPlugin() {
    const keyword = metadataKeyword.value.trim();
    const source = metadataSearchPlugin.value?.ui.metadata_source;
    if (!keyword || !source) return;
    metadataSearchLoading.value = true;
    metadataSearchError.value = '';
    metadataSearchDone.value = false;
    try {
        const rsp = await $backend('/admin/plugins/metadata-search', {
            method: 'POST',
            body: JSON.stringify({ source, keyword }),
        });
        if (rsp.err !== 'ok') {
            metadataSearchError.value = rsp.msg || rsp.err;
            metadataSearchResults.value = [];
            return;
        }
        metadataSearchResults.value = (rsp.books || []).slice(0, 5);
    } catch {
        metadataSearchError.value = t('pluginManagement.metadataSearchFailed');
        metadataSearchResults.value = [];
    } finally {
        metadataSearchDone.value = true;
        metadataSearchLoading.value = false;
    }
}

async function testPlugin(plugin) {
    primaryActionLoading.value = plugin.plugin_key;
    try {
        let connection = connectionFor(plugin);
        if (!connection) {
            const rsp = await $backend('/admin/plugins/connections', {
                method: 'POST',
                body: JSON.stringify({
                    installation_id: plugin.installation.id,
                    owner_type: 'instance',
                    name: 'default',
                    credentials: {},
                    config: {},
                    scopes: plugin.permissions,
                }),
            });
            if (rsp.err !== 'ok') {
                $alert?.('error', rsp.msg || rsp.err);
                return;
            }
            connection = rsp.connection;
        }
        await runAction(connection, 'test');
    } finally {
        primaryActionLoading.value = '';
    }
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
            builtinState.value = {
                ...builtinState.value,
                'talebook.book-source.opds': {
                    ...builtinState.value['talebook.book-source.opds'],
                    service_enabled: rsp.enabled,
                },
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
    return Object.entries(schema?.properties || {})
        .filter(([, value]) => !value.ui_hidden)
        .map(([key, value]) => ({ key, schema: value, required: required.has(key) }));
}

function connectionFieldLabel(key) {
    const translationKey = `pluginManagement.field_${key}`;
    const translated = t(translationKey);
    return translated === translationKey ? key : translated;
}

function dialogFieldLabel(field) {
    if (field.key === 'queries' && connectionPlugin.value?.plugin_key === 'talebook.metadata.open-library') {
        return t('pluginManagement.fieldIsbnQueries');
    }
    if (field.key === 'endpoint' && connectionPlugin.value?.plugin_key === 'talebook.annotations.brs') {
        return t('pluginManagement.fieldBrsEndpoint');
    }
    const translated = connectionFieldLabel(field.key);
    return translated === field.key ? (field.schema.title || field.key) : translated;
}

function dialogFieldHint(field) {
    if (field.key === 'queries') {
        if (connectionPlugin.value?.plugin_key?.includes('bangumi')) return t('pluginManagement.queryDomainIdHint');
        if (connectionPlugin.value?.plugin_key?.includes('anilist')) return t('pluginManagement.queryDomainIdHint');
        return t('pluginManagement.queryIsbnHint');
    }
    if (field.key === 'formats') return t('pluginManagement.formatsHint');
    if (field.key === 'allowed_hosts') return t('pluginManagement.allowedHostsHint');
    return field.schema.description || '';
}

function fieldOptions(field) {
    if (field.key === 'formats') return ['epub', 'pdf', 'mobi', 'azw3', 'txt', 'cbz'];
    return [];
}

function fieldItems(field) {
    if (field.key === 'account_mode') {
        return [
            { title: t('pluginManagement.accountModeLogin'), value: 'login' },
            { title: t('pluginManagement.accountModeRegister'), value: 'register' },
        ];
    }
    return field.schema.enum;
}

function credentialAutocomplete(key) {
    if (key === 'email') return 'email';
    if (key === 'username') return 'username';
    if (key === 'password') return 'current-password';
    return 'off';
}

function credentialType(key) {
    return ['username', 'email', 'nickname'].includes(key) ? 'text' : 'password';
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
    connectionTrigger = document.activeElement;
    connectionPlugin.value = plugin;
    const existing = connectionFor(plugin);
    dialogConnectionName.value = existing?.name || 'default';
    dialogConfigValues.value = Object.fromEntries(schemaFields(plugin.config_schema).map((field) => {
        let value = existing?.config?.[field.key] ?? field.schema.default ?? (field.schema.type === 'array' ? [] : field.schema.type === 'boolean' ? false : '');
        if (field.key === 'queries') value = (value || []).map(query => query.isbn || query.title || query.domain_id || '').filter(Boolean);
        else if (field.schema.type === 'object') value = objectToMappingLines(value);
        return [field.key, value];
    }));
    credentialValues.value = Object.fromEntries(dialogCredentialFields.value.map(field => [field.key, '']));
    credentialFieldErrors.value = {};
    connectionFormError.value = '';
    connectionDialogOpen.value = true;
}

async function savePluginConnection() {
    connectionFormError.value = '';
    credentialFieldErrors.value = {};
    const config = serializeDialogConfig();
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

function objectToMappingLines(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
    return Object.entries(value).map(([key, item]) => `${key}=${item}`).join('\n');
}

function mappingLinesToObject(value) {
    return Object.fromEntries(String(value || '').split('\n').map((line) => {
        const index = line.indexOf('=');
        return index < 0 ? [] : [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }).filter(pair => pair.length === 2 && pair[0]));
}

function serializeDialogConfig() {
    return Object.fromEntries(dialogConfigFields.value.map((field) => {
        let value = dialogConfigValues.value[field.key];
        if (field.key === 'queries') {
            const useDomainId = ['talebook.reviews.bangumi', 'talebook.reviews.anilist'].includes(connectionPlugin.value?.plugin_key);
            value = (value || []).map(item => useDomainId ? { domain_id: String(item).trim() } : { isbn: String(item).trim() }).filter(item => Object.values(item)[0]);
        } else if (field.schema.type === 'object') value = mappingLinesToObject(value);
        else if (field.schema.type === 'array') value = (value || []).map(item => String(item).trim()).filter(Boolean);
        else if (field.schema.type === 'integer') value = value === '' ? undefined : Number.parseInt(value, 10);
        else if (field.schema.type === 'number') value = value === '' ? undefined : Number(value);
        return [field.key, value];
    }).filter(([, value]) => value !== undefined && value !== ''));
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
.plugin-card { display: flex; flex-direction: column; }
.plugin-card :deep(.v-card-item) { align-items: start; }
.plugin-card :deep(.v-card-item__append) { align-self: start; }
.plugin-card-title { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; overflow: visible; white-space: normal; }
.plugin-card-tags { opacity: 1; }
.plugin-card-actions { align-self: flex-start; }
.plugin-description { min-height: 2.8em; }
@media (max-width: 599px) {
    .plugin-search, .plugin-filter { max-width: none; flex-basis: 100%; }
    .plugin-card :deep(.v-card-item) {
        grid-template-areas: 'prepend content append';
        grid-template-columns: max-content minmax(0, 1fr) max-content;
        column-gap: 6px;
    }
    .plugin-card :deep(.v-card-item__prepend) { grid-area: prepend; align-self: start; }
    .plugin-card :deep(.v-card-item__content) { grid-area: content; min-width: 0; }
    .plugin-card :deep(.v-card-item__append) {
        grid-area: append;
        align-self: start;
        margin-inline-start: 0;
    }
    .plugin-card-avatar { width: 32px !important; height: 32px !important; font-size: 18px; }
    .plugin-card-title { flex-wrap: nowrap; gap: 4px; font-size: .82rem !important; line-height: 1.25; }
    .plugin-card-title > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .plugin-card-title :deep(.v-chip) { --v-chip-height: 22px; flex: 0 0 auto; font-size: .68rem; padding-inline: 6px; }
    .plugin-card-actions { gap: 0 !important; }
    .plugin-card-actions :deep(.v-btn) { min-width: 42px; padding-inline: 7px; font-size: .72rem; }
    .plugin-card-actions :deep(.v-btn--icon) { width: 30px; min-width: 30px; height: 30px; padding: 0; }
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
.opds-service-settings { padding: 14px; border: 1px solid rgb(var(--v-theme-outline-variant)); border-radius: 10px; }
</style>
