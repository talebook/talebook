<template>
    <v-card>
        <v-card-title>
            {{ $t('admin.imports.title') }} <v-chip
                size="small"
                variant="elevated"
                color="primary ml-2"
            >
                Beta
            </v-chip>
        </v-card-title>
        <v-card-text>
            {{ $t('admin.imports.description', {dir: scan_dir}) }}<br>
            {{ $t('admin.imports.note') }}<br>
            {{ $t('admin.imports.calibreNote') }}
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
                </v-icon>{{ $t('admin.imports.actions.refresh') }}
            </v-btn>
            <v-btn
                :disabled="loading"
                variant="elevated"
                color="primary"
                @click="scan_books"
            >
                <v-icon start>
                    mdi-file-find
                </v-icon>{{ $t('admin.imports.actions.scanBooks') }}
            </v-btn>
            <v-btn
                :disabled="loading"
                variant="elevated"
                color="primary"
                @click="openOpdsImportDialog"
            >
                <v-icon start>
                    mdi-database-import
                </v-icon>{{ $t('admin.imports.actions.importFromOpds') }}
            </v-btn>
            <template v-if="selected.length > 0">
                <v-btn
                    :disabled="loading"
                    variant="elevated"
                    color="#424242"
                    @click="import_books"
                >
                    <v-icon start>
                        mdi-import
                    </v-icon>{{ $t('admin.imports.actions.importSelected') }}
                </v-btn>
                <v-btn
                    :disabled="loading"
                    variant="outlined"
                    color="primary"
                    @click="delete_record"
                >
                    <v-icon start>
                        mdi-delete
                    </v-icon>{{ $t('admin.imports.actions.delete') }}
                </v-btn>
            </template>
            <template v-else>
                <v-btn
                    :disabled="loading"
                    variant="elevated"
                    color="warning"
                    @click="import_books"
                >
                    <v-icon start>
                        mdi-import
                    </v-icon>{{ $t('admin.imports.actions.importAll') }}
                </v-btn>
            </template>
            <v-spacer />
            <v-checkbox
                v-model="delete_after_import"
                :label="$t('admin.imports.options.deleteAfterImport')"
                color="primary"
                hide-details
            />
        </v-card-actions>
        <v-card-text>
            <div v-if="selected.length == 0">
                {{ $t('admin.imports.selectionHint') }}
            </div>
            <div v-else>
                {{ $t('admin.imports.selectedCount', {count: selected.length}) }}
            </div>
        </v-card-text>
        <v-tabs
            v-model="filter_type"
            @update:model-value="onFilterChange"
        >
            <v-tab value="todo">
                {{ $t('admin.imports.tabs.todo') }} ({{ count_todo }})
            </v-tab>
            <v-tab value="done">
                {{ $t('admin.imports.tabs.done') }} ({{ count_done }})
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
                    {{ $t('admin.imports.status.ready') }}
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'exist'"
                    size="small"
                    color="grey-lighten-2"
                >
                    {{ $t('admin.imports.status.exist') }}
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'imported'"
                    size="small"
                    color="primary"
                >
                    {{ $t('admin.imports.status.imported') }}
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'new'"
                    size="small"
                    color="grey"
                >
                    {{ $t('admin.imports.status.pending') }}
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'downloading'"
                    size="small"
                    color="info"
                >
                    {{ $t('admin.imports.status.downloading') }}
                </v-chip>
                <v-chip
                    v-else
                    size="small"
                    color="info"
                >
                    {{ item.status }}
                </v-chip>
            </template>
            <template #item.title="{ item }">
                {{ $t('admin.imports.bookInfo.title') }}<span v-if="item.book_id == 0"> {{ item.title }} </span>
                <a
                    v-else
                    target="_blank"
                    :href="`/book/${item.book_id}`"
                >{{ item.title }}</a> <br>
                {{ $t('admin.imports.bookInfo.author') }}{{ item.author }}
            </template>
        </v-data-table-server>
    </v-card>

    <!-- OPDS Import Dialog -->
    <OpdsImportDialog
        v-model:dialogVisible="opdsImportDialogVisible"
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
const delete_after_import = ref(false);
const opdsImportDialogVisible = ref(false);

