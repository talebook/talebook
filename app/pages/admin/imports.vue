<template>
    <v-card>
        <v-card-title>
            {{ t('admin.imports.title') }} <v-chip
                size="small"
                variant="elevated"
                color="primary ml-2"
            >
                Beta
            </v-chip>
        </v-card-title>
        <v-card-text>
            {{ t('admin.imports.message.importDirInfo', [scan_dir]) }}<br>
            {{ t('admin.imports.message.importAsyncInfo') }}<br>
            {{ t('admin.imports.message.calibreInfo') }}
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
                :disabled="loading"
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
                    :disabled="loading"
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
                    :disabled="loading"
                    variant="elevated"
                    color="warning"
                    @click="import_books"
                >
                    <v-icon start>
                        mdi-import
                    </v-icon>{{ t('admin.imports.button.importAllBooks') }}
                </v-btn>
            </template>
            <v-spacer />
            <v-checkbox
                v-model="delete_after_import"
                :label="t('admin.imports.label.deleteAfterImport')"
                color="primary"
                hide-details
            />
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
                    v-else-if="item.status == 'imported'"
                    size="small"
                    color="primary"
                >
                    {{ t('admin.imports.status.imported') }}
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

    <!-- OPDS Import Dialog -->
    <v-dialog
        v-model="opdsImportDialogVisible"
        width="800"
        max-height="90vh"
    >
        <v-card>
            <v-card-title>
                {{ t('admin.button.importFromOpds') }}
                <v-spacer />
                <v-chip
                    v-if="opdsImportState === 'browsing' && selectedOpdsBooks.length > 0"
                    color="primary"
                    size="small"
                >
                    {{ t('admin.imports.message.selectedCount') }}
                </v-chip>
            </v-card-title>
            <v-card-text style="padding: 16px;">
                <!-- 连接信息填写界面 -->
                <div v-if="opdsImportState === 'connecting'">
                    <v-row>
                        <v-col cols="8">
                            <v-text-field
                                v-model="opdsHost"
                                :label="t('admin.label.host')"
                                :placeholder="t('admin.placeholder.host')"
                                variant="outlined"
                                full-width
                                @keyup.enter="connectToOpds"
                                @blur="autoFillPortFromHost"
                            />
                        </v-col>
                        <v-col cols="4">
                            <v-text-field
                                v-model="opdsPort"
                                :label="t('admin.label.port')"
                                :placeholder="t('admin.placeholder.port')"
                                variant="outlined"
                                full-width
                                type="number"
                                @keyup.enter="connectToOpds"
                            />
                        </v-col>
                    </v-row>
                    <v-text-field
                        v-model="opdsPath"
                        :label="t('admin.label.path')"
                        :placeholder="t('admin.placeholder.path')"
                        variant="outlined"
                        full-width
                        class="mt-4"
                        @keyup.enter="connectToOpds"
                    />
                    <div class="text-body-2 text-gray-600 mt-2">
                        {{ t('admin.imports.message.opdsTip') }}
                        <br>{{ t('admin.imports.message.opdsPortTip') }}
                    </div>
                </div>
                
                <!-- 目录浏览界面 -->
                <div v-else-if="opdsImportState === 'browsing'">
                    <!-- 自定义面包屑导航 -->
                    <div class="mb-4">
                        <div class="d-flex align-center flex-wrap pa-0">
                            <v-icon
                                size="small"
                                class="mr-1"
                            >
                                mdi-folder
                            </v-icon>
                            <template
                                v-for="(crumb, index) in breadcrumbs"
                                :key="index"
                            >
                                <div 
                                    class="d-flex align-center"
                                >
                                    <span 
                                        class="text-body-2"
                                        :class="{
                                            'text-black cursor-pointer hover:underline hover:text-primary': !crumb.disabled,
                                            'text-gray-500': crumb.disabled
                                        }"
                                        @click.stop="handleBreadcrumbClick(crumb, index)"
                                    >
                                        {{ crumb.title }}
                                    </span>
                                    <v-icon 
                                        v-if="index < breadcrumbs.length - 1" 
                                        size="small" 
                                        class="mx-1"
                                    >
                                        mdi-chevron-right
                                    </v-icon>
                                </div>
                            </template>
                        </div>
                    </div>
                    
                    <!-- 目录内容区域 -->
                    <div 
                        class="border rounded-lg"
                        style="max-height: 400px; min-height: 200px; overflow-y: auto; position: relative;"
                    >
                        <div
                            class="pa-2"
                            :style="{ minHeight: opdsItems.length === 0 ? '200px' : 'auto' }"
                        >
                            <!-- 加载动画 -->
                            <div 
                                v-if="opdsLoading && opdsItems.length === 0"
                                class="text-center py-12"
                            >
                                <v-progress-circular
                                    indeterminate
                                    color="primary"
                                    size="32"
                                />
                                <div class="mt-4 text-body-1 text-gray-600">
                                    {{ t('admin.imports.message.loadingDirectory') }}
                                </div>
                            </div>
                            
                            <!-- 返回上级目录 -->
                            <div 
                                v-if="currentOpdsPath !== '' && currentOpdsPath !== originalOpdsPath && !opdsLoading"
                                class="flex items-center pa-3 hover:bg-gray-50 rounded cursor-pointer mb-1"
                                @click="goBackInOpdsPath"
                            >
                                <v-icon
                                    class="mr-2"
                                    color="primary"
                                >
                                    mdi-arrow-left
                                </v-icon>
                                <span class="text-body-1">{{ t('admin.imports.message.backToParent') }}</span>
                            </div>
                            
                            <!-- 项目列表 -->
                            <template v-if="!opdsLoading">
                                <div 
                                    v-for="(item, index) in opdsItems" 
                                    :key="item.id || index"
                                    class="mb-1"
                                >
                                    <!-- 文件夹 -->
                                    <div
                                        v-if="item.type === 'folder' || (!item.type && item.href)"
                                        class="flex items-center pa-3 hover:bg-gray-50 rounded cursor-pointer"
                                        @click="navigateToOpdsFolder(item)"
                                    >
                                        <v-icon
                                            class="mr-3"
                                            color="amber"
                                        >
                                            mdi-folder
                                        </v-icon>
                                        <div class="flex-grow">
                                            <div class="font-weight-medium text-body-1">
                                                {{ item.title }}
                                            </div>
                                            <div
                                                v-if="item.summary"
                                                class="text-caption text-gray-600"
                                            >
                                                {{ item.summary }}
                                            </div>
                                        </div>
                                        <v-icon size="small">
                                            mdi-chevron-right
                                        </v-icon>
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
                                            />
                                        </div>
                                        
                                        <!-- 书籍图标 -->
                                        <v-icon
                                            class="mr-3"
                                            color="blue"
                                            size="small"
                                        >
                                            mdi-book
                                        </v-icon>
                                        
                                        <!-- 书籍信息 -->
                                        <div class="flex-grow min-w-0">
                                            <div class="font-weight-medium text-body-1 truncate">
                                                {{ item.title }}
                                            </div>
                                            <div
                                                v-if="item.author"
                                                class="text-caption text-gray-600"
                                            >
                                                {{ t('admin.imports.label.author') }}: {{ item.author }}
                                            </div>
                                            <div
                                                v-if="item.summary"
                                                class="text-caption text-gray-500 truncate"
                                            >
                                                {{ item.summary }}
                                            </div>
                                        </div>
                                        
                                        <!-- 封面图片 -->
                                        <div
                                            v-if="item.cover_link"
                                            class="ml-3 flex-shrink-0"
                                        >
                                            <v-avatar
                                                size="40"
                                                rounded="sm"
                                            >
                                                <v-img 
                                                    :src="item.cover_link" 
                                                    :alt="t('admin.imports.label.cover')"
                                                    cover
                                                />
                                            </v-avatar>
                                        </div>
                                    </div>
                                </div>
                            </template>
                            
                            <!-- 空状态 -->
                            <div
                                v-if="opdsItems.length === 0 && !opdsLoading"
                                class="text-center py-8"
                            >
                                <v-icon
                                    size="48"
                                    color="grey"
                                >
                                    mdi-folder-open-outline
                                </v-icon>
                                <div class="mt-2 text-gray-600">
                                    {{ t('admin.imports.message.emptyDirectory') }}
                                </div>
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
                        />
                        <div class="mt-4 text-h6">
                            {{ t('admin.imports.message.importingBooks') }}
                        </div>
                        <div class="mt-2 text-body-1">
                            {{ t('admin.imports.message.importProgress') }}
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
                            <v-alert
                                type="info"
                                variant="tonal"
                                class="text-left"
                            >
                                <div class="text-body-2">
                                    <v-icon
                                        color="info"
                                        size="small"
                                    >
                                        mdi-information
                                    </v-icon>
                                    {{ t('admin.imports.message.importToTodo') }}
                                </div>
                                <div class="text-body-2 mt-1">
                                    {{ t('admin.imports.message.importAfterScan') }}
                                </div>
                            </v-alert>
                        </div>
                    </div>
                </div>
                
                <!-- 导入完成界面 -->
                <div v-else-if="opdsImportState === 'completed'">
                    <div class="text-center py-8">
                        <v-icon
                            size="64"
                            color="success"
                        >
                            mdi-check-circle
                        </v-icon>
                        <div class="mt-4 text-h6 text-success">
                            {{ t('admin.imports.message.importCompleted') }}
                        </div>
                        <div class="mt-2 text-body-1">
                            {{ t('admin.imports.message.importSuccess') }}
                        </div>
                        <div
                            v-if="opdsImportResult.fail > 0"
                            class="mt-2 text-body-1 text-warning"
                        >
                            {{ t('admin.imports.message.importFailed') }}
                        </div>
                        <div class="mt-4">
                            <v-alert
                                type="success"
                                variant="tonal"
                                class="text-left"
                            >
                                <div class="text-body-2">
                                    <v-icon
                                        color="success"
                                        size="small"
                                    >
                                        mdi-check
                                    </v-icon>
                                    {{ t('admin.imports.message.booksAddedToScanDir') }}
                                </div>
                                <div class="text-body-2 mt-1">
                                    {{ t('admin.imports.message.importNextSteps') }}
                                    <ol class="mt-2 pl-4">
                                        <li>{{ t('admin.imports.message.importStep1') }}</li>
                                        <li>{{ t('admin.imports.message.importStep2') }}</li>
                                        <li>{{ t('admin.imports.message.importStep3') }}</li>
                                        <li>{{ t('admin.imports.message.importStep4') }}</li>
                                    </ol>
                                </div>
                            </v-alert>
                        </div>
                    </div>
                </div>
                
                <!-- 错误状态 -->
                <div v-else-if="opdsImportState === 'error'">
                    <div class="text-center py-8">
                        <v-icon
                            size="64"
                            color="error"
                        >
                            mdi-alert-circle
                        </v-icon>
                        <div class="mt-4 text-h6 text-error">
                            {{ opdsError }}
                        </div>
                        <div class="mt-4">
                            <v-btn
                                color="primary"
                                @click="resetOpdsImportState"
                            >
                                {{ t('admin.imports.message.backToConnect') }}
                            </v-btn>
                        </div>
                    </div>
                </div>
            </v-card-text>
            <v-card-actions class="flex w-full items-center justify-end gap-2 pa-4">
                <!-- 统一的按钮 -->
                <v-btn
                    color="primary"
                    variant="outlined"
                    :disabled="isLeftButtonDisabled"
                    @click="handleLeftButtonClick"
                >
                    {{ leftButtonText }}
                </v-btn>
                <v-btn
                    :loading="isRightButtonLoading"
                    :disabled="isRightButtonDisabled"
                    color="primary"
                    @click="handleRightButtonClick"
                >
                    {{ rightButtonText }}
                    <template v-if="opdsImportState === 'browsing' && selectedOpdsBooks.length > 0">
                        ({{ selectedOpdsBooks.length }})
                    </template>
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';

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
const opdsHost = ref('');
const opdsPort = ref('');
const opdsPath = ref('');
const opdsImportState = ref('connecting'); // connecting, browsing, importing, completed, error
const currentOpdsPath = ref('');
const originalOpdsPath = ref(''); // 保存用户输入的原始路径作为根目录
const opdsItems = ref([]);
const selectedOpdsBooks = ref([]);
const opdsConnection = ref(null);
const opdsLoading = ref(false);
const opdsError = ref('');

