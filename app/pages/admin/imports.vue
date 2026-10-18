<template>
    <v-card>
        <v-card-title class="pl-4 imports-titlebar">
            <div class="imports-title">
                {{ t('admin.imports.title') }} <v-chip
                    size="small"
                    variant="elevated"
                    color="primary ml-2"
                >
                    Beta
                </v-chip>
            </div>
            <div class="imports-title-actions">
                <v-chip
                    v-if="needsSettingsAttention"
                    size="small"
                    color="warning"
                    variant="tonal"
                >
                    {{ t('admin.imports.settings.needsAttention') }}
                </v-chip>
                <v-btn
                    :disabled="settingsLoading"
                    :loading="settingsLoading"
                    variant="outlined"
                    color="primary"
                    @click="openImportSettingsDialog"
                >
                    <v-icon start>
                        mdi-cog-outline
                    </v-icon>{{ t('admin.imports.button.importSettings') }}
                </v-btn>
            </div>
        </v-card-title>
        <v-card-text class="imports-summary">
            <div class="summary-row">
                <v-chip
                    size="small"
                    variant="tonal"
                >
                    {{ t('admin.imports.settings.directory') }}：<span class="summary-path">{{ allowed_roots.join('、') || scan_dir }}</span>
                </v-chip>
                <v-chip
                    size="small"
                    variant="tonal"
                >
                    {{ t('admin.imports.settings.mode') }}：{{ importModeLabel(import_mode) }}
                </v-chip>
                <v-chip
                    size="small"
                    :color="watchStatusColor"
                    variant="tonal"
                >
                    {{ t('admin.imports.settings.autoWatch') }}：{{ watchStatusText }}
                </v-chip>
                <v-chip
                    size="small"
                    variant="tonal"
                >
                    {{ t('admin.imports.settings.lastScan') }}：{{ watch_status.last_scan_at || t('admin.imports.settings.neverScanned') }}
                </v-chip>
            </div>
            <v-alert
                v-if="directoryAlert"
                class="mt-3"
                density="compact"
                :type="directoryAlert.type"
                variant="tonal"
            >
                {{ directoryAlert.message }}
            </v-alert>
            <div class="imports-help text-medium-emphasis mt-3">
                {{ t('admin.imports.message.importAsyncInfo') }}
            </div>
            <v-alert
                v-if="backgroundTask"
                class="mt-3"
                type="info"
                variant="tonal"
                role="status"
                aria-live="polite"
            >
                <div class="text-high-emphasis">{{ t(watch_status.manual_library_import_phase === 'queued' && watch_status.manual_library_import_running ? 'admin.imports.message.fullImportQueued' : backgroundTask === 'scan' ? 'admin.imports.message.fullScanRunning' : 'admin.imports.message.importRunning') }}</div>
                <div
                    v-if="watch_status.scan_progress?.directory"
                    class="text-high-emphasis imports-progress"
                >
                    {{ t('admin.imports.message.scanProgress', [watch_status.scan_progress.processed || 0, watch_status.scan_progress.archives || 0, watch_status.scan_progress.failed || 0]) }}
                    <div class="directory-path">{{ watch_status.scan_progress.current || watch_status.scan_progress.directory }}</div>
                </div>
                <div class="text-high-emphasis imports-progress">
                    {{ t('admin.imports.message.importProgress', [count_done, count_todo, count_failed]) }}
                </div>
            </v-alert>
        </v-card-text>
        <v-card-actions class="imports-actions">
            <v-btn
                :disabled="loading"
                variant="outlined"
                color="primary"
                @click="getDataFromApi"
            >
                <v-icon start>
                    mdi-reload
                </v-icon>{{ t('admin.imports.button.refresh') }}
            </v-btn>
            <v-btn
                :disabled="loading || backgroundTask !== null || importActionsDisabled"
                variant="elevated"
                color="primary"
                @click="scan_books"
            >
                <v-icon start>
                    mdi-file-find
                </v-icon>{{ t('admin.imports.button.scanBooks') }}
            </v-btn>
            <v-btn
                :disabled="loading"
                variant="elevated"
                color="primary"
                @click="openOpdsImportDialog"
            >
                <v-icon start>
                    mdi-database-import
                </v-icon>{{ t('admin.imports.button.importFromOpds') }}
            </v-btn>
            <template v-if="selected.length > 0">
                <v-btn
                    v-if="filter_type !== 'skipped'"
                    :disabled="loading || backgroundTask !== null || importActionsDisabled"
                    variant="elevated"
                    color="#424242"
                    @click="import_books(selected)"
                >
                    <v-icon start>
                        mdi-import
                    </v-icon>{{ t('admin.imports.button.importSelectedBooks') }}
                </v-btn>
                <v-btn
                    :disabled="loading || backgroundTask !== null"
                    variant="outlined"
                    color="primary"
                    @click="delete_record"
                >
                    <v-icon start>
                        mdi-delete
                    </v-icon>{{ t('common.delete') }}
                </v-btn>
            </template>
            <v-btn
                :disabled="loading || Boolean(watch_status.manual_library_import_running) || importActionsDisabled"
                variant="elevated"
                color="primary"
                data-testid="import-all-books"
                @click="import_books('all')"
            >
                <v-icon start>
                    mdi-import
                </v-icon>{{ t('admin.imports.button.importAllBooks') }}
            </v-btn>
        </v-card-actions>
        <v-card-text>
            <div v-if="selected.length == 0">
                {{ t('admin.imports.message.selectFilesInfo') }}
            </div>
            <div v-else>
                {{ t('admin.imports.message.selectedCount', [selected.length]) }}
            </div>
        </v-card-text>
        <v-tabs
            v-model="filter_type"
            @update:model-value="onFilterChange"
        >
            <v-tab value="todo">
                {{ t('admin.imports.tab.todo') }} ({{ count_todo }})
            </v-tab>
            <v-tab value="done">
                {{ t('admin.imports.tab.done') }} ({{ count_done }})
            </v-tab>
            <v-tab value="failed">
                {{ t('admin.imports.tab.failed') }} ({{ count_failed }})
            </v-tab>
            <v-tab value="skipped" data-testid="import-skipped-tab">
                {{ t('admin.imports.tab.skipped') }} ({{ count_skipped }})
            </v-tab>
        </v-tabs>
        <v-data-table-server
            v-model="selected"
            density="compact"
            class="imports-table elevation-1 text-body-2"
            :mobile-breakpoint="600"
            show-select
            item-value="hash"
            :search="search"
            :headers="headers"
            :items="items"
            :items-length="total"
            :loading="loading"
            :items-per-page="itemsPerPage"
            @update:options="updateOptions"
        >
            <template #item.status="{ item }">
                <v-chip
                    v-if="item.status == 'ready'"
                    size="small"
                    color="success"
                >
                    {{ t('admin.imports.status.ready') }}
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'exist'"
                    size="small"
                    color="grey-lighten-2"
                >
                    {{ t('admin.imports.status.exist') }}
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'queued'"
                    size="small"
                    color="info"
                >
                    {{ t('admin.imports.status.queued') }}
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'importing'"
                    size="small"
                    color="info"
                >
                    {{ t('admin.imports.status.importing') }}
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'imported'"
                    size="small"
                    color="primary"
                >
                    {{ t('admin.imports.status.imported') }}
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'indexed'"
                    size="small"
                    color="primary"
                    variant="tonal"
                >
                    {{ t('admin.imports.status.indexed') }}
                </v-chip>
                <v-tooltip
                    v-else-if="item.status == 'delete_failed'"
                    :text="item.data?.delete_error || t('admin.imports.status.deleteFailedTooltip')"
                    location="top"
                >
                    <template #activator="{ props }">
                        <v-chip
                            size="small"
                            color="error"
                            v-bind="props"
                        >
                            {{ t('admin.imports.status.deleteFailed') }}
                        </v-chip>
                    </template>
                </v-tooltip>
                <v-chip
                    v-else-if="item.status == 'failed'"
                    size="small"
                    color="error"
                >
                    {{ t('admin.imports.status.failed') }}
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'new'"
                    size="small"
                    color="grey"
                >
                    {{ t('admin.imports.status.new') }}
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'downloading'"
                    size="small"
                    color="info"
                >
                    {{ t('admin.imports.status.downloading') }}
                </v-chip>
                <v-tooltip
                    v-else-if="item.status == 'drop'"
                    :text="t('admin.imports.status.dropTooltip')"
                    location="top"
                >
                    <template #activator="{ props }">
                        <v-chip
                            size="small"
                            color="warning"
                            v-bind="props"
                        >
                            {{ t('admin.imports.status.drop') }}
                        </v-chip>
                    </template>
                </v-tooltip>
                <v-chip
                    v-else
                    size="small"
                    color="info"
                >
                    {{ item.status }}
                </v-chip>
            </template>
            <template #item.path="{ item }">
                <span class="directory-path">{{ item.data?.archive_source || item.data?.source_path || item.path }}</span>
                <div
                    v-if="item.status === 'failed' && (item.data?.analysis_error || item.data?.import_error)"
                    class="import-failure-reason text-body-2 text-high-emphasis mt-1"
                    data-testid="import-failure-reason"
                >
                    {{ item.data?.analysis_error || item.data?.import_error }}
                </div>
            </template>
            <template #item.title="{ item }">
                {{ t('admin.imports.label.bookTitle') }}：<span v-if="item.book_id == 0"> {{ item.title }} </span>
                <a
                    v-else
                    target="_blank"
                    :href="withBasePath(`/book/${item.book_id}`)"
                >{{ item.title }}</a> <br>
                {{ t('admin.imports.label.author') }}：{{ item.author }}
            </template>
        </v-data-table-server>
    </v-card>

    <v-dialog
        v-model="settingsDialogVisible"
        max-width="760"
        scrollable
    >
        <v-card>
            <v-card-title class="imports-dialog-title">
                <span>{{ t('admin.imports.settings.title') }}</span>
                <v-btn
                    icon="mdi-close"
                    variant="text"
                    :aria-label="t('admin.imports.settings.close')"
                    @click="closeSettingsDialog"
                />
            </v-card-title>
            <v-card-text>
                <v-alert
                    v-if="settingsError"
                    class="mb-4"
                    type="error"
                    variant="tonal"
                    density="compact"
                >
                    {{ settingsError }}
                </v-alert>

                <section class="settings-section">
                    <div class="settings-section-title">
                        {{ t('admin.imports.settings.directoryList') }}
                    </div>
                    <p class="settings-section-hint">
                        {{ t('admin.imports.settings.directoryListHint') }}
                    </p>

                    <div
                        v-for="(root, index) in settingsDraft.import_allowed_roots"
                        :key="'root-' + index"
                        class="settings-root-row"
                    >
                        <v-text-field
                            v-model="settingsDraft.import_allowed_roots[index]"
                            :label="t('admin.imports.settings.directoryItemLabel', { index: index + 1 })"
                            variant="outlined"
                            density="comfortable"
                            :disabled="settingsSaving"
                            :data-testid="'import-root-' + index"
                            @update:model-value="settingsDraft.directory_check = null"
                        />
                        <v-btn
                            icon="mdi-folder-open-outline"
                            variant="text"
                            color="primary"
                            :disabled="settingsSaving"
                            :aria-label="t('admin.imports.button.chooseDirectory')"
                            :data-testid="'import-root-pick-' + index"
                            @click="openDirectoryPicker(index)"
                        />
                        <v-btn
                            icon="mdi-delete-outline"
                            variant="text"
                            color="error"
                            :disabled="settingsSaving"
                            :aria-label="t('admin.imports.settings.removeDirectory')"
                            :data-testid="'import-root-remove-' + index"
                            @click="removeAllowedRoot(index)"
                        />
                    </div>

                    <div class="settings-inline-actions">
                        <v-btn
                            variant="outlined"
                            color="primary"
                            :disabled="settingsSaving"
                            data-testid="import-root-add"
                            @click="addAllowedRoot"
                        >
                            <v-icon start>
                                mdi-plus
                            </v-icon>{{ t('admin.imports.settings.addDirectory') }}
                        </v-btn>
                    </div>

                    <v-alert
                        v-if="allowedRootsError"
                        class="mt-3"
                        density="compact"
                        type="error"
                        variant="tonal"
                    >
                        {{ allowedRootsError }}
                    </v-alert>
                </section>

                <section class="settings-section">
                    <div class="settings-section-title">
                        {{ t('admin.imports.settings.mode') }}
                    </div>
                    <v-radio-group
                        v-model="settingsDraft.import_mode"
                        :disabled="settingsSaving"
                        hide-details
                    >
                        <div
                            v-for="mode in importModeOptions"
                            :key="mode.value"
                            class="import-mode-option"
                            :class="{ selected: settingsDraft.import_mode === mode.value, disabled: mode.disabled }"
                        >
                            <v-radio
                                :value="mode.value"
                                :disabled="mode.disabled"
                                color="primary"
                            >
                                <template #label>
                                    <div>
                                        <div class="import-mode-label">
                                            {{ mode.label }}
                                        </div>
                                        <div class="import-mode-description">
                                            {{ mode.description }}
                                        </div>
                                    </div>
                                </template>
                            </v-radio>
                        </div>
                    </v-radio-group>
                    <v-alert
                        v-if="moveModeUnavailable"
                        class="mt-3"
                        type="warning"
                        density="compact"
                        variant="tonal"
                    >
                        {{ t('admin.imports.settings.moveDisabled') }}
                    </v-alert>
                </section>

                <section class="settings-section">
                    <v-switch
                        v-model="settingsDraft.auto_watch_enabled"
                        color="primary"
                        :label="t('admin.imports.settings.autoWatch')"
                        :disabled="settingsSaving"
                        hide-details
                    />
                    <div class="text-medium-emphasis">
                        {{ t('admin.imports.settings.autoWatchHint') }}
                    </div>
                    <div
                        class="watch-summary"
                        aria-live="polite"
                    >
                        {{ watchStatusText }}
                    </div>
                </section>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn
                    variant="text"
                    :disabled="settingsSaving"
                    @click="closeSettingsDialog"
                >
                    {{ t('common.cancel') }}
                </v-btn>
                <v-btn
                    color="primary"
                    variant="elevated"
                    :loading="settingsSaving"
                    :disabled="settingsSaveDisabled"
                    @click="saveImportSettings"
                >
                    {{ t('admin.imports.button.saveSettings') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <v-dialog
        v-model="directoryPickerVisible"
        max-width="720"
        scrollable
    >
        <v-card>
            <v-card-title class="imports-dialog-title">
                <span>{{ t('admin.imports.settings.chooseDirectoryTitle') }}</span>
                <v-btn
                    icon="mdi-close"
                    variant="text"
                    :aria-label="t('admin.imports.settings.closeDirectoryPicker')"
                    @click="directoryPickerVisible = false"
                />
            </v-card-title>
            <v-card-text>
                <div class="directory-path">
                    {{ directoryPickerPath }}
                </div>
                <v-btn
                    class="mt-2"
                    size="small"
                    variant="outlined"
                    :disabled="!directoryPickerParent || directoryLoading"
                    @click="loadDirectory(directoryPickerParent)"
                >
                    <v-icon start>
                        mdi-arrow-up
                    </v-icon>{{ t('admin.imports.message.backToParent') }}
                </v-btn>
                <v-progress-linear
                    v-if="directoryLoading"
                    class="mt-3"
                    indeterminate
                    color="primary"
                />
                <v-list
                    v-else
                    class="directory-list mt-3"
                    density="compact"
                >
                    <v-list-item
                        v-if="directoryItems.length === 0"
                        :title="t('admin.imports.settings.emptyDirectorySelectable')"
                    />
                    <v-list-item
                        v-for="item in directoryItems"
                        :key="item.path"
                        :disabled="item.is_symlink || !item.readable"
                        @click="loadDirectory(item.path)"
                    >
                        <template #prepend>
                            <v-icon>
                                mdi-folder-outline
                            </v-icon>
                        </template>
                        <v-list-item-title>{{ item.name }}</v-list-item-title>
                        <v-list-item-subtitle>{{ item.path }}</v-list-item-subtitle>
                        <template #append>
                            <v-chip
                                v-if="item.is_symlink"
                                size="x-small"
                                color="warning"
                                variant="tonal"
                            >
                                {{ t('admin.imports.settings.symlink') }}
                            </v-chip>
                            <v-icon>
                                mdi-chevron-right
                            </v-icon>
                        </template>
                    </v-list-item>
                </v-list>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn
                    variant="text"
                    @click="directoryPickerVisible = false"
                >
                    {{ t('common.cancel') }}
                </v-btn>
                <v-btn
                    color="primary"
                    variant="elevated"
                    :disabled="directoryLoading"
                    @click="chooseCurrentDirectory"
                >
                    {{ t('admin.imports.button.chooseCurrentDirectory') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <OpdsImportDialog
        v-model:dialog-visible="opdsImportDialogVisible"
        @refresh-data="getDataFromApi"
    />
</template>

<script setup>
import { DEFAULT_IMPORT_MODE, allowedRootsFromSettings, validateAllowedRoots } from '@/composables/useImportRoots';
import { activeImportTask } from '@/composables/useImportTask';
import { withBasePath } from '@/utils/base-path';
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';
import OpdsImportDialog from '@/components/OpdsImportDialog.vue';

const store = useMainStore();
const { $backend, $alert } = useNuxtApp();
const { t } = useI18n();

store.setNavbar(true);

const filter_type = ref('todo');
const selected = ref([]);
const scan_dir = ref('/data/books/imports/');
// 单一的扫描目录清单，同时用于手动扫描与监控配置。
const allowed_roots = ref(['/data/books/imports/']);
const search = ref('');
const items = ref([]);
const total = ref(0);
const loading = ref(false);
const itemsPerPage = ref(100);
const options = ref({ page: 1, itemsPerPage: 100, sortBy: [{ key: 'create_time', order: 'desc' }] });

const count_todo = ref(0);
const count_done = ref(0);
const count_failed = ref(0);
const count_skipped = ref(0);
const import_mode = ref(DEFAULT_IMPORT_MODE);
const auto_watch_enabled = ref(false);
const directory_check = ref(null);
const watch_status = ref({ state: 'off', queued: 0, running: 0, failed: 0, last_scan_at: null });
const backgroundTask = computed(() => activeImportTask(watch_status.value));
const opdsImportDialogVisible = ref(false);
const settingsDialogVisible = ref(false);
const settingsLoading = ref(false);
const settingsSaving = ref(false);
const settingsError = ref('');
const settingsDraft = ref({
    scan_upload_path: '/data/books/imports/',
    import_allowed_roots: ['/data/books/imports/'],
    import_mode: DEFAULT_IMPORT_MODE,
    auto_watch_enabled: false,
    directory_check: null,
});
// 多目录列表的本地校验错误（后端仍会再校验一次）。
const allowedRootsError = ref('');
// 目录选择器的目标是 import_directories 清单中的一项。
const directoryPickerTarget = ref(0);
const directoryChecking = ref(false);
const directoryPickerVisible = ref(false);
const directoryLoading = ref(false);
const directoryPickerPath = ref('');
const directoryPickerParent = ref('');
const directoryItems = ref([]);

const scan_status = ref({});
const import_status = ref({});

const headers = computed(() => [
    { title: 'ID', key: 'id', sortable: true },
    { title: t('admin.imports.label.status'), key: 'status', sortable: true, minWidth: '88px' },
    { title: t('admin.imports.label.path'), key: 'path', sortable: true },
    { title: t('admin.imports.label.scanInfo'), key: 'title', sortable: false, minWidth: '128px' },
    { title: t('admin.imports.label.time'), key: 'create_time', sortable: true, width: '200px' },
]);

const importModeDefinitions = computed(() => ({
    index: {
        label: t('admin.imports.settings.modeIndex'),
        description: t('admin.imports.settings.modeIndexDescription'),
    },
    copy: {
        label: t('admin.imports.settings.modeCopy'),
        description: t('admin.imports.settings.modeCopyDescription'),
    },
    move: {
        label: t('admin.imports.settings.modeMove'),
        description: t('admin.imports.settings.modeMoveDescription'),
    },
}));

const importModeLabel = (mode) => importModeDefinitions.value[mode]?.label || importModeDefinitions.value.index.label;

const moveModeUnavailable = computed(() => {
    const check = settingsDraft.value.directory_check;
    return Boolean(check && check.status !== 'error' && check.writable === false);
});

const importModeOptions = computed(() => Object.entries(importModeDefinitions.value).map(([value, option]) => ({
    value,
    label: option.label,
    description: option.description,
    disabled: value === 'move' && moveModeUnavailable.value,
})));

const watchStatusText = computed(() => {
    const status = watch_status.value || {};
    if (!auto_watch_enabled.value && status.state === 'off') return t('admin.imports.watch.off');
    if (status.state === 'scanning') return t('admin.imports.watch.scanning');
    if (status.state === 'queued') return t('admin.imports.watch.queued', [status.queued || 0]);
    if (status.state === 'importing') return t('admin.imports.watch.importing', [status.running || 0]);
    if (status.state === 'failed') return t('admin.imports.watch.failed', [status.failed || 0]);
    if (status.state === 'starting') return t('admin.imports.watch.starting');
    return auto_watch_enabled.value ? t('admin.imports.watch.watching') : t('admin.imports.watch.off');
});

const watchStatusColor = computed(() => {
    const state = watch_status.value?.state;
    if (state === 'failed') return 'error';
    if (['scanning', 'queued', 'importing', 'starting'].includes(state)) return 'info';
    if (auto_watch_enabled.value) return 'success';
    return 'default';
});

const directoryAlert = computed(() => {
    const check = directory_check.value;
    if (!check?.msg || check.status === 'ok') return null;
    return {
        type: check.status === 'warning' ? 'warning' : 'error',
        message: check.msg,
    };
});

const needsSettingsAttention = computed(() => {
    const check = directory_check.value;
    return Boolean(check && check.status === 'error') || watch_status.value?.state === 'failed';
});

const importActionsDisabled = computed(() => Boolean(directory_check.value && directory_check.value.status === 'error'));

const settingsSaveDisabled = computed(() => {
    const check = settingsDraft.value.directory_check;
    // 目录列表的合法性由 validateDraftAllowedRoots() 在保存时给出可读的错误提示，
    // 目录检测在保存时执行，保证先把路径错误显示给用户。
    return settingsSaving.value || directoryChecking.value || (settingsDraft.value.import_mode === 'move' && check?.writable === false);
});

const directoryCheckAlertType = (check) => {
    if (!check || check.status === 'ok') return 'success';
    return check.status === 'warning' ? 'warning' : 'error';
};

const updateOptions = (newOptions) => {
    options.value = newOptions;
    if (newOptions.itemsPerPage !== undefined) {
        itemsPerPage.value = newOptions.itemsPerPage;
    }
    getDataFromApi();
};

const onFilterChange = () => {
    options.value.page = 1;
    selected.value = [];
    getDataFromApi();
};

let listRequestSerial = 0;
const getDataFromApi = (resume = true) => {
    const requestSerial = ++listRequestSerial;
    loading.value = true;
    const { page, itemsPerPage, sortBy } = options.value;

    const sortKey = sortBy && sortBy.length ? sortBy[0].key : 'create_time';
    const sortOrder = sortBy && sortBy.length ? (sortBy[0].order === 'desc') : true;

    const data = new URLSearchParams();
    data.append('filter', filter_type.value);
    if (page != undefined) data.append('page', page);
    data.append('sort', sortKey);
    data.append('desc', sortOrder);
    if (itemsPerPage != undefined) data.append('num', itemsPerPage);

    return $backend('/admin/scan/list?' + data.toString())
        .then((rsp) => {
            if (pageDisposed || requestSerial !== listRequestSerial) return;
            if (rsp.err != 'ok') {
                items.value = [];
                total.value = 0;
                if ($alert) $alert('error', rsp.msg);
                return;
            }
            items.value = rsp.items;
            total.value = rsp.total;
            scan_dir.value = rsp.scan_dir;
            import_mode.value = rsp.import_mode || import_mode.value;
            auto_watch_enabled.value = Boolean(rsp.auto_watch_enabled);
            watch_status.value = rsp.watch_status || watch_status.value;
            count_done.value = rsp.summary.done;
            count_todo.value = rsp.summary.todo;
            count_failed.value = rsp.summary.failed || 0;
            count_skipped.value = rsp.summary.skipped || 0;
            if (resume !== false) resumeBackgroundTask();
        })
        .catch((error) => {
            if (pageDisposed || requestSerial !== listRequestSerial) return;
            if ($alert) $alert('error', error.message || t('errors.networkError'));
        })
        .finally(() => {
            if (!pageDisposed && requestSerial === listRequestSerial) loading.value = false;
        });
};

let statusTimer = null;
let observedTask = null;
let pageDisposed = false;
onBeforeUnmount(() => {
    pageDisposed = true;
    if (statusTimer) clearTimeout(statusTimer);
});
const loop_check_status = (url, callback) => {
    if (pageDisposed) return;
    if (statusTimer) clearTimeout(statusTimer);
    statusTimer = setTimeout(async () => {
        try {
            const rsp = await $backend(url);
            if (pageDisposed) return;
            if (rsp.err !== 'ok') {
                loading.value = false;
                observedTask = null;
                if ($alert) $alert('error', rsp.msg);
                getDataFromApi(false);
                return;
            }
            if (callback(rsp)) {
                loop_check_status(url, callback);
            } else {
                observedTask = null;
                getDataFromApi();
                if ($alert) $alert('info', '处理完毕！');
            }
        } catch (error) {
            observedTask = null;
            loading.value = false;
            if (!pageDisposed && $alert) $alert('error', error.message || '状态查询失败');
        }
    }, 2000);
};

const observeTask = (kind) => {
    observedTask = kind;
    loop_check_status(`/admin/${kind}/status`, (rsp) => {
        watch_status.value = rsp.watch_status || watch_status.value;
        count_done.value = rsp.summary.done;
        count_todo.value = rsp.summary.todo;
        count_failed.value = rsp.summary.failed || 0;
        count_skipped.value = rsp.summary.skipped || 0;
        if (kind === 'scan') scan_status.value = rsp.status;
        else import_status.value = rsp.status;
        loading.value = false;
        return Boolean(rsp.running);
    });
};

const resumeBackgroundTask = () => {
    const kind = backgroundTask.value;
    if (kind && !observedTask) observeTask(kind);
};

const applyImportSettings = (settings) => {
    if (!settings) return;
    allowed_roots.value = allowedRootsFromSettings(settings);
    scan_dir.value = allowed_roots.value[0] || settings.scan_upload_path || scan_dir.value;
    import_mode.value = settings.import_mode || DEFAULT_IMPORT_MODE;
    auto_watch_enabled.value = Boolean(settings.auto_watch_enabled);
    directory_check.value = settings.directory_check || null;
    watch_status.value = settings.watch_status || watch_status.value;
};

const resetSettingsDraft = () => {
    settingsDraft.value = {
        scan_upload_path: allowed_roots.value[0] || scan_dir.value,
        import_allowed_roots: allowed_roots.value.length ? allowed_roots.value.slice() : [scan_dir.value],
        import_mode: import_mode.value,
        auto_watch_enabled: auto_watch_enabled.value,
        directory_check: directory_check.value,
    };
    settingsError.value = '';
    allowedRootsError.value = '';
};

const addAllowedRoot = () => {
    settingsDraft.value.import_allowed_roots.push('');
    allowedRootsError.value = '';
    settingsDraft.value.directory_check = null;
};

const removeAllowedRoot = (index) => {
    settingsDraft.value.import_allowed_roots.splice(index, 1);
    allowedRootsError.value = '';
    settingsDraft.value.directory_check = null;
};

// 归一化与校验逻辑在 composables/useImportRoots.ts，便于脱离 Nuxt 单测。
const validateDraftAllowedRoots = () => {
    const result = validateAllowedRoots(settingsDraft.value.import_allowed_roots);
    if (result.error === 'empty') {
        allowedRootsError.value = t('admin.imports.settings.atLeastOneDirectory');
        return null;
    }
    if (result.error === 'outside') {
        allowedRootsError.value = t('admin.imports.settings.directoryOutsideRoots');
        return null;
    }
    allowedRootsError.value = '';
    return result.roots;
};

const getImportSettings = () => {
    settingsLoading.value = true;
    return $backend('/admin/import/settings')
        .then((rsp) => {
            if (rsp.err !== 'ok') {
                if ($alert) $alert('error', rsp.msg);
                return;
            }
            applyImportSettings(rsp.settings);
            resumeBackgroundTask();
        })
        .finally(() => {
            settingsLoading.value = false;
        });
};

const openImportSettingsDialog = () => {
    getImportSettings().then(() => {
        resetSettingsDraft();
        settingsDialogVisible.value = true;
    });
};

const closeSettingsDialog = () => {
    const draftChanged = JSON.stringify({
        directories: settingsDraft.value.import_allowed_roots,
        mode: settingsDraft.value.import_mode,
        watch: settingsDraft.value.auto_watch_enabled,
    }) !== JSON.stringify({
        directories: allowed_roots.value,
        mode: import_mode.value,
        watch: auto_watch_enabled.value,
    });
    if (draftChanged && !window.confirm(t('admin.imports.settings.discardConfirm'))) {
        return;
    }
    settingsDialogVisible.value = false;
};

const checkDraftDirectory = (path) => {
    directoryChecking.value = true;
    settingsDraft.value.directory_check = null;
    return $backend('/admin/import/directory/check', {
        method: 'POST',
        body: JSON.stringify({
            path: path || settingsDraft.value.import_allowed_roots[0]
        }),
    }).then((rsp) => {
        if (rsp.err !== 'ok') {
            settingsError.value = rsp.msg || t('admin.imports.settings.directoryCheckFailed');
            return;
        }
        settingsDraft.value.directory_check = rsp.directory;
        if (settingsDraft.value.import_mode === 'move' && rsp.directory?.writable === false) {
            settingsDraft.value.import_mode = DEFAULT_IMPORT_MODE;
        }
    }).finally(() => {
        directoryChecking.value = false;
    });
};

const saveImportSettings = async () => {
    settingsError.value = '';
    // 先校验目录列表：它不依赖后端检测，能立即给出可读的错误。
    const roots = validateDraftAllowedRoots();
    if (!roots) return;
    const primaryDirectory = roots[0];
    try {
        await checkDraftDirectory(primaryDirectory);
    } catch (error) {
        settingsError.value = error.message || t('admin.imports.settings.directoryCheckFailed');
        return;
    }
    if (!settingsDraft.value.directory_check) return;
    if (settingsDraft.value.directory_check.status === 'error') {
        settingsError.value = settingsDraft.value.directory_check.msg || t('admin.imports.settings.directoryCheckFailed');
        return;
    }
    if (settingsDraft.value.import_mode === 'move' && settingsDraft.value.directory_check.writable === false) {
        settingsError.value = t('admin.imports.settings.moveDisabled');
        return;
    }
    if (!auto_watch_enabled.value && settingsDraft.value.auto_watch_enabled) {
        let message = t('admin.imports.settings.enableWatchConfirm');
        if (settingsDraft.value.import_mode === 'move') {
            message += '\n' + t('admin.imports.settings.enableMoveWatchConfirm');
        }
        if (!window.confirm(message)) return;
    }

    settingsSaving.value = true;
    $backend('/admin/import/settings', {
        method: 'POST',
        body: JSON.stringify({
            scan_upload_path: roots[0],
            import_directories: roots,
            import_allowed_roots: roots,
            import_mode: settingsDraft.value.import_mode,
            auto_watch_enabled: settingsDraft.value.auto_watch_enabled,
        }),
    }).then((rsp) => {
        if (rsp.err !== 'ok') {
            settingsError.value = rsp.msg || t('admin.imports.settings.saveFailed');
            return;
        }
        applyImportSettings(rsp.settings);
        settingsDialogVisible.value = false;
        if ($alert) $alert('success', rsp.msg || t('admin.imports.settings.saved'));
        getDataFromApi();
    }).catch((error) => {
        settingsError.value = error.message || t('admin.imports.settings.saveFailed');
    }).finally(() => {
        settingsSaving.value = false;
    });
};

const loadDirectory = (path) => {
    directoryLoading.value = true;
    const params = new URLSearchParams();
    if (path) params.append('path', path);
    $backend('/admin/import/directory/list?' + params.toString())
        .then((rsp) => {
            if (rsp.err !== 'ok') {
                if ($alert) $alert('error', rsp.msg);
                return;
            }
            directoryPickerPath.value = rsp.path;
            directoryPickerParent.value = rsp.parent || '';
            directoryItems.value = rsp.items || [];
        })
        .finally(() => {
            directoryLoading.value = false;
        });
};

const openDirectoryPicker = (target = 0) => {
    directoryPickerTarget.value = target;
    directoryPickerVisible.value = true;
    loadDirectory(settingsDraft.value.import_allowed_roots[target] || '/');
};

const chooseCurrentDirectory = () => {
    const target = directoryPickerTarget.value;
    settingsDraft.value.import_allowed_roots[target] = directoryPickerPath.value;
    allowedRootsError.value = '';
    settingsDraft.value.directory_check = null;
    directoryPickerVisible.value = false;
};

const scan_books = () => {
    loading.value = true;
    $backend('/admin/scan/run', {
        method: 'POST',
    }).then((rsp) => {
        if (rsp.err !== 'ok') {
            if ($alert) $alert('error', rsp.msg);
            loading.value = false;
            return;
        }

        watch_status.value = { ...watch_status.value, manual_scan_running: true };
        observeTask('scan');
    }).catch((error) => {
        loading.value = false;
        if ($alert) $alert('error', error.message || t('admin.imports.settings.directoryCheckFailed'));
    });
};

const import_books = (hashlist = 'all') => {
    if (import_mode.value === 'move' && !window.confirm(t('admin.imports.settings.moveImportConfirm'))) {
        return;
    }
    loading.value = true;

    $backend('/admin/import/run', {
        method: 'POST',
        body: JSON.stringify({
            hashlist: hashlist,
            import_mode: import_mode.value
        }),
    }).then((rsp) => {
        if (rsp.err !== 'ok') {
            if ($alert) $alert('error', rsp.msg);
            loading.value = false;
            return;
        }

        watch_status.value = rsp.watch_status || { ...watch_status.value, manual_import_running: true };
        observeTask('import');
    }).catch((error) => {
        loading.value = false;
        if ($alert) $alert('error', error.message || t('admin.imports.settings.directoryCheckFailed'));
    });
};

const delete_record = () => {
    loading.value = true;
    $backend('/admin/scan/delete', {
        method: 'POST',
        body: JSON.stringify({
            hashlist: selected.value
        }),
    }).then((rsp) => {
        if (rsp.err !== 'ok') {
            if ($alert) $alert('error', rsp.msg);
        }
        getDataFromApi();
        selected.value = [];
    }).finally(() => {
        loading.value = false;
    });
};

const openOpdsImportDialog = () => {
    opdsImportDialogVisible.value = true;
};

onMounted(() => {
    getDataFromApi();
    getImportSettings();
});

useHead(() => ({
    title: t('admin.imports.title')
}));
</script>

<style scoped>
.imports-actions {
    flex-wrap: wrap;
    gap: 8px;
}

.imports-titlebar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
}

.imports-title {
    min-width: 0;
}

.imports-title-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
}

.imports-summary .summary-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
}

.summary-path,
.directory-path {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    overflow-wrap: anywhere;
}

.import-failure-reason {
    overflow-wrap: anywhere;
}

@media (max-width: 599px) {
    .imports-table :deep(.v-data-table__tr--mobile > td:not(.v-data-table__td--select-row)) {
        grid-template-columns: minmax(0, 1fr);
        row-gap: 4px;
        padding-block: 8px;
    }

    .imports-table :deep(.v-data-table__td-value) {
        min-width: 0;
        text-align: start;
    }
}

.imports-help {
    font-size: 0.875rem;
}

.imports-progress {
    font-variant-numeric: tabular-nums;
    min-width: 0;
}

.imports-dialog-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.settings-section + .settings-section {
    margin-top: 24px;
}

.settings-section-title {
    margin-bottom: 10px;
    font-weight: 700;
}

.settings-inline-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
}

