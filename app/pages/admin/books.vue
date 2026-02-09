
<template>
    <v-card>
        <v-card-title>
            {{ $t('admin.booksTitle') }} <v-chip
                size="small"
                variant="elevated"
                color="primary"
                class="ml-2"
            >
                Beta
            </v-chip>
        </v-card-title>
        <v-card-text> {{ $t('admin.booksNotice') }}</v-card-text>
        <v-card-actions>
            <v-btn
                :disabled="loading"
                variant="outlined"
                color="primary"
                @click="getDataFromApi"
            >
                <v-icon start>
                    mdi-reload
                </v-icon>{{ $t('actions.refresh') }}
            </v-btn>
            <v-btn
                :disabled="loading"
                variant="outlined"
                color="info"
                @click="show_dialog_auto_file"
            >
                <v-icon start>
                    mdi-information
                </v-icon>{{ $t('admin.autoUpdateBooks') }}
            </v-btn>
            <v-btn
                v-if="books_selected.length > 0"
                :disabled="loading"
                variant="outlined"
                color="error"
                @click="delete_selected_books"
            >
                <v-icon start>
                    mdi-delete-alert
                            </v-icon>{{ $t('actions.bulkDelete') }} ({{ books_selected.length
                }})
            </v-btn>
            <v-spacer />
            <v-text-field
                v-model="search"
                density="compact"
                append-inner-icon="mdi-magnify"
                :label="$t('common.search')"
                single-line
                hide-details
            />
        </v-card-actions>
        
        <v-data-table-server
            v-model="books_selected"
            density="compact"
            class="elevation-1 text-body-2"
            show-select
            item-value="id"
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
                    {{ $t('admin.importStatus.ready') }}
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'exist'"
                    size="small"
                    color="grey-lighten-2"
                >
                    {{ $t('admin.importStatus.exist') }}
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'imported'"
                    size="small"
                    color="primary"
                >
                    {{ $t('admin.importStatus.imported') }}
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'new'"
                    size="small"
                    color="grey"
                >
                    {{ $t('admin.importStatus.pending') }}
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'downloading'"
                    size="small"
                    color="info"
                >
                    {{ $t('admin.importStatus.downloading') }}
                </v-chip>
                <v-chip
                    v-else
                    size="small"
                    color="info"
                >
                    {{ item.status }}
                </v-chip>
            </template>
            
            <template #item.img="{ item }">
                <v-img
                    :src="item.img"
                    width="40"
                    height="60"
                    cover
                    class="cursor-pointer"
                    @click="editCover(item)"
                />
            </template>
            
            <template #item.id="{ item }">
                <a
                    class="press-content"
                    target="_blank"
                    :href="`/book/${item.id}`"
                >{{ item.id }}</a>
            </template>
            
            <template #item.title="{ item }">
                    <div
                    class="cursor-pointer"
                    style="min-width: 120px; white-space: normal; word-break: break-word;"
                    @click="editField(item, 'title', $t('book.field.title'))"
                >
                    {{ item.title }}
                </div>
            </template>

            <template #item.authors="{ item }">
                <div
                    class="cursor-pointer"
                    style="min-width: 60px; white-space: normal; word-break: break-word;"
                    @click="editField(item, 'authors', $t('book.field.authors'))"
                >
                    <span v-if="item.authors">{{ item.authors.join("/") }}</span>
                    <span v-else> - </span>
                </div>
            </template>

            <template #item.rating="{ item }">
                <div
                    class="cursor-pointer"
                    @click="editField(item, 'rating', $t('book.field.rating'))"
                >
                    <span v-if="item.rating != null">{{ item.rating }} {{ $t('book.ratingStar') }}</span>
                    <span v-else> - </span>
                </div>
            </template>

            <template #item.publisher="{ item }">
                <div
                    class="cursor-pointer"
                    @click="editField(item, 'publisher', $t('book.field.publisher'))"
                >
                    {{ item.publisher || '-' }}
                </div>
            </template>

            <template #item.tags="{ item }">
                <div
                    class="cursor-pointer"
                    style="min-width: 200px; white-space: normal; word-break: break-word;"
                    @click="editField(item, 'tags', $t('book.field.tags'))"
                >
                    <span v-if="item.tags">{{ (tagsStr = item.tags.join("/"), tagsStr.slice(0, 77) + (tagsStr.length > 70 ? '...' : '')) }}</span>
                    <span v-else> - </span>
                </div>
            </template>

            <template #item.comments="{ item }">
                <div
                    class="cursor-pointer"
                    style="min-width: 300px; white-space: normal; word-break: break-word;"
                    @click="editField(item, 'comments', $t('book.field.comments'))"
                >
                    {{ item.comments ? item.comments.slice(0, 65) + (item.comments.length > 65 ? '...' : '') : '-' }}
                </div>
            </template>

            <template #item.actions="{ item }">
                <v-menu>
                    <template #activator="{ props }">
                        <v-btn
                            color="primary"
                            size="small"
                            v-bind="props"
                        >
                            {{ $t('actions.more') }} <v-icon size="small">
                                mdi-dots-vertical
                            </v-icon>
                        </v-btn>
                    </template>
                    <v-list density="compact">
                        <v-list-item @click="delete_book(item)">
                            <v-list-item-title>{{ $t('actions.deleteBook') }}</v-list-item-title>
                        </v-list-item>
                    </v-list>
                </v-menu>
            </template>
        </v-data-table-server>

        <!-- 通用编辑对话框 -->
        <v-dialog
            v-model="editDialog"
            width="500"
        >
            <v-card>
                <v-card-title>{{ t('actions.edit') }} {{ editFieldLabel }}</v-card-title>
                <v-card-text>
                    <v-text-field
                        v-if="['title', 'publisher'].includes(editingField)"
                        v-model="editingValue"
                        :label="editFieldLabel"
                    />
                    <v-textarea
                        v-else-if="editingField === 'comments'"
                        v-model="editingValue"
                        :label="editFieldLabel"
                    />
                    <v-rating
                        v-else-if="editingField === 'rating'"
                        v-model="editingValue"
                        length="10"
                        dense
                    />
                    <v-combobox
                        v-else-if="['authors', 'tags'].includes(editingField)"
                        v-model="editingValue"
                        :items="editingValue"
                        multiple
                        chips
                    />
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        text
                        @click="editDialog = false"
                    >
                        {{ t('actions.cancel') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        @click="saveField"
                    >
                        {{ t('actions.save') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- 封面编辑对话框 -->
        <v-dialog
            v-model="coverDialog"
            width="500"
        >
            <v-card>
                <v-card-title>{{ t('book.editCoverTitle') }}</v-card-title>
                <v-card-text>
                    <v-row>
                        <v-col
                            cols="12"
                            sm="6"
                        >
                            <v-img
                                :src="editingItem?.img"
                                max-height="200"
                                class="mb-4"
                                contain
                            />
                        </v-col>
                        <v-col
                            cols="12"
                            sm="6"
                        >
                            <v-file-input
                                v-model="coverFile"
                                accept="image/jpeg, image/png, image/gif"
                                :label="t('book.selectCover')"
                                prepend-icon="mdi-image"
                                @change="onCoverFileChange"
                            />
                            <small class="text-caption">{{ t('book.coverSupported') }}</small>
                        </v-col>
                    </v-row>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        text
                        @click="coverDialog = false"
                    >
                        {{ $t('admin.books.coverDialog.cancel') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        @click="saveCover"
                    >
                        {{ $t('admin.books.coverDialog.save') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- 小浮窗提醒 -->
        <v-snackbar
            v-model="snack"
            top
            :timeout="3000"
            :color="snackColor"
        >
            {{ snackText }}
            <template #actions>
                    <v-btn
                        variant="text"
                        @click="snack = false"
                    >
                        {{ t('actions.close') }}
                    </v-btn>
            </template>
        </v-snackbar>

        <!-- 提醒拉取图书的规则说明 -->
        <v-dialog
            v-model="meta_dialog"
            persistent
            transition="dialog-bottom-transition"
            width="500"
        >
            <v-card>
                <v-toolbar
                    flat
                    density="compact"
                    dark
                    color="primary"
                >
                    {{ t('admin.books.reminder') }}
                </v-toolbar>
                <v-card-text class="pt-4">
                    <p> {{ $t('admin.books.metaDialog.description') }}</p>
                    <p> 1. {{ $t('admin.books.metaDialog.rule1') }}</p>
                    <p> 2. {{ $t('admin.books.metaDialog.rule2') }}</p>
                    <p> 3. {{ $t('admin.books.metaDialog.rule3') }} </p>
                    <br>
                    <template v-if="progress.total > 0">
                        <p>
                            {{ t('admin.books.current_progress') }}：<v-btn
                                size="small"
                                variant="text"
                                @click="refresh_progress"
                            >
                                {{ t('actions.refresh') }}
                            </v-btn>
                        </p>
                        <p>
                            {{ $t('admin.books.metaDialog.progressDetails', {total: progress.total, done: progress.done, fail: progress.fail, skip: progress.skip}) }}
                        </p>
                    </template>
                    <p v-else>
                        {{ $t('admin.books.metaDialog.estimatedTime', {minutes: auto_fill_mins}) }}
                    </p>
                </v-card-text>
                <v-card-actions>
                    <v-btn @click="meta_dialog = !meta_dialog">
                        {{ t('actions.cancel') }}
                    </v-btn>
                    <v-spacer />
                    <v-btn
                        color="primary"
                        @click="auto_fill"
                    >
                        {{ t('actions.start') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- 批量删除确认对话框 -->
        <v-dialog
            v-model="delete_dialog"
            persistent
            width="500"
        >
            <v-card>
                <v-toolbar
                    flat
                    density="compact"
                    dark
                    color="error"
                >
                    {{ t('actions.confirmDelete') }}
                </v-toolbar>
                <v-card-text class="pt-4">
                    <p> {{ t('admin.books.confirm_delete_count', {count: books_selected.length}) }}</p>
                    <p class="text-medium-emphasis">
                        {{ t('admin.books.delete_warning') }}
                    </p>
                </v-card-text>
                <v-card-actions>
                    <v-btn @click="delete_dialog = !delete_dialog">
                        {{ t('actions.cancel') }}
                    </v-btn>
                    <v-spacer />
                    <v-btn
                        color="error"
                        @click="confirm_delete_books"
                    >
                        {{ t('actions.confirm') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-card>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';

const store = useMainStore();
const { $backend, $alert } = useNuxtApp();
const { t } = useI18n();

store.setNavbar(true);

const snack = ref(false);
const snackColor = ref('');
const snackText = ref('');
const meta_dialog = ref(false);
const delete_dialog = ref(false);
const coverFile = ref(null);

const books_selected = ref([]);
const search = ref('');
const items = ref([]);
const total = ref(0);
const loading = ref(false);
const itemsPerPage = ref(10);
const options = ref({ page: 1, itemsPerPage: 10, sortBy: [{ key: 'id', order: 'desc' }] });

const headers = [
    { title: t('admin.books.headers.cover'), key: 'img', sortable: false, width: '80px' },
    { title: t('admin.table.id'), key: 'id', sortable: true, width: '80px' },
    { title: t('admin.table.title'), key: 'title', sortable: true, width: '200px' },
    { title: t('admin.table.authors'), key: 'authors', sortable: true, width: '100px' },
    { title: t('admin.table.rating'), key: 'rating', sortable: false, width: '60px' },
    { title: t('admin.table.publisher'), key: 'publisher', sortable: false },
    { title: t('admin.table.tags'), key: 'tags', sortable: true, width: '100px' },
    { title: t('admin.table.comments'), key: 'comments', sortable: true },
    { title: t('admin.table.actions'), key: 'actions', sortable: false },
];

const progress = ref({
    skip: 0,
    fail: 0,
    done: 0,
    total: 0,
    status: 'finish',
});

const auto_fill_mins = computed(() => Math.floor(total.value / 60) + 1);

// Edit dialog state
const editDialog = ref(false);
const editingItem = ref(null);
const editingField = ref('');
const editingValue = ref(null);
const editFieldLabel = ref('');

const coverDialog = ref(false);

const updateOptions = (newOptions) => {
    options.value = newOptions;
    getDataFromApi();
};

const getDataFromApi = () => {
    loading.value = true;
    const { page, itemsPerPage, sortBy } = options.value;
    
    // Vuetify 3 sortBy format: [{ key: 'id', order: 'desc' }]
    const sortKey = sortBy && sortBy.length ? sortBy[0].key : 'id';
    const sortOrder = sortBy && sortBy.length ? (sortBy[0].order === 'desc') : true;

    var data = new URLSearchParams();
    if (page != undefined) data.append('page', page);
    data.append('sort', sortKey);
    data.append('desc', sortOrder);
    if (itemsPerPage != undefined) data.append('num', itemsPerPage);
    if (search.value) data.append('search', search.value);

    $backend('/admin/book/list?' + data.toString())
        .then((rsp) => {
            if (rsp.err != 'ok') {
                items.value = [];
                total.value = 0;
                if ($alert) $alert('error', rsp.msg);
                return false;
            }
            items.value = rsp.items;
            total.value = rsp.total;
        })
        .finally(() => {
            loading.value = false;
        });
};

const refresh_progress = () => {
    $backend('/admin/book/fill', { method: 'GET' })
        .then((rsp) => {
            progress.value = rsp.status;
        });
};

const show_dialog_auto_file = () => {
    meta_dialog.value = true;
    refresh_progress();
};

const auto_fill = () => {
    $backend('/admin/book/fill', {
        method: 'POST',
        body: JSON.stringify({ 'idlist': 'all' }),
    })
        .then((rsp) => {
            meta_dialog.value = false;
            if (rsp.err != 'ok') {
                if ($alert) $alert('error', rsp.msg);
            }
            snack.value = true;
            snackColor.value = 'success';
            snackText.value = rsp.msg;
        });
};

const delete_book = (book) => {
    loading.value = true;
    $backend('/book/' + book.id + '/delete', {
        method: 'POST',
        body: '',
    })
        .then((rsp) => {
            if (rsp.err != 'ok') {
                if ($alert) $alert('error', rsp.msg);
            }
            snack.value = true;
            snackColor.value = 'success';
            snackText.value = rsp.msg;

            getDataFromApi();
        })
        .finally(() => {
            loading.value = false;
        });
};

const delete_selected_books = () => {
    if (books_selected.value.length === 0) {
        snack.value = true;
        snackColor.value = 'warning';
        snackText.value = t('admin.books.selectBooksToDelete');
        return;
    }
    delete_dialog.value = true;
};

const confirm_delete_books = () => {
    if (books_selected.value.length === 0) {
        delete_dialog.value = false;
        return;
    }

    loading.value = true;
    delete_dialog.value = false;

    // v-data-table-server v-model returns IDs if item-value is set? 
    // Vuetify 3: if return-object is false (default), it returns values.
    // Wait, let's check. item-value="id". So books_selected should be array of IDs.
    const selectedIds = books_selected.value;

    $backend('/admin/book/delete', {
        method: 'POST',
        body: JSON.stringify({ idlist: selectedIds }),
    })
        .then((rsp) => {
            if (rsp.err != 'ok') {
                if ($alert) $alert('error', rsp.msg);
            } else {
                snack.value = true;
                snackColor.value = 'success';
                snackText.value = rsp.msg;
                books_selected.value = [];
                getDataFromApi();
            }
        })
        .finally(() => {
            loading.value = false;
        });
};

// Edit Field Logic
const editField = (item, field, label) => {
    editingItem.value = item;
    editingField.value = field;
    // Deep copy for arrays
    editingValue.value = Array.isArray(item[field]) ? [...item[field]] : item[field];
    editFieldLabel.value = label;
    editDialog.value = true;
};

const saveField = () => {
    const book = editingItem.value;
    const field = editingField.value;
    const value = editingValue.value;
    
    var edit = {};
    edit[field] = value;
    
    $backend('/book/' + book.id + '/edit', {
        method: 'POST',
        body: JSON.stringify(edit),
    }).then((rsp) => {
        if (rsp.err == 'ok') {
            snack.value = true;
            snackColor.value = 'success';
            snackText.value = rsp.msg;
            editDialog.value = false;
            getDataFromApi();
        } else {
            if ($alert) $alert('error', rsp.msg);
        }
    });
};

// Cover Edit Logic
const editCover = (item) => {
    editingItem.value = item;
    coverFile.value = null;
    coverDialog.value = true;
};

const onCoverFileChange = (e) => {
    // In Vuetify 3, v-file-input returns File[] or File.
    // v-model coverFile
    const file = Array.isArray(coverFile.value) ? coverFile.value[0] : coverFile.value;
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            if ($alert) $alert('error', t('book.coverSizeLimit'));
            coverFile.value = null;
        }
    }
};

const saveCover = () => {
    const file = Array.isArray(coverFile.value) ? coverFile.value[0] : coverFile.value;
    
    if (!file) {
        if ($alert) $alert('info', t('book.selectCover'));
        return;
    }

    loading.value = true;
    const formData = new FormData();
    formData.append('cover', file);

    $backend('/book/' + editingItem.value.id + '/edit', {
        method: 'POST',
        body: formData
    }).then((rsp) => {
        if (rsp.err == 'ok') {
            snack.value = true;
            snackColor.value = 'success';
            snackText.value = rsp.msg;
            coverDialog.value = false;
            getDataFromApi();
        } else {
            if ($alert) $alert('error', rsp.msg);
        }
    }).finally(() => {
        loading.value = false;
        coverFile.value = null;
    });
};

watch(search, () => {
    options.value.page = 1;
    getDataFromApi();
});

useHead({
    title: () => t('admin.booksTitle')
});
</script>

<style scoped>
.cursor-pointer {
    cursor: pointer;
}
</style>
