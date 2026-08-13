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
                    {{ t('admin.imports.settings.directory') }}：<span class="summary-path">{{ scan_dir }}</span>
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
        </v-card-text>
        <v-card-actions>
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
                :disabled="loading || importActionsDisabled"
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
                    :disabled="loading || importActionsDisabled"
                    variant="elevated"
                    color="#424242"
                    @click="import_books"
                >
                    <v-icon start>
                        mdi-import
                    </v-icon>{{ t('admin.imports.button.importSelectedBooks') }}
                </v-btn>
                <v-btn
                    :disabled="loading"
                    variant="outlined"
                    color="primary"
                    @click="delete_record"
                >
                    <v-icon start>
                        mdi-delete
                    </v-icon>{{ t('common.delete') }}
                </v-btn>
            </template>
            <template v-else>
                <v-btn
                    :disabled="loading || importActionsDisabled"
                    variant="elevated"
                    color="warning"
                    @click="import_books"
                >
                    <v-icon start>
                        mdi-import
                    </v-icon>{{ t('admin.imports.button.importAllBooks') }}
                </v-btn>
            </template>
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
        </v-tabs>
        <v-data-table-server
            v-model="selected"
            density="compact"
            class="elevation-1 text-body-2"
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
            <template #item.title="{ item }">
                {{ t('admin.imports.label.bookTitle') }}：<span v-if="item.book_id == 0"> {{ item.title }} </span>
                <a
                    v-else
                    target="_blank"
                    :href="`/book/${item.book_id}`"
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
                        {{ t('admin.imports.settings.directory') }}
                    </div>
                    <v-text-field
                        v-model="settingsDraft.scan_upload_path"
                        :label="t('admin.imports.settings.directoryLabel')"
                        :hint="t('admin.imports.settings.directoryHint')"
                        persistent-hint
                        variant="outlined"
                        density="comfortable"
                        :disabled="settingsSaving"
                        @update:model-value="settingsDraft.directory_check = null"
                    />
                    <div class="settings-inline-actions">
                        <v-btn
                            variant="outlined"
                            color="primary"
                            :disabled="settingsSaving"
                            @click="openDirectoryPicker"
                        >
                            <v-icon start>
                                mdi-folder-open-outline
                            </v-icon>{{ t('admin.imports.button.chooseDirectory') }}
                        </v-btn>
                        <v-btn
                            variant="outlined"
                            color="primary"
                            :loading="directoryChecking"
                            :disabled="settingsSaving || !settingsDraft.scan_upload_path"
                            @click="checkDraftDirectory"
                        >
                            <v-icon start>
                                mdi-shield-check-outline
                            </v-icon>{{ t('admin.imports.button.checkDirectory') }}
                        </v-btn>
                    </div>
                    <v-alert
                        v-if="settingsDraft.directory_check?.msg"
                        class="mt-3"
                        density="compact"
                        :type="directoryCheckAlertType(settingsDraft.directory_check)"
                        variant="tonal"
                    >
                        {{ settingsDraft.directory_check.msg }}
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
                        :disabled="item.is_symlink || !item.readable || !item.in_allowed_roots"
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
import { ref, onMounted, computed } from 'vue';
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
const search = ref('');
const items = ref([]);
const total = ref(0);
const loading = ref(false);
const itemsPerPage = ref(100);
const options = ref({ page: 1, itemsPerPage: 100, sortBy: [{ key: 'create_time', order: 'desc' }] });

const count_todo = ref(0);
const count_done = ref(0);
const count_failed = ref(0);
const import_mode = ref('copy');
const auto_watch_enabled = ref(false);
const directory_check = ref(null);
const watch_status = ref({ state: 'off', queued: 0, running: 0, failed: 0, last_scan_at: null });
const opdsImportDialogVisible = ref(false);
const settingsDialogVisible = ref(false);
const settingsLoading = ref(false);
const settingsSaving = ref(false);
const settingsError = ref('');
const settingsDraft = ref({
    scan_upload_path: '/data/books/imports/',
    import_mode: 'copy',
    auto_watch_enabled: false,
    directory_check: null,
});
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
    { title: t('admin.imports.label.status'), key: 'status', sortable: true },
    { title: t('admin.imports.label.path'), key: 'path', sortable: true },
    { title: t('admin.imports.label.scanInfo'), key: 'title', sortable: false },
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

const importModeLabel = (mode) => importModeDefinitions.value[mode]?.label || importModeDefinitions.value.copy.label;

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
    return settingsSaving.value || !settingsDraft.value.scan_upload_path || !check || check.status === 'error' || (settingsDraft.value.import_mode === 'move' && check.writable === false);
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
    getDataFromApi();
};

const getDataFromApi = () => {
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

    $backend('/admin/scan/list?' + data.toString())
        .then((rsp) => {
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
        })
        .finally(() => {
            loading.value = false;
        });
};

