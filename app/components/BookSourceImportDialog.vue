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
                        <v-textarea
                            v-model="jsonText"
                            :placeholder="$t('booksource.jsonPlaceholder')"
                            rows="8"
                            variant="outlined"
                            hide-details
                        />
                    </v-window-item>
                    <v-window-item value="seed">
                        <p class="text-body-2">
                            {{ $t('booksource.importSeed') }}
                        </p>
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

const dialog = ref(false);
const tab = ref('url');
const jsonText = ref('');
const url = ref('');
const loading = ref(false);

const open = () => {
    dialog.value = true;
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
        body = null;
    }

    loading.value = true;
    try {
        const endpoint = tab.value === 'seed' ? '/admin/booksource/seed' : '/admin/booksource/import';
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

defineExpose({ open, doImport, tab, jsonText, url });
</script>
