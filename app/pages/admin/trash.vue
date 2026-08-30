<template>
    <v-card class="trash-page">
        <v-card-title class="trash-title d-flex flex-wrap align-center ga-2">
            <h1 class="text-h5">
                {{ t('admin.trash.title') }}
            </h1>
            <v-chip
                size="small"
                color="primary"
                variant="tonal"
            >
                {{ t('admin.trash.totalSpace', { size: formatSize(totalSize) }) }}
            </v-chip>
        </v-card-title>

        <v-card-text class="pb-2">
            <v-alert
                type="info"
                variant="tonal"
                density="compact"
            >
                {{ t('admin.trash.description') }}
            </v-alert>
        </v-card-text>

        <v-card-actions class="trash-actions flex-wrap px-4">
            <v-btn
                variant="outlined"
                color="primary"
                :disabled="loading"
                @click="fetchTrash"
            >
                <v-icon start>
                    mdi-reload
                </v-icon>
                {{ t('admin.trash.refresh') }}
            </v-btn>
            <v-btn
                v-if="selected.length"
                variant="outlined"
                color="success"
                :disabled="loading"
                data-testid="restore-selected"
                @click="restoreBooks(selected)"
            >
                <v-icon start>
                    mdi-backup-restore
                </v-icon>
                {{ t('admin.trash.restoreSelected') }}
            </v-btn>
            <v-btn
                v-if="selected.length"
                variant="outlined"
                color="error"
                :disabled="loading"
                data-testid="delete-selected"
                @click="askPermanentDelete(selected)"
            >
                <v-icon start>
                    mdi-delete-forever
                </v-icon>
                {{ t('admin.trash.deleteSelected') }}
            </v-btn>
            <v-spacer />
            <span
                v-if="selected.length"
                class="text-body-2 text-medium-emphasis"
            >
                {{ t('admin.trash.selected', { count: selected.length }) }}
            </span>
        </v-card-actions>

        <div
            v-if="!display.smAndDown.value"
            class="trash-table-wrap"
        >
            <v-data-table
                v-model="selected"
                :headers="headers"
                :items="items"
                :loading="loading"
                item-value="id"
                show-select
                density="compact"
                :no-data-text="t('admin.trash.empty')"
            >
                <template #item.title="{ item }">
                    <span class="font-weight-medium">{{ item.title }}</span>
                </template>
                <template #item.deleted_at="{ item }">
                    <span class="text-no-wrap">{{ formatDeletedAt(item.deleted_at) }}</span>
                </template>
                <template #item.formats="{ item }">
                    <div class="d-flex flex-wrap ga-1 py-1">
                        <v-chip
                            v-for="format in item.formats"
                            :key="format"
                            size="x-small"
                            variant="tonal"
                        >
                            {{ format }}
                        </v-chip>
                        <span v-if="!item.formats?.length">—</span>
                    </div>
                </template>
                <template #item.size="{ item }">
                    <span class="text-no-wrap">{{ formatSize(item.size) }}</span>
                </template>
                <template #item.actions="{ item }">
                    <div class="trash-row-actions d-flex flex-wrap ga-1 py-1">
                        <v-btn
                            size="small"
                            variant="text"
                            color="success"
                            :disabled="loading"
                            @click="restoreBooks([item.id])"
                        >
                            <v-icon start>
                                mdi-backup-restore
                            </v-icon>
                            {{ t('admin.trash.restore') }}
                        </v-btn>
                        <v-btn
                            size="small"
                            variant="text"
                            color="error"
                            :disabled="loading"
                            @click="askPermanentDelete([item.id])"
                        >
                            <v-icon start>
                                mdi-delete-forever
                            </v-icon>
                            {{ t('admin.trash.deletePermanently') }}
                        </v-btn>
                    </div>
                </template>
            </v-data-table>
        </div>

        <div
            v-else
            class="trash-mobile-list px-3 pb-3"
        >
            <v-progress-linear
                v-if="loading"
                indeterminate
                color="primary"
                class="mb-3"
            />
            <v-alert
                v-else-if="!items.length"
                type="info"
                variant="tonal"
            >
                {{ t('admin.trash.empty') }}
            </v-alert>
            <v-card
                v-for="item in items"
                :key="item.id"
                class="trash-mobile-card mb-3"
                variant="outlined"
            >
                <v-card-title class="d-flex align-start ga-2 text-body-1">
                    <v-checkbox-btn
                        class="trash-mobile-checkbox"
                        :model-value="selected.includes(item.id)"
                        :aria-label="t('admin.trash.selectBook', { title: item.title })"
                        @update:model-value="toggleSelected(item.id, $event)"
                    />
                    <span class="trash-mobile-title">{{ item.title }}</span>
                </v-card-title>
                <v-card-subtitle>{{ item.author }}</v-card-subtitle>
                <v-card-text class="trash-mobile-meta">
                    <div>
                        <span>{{ t('admin.trash.headers.deletedAt') }}</span>
                        <strong>{{ formatDeletedAt(item.deleted_at) }}</strong>
                    </div>
                    <div>
                        <span>{{ t('admin.trash.headers.size') }}</span>
                        <strong>{{ formatSize(item.size) }}</strong>
                    </div>
                    <div>
                        <span>{{ t('admin.trash.headers.formats') }}</span>
                        <span class="d-flex flex-wrap ga-1 justify-end">
                            <v-chip
                                v-for="format in item.formats"
                                :key="format"
                                size="x-small"
                                variant="tonal"
                            >
                                {{ format }}
                            </v-chip>
                            <strong v-if="!item.formats?.length">—</strong>
                        </span>
                    </div>
                </v-card-text>
                <v-card-actions class="flex-wrap">
                    <v-btn
                        color="success"
                        variant="text"
                        :disabled="loading"
                        @click="restoreBooks([item.id])"
                    >
                        <v-icon start>
                            mdi-backup-restore
                        </v-icon>
                        {{ t('admin.trash.restore') }}
                    </v-btn>
                    <v-btn
                        color="error"
                        variant="text"
                        :disabled="loading"
                        @click="askPermanentDelete([item.id])"
                    >
                        <v-icon start>
                            mdi-delete-forever
                        </v-icon>
                        {{ t('admin.trash.deletePermanently') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </div>
    </v-card>

    <v-dialog
        v-model="deleteDialog"
        persistent
        max-width="520"
    >
        <v-card>
            <v-toolbar
                color="error"
                density="compact"
            >
                <v-toolbar-title>{{ t('admin.trash.confirmTitle') }}</v-toolbar-title>
            </v-toolbar>
            <v-card-text class="pt-5">
                <p>{{ t('admin.trash.confirmMessage', { count: deleteIds.length }) }}</p>
                <v-alert
                    type="error"
                    variant="tonal"
                    class="mt-4"
                >
                    {{ t('admin.trash.confirmWarning') }}
                </v-alert>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn @click="deleteDialog = false">
                    {{ t('common.cancel') }}
                </v-btn>
                <v-btn
                    color="error"
                    variant="flat"
                    data-testid="confirm-permanent-delete"
                    @click="permanentlyDelete"
                >
                    {{ t('admin.trash.deletePermanently') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <v-snackbar
        v-model="snackbar"
        :color="snackbarColor"
        :timeout="snackbarTimeout"
    >
        {{ snackbarText }}
        <template #actions>
            <v-btn
                variant="text"
                @click="snackbar = false"
            >
                {{ t('common.close') }}
            </v-btn>
        </template>
    </v-snackbar>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';
import { useDisplay } from 'vuetify';

const store = useMainStore();
const display = useDisplay();
const router = useRouter();
const { $backend } = useNuxtApp();
const { t } = useI18n();

store.setNavbar(true);

const items = ref([]);
const selected = ref([]);
const loading = ref(false);
const totalSize = ref(0);
const deleteDialog = ref(false);
const deleteIds = ref([]);
const snackbar = ref(false);
const snackbarColor = ref('success');
const snackbarText = ref('');
const snackbarTimeout = ref(4000);

const headers = computed(() => [
    { title: t('admin.trash.headers.title'), key: 'title', minWidth: '180px' },
    { title: t('admin.trash.headers.author'), key: 'author', minWidth: '130px' },
    { title: t('admin.trash.headers.deletedAt'), key: 'deleted_at', minWidth: '170px' },
    { title: t('admin.trash.headers.formats'), key: 'formats', sortable: false, minWidth: '100px' },
    { title: t('admin.trash.headers.size'), key: 'size', minWidth: '90px' },
    { title: t('admin.trash.headers.actions'), key: 'actions', sortable: false, minWidth: '250px' },
]);

function formatSize(value) {
    const size = Number(value) || 0;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
    return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDeletedAt(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function showResult(kind, response) {
    const succeeded = response[kind]?.length || 0;
    const failures = response.failures || [];
    if (failures.length) {
        const key = kind === 'restored' ? 'admin.trash.restorePartialResult' : 'admin.trash.deletePartialResult';
        snackbarText.value = t(key, {
            count: succeeded,
            failed: failures.length,
            ids: failures.map(failure => failure.id).join(', '),
        });
        if (failures.some(failure => failure.reason === 'id_conflict')) {
            snackbarText.value += ` ${t('admin.trash.idConflictHint')}`;
        }
        snackbarColor.value = 'warning';
        snackbarTimeout.value = -1;
    } else {
        const key = kind === 'restored' ? 'admin.trash.restoreResult' : 'admin.trash.deleteResult';
        snackbarText.value = t(key, { count: succeeded });
        snackbarColor.value = 'success';
        snackbarTimeout.value = 4000;
    }
    snackbar.value = true;
}

function toggleSelected(id, checked) {
    if (checked && !selected.value.includes(id)) selected.value = [...selected.value, id];
    if (!checked) selected.value = selected.value.filter(selectedId => selectedId !== id);
}

async function fetchTrash() {
    loading.value = true;
    try {
        const response = await $backend('/admin/trash');
        if (response.err !== 'ok') {
            if (response.err === 'permission.not_admin' || response.err === 'user.need_login') {
                await router.replace('/');
                return;
            }
            items.value = [];
            totalSize.value = 0;
            snackbarText.value = response.msg || t('admin.trash.loadFailed');
            snackbarColor.value = 'error';
            snackbarTimeout.value = -1;
            snackbar.value = true;
            return;
        }
        items.value = response.items || [];
        totalSize.value = response.total_size || 0;
        selected.value = selected.value.filter(id => items.value.some(item => item.id === id));
    } catch {
        snackbarText.value = t('admin.trash.loadFailed');
        snackbarColor.value = 'error';
        snackbarTimeout.value = -1;
        snackbar.value = true;
    } finally {
        loading.value = false;
    }
}

async function restoreBooks(ids) {
    if (!ids.length) return;
    loading.value = true;
    try {
        const response = await $backend('/admin/trash', {
            method: 'PATCH',
            body: JSON.stringify({ idlist: [...ids] }),
        });
        if (response.err !== 'ok') throw new Error(response.msg || response.err);
        showResult('restored', response);
        selected.value = [];
        await fetchTrash();
    } catch (error) {
        snackbarText.value = error.message || t('admin.trash.loadFailed');
        snackbarColor.value = 'error';
        snackbarTimeout.value = -1;
        snackbar.value = true;
        loading.value = false;
    }
}

function askPermanentDelete(ids) {
    deleteIds.value = [...ids];
    deleteDialog.value = true;
}

async function permanentlyDelete() {
    const ids = [...deleteIds.value];
    deleteDialog.value = false;
    loading.value = true;
    try {
        const response = await $backend('/admin/trash', {
            method: 'DELETE',
            body: JSON.stringify({ idlist: ids, confirm: true }),
        });
        if (response.err !== 'ok') throw new Error(response.msg || response.err);
        showResult('deleted', response);
        selected.value = [];
        deleteIds.value = [];
        await fetchTrash();
    } catch (error) {
        snackbarText.value = error.message || t('admin.trash.loadFailed');
        snackbarColor.value = 'error';
        snackbarTimeout.value = -1;
        snackbar.value = true;
        loading.value = false;
    }
}

onMounted(async () => {
    await store.bootstrap();
    if (!store.user.is_admin) {
        await router.replace('/');
        return;
    }
    await fetchTrash();
});
</script>

<style scoped>
.trash-title {
    min-height: 56px;
}

.trash-actions {
    gap: 8px;
}

.trash-table-wrap {
    max-width: 100%;
    overflow-x: auto;
}

.trash-table-wrap :deep(.v-table__wrapper) {
    min-width: 940px;
}

.trash-mobile-checkbox {
    flex: 0 0 auto;
}

.trash-mobile-title {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
    text-align: start;
    white-space: normal;
}

.trash-mobile-meta {
    display: grid;
    gap: 8px;
}

.trash-mobile-meta > div {
    align-items: center;
    display: flex;
    gap: 12px;
    justify-content: space-between;
}

.trash-mobile-meta > div > span:first-child {
    color: rgba(var(--v-theme-on-surface), .72);
    font-weight: 500;
}

@media (max-width: 600px) {
    .trash-page {
        margin-inline: -8px;
    }

    .trash-actions .v-spacer {
        display: none;
    }
}
</style>
