<template>
    <div>
        <v-btn
            class="upload-btn"
            color="pink"
            icon="mdi-upload"
            size="large"
            elevation="4"
            :aria-label="$t('messages.uploadBooks')"
            @click="dialog = !dialog"
        />
        <v-dialog
            v-model="dialog"
            persistent
            transition="dialog-bottom-transition"
            width="300"
        >
            <v-card>
                <v-toolbar
                    flat
                    density="compact"
                    color="primary"
                >
                    <v-toolbar-title>{{ $t('messages.uploadBooks') }}</v-toolbar-title>
                    <v-spacer />
                    <v-btn
                        variant="text"
                        @click="dialog = false"
                    >
                        {{ $t('messages.dialogClose') }}
                    </v-btn>
                </v-toolbar>
                <v-card-text>
                    <p>{{ $t('messages.uploadNotice') }}</p>
                    <p class="text-caption text-medium-emphasis mb-3">
                        {{ $t('book.supportedFormatsUpload') }}
                    </p>
                    <v-form
                        ref="form"
                        @submit.prevent="do_upload"
                    >
                        <v-file-input
                            v-model="ebooks"
                            :label="$t('messages.selectEbook')"
                            accept=".epub,.mobi,.azw,.azw3,.pdf,.txt,.cbz,.zip,.cbr,.rar"
                        />
                    </v-form>
                    <v-progress-linear
                        v-if="loading && progress > 0"
                        :model-value="progress"
                        :color="stage === 'merging' ? 'amber-darken-2' : 'primary'"
                        height="20"
                        rounded
                        :striped="stage === 'uploading'"
                        :indeterminate="stage === 'merging'"
                    >
                        <template #default>
                            <strong v-if="stage === 'merging'">
                                {{ $t('messages.uploadMerging') }}
                            </strong>
                            <strong v-else>
                                {{ $t('messages.uploadProgress', { percent: progress }) }}
                            </strong>
                        </template>
                    </v-progress-linear>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        :loading="loading"
                        color="primary"
                        @click="do_upload"
                    >
                        {{ $t('actions.upload') }}
                    </v-btn>
                    <v-spacer />
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';

const { $backend, $alert } = useNuxtApp();
const { t } = useI18n();
const router = useRouter();
const store = useMainStore();

const loading = ref(false);
const dialog = ref(false);
const ebooks = ref(null);
const progress = ref(0);
// 上传阶段状态：uploading（分片上传中）/ merging（分片已传完，正在合并）
const stage = ref(null);

// 是否启用分片上传，及分片阈值/分片大小，均可在管理后台自定义（webserver 通过 sys.upload 下发）
const CHUNK_ENABLED = computed(() => store.sys?.upload?.chunk_enabled ?? true);
// 超过该大小的文件才走分片上传，避免小文件多一次网络往返
const CHUNK_THRESHOLD = computed(() => store.sys?.upload?.chunk_threshold ?? 8 * 1024 * 1024);
// 单个分片大小，需小于反代（如 Cloudflare 免费版）100MB 的单请求体积限制
const CHUNK_SIZE = computed(() => store.sys?.upload?.chunk_size ?? 4 * 1024 * 1024);

function generateUploadId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID().replace(/-/g, '');
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function uploadWhole(file) {
    const data = new FormData();
    data.append('ebook', file, encodeURIComponent(file.name || 'upload.bin'));
    return $backend('/book/upload', {
        method: 'POST',
        body: data,
    });
}

async function uploadInChunks(file) {
    const chunkSize = CHUNK_SIZE.value;
    const uploadId = generateUploadId();
    const totalChunks = Math.ceil(file.size / chunkSize);

    stage.value = 'uploading';
    for (let index = 0; index < totalChunks; index++) {
        const start = index * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        const data = new FormData();
        data.append('chunk', chunk);
        data.append('upload_id', uploadId);
        data.append('chunk_index', index);
        data.append('total_chunks', totalChunks);

        const rsp = await $backend('/book/upload/chunk', {
            method: 'POST',
            body: data,
        });
        if (rsp.err !== 'ok') {
            return rsp;
        }
        // 按已上传字节数计算进度，比按分片序号更准确
        progress.value = Math.min(100, Math.round((end / file.size) * 100));
    }

    // 分片已全部上传完成，进入合并阶段：进度条切换为不确定动画并显示“正在合并”
    stage.value = 'merging';
    progress.value = 100;
    const data = new FormData();
    data.append('upload_id', uploadId);
    data.append('filename', encodeURIComponent(file.name || 'upload.bin'));
    data.append('total_chunks', totalChunks);
    return $backend('/book/upload/complete', {
        method: 'POST',
        body: data,
    });
}

function do_upload() {
    let file = null;
    if (ebooks.value) {
        file = Array.isArray(ebooks.value) ? ebooks.value[0] : ebooks.value;
    }

    if (!file) {
        $alert('error', t('messages.selectFileToUpload'));
        return;
    }

    loading.value = true;
    progress.value = 0;
    stage.value = null;
    const useChunks = CHUNK_ENABLED.value && file.size > CHUNK_THRESHOLD.value;
    const uploadPromise = useChunks ? uploadInChunks(file) : uploadWhole(file);

    uploadPromise
        .then(rsp => {
            dialog.value = false;
            if (rsp.err === 'ok') {
                $alert('success', t('messages.uploadSuccess'), '/book/' + rsp.book_id);
                router.push('/book/' + rsp.book_id);
            } else if (rsp.err === 'samebook') {
                $alert('error', rsp.msg, '/book/' + rsp.book_id);
                router.push('/book/' + rsp.book_id);
            } else {
                $alert('error', rsp.msg);
            }
        })
        .catch(() => {
            // $backend 已在网络/HTTP异常场景下弹出提示，这里仅需终止流程
        })
        .finally(() => {
            loading.value = false;
            progress.value = 0;
            stage.value = null;
        });
}
</script>

<style scoped>
.upload-btn {
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 100;
}
</style>
