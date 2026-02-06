
<template>
    <v-card>
        <v-card-title>
            导入图书 <v-chip
                size="small"
                variant="elevated"
                color="primary ml-2"
            >
                Beta
            </v-chip>
        </v-card-title>
        <v-card-text>
            请将需要导入的书籍放入{{ scan_dir }}目录中。 支持的格式为 azw/azw3/epub/mobi/pdf/txt 。<br>
            请注意：此功能为后台异步执行，不必重复点击，启动后可关闭浏览器，或刷新关注表格状态进展。已导入成功的记录请不要删除，以免书籍被再次导入。<br>
            另外，还可以使用<a
                class="press-content"
                target="_blank"
                href="https://calibre-ebook.com/"
            >PC版Calibre软件</a>管理书籍，但是请注意：使用完PC版后，需重启Web版方可生效。
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
                </v-icon>刷新
            </v-btn>
            <v-btn
                :disabled="loading"
                variant="elevated"
                color="primary"
                @click="scan_books"
            >
                <v-icon start>
                    mdi-file-find
                </v-icon>扫描书籍
            </v-btn>
            <v-btn
                :disabled="loading"
                variant="elevated"
                color="primary"
                @click="openOpdsImportDialog"
            >
                <v-icon start>
                    mdi-database-import
                </v-icon>从其他 OPDS 导入
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
                    </v-icon>导入选中书籍
                </v-btn>
                <v-btn
                    :disabled="loading"
                    variant="outlined"
                    color="primary"
                    @click="delete_record"
                >
                    <v-icon start>
                        mdi-delete
                    </v-icon>删除
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
                    </v-icon>导入全部书籍
                </v-btn>
            </template>
            <v-spacer />
            <v-checkbox
                v-model="delete_after_import"
                label="导入后删除源文件"
                color="primary"
                hide-details
            />
        </v-card-actions>
        <v-card-text>
            <div v-if="selected.length == 0">
                请勾选需要处理的文件（默认情况下导入全部书籍即可。已存在的书籍，即使勾选了也不会重复导入）
            </div>
            <div v-else>
                共选择了{{ selected.length }}个
            </div>
        </v-card-text>
        <v-tabs
            v-model="filter_type"
            @update:model-value="onFilterChange"
        >
            <v-tab value="todo">
                待处理 ({{ count_todo }})
            </v-tab>
            <v-tab value="done">
                已导入 ({{ count_done }})
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
                    可导入
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'exist'"
                    size="small"
                    color="grey-lighten-2"
                >
                    已存在
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'imported'"
                    size="small"
                    color="primary"
                >
                    导入成功
                </v-chip>
                <v-chip
                    v-else-if="item.status == 'new'"
                    size="small"
                    color="grey"
                >
                    待扫描
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
                书名：<span v-if="item.book_id == 0"> {{ item.title }} </span>
                <a
                    v-else
                    target="_blank"
                    :href="`/book/${item.book_id}`"
                >{{ item.title }}</a> <br>
                作者：{{ item.author }}
            </template>
        </v-data-table-server>
    </v-card>

    <!-- OPDS Import Dialog -->
    <v-dialog
        v-model="opdsImportDialogVisible"
        width="800"
        max-height="80vh"
    >
        <v-card>
            <v-card-title>
                <div class="flex items-center justify-between w-full">
                    <span>从其他 OPDS 导入</span>
                    <v-btn
                        color="primary"
                        text
                        @click="opdsImportDialogVisible = false"
                    >
                        关闭
                    </v-btn>
                </div>
            </v-card-title>
            <v-card-text>
                <!-- 连接信息填写界面 -->
                <div v-if="opdsImportState === 'connecting'">
                    <v-text-field
                        v-model="opdsUrl"
                        label="OPDS 目录 URL"
                        placeholder="例如: http://example.com/opds"
                        variant="outlined"
                        full-width
                    ></v-text-field>
                    <v-btn
                        :disabled="loading"
                        color="primary"
                        @click="connectToOpds"
                        class="mt-4"
                    >
                        连接
                    </v-btn>
                </div>
                
                <!-- 目录浏览界面 -->
                <div v-else-if="opdsImportState === 'browsing'">
                    <v-list
                        density="compact"
                        class="border rounded-lg overflow-hidden"
                        style="max-height: 500px; overflow-y: auto;"
                    >
                        <!-- 返回上级目录选项 -->
                        <v-list-item
                            v-if="currentOpdsPath !== ''"
                            @click="navigateToOpdsPath('')"
                            class="bg-gray-50"
                        >
                            <v-list-item-icon>
                                <v-icon>mdi-folder-up</v-icon>
                            </v-list-item-icon>
                            <v-list-item-title>..</v-list-item-title>
                        </v-list-item>
                        
                        <!-- 文件夹和书籍列表 -->
                        <template v-for="item in opdsItems" :key="item.id || item.href">
                            <!-- 文件夹项 -->
                            <v-list-item
                                v-if="item.type === 'folder'"
                                @click="navigateToOpdsPath(item.path)"
                                class="hover:bg-gray-50"
                            >
                                <v-list-item-icon>
                                    <v-icon>mdi-folder</v-icon>
                                </v-list-item-icon>
                                <v-list-item-title>{{ item.title }}</v-list-item-title>
                            </v-list-item>
                            
                            <!-- 书籍项 -->
                            <v-list-item
                                v-else-if="item.type === 'book'"
                                class="hover:bg-gray-50"
                            >
                                <v-list-item-action>
                                    <v-checkbox
                                        v-model="selectedOpdsBooks"
                                        :value="item"
                                        color="primary"
                                    ></v-checkbox>
                                </v-list-item-action>
                                <v-list-item-icon>
                                    <v-icon>mdi-book</v-icon>
                                </v-list-item-icon>
                                <v-list-item-title>{{ item.title }}</v-list-item-title>
                                <v-list-item-subtitle>{{ item.author }}</v-list-item-subtitle>
                            </v-list-item>
                        </template>
                    </v-list>
                </div>
                
                <!-- 导入进度界面 -->
                <div v-else-if="opdsImportState === 'importing'">
                    <div class="text-center py-8">
                        <v-progress-circular
                            indeterminate
                            color="primary"
                            size="64"
                        ></v-progress-circular>
                        <div class="mt-4">正在导入，请稍候...</div>
                    </div>
                </div>
            </v-card-text>
            <v-card-actions v-if="opdsImportState === 'browsing'">
                <v-spacer />
                <v-btn
                    :disabled="loading || selectedOpdsBooks.length === 0"
                    color="primary"
                    @click="importSelectedOpdsBooks"
                >
                    导入选中书籍
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMainStore } from '@/stores/main';

