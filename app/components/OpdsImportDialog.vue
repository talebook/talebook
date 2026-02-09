<template>
    <!-- OPDS Import Dialog -->
    <v-dialog
        :model-value="dialogVisible"
        @update:model-value="(value) => emit('update:dialogVisible', value)"
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
                                @blur="autoFillPortFromHost"
                            />
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
                            />
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
                    />
                    <div class="text-body-2 text-gray-600 mt-2">
                        提示：通常OPDS服务地址类似 http://example.com:8080/opds 或 http://example.com/opds/root.xml
                        <br>注意：如果端口为空，系统会根据协议自动填充默认端口（HTTP: 80, HTTPS: 443）
                    </div>
                </div>
                
                <!-- 目录浏览界面 -->
                <div v-else-if="opdsImportState === 'browsing'">
                        <!-- 自定义面包屑导航 -->
                        <div class="mb-4">
                            <div class="d-flex align-center flex-wrap pa-0">
                                <v-icon size="small" class="mr-1">mdi-folder</v-icon>
                                <template v-for="(crumb, index) in breadcrumbs" :key="index">
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
                        <div class="pa-2" :style="{ minHeight: opdsItems.length === 0 ? '200px' : 'auto' }">
                            <!-- 加载动画 -->
                            <div 
                                v-if="opdsLoading && opdsItems.length === 0"
                                class="text-center py-12"
                            >
                                <v-progress-circular
                                    indeterminate
                                    color="primary"
                                    size="32"
                                ></v-progress-circular>
                                <div class="mt-4 text-body-1 text-gray-600">正在加载目录...</div>
                            </div>
                            
                            <!-- 返回上级目录 -->
                            <div 
                                v-if="currentOpdsPath !== '' && currentOpdsPath !== originalOpdsPath && !opdsLoading"
                                @click="goBackInOpdsPath"
                                class="flex items-center pa-3 hover:bg-gray-50 rounded cursor-pointer mb-1"
                            >
                                <v-icon class="mr-2" color="primary">mdi-arrow-left</v-icon>
                                <span class="text-body-1">返回上级目录</span>
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
                            </template>
                            
                            <!-- 空状态 -->
                            <div v-if="opdsItems.length === 0 && !opdsLoading" class="text-center py-8">
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
                        />
                        <div class="mt-4 text-h6">
                            正在导入书籍到待处理列表...
                        </div>
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
                        <v-icon
                            size="64"
                            color="success"
                        >
                            mdi-check-circle
                        </v-icon>
                        <div class="mt-4 text-h6 text-success">
                            导入完成！
                        </div>
                        <div class="mt-2 text-body-1">
                            成功导入 {{ opdsImportResult.done }} 本书籍到待处理列表
                        </div>
                        <div
                            v-if="opdsImportResult.fail > 0"
                            class="mt-2 text-body-1 text-warning"
                        >
                            失败 {{ opdsImportResult.fail }} 本
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
                                返回连接界面
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
import { ref, computed } from 'vue';

// Props
const props = defineProps({
    dialogVisible: {
        type: Boolean,
        default: false
    }
});

// Emits
const emit = defineEmits(['update:dialogVisible', 'refresh-data']);

const { $backend, $alert } = useNuxtApp();

// OPDS Import State
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
            return '关闭';
        case 'importing':
            return '正在导入...';
        case 'completed':
        case 'error':
            return '返回连接界面';
        default:
            return '关闭';
    }
});

// 计算右侧按钮文本
const rightButtonText = computed(() => {
    switch (opdsImportState.value) {
        case 'connecting':
            return '连接';
        case 'browsing':
            return '导入选中书籍';
        case 'importing':
            return '正在导入...';
        case 'completed':
            return '完成';
        case 'error':
            return '重试';
        default:
            return '操作';
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

// 计算面包屑导航 - 基于导航历史而不是URL路径
const breadcrumbs = computed(() => {
    const crumbs = [];
    
    // 添加根目录
    crumbs.push({
        title: '根目录',
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

// 左侧按钮点击处理
const handleLeftButtonClick = () => {
    switch (opdsImportState.value) {
        case 'connecting':
        case 'browsing':
            emit('update:dialogVisible', false);
            resetOpdsImportState();
            break;
        case 'completed':
            emit('update:dialogVisible', false);
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

    // 自动填充端口（如果未填写）
    if (!opdsPort.value) {
        autoFillPortFromHost();
    }

    // 验证端口号
    if (opdsPort.value) {
        const portNum = parseInt(opdsPort.value);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            $alert('error', '端口号必须在 1-65535 范围内');
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
            $alert('error', response.msg || '导航失败');
        }
    } catch (error) {
        $alert('error', '导航失败：' + error.message);
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
                    // 触发数据刷新
                    emit('refresh-data');
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
            // 立即触发数据刷新以显示刚刚插入的下载项
            emit('refresh-data');
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
    emit('update:dialogVisible', false);
    
    // 提示用户进行扫描
    $alert('info', 'OPDS书籍已添加到扫描目录，请点击"扫描书籍"按钮进行识别。');
    
    // 重置状态
    resetOpdsImportState();
    
    // 触发数据刷新
    emit('refresh-data');
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
    navigationHistory.value = [];
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