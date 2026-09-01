<template>
    <v-dialog
        v-model="dialog"
        max-width="640"
    >
        <v-card>
            <v-card-title>{{ $t('booksource.import') }}</v-card-title>
            <v-card-text>
                <v-tabs
                    v-model="tab"
                    density="compact"
                >
                    <v-tab value="url">
                        {{ $t('booksource.importUrl') }}
                    </v-tab>
                    <v-tab value="json">
                        {{ $t('booksource.importJson') }}
                    </v-tab>
                    <v-tab value="seed">
                        {{ $t('booksource.importSeed') }}
                    </v-tab>
                </v-tabs>

                <v-window
                    v-model="tab"
                    class="mt-4"
                >
                    <v-window-item value="url">
                        <v-text-field
                            v-model="url"
                            :placeholder="$t('booksource.urlPlaceholder')"
                            variant="outlined"
                            hide-details
                        />
                    </v-window-item>
                    <v-window-item value="json">
                        <div class="d-flex justify-end mb-2">
                            <v-btn
                                variant="outlined"
                                size="small"
                                prepend-icon="mdi-file-upload-outline"
                                @click="triggerFileSelect"
                            >
                                {{ $t('booksource.loadFromFile') }}
                            </v-btn>
                            <input
                                ref="fileInput"
                                type="file"
                                accept=".json,application/json"
                                class="d-none"
                                @change="onFileSelected"
                            >
                        </div>
                        <v-textarea
                            v-model="jsonText"
                            :placeholder="$t('booksource.jsonPlaceholder')"
                            rows="8"
                            variant="outlined"
                            hide-details
                        />
                    </v-window-item>
                    <v-window-item value="seed">
                        <v-select
                            v-model="sampleSource"
                            :items="sampleOptions"
                            :label="$t('booksource.sampleSource')"
                            variant="outlined"
                            hide-details
                        >
                            <template #item="{ props, item }">
                                <v-list-item
                                    v-bind="props"
                                    :subtitle="item.raw.url"
                                />
                            </template>
                        </v-select>
                    </v-window-item>
                </v-window>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn
                    variant="text"
                    @click="dialog = false"
                >
                    {{ $t('common.cancel') }}
                </v-btn>
                <v-btn
                    color="primary"
                    :loading="loading"
                    @click="doImport"
                >
                    {{ $t('common.confirm') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const emit = defineEmits(['imported']);

// 默认书源订阅 URL，预填进输入框供用户直接使用（XIU2/Yuedu 开源书源）
const DEFAULT_BOOKSOURCE_URL = 'https://cdn.jsdmirror.com/gh/XIU2/Yuedu/shuyuan';
const BUILTIN_SAMPLE = 'builtin';
const MIAOGONGZI_SAMPLE_URL = 'https://legado.miaogongzi.org/%E9%98%85%E8%AF%BB%E4%B9%A6%E6%BA%90/sy.json';
const TICKMAO_SAMPLE_URL = 'https://cdn.jsdmirror.com/gh/tickmao/Novel@master/sources/legado/full.json';
const SHIDAHUILANG_SAMPLE_URL = 'https://raw.githubusercontent.com/shidahuilang/shuyuan-bak/refs/heads/main/good.json';

const dialog = ref(false);
const tab = ref('url');
const jsonText = ref('');
const url = ref(DEFAULT_BOOKSOURCE_URL);
const sampleSource = ref(BUILTIN_SAMPLE);
const sampleOptions = [
    { title: t('booksource.sampleBuiltIn'), value: BUILTIN_SAMPLE, url: '' },
    { title: t('booksource.sampleMiaogongzi'), value: MIAOGONGZI_SAMPLE_URL, url: MIAOGONGZI_SAMPLE_URL },
    { title: t('booksource.sampleTickmao'), value: TICKMAO_SAMPLE_URL, url: TICKMAO_SAMPLE_URL },
    { title: t('booksource.sampleShidahuilang'), value: SHIDAHUILANG_SAMPLE_URL, url: SHIDAHUILANG_SAMPLE_URL },
];
const loading = ref(false);
const fileInput = ref(null);

const open = () => {
    dialog.value = true;
};

const triggerFileSelect = () => {
    fileInput.value?.click();
};

// 读取本地 JSON 文件内容并填入文本框，交由既有的粘贴 JSON 流程校验与提交
const onFileSelected = (event) => {
    const { $alert } = useNuxtApp();
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        jsonText.value = String(reader.result || '');
    };
    reader.onerror = () => {
        if ($alert) $alert('error', t('booksource.fileReadError'));
    };
    reader.readAsText(file);
};

const doImport = async () => {
    const { $backend, $alert } = useNuxtApp();

    // 提交前在前端校验输入，避免把空内容或非法 JSON 丢给后端
    let body;
    if (tab.value === 'url') {
        const u = url.value.trim();
        if (!u) {
            if ($alert) $alert('error', t('booksource.urlRequired'));
            return;
        }
        body = { url: u };
    } else if (tab.value === 'json') {
        const text = jsonText.value.trim();
        if (!text) {
            if ($alert) $alert('error', t('booksource.jsonRequired'));
            return;
        }
        try {
            JSON.parse(text);
        } catch (e) {
            if ($alert) $alert('error', t('booksource.jsonInvalid', { msg: e.message }));
            return;
        }
        body = { json: text };
    } else {
        body = sampleSource.value === BUILTIN_SAMPLE ? null : { url: sampleSource.value };
    }

    loading.value = true;
    try {
        const endpoint = tab.value === 'seed' && sampleSource.value === BUILTIN_SAMPLE
            ? '/admin/booksource/seed'
            : '/admin/booksource/import';
        const rsp = await $backend(endpoint, {
            method: 'POST',
            body: JSON.stringify(body || {}),
        });
        if (rsp.err === 'ok') {
            if ($alert) {
                $alert('success', t('booksource.importResult', {
                    added: rsp.added || 0,
                    updated: rsp.updated || 0,
                    skipped: rsp.skipped || 0,
                    disabled: rsp.disabled || 0,
                    failed: (rsp.failed || []).length,
                    checking: rsp.checking || 0,
                }));
            }
            emit('imported');
            dialog.value = false;
        } else if ($alert) {
            $alert('error', rsp.msg || rsp.err);
        }
    } finally {
        loading.value = false;
    }
};

defineExpose({
    open,
    doImport,
    tab,
    jsonText,
    url,
    sampleSource,
    sampleOptions,
    fileInput,
    onFileSelected,
    triggerFileSelect,
});
</script>