// 新增：存储导航历史，用于构建面包屑
const navigationHistory = ref([]);

const opdsImportProgress = ref({
    done: 0,
    total: 0,
    percent: 0
});
const opdsImportResult = ref({
    done: 0,
    fail: 0
});

// 计算左侧按钮文本
const leftButtonText = computed(() => {
    switch (opdsImportState.value) {
        case 'connecting':
        case 'browsing':
            return t('common.close');
        case 'importing':
            return t('admin.imports.message.importingBooks');
        case 'completed':
        case 'error':
            return t('admin.imports.message.backToConnect');
        default:
            return t('common.close');
    }
});

// 计算右侧按钮文本
const rightButtonText = computed(() => {
    switch (opdsImportState.value) {
        case 'connecting':
            return t('admin.imports.message.connect');
        case 'browsing':
            return t('admin.imports.button.importSelectedBooks');
        case 'importing':
            return t('admin.imports.message.importingBooks');
        case 'completed':
            return t('common.done');
        case 'error':
            return t('common.retry');
        default:
            return t('common.action');
    }
});

// 计算左侧按钮是否禁用
const isLeftButtonDisabled = computed(() => {
    return opdsImportState.value === 'importing';
});

// 计算右侧按钮是否禁用
const isRightButtonDisabled = computed(() => {
    switch (opdsImportState.value) {
        case 'connecting':
            return false;
        case 'browsing':
            return selectedOpdsBooks.value.length === 0;
        case 'importing':
            return true;
        default:
            return false;
    }
});

