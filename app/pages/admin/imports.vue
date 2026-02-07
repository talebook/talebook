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
        max-height="90vh"
    >
        <v-card>
            <v-card-title>
                从其他 OPDS 导入
                <v-spacer />
                <v-chip
                    v-if="opdsImportState === 'browsing' && selectedOpdsBooks.length > 0"
                    color="primary"
                    size="small"
                >
                    已选: {{ selectedOpdsBooks.length }} 本
                </v-chip>
            </v-card-title>
            <v-card-text style="padding: 16px;">
                <!-- 连接信息填写界面 -->
                <div v-if="opdsImportState === 'connecting'">
                    <v-row>
                        <v-col cols="8">
                            <v-text-field
                                v-model="opdsHost"
                                label="主机地址"
                                placeholder="例如: http://example.com"
                                variant="outlined"
                                full-width
                                @keyup.enter="connectToOpds"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="4">
                            <v-text-field
                                v-model="opdsPort"
                                label="端口"
                                placeholder="例如: 80"
                                variant="outlined"
                                full-width
                                type="number"
                                @keyup.enter="connectToOpds"
                            ></v-text-field>
                        </v-col>
                    </v-row>
                    <v-text-field
                        v-model="opdsPath"
                        label="路径"
                        placeholder="例如: /opds 或 /opds/root.xml"
                        variant="outlined"
                        full-width
                        class="mt-4"
                        @keyup.enter="connectToOpds"
                    ></v-text-field>
                    <div class="text-body-2 text-gray-600 mt-2">
                        提示：通常OPDS服务地址类似 http://example.com:8080/opds 或 http://example.com/opds/root.xml
                    </div>
                </div>
                
                <!-- 目录浏览界面 -->
                <div v-else-if="opdsImportState === 'browsing'">
                    <!-- 面包屑导航 -->
                    <div class="mb-4">
                        <v-breadcrumbs :items="breadcrumbs" class="pa-0">
                            <template #prepend>
                                <v-icon size="small">mdi-folder</v-icon>
                            </template>
                            <template #divider>
                                <v-icon size="small">mdi-chevron-right</v-icon>
                            </template>
                        </v-breadcrumbs>
                    </div>
                    
                    <!-- 目录内容区域 -->
                    <div 
                        class="border rounded-lg overflow-hidden"
                        style="height: 400px; overflow-y: auto;"
                    >
                        <div class="pa-2">
                            <!-- 返回上级目录 -->
                            <div 
                                v-if="currentOpdsPath !== ''"
                                @click="goBackInOpdsPath"
                                class="flex items-center pa-3 hover:bg-gray-50 rounded cursor-pointer mb-1"
                            >
                                <v-icon class="mr-2" color="primary">mdi-arrow-left</v-icon>
                                <span class="text-body-1">返回上级目录</span>
                            </div>
                            
                            <!-- 项目列表 -->
                            <div 
                                v-for="(item, index) in opdsItems" 
                                :key="item.id || index"
                                class="mb-1"
                            >
                                <!-- 文件夹 -->
                                <div
                                    v-if="item.type === 'folder' || (!item.type && item.href)"
                                    @click="navigateToOpdsFolder(item)"
                                    class="flex items-center pa-3 hover:bg-gray-50 rounded cursor-pointer"
                                >
                                    <v-icon class="mr-3" color="amber">mdi-folder</v-icon>
                                    <div class="flex-grow">
                                        <div class="font-weight-medium text-body-1">{{ item.title }}</div>
                                        <div v-if="item.summary" class="text-caption text-gray-600">{{ item.summary }}</div>
                                    </div>
                                    <v-icon size="small">mdi-chevron-right</v-icon>
                                </div>
                                
                                <!-- 书籍 -->
                                <div
                                    v-else-if="item.type === 'book' || (!item.type && !item.href)"
                                    class="flex items-center pa-3 hover:bg-gray-100 rounded"
                                >
                                    <!-- 复选框 - 放在最左边 -->
                                    <div class="mr-3 flex-shrink-0">
                                        <v-checkbox
                                            v-model="selectedOpdsBooks"
                                            :value="item"
                                            color="primary"
                                            hide-details
                                            class="ma-0 pa-0"
                                        ></v-checkbox>
                                    </div>
                                    
                                    <!-- 书籍图标 -->
                                    <v-icon class="mr-3" color="blue" size="small">mdi-book</v-icon>
                                    
                                    <!-- 书籍信息 -->
                                    <div class="flex-grow min-w-0">
                                        <div class="font-weight-medium text-body-1 truncate">{{ item.title }}</div>
                                        <div v-if="item.author" class="text-caption text-gray-600">作者: {{ item.author }}</div>
                                        <div v-if="item.summary" class="text-caption text-gray-500 truncate">{{ item.summary }}</div>
                                    </div>
                                    
                                    <!-- 封面图片 -->
                                    <div v-if="item.cover_link" class="ml-3 flex-shrink-0">
                                        <v-avatar size="40" rounded="sm">
                                            <v-img 
                                                :src="item.cover_link" 
                                                alt="封面"
                                                cover
                                            ></v-img>
                                        </v-avatar>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 空状态 -->
                            <div v-if="opdsItems.length === 0" class="text-center py-8">
                                <v-icon size="48" color="grey">mdi-folder-open-outline</v-icon>
                                <div class="mt-2 text-gray-600">目录为空</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 导入进度界面 -->
                <div v-else-if="opdsImportState === 'importing'">
                    <div class="text-center py-8">
                        <v-progress-circular
                            indeterminate
                            color="primary"
                            size="64"
                        ></v-progress-circular>
                        <div class="mt-4 text-h6">正在导入书籍到待处理列表...</div>
                        <div class="mt-2 text-body-1">
                            已导入 {{ opdsImportProgress.done }} / {{ opdsImportProgress.total }} 本
                        </div>
                        <v-progress-linear
                            v-model="opdsImportProgress.percent"
                            color="primary"
                            height="20"
                            class="mt-4"
                        >
                            <template #default="{ value }">
                                <strong>{{ Math.ceil(value) }}%</strong>
                            </template>
                        </v-progress-linear>
                        <div class="mt-4">
                            <v-alert type="info" variant="tonal" class="text-left">
                                <div class="text-body-2">
                                    <v-icon color="info" size="small">mdi-information</v-icon>
                                    导入的书籍会自动添加到"待处理"列表
                                </div>
                                <div class="text-body-2 mt-1">
                                    导入完成后，您需要在主界面上点击"扫描书籍"按钮来识别这些书籍
                                </div>
                            </v-alert>
                        </div>
                    </div>
                </div>
                
                <!-- 导入完成界面 -->
                <div v-else-if="opdsImportState === 'completed'">
                    <div class="text-center py-8">
                        <v-icon size="64" color="success">mdi-check-circle</v-icon>
                        <div class="mt-4 text-h6 text-success">导入完成！</div>
                        <div class="mt-2 text-body-1">
                            成功导入 {{ opdsImportResult.done }} 本书籍到待处理列表
                        </div>
                        <div v-if="opdsImportResult.fail > 0" class="mt-2 text-body-1 text-warning">
                            失败 {{ opdsImportResult.fail }} 本
                        </div>
                        <div class="mt-4">
                            <v-alert type="success" variant="tonal" class="text-left">
                                <div class="text-body-2">
                                    <v-icon color="success" size="small">mdi-check</v-icon>
                                    书籍已成功添加到扫描目录
                                </div>
                                <div class="text-body-2 mt-1">
                                    接下来请：
                                    <ol class="mt-2 pl-4">
                                        <li>关闭此窗口</li>
                                        <li>在主界面上点击"扫描书籍"按钮</li>
                                        <li>在"待处理"列表中查看导入的书籍</li>
                                        <li>选择要导入的书籍并点击"导入"</li>
                                    </ol>
                                </div>
                            </v-alert>
                        </div>
                    </div>
                </div>
                
                <!-- 错误状态 -->
                <div v-else-if="opdsImportState === 'error'">
                    <div class="text-center py-8">
                        <v-icon size="64" color="error">mdi-alert-circle</v-icon>
                        <div class="mt-4 text-h6 text-error">{{ opdsError }}</div>
                        <div class="mt-4">
                            <v-btn color="primary" @click="resetOpdsImportState">
                                返回连接界面
                            </v-btn>
                        </div>
                    </div>
                </div>
            </v-card-text>
            <v-card-actions class="flex w-full items-center justify-end gap-2 pa-4">
                <!-- 连接状态的按钮 -->
                <template v-if="opdsImportState === 'connecting'">
                    <v-btn
                        color="primary"
                        @click="opdsImportDialogVisible = false"
                    >
                        关闭
                    </v-btn>
                    <v-btn
                        :loading="opdsLoading"
                        color="primary"
                        @click="connectToOpds"
                    >
                        连接
                    </v-btn>
                </template>
                
                <!-- 浏览状态的按钮 -->
                <template v-else-if="opdsImportState === 'browsing'">
                    <v-btn
                        color="primary"
                        @click="opdsImportDialogVisible = false"
                    >
                        关闭
                    </v-btn>
                    <v-btn
                        :disabled="selectedOpdsBooks.length === 0"
                        color="primary"
                        @click="importSelectedOpdsBooks"
                        :loading="opdsLoading"
                    >
                        导入选中书籍 ({{ selectedOpdsBooks.length }})
                    </v-btn>
                </template>
                
                <!-- 导入状态的按钮 -->
                <template v-else-if="opdsImportState === 'importing'">
                    <v-btn
                        color="primary"
                        variant="outlined"
                        disabled
                    >
                        正在导入...
                    </v-btn>
                </template>
                
                <!-- 完成状态的按钮 -->
                <template v-else-if="opdsImportState === 'completed'">
                    <v-btn
                        color="primary"
                        @click="handleOpdsImportComplete"
                    >
                        完成
                    </v-btn>
                </template>
                
                <!-- 错误状态的按钮 -->
                <template v-else-if="opdsImportState === 'error'">
                    <v-btn
                        color="primary"
                        @click="resetOpdsImportState"
                    >
                        返回连接界面
                    </v-btn>
                </template>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
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
const opdsHost = ref('');
const opdsPort = ref('');
const opdsPath = ref('');
const opdsImportState = ref('connecting'); // connecting, browsing, importing, completed, error
const currentOpdsPath = ref('');
const opdsItems = ref([]);
const selectedOpdsBooks = ref([]);
const opdsConnection = ref(null);
const opdsLoading = ref(false);
const opdsError = ref('');
const opdsImportProgress = ref({
    done: 0,
    total: 0,
    percent: 0
});
const opdsImportResult = ref({
    done: 0,
    fail: 0
});