const headers = [
    { title: t('admin.imports.headers.id'), key: 'id', sortable: true },
    { title: t('admin.imports.headers.status'), key: 'status', sortable: true },
    { title: t('admin.imports.headers.path'), key: 'path', sortable: true },
    { title: t('admin.imports.headers.title'), key: 'title', sortable: false },
    { title: t('admin.imports.headers.time'), key: 'create_time', sortable: true, width: '200px' },
];

const progress = ref({
    done: 0,
    total: 0,
    status: 'finish',
});

// Variables for scan/import status
const scan_status = ref({});
const import_status = ref({});

const updateOptions = (newOptions) => {
    options.value = newOptions;
    getDataFromApi();
};

const onFilterChange = (val) => {
    // Reset page when tab changes
    options.value.page = 1;
    getDataFromApi();
};

const getDataFromApi = () => {
    loading.value = true;
    const { page, itemsPerPage, sortBy } = options.value;
    
    const sortKey = sortBy && sortBy.length ? sortBy[0].key : 'create_time';
    const sortOrder = sortBy && sortBy.length ? (sortBy[0].order === 'desc') : true;

    var data = new URLSearchParams();
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
                return false;
            }
            items.value = rsp.items;
            total.value = rsp.total;
            scan_dir.value = rsp.scan_dir;
            count_done.value = rsp.summary.done;
            count_todo.value = rsp.summary.todo;
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
                    // 在扫描过程中，每次检查状态后都刷新书籍列表，实现自动更新
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
            if (scan_status.value.new === 0) {
                loading.value = false;
                // 扫描完成后提示用户
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
    loading.value = true;
    var hashlist = 'all';
    if (selected.value.length > 0) {
        hashlist = selected.value; // v-data-table-server with item-value="hash" returns hashes
    }
    
    $backend('/admin/import/run', {
        method: 'POST',
        body: JSON.stringify({
            hashlist: hashlist,
            delete_after: delete_after_import.value
        }),
    })
        .then((rsp) => {
            if (rsp.err !== 'ok') {
                if ($alert) $alert('error', rsp.msg);
            }

            loop_check_status('/admin/import/status', (rsp) => {
                import_status.value = rsp.status;
                count_done.value = rsp.summary.done;
                count_todo.value = rsp.summary.todo;
                if (import_status.value.ready === 0) {
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
    })
        .then((rsp) => {
            if (rsp.err !== 'ok') {
                if ($alert) $alert('error', rsp.msg);
            }
            getDataFromApi();
            // 清空选中数组
            selected.value = [];
        })
        .finally(() => {
            loading.value = false;
        });
};

const openOpdsImportDialog = () => {
    opdsImportDialogVisible.value = true;
};

onMounted(() => {
    getDataFromApi();
});

useHead({
    title: () => t('admin.importsTitle')
});
</script>

<style scoped>
.cursor-pointer {
    cursor: pointer;
}
.hover\:bg-gray-50:hover {
    background-color: rgba(0, 0, 0, 0.02);
}
.hover\:bg-gray-100:hover {
    background-color: rgba(0, 0, 0, 0.04);
}
.truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.min-w-0 {
    min-width: 0;
}

/* 自定义滚动条样式 - 确保在所有浏览器中都能滚动 */
.border::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

.border::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
}

.border::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
}

.border::-webkit-scrollbar-thumb:hover {
    background: #555;
}

/* 确保容器能够正确滚动 */
.border {
    overflow: auto !important;
    -webkit-overflow-scrolling: touch;
}

/* 面包屑导航链接样式 */
.v-breadcrumbs-item--link {
    cursor: pointer;
    color: #1976d2;
    text-decoration: none;
}

.v-breadcrumbs-item--link:hover {
    text-decoration: underline;
}

.v-breadcrumbs-item--disabled {
    color: rgba(0, 0, 0, 0.38);
    cursor: default;
}

/* 防止点击事件冒泡 */
.v-breadcrumbs-item {
    cursor: pointer;
}

/* 确保复选框和内容对齐 */
.v-checkbox {
    margin: 0;
    padding: 0;
}
</style>