// 计算右侧按钮是否显示加载状态
const isRightButtonLoading = computed(() => {
    return opdsLoading.value || opdsImportState.value === 'importing';
});

// 新增：使用computed替代多个ref来同步状态
const isImporting = computed(() => opdsImportState.value === 'importing');
const isConnecting = computed(() => opdsImportState.value === 'connecting');
const isBrowsing = computed(() => opdsImportState.value === 'browsing');
const isCompleted = computed(() => opdsImportState.value === 'completed');
const isError = computed(() => opdsImportState.value === 'error');

// 计算导入是否正在进行中
const isOpdsOperationInProgress = computed(() => {
    return opdsLoading.value || opdsImportState.value === 'importing';
});

// 左侧按钮点击处理
const handleLeftButtonClick = () => {
    switch (opdsImportState.value) {
        case 'connecting':
        case 'browsing':
            opdsImportDialogVisible.value = false;
            break;
        case 'completed':
            opdsImportDialogVisible.value = false;
            resetOpdsImportState();
            break;
        case 'error':
            resetOpdsImportState();
            break;
    }
};

// 右侧按钮点击处理
const handleRightButtonClick = () => {
    switch (opdsImportState.value) {
        case 'connecting':
            connectToOpds();
            break;
        case 'browsing':
            importSelectedOpdsBooks();
            break;
        case 'completed':
            handleOpdsImportComplete();
            break;
        case 'error':
            if (currentOpdsPath.value) {
                // 如果是导航错误，重试连接
                connectToOpds();
            } else {
                // 如果是连接错误，重置状态
                resetOpdsImportState();
            }
            break;
    }
};