// 计算面包屑导航
const breadcrumbs = computed(() => {
    const crumbs = [];
    
    // 添加根目录
    crumbs.push({
        title: '根目录',
        disabled: !currentOpdsPath.value,
        href: '#',
        click: () => navigateToRoot()
    });
    
    // 如果有当前路径，添加路径分段
    if (currentOpdsPath.value) {
        const segments = currentOpdsPath.value.split('/').filter(s => s);
        segments.forEach((segment, index) => {
            const path = '/' + segments.slice(0, index + 1).join('/');
            crumbs.push({
                title: segment,
                disabled: index === segments.length - 1,
                href: '#',
                click: () => navigateToPath(path)
            });
        });
    }
    
    return crumbs;
});

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
    resetOpdsImportState();
};

const connectToOpds = async () => {
    if (!opdsHost.value) {
        $alert('error', '请输入主机地址');
        return;
    }

    // 验证URL格式
    if (!opdsHost.value.startsWith('http://') && !opdsHost.value.startsWith('https://')) {
        $alert('error', '主机地址需要以 http:// 或 https:// 开头');
        return;
    }

    opdsLoading.value = true;
    opdsError.value = '';
    
    try {
        // 调用后端API浏览OPDS目录
        const response = await $backend('/admin/opds/browse', {
            method: 'POST',
            body: JSON.stringify({
                host: opdsHost.value,
                port: opdsPort.value,
                path: opdsPath.value
            }),
        });
        
        if (response.err === 'ok') {
            // 保存连接信息
            opdsConnection.value = response.current_path;
            currentOpdsPath.value = opdsPath.value || '';
            
            // 处理返回的项目列表
            opdsItems.value = response.items.map(item => {
                // 确保每个项目都有id
                if (!item.id && item.href) {
                    // 使用href生成一个简单的hash id
                    item.id = Math.abs(hashCode(item.href));
                }
                return item;
            });
            
            // 更新状态
            opdsImportState.value = 'browsing';
            $alert('success', '连接成功！');
        } else {
            opdsError.value = response.msg || '连接失败，请检查地址是否正确';
            opdsImportState.value = 'error';
            $alert('error', opdsError.value);
        }
    } catch (error) {
        opdsError.value = '连接失败：' + (error.message || '请检查地址是否正确');
        opdsImportState.value = 'error';
        $alert('error', opdsError.value);
    } finally {
        opdsLoading.value = false;
    }
};

