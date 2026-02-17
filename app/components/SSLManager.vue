
<template>
    <div>
        <v-btn @click="dialog = !dialog">
            <v-icon start>
                mdi-upload
            </v-icon> {{ $t('messages.updateSsl') }}
        </v-btn>
        <v-dialog
            v-model="dialog"
            persistent
            transition="dialog-bottom-transition"
            width="400"
        >
            <v-card>
                <v-toolbar
                    flat
                    density="compact"
                    dark
                    color="primary"
                >
                    <v-toolbar-title class="ml-4">
                        {{ $t('messages.updateSsl') }}
                    </v-toolbar-title>
                    <v-spacer />
                    <v-btn
                        variant="text"
                        @click="dialog = false"
                    >
                        {{ $t('messages.dialogClose') }}
                    </v-btn>
                </v-toolbar>
                <v-card-text class="pt-4">
                    <p class="mb-4 text-caption">
                        {{ $t('messages.selectCertFile') }}
                    </p>
                    <v-form
                        ref="form"
                        @submit.prevent="upload_ssl"
                    >
                        <v-file-input
                            v-model="ssl_crt"
                            accept=".crt"
                            :label="$t('messages.selectCertFile')"
                        />
                        <v-file-input
                            v-model="ssl_key"
                            accept=".key"
                            :label="$t('messages.selectKeyFile')"
                        />
                    </v-form>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        :loading="loading"
                        color="primary"
                        @click="upload_ssl"
                    >
                        {{ $t('messages.updateSsl') }}
                    </v-btn>
                    <v-spacer />
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { validateCertFile, validateKeyFile, validateCertKeyFiles } from '~/utils/sslValidator';
const { $backend, $alert } = useNuxtApp();

import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const loading = ref(false);
const dialog = ref(false);
const ssl_crt = ref(null);
const ssl_key = ref(null);

const check_certs = async () => {
    // Vuetify 3 file input v-model is array of files or single file depending on 'multiple' prop
    const crtFile = Array.isArray(ssl_crt.value) ? ssl_crt.value[0] : ssl_crt.value;
    const keyFile = Array.isArray(ssl_key.value) ? ssl_key.value[0] : ssl_key.value;

    if (!crtFile) {
        if ($alert) $alert('error', t('messages.selectCertFile'));
        return false;
    }
    if (!keyFile) {
        if ($alert) $alert('error', t('messages.selectKeyFile'));
        return false;
    }

    // 使用 sslValidator 模块验证证书
    const certResult = await validateCertFile(crtFile);
    if (!certResult.valid) {
        if ($alert) $alert('error', certResult.error || t('messages.certFileError'));
        return false;
    }

    // 使用 sslValidator 模块验证私钥
    const keyResult = await validateKeyFile(keyFile);
    if (!keyResult.valid) {
        if ($alert) $alert('error', keyResult.error || t('messages.keyFileError'));
        return false;
    }

    // 验证证书和私钥是否匹配
    const matchResult = await validateCertKeyFiles(crtFile, keyFile);
    if (!matchResult.valid) {
        if ($alert) $alert('error', matchResult.error);
        return false;
    }

    // 如果有警告（如加密私钥），显示警告但不阻止上传
    if (matchResult.warning) {
        console.warn('SSL Warning:', matchResult.warning);
    }

    return true;
};

const upload_ssl = async () => {
    loading.value = true;
    var ok = await check_certs();
    
    if ( !ok ) {
        loading.value = false;
        // dialog.value = false; // Don't close dialog on error
        return;
    }

    const crtFile = Array.isArray(ssl_crt.value) ? ssl_crt.value[0] : ssl_crt.value;
    const keyFile = Array.isArray(ssl_key.value) ? ssl_key.value[0] : ssl_key.value;

    var data = new FormData();
    data.append('ssl_crt', crtFile);
    data.append('ssl_key', keyFile);
    
    $backend('/admin/ssl', {
        method: 'POST',
        body: data,
    })
        .then( rsp => {
            dialog.value = false;
            if ( rsp.err == 'ok' ) {
                if ($alert) $alert('success', t('messages.uploadSuccess'));
            } else {
                if ($alert) $alert('error', rsp.msg);
            }
        })
        .finally(() => {
            loading.value = false;
        });
};
</script>