const store = useMainStore();
const { $backend, $alert } = useNuxtApp();

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
const opdsUrl = ref('');
const opdsImportState = ref('connecting'); // connecting, browsing, importing
const currentOpdsPath = ref('');
const opdsItems = ref([]);
const selectedOpdsBooks = ref([]);
const opdsConnection = ref(null);

const headers = [
    { title: 'ID', key: 'id', sortable: true },
    { title: '状态', key: 'status', sortable: true },
    { title: '路径', key: 'path', sortable: true },
    { title: '扫描信息', key: 'title', sortable: false },
    { title: '时间', key: 'create_time', sortable: true, width: '200px' },
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

const connectToOpds = () => {
    if (!opdsUrl.value) {
        if ($alert) $alert('error', '请输入 OPDS URL');
        return;
    }

    loading.value = true;
    // 这里应该调用后端接口获取 OPDS 根目录
    // 暂时模拟数据
    setTimeout(() => {
        opdsConnection.value = opdsUrl.value;
        currentOpdsPath.value = '';
        // 模拟根目录数据
        opdsItems.value = [
            {
                type: 'folder',
                title: '科幻小说',
                path: 'sci-fi'
            },
            {
                type: 'folder',
                title: '文学经典',
                path: 'classics'
            },
            {
                type: 'book',
                id: 1,
                title: '三体',
                author: '刘慈欣',
                href: 'http://example.com/opds/books/1'
            },
            {
                type: 'book',
                id: 2,
                title: '流浪地球',
                author: '刘慈欣',
                href: 'http://example.com/opds/books/2'
            }
        ];
        opdsImportState.value = 'browsing';
        loading.value = false;
    }, 1000);
};

const navigateToOpdsPath = (path) => {
    if (path === '') {
        // 返回根目录
        currentOpdsPath.value = '';
        // 模拟根目录数据
        opdsItems.value = [
            {
                type: 'folder',
                title: '科幻小说',
                path: 'sci-fi'
            },
            {
                type: 'folder',
                title: '文学经典',
                path: 'classics'
            },
            {
                type: 'book',
                id: 1,
                title: '三体',
                author: '刘慈欣',
                href: 'http://example.com/opds/books/1'
            },
            {
                type: 'book',
                id: 2,
                title: '流浪地球',
                author: '刘慈欣',
                href: 'http://example.com/opds/books/2'
            }
        ];
    } else {
        // 导航到子目录
        currentOpdsPath.value = path;
        // 模拟子目录数据
        opdsItems.value = [
            {
                type: 'book',
                id: 3,
                title: '银河帝国',
                author: '艾萨克·阿西莫夫',
                href: 'http://example.com/opds/books/3'
            },
            {
                type: 'book',
                id: 4,
                title: '基地',
                author: '艾萨克·阿西莫夫',
                href: 'http://example.com/opds/books/4'
            }
        ];
    }
};

const importSelectedOpdsBooks = () => {
    if (selectedOpdsBooks.value.length === 0) {
        if ($alert) $alert('error', '请至少选择一本书籍');
        return;
    }

    loading.value = true;
    opdsImportState.value = 'importing';
    
    // 调用后端接口导入选中的书籍
    $backend('/api/admin/opds/import', {
        method: 'POST',
        body: JSON.stringify({
            opds_url: opdsConnection.value,
            books: selectedOpdsBooks.value.map(book => ({
                id: book.id,
                title: book.title,
                author: book.author,
                href: book.href
            }))
        }),
    })
        .then((rsp) => {
            if (rsp.err != 'ok') {
                if ($alert) $alert('error', rsp.msg);
            } else {
                if ($alert) $alert('info', rsp.msg);
                // 导入成功后关闭弹窗
                opdsImportDialogVisible.value = false;
                // 重置状态
                resetOpdsImportState();
            }
        })
        .finally(() => {
            loading.value = false;
        });
};

const resetOpdsImportState = () => {
    opdsImportState.value = 'connecting';
    currentOpdsPath.value = '';
    opdsItems.value = [];
    selectedOpdsBooks.value = [];
    opdsConnection.value = null;
};

onMounted(() => {
    getDataFromApi();
});

useHead({
    title: '导入图书'
});
</script>