// 计算面包屑导航 - 基于导航历史而不是URL路径
const breadcrumbs = computed(() => {
    const crumbs = [];
    
    // 添加根目录
    crumbs.push({
        title: t('admin.imports.message.rootDirectory'),
        disabled: navigationHistory.value.length === 0,
        path: originalOpdsPath.value
    });
    
    // 添加导航历史中的项目
    navigationHistory.value.forEach((item, index) => {
        crumbs.push({
            title: item.title,
            disabled: index === navigationHistory.value.length - 1,
            path: item.path
        });
    });
    
    return crumbs;
});

// 处理面包屑点击
const handleBreadcrumbClick = (crumb, index) => {
    if (crumb.disabled) return;
    
    if (index === 0) {
        // 点击根目录
        navigateToOriginalPath();
    } else {
        // 点击其他面包屑
        navigateToPath(crumb.path);
    }
};

const headers = computed(() => [
    { title: 'ID', key: 'id', sortable: true },
    { title: t('admin.imports.label.status'), key: 'status', sortable: true },
    { title: t('admin.imports.label.path'), key: 'path', sortable: true },
    { title: t('admin.imports.label.scanInfo'), key: 'title', sortable: false },
    { title: t('admin.imports.label.time'), key: 'create_time', sortable: true, width: '200px' },
]);

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