// 简单的hash函数
const hashCode = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
    }
    return hash;
};

const navigateToOpdsFolder = async (folder) => {
    if (!folder.href) {
        $alert('error', '无法导航：缺少链接地址');
        return;
    }
    
    opdsLoading.value = true;
    
    try {
        // 解析href获取路径
        const url = new URL(folder.href);
        const path = url.pathname;
        
        // 调用后端API浏览该路径
        const response = await $backend('/admin/opds/browse', {
            method: 'POST',
            body: JSON.stringify({
                host: opdsHost.value,
                port: opdsPort.value,
                path: path
            }),
        });
        
        if (response.err === 'ok') {
            currentOpdsPath.value = path;
            opdsItems.value = response.items.map(item => {
                if (!item.id && item.href) {
                    item.id = Math.abs(hashCode(item.href));
                }
                return item;
            });
        } else {
            $alert('error', response.msg || '导航失败');
        }
    } catch (error) {
        $alert('error', '导航失败：' + error.message);
    } finally {
        opdsLoading.value = false;
    }
};

const navigateToRoot = async () => {
    opdsLoading.value = true;
    
    try {
        const response = await $backend('/admin/opds/browse', {
            method: 'POST',
            body: JSON.stringify({
                host: opdsHost.value,
                port: opdsPort.value,
                path: ''
            }),
        });
        
        if (response.err === 'ok') {
            currentOpdsPath.value = '';
            opdsItems.value = response.items.map(item => {
                if (!item.id && item.href) {
                    item.id = Math.abs(hashCode(item.href));
                }
                return item;
            });
        } else {
            $alert('error', response.msg || '返回根目录失败');
        }
    } catch (error) {
        $alert('error', '返回根目录失败：' + error.message);
    } finally {
        opdsLoading.value = false;
    }
};

