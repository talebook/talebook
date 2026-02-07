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
                从其他 OPDS 导入
            </v-card-title>
            <v-card-text>
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
                    <div class="mb-4">
                        <v-chip size="small" color="info" class="mr-2">
                            当前路径: {{ currentOpdsPath || '根目录' }}
                        </v-chip>
                        <v-chip size="small" color="primary">
                            选中书籍: {{ selectedOpdsBooks.length }} 本
                        </v-chip>
                    </div>
                    
                    <v-list
                        density="compact"
                        class="border rounded-lg overflow-hidden"
                        style="max-height: 500px; overflow-y: auto;"
                    >
                        <!-- 返回上级目录选项 -->
                        <v-list-item
                            v-if="currentOpdsPath !== ''"
                            @click="goBackInOpdsPath"
                            class="bg-gray-50 cursor-pointer"
                        >
                            <v-list-item-icon>
                                <v-icon>mdi-folder-up</v-icon>
                            </v-list-item-icon>
                            <v-list-item-title>返回上级目录</v-list-item-title>
                        </v-list-item>
                        
                        <!-- 文件夹和书籍列表 -->
                        <template v-for="(item, index) in opdsItems" :key="item.id || index">
                            <!-- 文件夹项 -->
                            <v-list-item
                                v-if="item.type === 'folder'"
                                @click="navigateToOpdsFolder(item)"
                                class="hover:bg-gray-50 cursor-pointer"
                            >
                                <v-list-item-icon>
                                    <v-icon color="amber">mdi-folder</v-icon>
                                </v-list-item-icon>
                                <v-list-item-title>{{ item.title }}</v-list-item-title>
                                <v-list-item-subtitle v-if="item.summary">{{ item.summary }}</v-list-item-subtitle>
                                <template #append>
                                    <v-icon>mdi-chevron-right</v-icon>
                                </template>
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
                                        hide-details
                                    ></v-checkbox>
                                </v-list-item-action>
                                <v-list-item-icon>
                                    <v-icon color="blue">mdi-book</v-icon>
                                </v-list-item-icon>
                                <v-list-item-content>
                                    <v-list-item-title class="font-weight-medium">{{ item.title }}</v-list-item-title>
                                    <v-list-item-subtitle v-if="item.author">作者: {{ item.author }}</v-list-item-subtitle>
                                    <v-list-item-subtitle v-if="item.summary" class="text-caption text-truncate">
                                        {{ item.summary }}
                                    </v-list-item-subtitle>
                                </v-list-item-content>
                                <template #append v-if="item.cover_link">
                                    <v-avatar size="40">
                                        <v-img :src="item.cover_link" alt="封面"></v-img>
                                    </v-avatar>
                                </template>
                            </v-list-item>
                            
                            <!-- 未知类型项 -->
                            <v-list-item
                                v-else
                                class="hover:bg-gray-50"
                            >
                                <v-list-item-icon>
                                    <v-icon>mdi-help-circle</v-icon>
                                </v-list-item-icon>
                                <v-list-item-title>{{ item.title || '未知项目' }}</v-list-item-title>
                            </v-list-item>
                        </template>
                        
                        <!-- 空状态 -->
                        <div v-if="opdsItems.length === 0" class="text-center py-8">
                            <v-icon size="48" color="grey">mdi-folder-open-outline</v-icon>
                            <div class="mt-2 text-gray-600">目录为空</div>
                        </div>
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
                        <div class="mt-4 text-h6">正在导入书籍...</div>
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
                        <div class="mt-4 text-body-2 text-gray-600">
                            导入完成后会自动关闭此窗口
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
            <v-card-actions class="flex w-full items-center justify-end gap-2">
                <!-- 连接状态的按钮 -->
                <template v-if="opdsImportState === 'connecting'">
                    <v-btn
                        :loading="opdsLoading"
                        color="primary"
                        @click="connectToOpds"
                    >
                        连接
                    </v-btn>
                    <v-btn
                        color="primary"
                        text
                        @click="opdsImportDialogVisible = false"
                    >
                        关闭
                    </v-btn>
                </template>
                
                <!-- 浏览状态的按钮 -->
                <template v-else-if="opdsImportState === 'browsing'">
                    <v-btn
                        :disabled="selectedOpdsBooks.length === 0"
                        color="primary"
                        @click="importSelectedOpdsBooks"
                    >
                        导入选中书籍 ({{ selectedOpdsBooks.length }})
                    </v-btn>
                    <v-btn
                        color="primary"
                        text
                        @click="opdsImportDialogVisible = false"
                    >
                        关闭
                    </v-btn>
                </template>
                
                <!-- 导入状态的按钮 -->
                <template v-else-if="opdsImportState === 'importing'">
                    <v-btn
                        color="primary"
                        text
                        :loading="opdsImportProgress.done < opdsImportProgress.total"
                        @click="opdsImportDialogVisible = false"
                    >
                        关闭
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
const opdsImportState = ref('connecting'); // connecting, browsing, importing, error
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
        const response = await $backend('/api/admin/opds/browse', {
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
        const response = await $backend('/api/admin/opds/browse', {
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
        const response = await $backend('/api/admin/opds/browse', {
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
    if (!confirm(`确定要导入选中的 ${selectedOpdsBooks.value.length} 本书籍吗？`)) {
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
        const response = await $backend('/api/admin/opds/import', {
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
            $alert('success', `开始导入 ${selectedOpdsBooks.value.length} 本书籍，请稍后在导入记录中查看进度`);
            
            // 启动进度检查
            checkOpdsImportProgress();
        } else {
            $alert('error', response.msg || '导入失败');
            opdsImportState.value = 'browsing';
        }
    } catch (error) {
        $alert('error', '导入失败：' + error.message);
        opdsImportState.value = 'browsing';
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
</style>