// 从主机地址自动填充端口号
const autoFillPortFromHost = () => {
    if (!opdsHost.value || opdsPort.value) {
        // 如果主机地址为空或已经填写了端口，则不自动填充
        return;
    }

    try {
        // 解析URL
        let urlString = opdsHost.value;
        
        // 确保URL有协议前缀
        if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
            // 如果不以协议开头，尝试添加http://
            urlString = 'http://' + urlString;
            opdsHost.value = urlString;
        }
        
        // 创建URL对象
        const url = new URL(urlString);
        
        // 获取端口号
        let port = url.port;
        
        if (!port) {
            // 如果没有明确指定端口，根据协议设置默认端口
            if (url.protocol === 'https:') {
                port = '443';
            } else if (url.protocol === 'http:') {
                port = '80';
            }
        }
        
        // 设置端口号
        if (port) {
            opdsPort.value = port;
        }
    } catch (error) {
        console.log('自动填充端口失败:', error);
        // 如果URL解析失败，保持现状
    }
};

const connectToOpds = async () => {
    if (!opdsHost.value) {
        $alert('error', t('admin.imports.message.enterHost'));
        return;
    }

    // 验证URL格式
    if (!opdsHost.value.startsWith('http://') && !opdsHost.value.startsWith('https://')) {
        $alert('error', t('admin.imports.message.hostProtocol'));
        return;
    }

    // 自动填充端口（如果未填写）
    if (!opdsPort.value) {
        autoFillPortFromHost();
    }

    // 验证端口号
    if (opdsPort.value) {
        const portNum = parseInt(opdsPort.value);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            $alert('error', t('admin.imports.message.portRange'));
            return;
        }
    }

    opdsLoading.value = true;
    opdsError.value = '';
    
    try {
        // 保存原始路径作为根目录
        originalOpdsPath.value = opdsPath.value || '';
        
        // 重置导航历史
        navigationHistory.value = [];
        
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
            currentOpdsPath.value = originalOpdsPath.value; // 使用原始路径作为当前路径
            
            // 处理返回的项目列表
            opdsItems.value = response.items.map(item => {
                // 确保每个项目都有id
                if (!item.id && item.href) {
                    // 使用href生成一个简单的hash id
                    item.id = Math.abs(hashCode(item.href));
                }
                // 提取路径信息用于显示
                if (item.href) {
                    try {
                        const url = new URL(item.href);
                        item.path = url.pathname;
                    } catch (e) {
                        item.path = item.href;
                    }
                }
                return item;
            });
            
            // 更新状态
            opdsImportState.value = 'browsing';
            $alert('success', t('admin.imports.message.connectSuccess'));
        } else {
            opdsError.value = response.msg || t('admin.imports.message.connectFailedCheckAddress');
            opdsImportState.value = 'error';
            $alert('error', opdsError.value);
        }
    } catch (error) {
        opdsError.value = t('admin.imports.message.connectFailed') + (error.message || t('admin.imports.message.checkAddress'));
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
        $alert('error', t('admin.imports.message.cannotNavigateMissingLink'));
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
            
            // 将文件夹信息添加到导航历史
            navigationHistory.value.push({
                title: folder.title,
                path: path
            });
            
            opdsItems.value = response.items.map(item => {
                if (!item.id && item.href) {
                    item.id = Math.abs(hashCode(item.href));
                }
                // 提取路径信息用于显示
                if (item.href) {
                    try {
                        const url = new URL(item.href);
                        item.path = url.pathname;
                    } catch (e) {
                        item.path = item.href;
                    }
                }
                return item;
            });
        } else {
            $alert('error', response.msg || t('admin.imports.message.navigateFailed'));
        }
    } catch (error) {
        $alert('error', t('admin.imports.message.navigateFailed') + error.message);
    } finally {
        opdsLoading.value = false;
    }
};