const navigateToPath = async (path) => {
    opdsLoading.value = true;
    
    try {
        const response = await $backend('/admin/opds/browse', {
            method: 'POST',
            body: JSON.stringify({
                host: opdsHost.value,
                port: opdsPort.value,
                path: path
            }),
        });
        
        if (response.err === 'ok') {
            currentOpdsPath.value = path;
            opdsItems.value = response.items.map(item => {
                if (!item.id && item.href) {
                    item.id = Math.abs(hashCode(item.href));
                }
                return item;
            });
        } else {
            $alert('error', response.msg || '导航失败');
        }
    } catch (error) {
        $alert('error', '导航失败：' + error.message);
    } finally {
        opdsLoading.value = false;
    }
};

const goBackInOpdsPath = async () => {
    if (!currentOpdsPath.value) return;
    
    // 计算上级目录
    const pathSegments = currentOpdsPath.value.split('/').filter(segment => segment);
    pathSegments.pop(); // 移除最后一段
    const parentPath = '/' + pathSegments.join('/');
    
    opdsLoading.value = true;
    
    try {
        const response = await $backend('/admin/opds/browse', {
            method: 'POST',
            body: JSON.stringify({
                host: opdsHost.value,
                port: opdsPort.value,
                path: parentPath
            }),
        });
        
        if (response.err === 'ok') {
            currentOpdsPath.value = parentPath;
            opdsItems.value = response.items.map(item => {
                if (!item.id && item.href) {
                    item.id = Math.abs(hashCode(item.href));
                }
                return item;
            });
        } else {
            $alert('error', response.msg || '返回上级目录失败');
        }
    } catch (error) {
        $alert('error', '返回上级目录失败：' + error.message);
    } finally {
        opdsLoading.value = false;
    }
};