.settings-section-hint {
    margin: 0 0 12px;
    color: rgba(var(--v-theme-on-surface), 0.7);
    font-size: 0.875rem;
    line-height: 1.5;
}

/* 多目录列表：每行一个输入框 + 选择 + 删除。 */
.settings-root-row {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 4px;
}

.settings-root-row .v-text-field {
    flex: 1 1 auto;
    min-width: 0;
}

.import-mode-option {
    margin-bottom: 8px;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 8px;
    transition: border-color 0.15s ease, background-color 0.15s ease;
}

.import-mode-option.selected {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.06);
}

.import-mode-option.disabled {
    opacity: 0.62;
}

.import-mode-label {
    font-weight: 700;
}

.import-mode-description {
    color: rgba(var(--v-theme-on-surface), 0.68);
    font-size: 0.84rem;
    line-height: 1.45;
}

.watch-summary {
    margin-top: 8px;
    color: rgba(var(--v-theme-on-surface), 0.72);
    font-size: 0.875rem;
}

.directory-list {
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 8px;
}

/* 加宽分页选择器 */
:deep(.v-data-table-footer__items-per-page) {
    min-width: 120px;
}

:deep(.v-data-table-footer__items-per-page .v-field) {
    min-width: 100px;
}

@media (max-width: 600px) {
    .imports-titlebar,
    .imports-title-actions,
    .settings-inline-actions {
        align-items: stretch;
        flex-direction: column;
    }
}
</style>