const loop_check_status = (url, callback) => {
    setTimeout(() => {
        $backend(url)
            .then((rsp) => {
                if (rsp.err != 'ok') {
                    if ($alert) $alert('error', rsp.msg);
                    return;
                }
                if (callback(rsp)) {
                    getDataFromApi();
                    setTimeout(() => {
                        loop_check_status(url, callback);
                    }, 2000);
                } else {
                    getDataFromApi();
                    if ($alert) $alert('info', '处理完毕！');
                }
            });
    }, 2000);
};

const applyImportSettings = (settings) => {
    if (!settings) return;
    scan_dir.value = settings.scan_upload_path || scan_dir.value;
    import_mode.value = settings.import_mode || 'copy';
    auto_watch_enabled.value = Boolean(settings.auto_watch_enabled);
    directory_check.value = settings.directory_check || null;
    watch_status.value = settings.watch_status || watch_status.value;
};

const resetSettingsDraft = () => {
    settingsDraft.value = {
        scan_upload_path: scan_dir.value,
        import_mode: import_mode.value,
        auto_watch_enabled: auto_watch_enabled.value,
        directory_check: directory_check.value,
    };
    settingsError.value = '';
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
        path: settingsDraft.value.scan_upload_path,
        mode: settingsDraft.value.import_mode,
        watch: settingsDraft.value.auto_watch_enabled,
    }) !== JSON.stringify({
        path: scan_dir.value,
        mode: import_mode.value,
        watch: auto_watch_enabled.value,
    });
    if (draftChanged && !window.confirm(t('admin.imports.settings.discardConfirm'))) {
        return;
    }
    settingsDialogVisible.value = false;
};

const checkDraftDirectory = () => {
    directoryChecking.value = true;
    return $backend('/admin/import/directory/check', {
        method: 'POST',
        body: JSON.stringify({
            path: settingsDraft.value.scan_upload_path
        }),
    }).then((rsp) => {
        if (rsp.err !== 'ok') {
            settingsError.value = rsp.msg || t('admin.imports.settings.directoryCheckFailed');
            return;
        }
        settingsDraft.value.directory_check = rsp.directory;
        if (settingsDraft.value.import_mode === 'move' && rsp.directory?.writable === false) {
            settingsDraft.value.import_mode = 'copy';
        }
    }).finally(() => {
        directoryChecking.value = false;
    });
};

const saveImportSettings = () => {
    settingsError.value = '';
    if (!settingsDraft.value.directory_check) {
        checkDraftDirectory().then(() => {
            if (settingsDraft.value.directory_check && settingsDraft.value.directory_check.status !== 'error') {
                saveImportSettings();
            }
        });
        return;
    }
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
            scan_upload_path: settingsDraft.value.scan_upload_path,
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

const openDirectoryPicker = () => {
    directoryPickerVisible.value = true;
    loadDirectory(settingsDraft.value.scan_upload_path);
};

const chooseCurrentDirectory = () => {
    settingsDraft.value.scan_upload_path = directoryPickerPath.value;
    directoryPickerVisible.value = false;
    checkDraftDirectory();
};

const scan_books = () => {
    loading.value = true;
    $backend('/admin/scan/run', {
        method: 'POST',
    }).then((rsp) => {
        if (rsp.err !== 'ok') {
            if ($alert) $alert('error', rsp.msg);
            return;
        }

        loop_check_status('/admin/scan/status', (rsp) => {
            scan_status.value = rsp.status;
            count_done.value = rsp.summary.done;
            count_todo.value = rsp.summary.todo;
            count_failed.value = rsp.summary.failed || 0;
            if (scan_status.value.new === 0) {
                loading.value = false;
                if (scan_status.value.new === 0 && scan_status.value.total > 0) {
                    $alert('success', '扫描完成！请查看"待处理"列表中的书籍。');
                }
                return false;
            }
            loading.value = true;
            return true;
        });
    });
};

const import_books = () => {
    if (import_mode.value === 'move' && !window.confirm(t('admin.imports.settings.moveImportConfirm'))) {
        return;
    }
    loading.value = true;
    const hashlist = selected.value.length > 0 ? selected.value : 'all';

    $backend('/admin/import/run', {
        method: 'POST',
        body: JSON.stringify({
            hashlist: hashlist,
            import_mode: import_mode.value
        }),
    }).then((rsp) => {
        if (rsp.err !== 'ok') {
            if ($alert) $alert('error', rsp.msg);
        }

        loop_check_status('/admin/import/status', (rsp) => {
            import_status.value = rsp.status;
            count_done.value = rsp.summary.done;
            count_todo.value = rsp.summary.todo;
            count_failed.value = rsp.summary.failed || 0;
            if ((import_status.value.ready || 0) === 0 && (import_status.value.importing || 0) === 0) {
                loading.value = false;
                return false;
            }
            loading.value = true;
            return true;
        });
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

.imports-help {
    font-size: 0.875rem;
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