const navigateToOriginalPath = async () => {
    // 导航到原始路径（用户输入的路径）
    opdsLoading.value = true;
    
    try {
        const response = await $backend('/admin/opds/browse', {
            method: 'POST',
            body: JSON.stringify({
                host: opdsHost.value,
                port: opdsPort.value,
                path: originalOpdsPath.value
            }),
        });
        
        if (response.err === 'ok') {
            currentOpdsPath.value = originalOpdsPath.value;
            
            // 清空导航历史（回到根目录）
            navigationHistory.value = [];
            
            // 处理返回的项目列表
            opdsItems.value = response.items.map(item => {
                if (!item.id && item.href) {
                    item.id = Math.abs(hashCode(item.href));
                }
                // 提取路径信息用于显示
                if (item.href) {
                    try {
                        const url = new URL(item.href);
                        item.path = url.pathname;
                    } catch (e) {
                        item.path = item.href;
                    }
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

const navigateToRoot = async () => {
    // 导航到根目录（空的路径）
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
            originalOpdsPath.value = ''; // 更新原始路径
            opdsItems.value = response.items.map(item => {
                if (!item.id && item.href) {
                    item.id = Math.abs(hashCode(item.href));
                }
                // 提取路径信息用于显示
                if (item.href) {
                    try {
                        const url = new URL(item.href);
                        item.path = url.pathname;
                    } catch (e) {
                        item.path = item.href;
                    }
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
    // 确保路径格式正确
    let cleanPath = path;
    if (cleanPath && !cleanPath.startsWith('/')) {
        cleanPath = '/' + cleanPath;
    }
    cleanPath = cleanPath.replace(/\/+/g, '/');
    
    opdsLoading.value = true;
    
    try {
        const response = await $backend('/admin/opds/browse', {
            method: 'POST',
            body: JSON.stringify({
                host: opdsHost.value,
                port: opdsPort.value,
                path: cleanPath
            }),
        });
        
        if (response.err === 'ok') {
            currentOpdsPath.value = cleanPath;
            
            // 重建导航历史
            const newHistory = [];
            
            // 从原始路径开始构建
            if (cleanPath !== originalOpdsPath.value) {
                // 我们需要知道这个路径对应的文件夹名称
                // 这里简化处理，使用路径的最后一部分作为名称
                const pathSegments = cleanPath.split('/').filter(s => s);
                const originalSegments = originalOpdsPath.value.split('/').filter(s => s);
                
                // 只添加相对于原始路径的部分
                for (let i = originalSegments.length; i < pathSegments.length; i++) {
                    // 这里需要知道每个文件夹的实际名称
                    // 由于我们没有保存每个文件夹的名称，这里使用路径段作为名称
                    newHistory.push({
                        title: pathSegments[i] || '未知文件夹',
                        path: '/' + pathSegments.slice(0, i + 1).join('/')
                    });
                }
            }
            
            navigationHistory.value = newHistory;
            
            opdsItems.value = response.items.map(item => {
                if (!item.id && item.href) {
                    item.id = Math.abs(hashCode(item.href));
                }
                // 提取路径信息用于显示
                if (item.href) {
                    try {
                        const url = new URL(item.href);
                        item.path = url.pathname;
                    } catch (e) {
                        item.path = item.href;
                    }
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
    if (!currentOpdsPath.value || currentOpdsPath.value === originalOpdsPath.value) return;
    
    // 计算上级目录路径
    let parentPath = '';
    if (navigationHistory.value.length > 1) {
        // 从导航历史获取上一级路径
        parentPath = navigationHistory.value[navigationHistory.value.length - 2].path;
    } else if (navigationHistory.value.length === 1) {
        // 回到根目录
        parentPath = originalOpdsPath.value;
    } else {
        // 直接计算上级路径
        const pathSegments = currentOpdsPath.value.split('/').filter(segment => segment);
        pathSegments.pop(); // 移除最后一段
        parentPath = '/' + pathSegments.join('/');
    }
    
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
            
            // 更新导航历史：移除最后一项
            if (navigationHistory.value.length > 0) {
                navigationHistory.value.pop();
            }
            
            opdsItems.value = response.items.map(item => {
                if (!item.id && item.href) {
                    item.id = Math.abs(hashCode(item.href));
                }
                // 提取路径信息用于显示
                if (item.href) {
                    try {
                        const url = new URL(item.href);
                        item.path = url.pathname;
                    } catch (e) {
                        item.path = item.href;
                    }
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
    
    // 轮询间隔（毫秒）
    const pollInterval = 2000;
    let pollTimer = null;
    
    const pollImportStatus = async () => {
        try {
            const statusResp = await $backend('/admin/opds/import/status');
            if (statusResp.err === 'ok' && statusResp.status) {
                const { total, done, skip, fail } = statusResp.status;
                // 更新进度
                opdsImportProgress.value.total = total || selectedOpdsBooks.value.length;
                opdsImportProgress.value.done = done || 0;
                opdsImportProgress.value.percent = total > 0 ? Math.round((done / total) * 100) : 0;
                
                // 如果导入完成（done >= total 或 total > 0 且 done + skip + fail >= total）
                const completed = (total > 0 && (done + skip + fail >= total)) || 
                                  (total === 0 && done > 0);
                if (completed) {
                    clearInterval(pollTimer);
                    opdsImportResult.value = {
                        done: done,
                        fail: fail
                    };
                    opdsImportState.value = 'completed';
                    opdsImportProgress.value.percent = 100;
                    opdsImportProgress.value.done = done;
                    // 自动刷新主列表
                    getDataFromApi();
                    opdsLoading.value = false;
                }
            }
        } catch (error) {
            console.warn('轮询导入状态失败:', error);
        }
    };
    
    try {
        // 调用后端API导入选中的书籍（异步）
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
            // 启动轮询
            pollTimer = setInterval(pollImportStatus, pollInterval);
            // 立即轮询一次
            setTimeout(pollImportStatus, 500);
            // 立即刷新待处理列表以显示刚刚插入的下载项
            getDataFromApi();
        } else {
            $alert('error', response.msg || '导入失败');
            opdsImportState.value = 'browsing';
            opdsLoading.value = false;
        }
    } catch (error) {
        $alert('error', '导入失败：' + error.message);
        opdsImportState.value = 'error';
        opdsError.value = '导入失败：' + error.message;
        opdsLoading.value = false;
        if (pollTimer) clearInterval(pollTimer);
    }
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
    originalOpdsPath.value = ''; // 重置原始路径
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

useHead(() => ({
    title: t('admin.imports.title')
}));
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