const importSelectedOpdsBooks = async () => {
    if (selectedOpdsBooks.value.length === 0) {
        $alert('error', '请至少选择一本书籍');
        return;
    }

    // 确认导入
    if (!confirm(`确定要导入选中的 ${selectedOpdsBooks.value.length} 本书籍吗？\n\n导入的书籍将添加到"待处理"列表中，您需要手动进行扫描和导入操作。`)) {
        return;
    }

    opdsLoading.value = true;
    opdsImportState.value = 'importing';
    
    // 初始化导入进度
    opdsImportProgress.value = {
        done: 0,
        total: selectedOpdsBooks.value.length,
        percent: 0
    };
    
    try {
        // 调用后端API导入选中的书籍
        const response = await $backend('/admin/opds/import', {
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
        });
        
        if (response.err === 'ok') {
            // 更新导入结果
            opdsImportResult.value = {
                done: response.total || selectedOpdsBooks.value.length,
                fail: 0
            };
            
            // 显示完成界面
            opdsImportState.value = 'completed';
            opdsImportProgress.value.percent = 100;
            opdsImportProgress.value.done = opdsImportResult.value.done;
            
            // 自动刷新主列表
            getDataFromApi();
        } else {
            $alert('error', response.msg || '导入失败');
            opdsImportState.value = 'browsing';
        }
    } catch (error) {
        $alert('error', '导入失败：' + error.message);
        opdsImportState.value = 'error';
        opdsError.value = '导入失败：' + error.message;
    } finally {
        opdsLoading.value = false;
    }
};

const checkOpdsImportProgress = () => {
    // 这里可以调用后端API检查导入进度
    // 由于后端可能没有实时进度API，我们使用模拟进度
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        opdsImportProgress.value.done = Math.floor(progress / 100 * opdsImportProgress.value.total);
        opdsImportProgress.value.percent = progress;
        
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                $alert('success', '书籍导入完成！');
                // 导入完成后关闭窗口
                opdsImportDialogVisible.value = false;
                // 刷新主列表
                getDataFromApi();
            }, 1000);
        }
    }, 500);
};

const handleOpdsImportComplete = () => {
    // 关闭窗口并重置状态
    opdsImportDialogVisible.value = false;
    
    // 提示用户进行扫描
    $alert('info', 'OPDS书籍已添加到扫描目录，请点击"扫描书籍"按钮进行识别。');
    
    // 重置状态
    resetOpdsImportState();
    
    // 刷新主列表
    getDataFromApi();
};

const resetOpdsImportState = () => {
    opdsImportState.value = 'connecting';
    currentOpdsPath.value = '';
    opdsItems.value = [];
    selectedOpdsBooks.value = [];
    opdsConnection.value = null;
    opdsHost.value = '';
    opdsPort.value = '';
    opdsPath.value = '';
    opdsError.value = '';
    opdsLoading.value = false;
    opdsImportProgress.value = {
        done: 0,
        total: 0,
        percent: 0
    };
    opdsImportResult.value = {
        done: 0,
        fail: 0
    };
};

onMounted(() => {
    getDataFromApi();
});

useHead({
    title: '导入图书'
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

/* 自定义滚动条样式 */
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

/* 确保复选框和内容对齐 */
.v-checkbox {
    margin: 0;
    padding: 0;
}
</style>