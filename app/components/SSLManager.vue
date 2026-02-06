
<template>
    <div>
        <v-btn @click="dialog = !dialog">
            <v-icon start>
                mdi-upload
            </v-icon> 更新SSL证书
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
                        上传SSL证书
                    </v-toolbar-title>
                    <v-spacer />
                    <v-btn
                        variant="text"
                        @click="dialog = false"
                    >
                        关闭
                    </v-btn>
                </v-toolbar>
                <v-card-text class="pt-4">
                    <p class="mb-4 text-caption">
                        请上传PEM格式的证书文件
                    </p>
                    <v-form
                        ref="form"
                        @submit.prevent="upload_ssl"
                    >
                        <v-file-input
                            v-model="ssl_crt"
                            accept=".crt"
                            label="请选择要上传的证书文件（.crt）"
                        />
                        <v-file-input
                            v-model="ssl_key"
                            accept=".key"
                            label="请选择要上传的证书私钥（.key）"
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
                        上传SSL证书
                    </v-btn>
                    <v-spacer />
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup>
import { ref } from 'vue';
const { $backend, $alert } = useNuxtApp();

const loading = ref(false);
const dialog = ref(false);
const ssl_crt = ref(null);
const ssl_key = ref(null);

const check_certs = async () => {
    var re = {
        crt: /-----BEGIN CERTIFICATE-----[^ ]*-----END CERTIFICATE-----/gm,
        key: /-----BEGIN [A-Z]* PRIVATE KEY-----[^ ]*-----END [A-Z]* PRIVATE KEY-----/gm,
    };

    // Vuetify 3 file input v-model is array of files or single file depending on 'multiple' prop
    // Default is array in recent versions or single object?
    // It seems to be array in Vuetify 3
    const crtFile = Array.isArray(ssl_crt.value) ? ssl_crt.value[0] : ssl_crt.value;
    const keyFile = Array.isArray(ssl_key.value) ? ssl_key.value[0] : ssl_key.value;

    if (!crtFile) {
        if ($alert) $alert('error', '请选择证书文件');
        return false;
    }
    if (!keyFile) {
        if ($alert) $alert('error', '请选择私钥文件');
        return false;
    }

    var content = await crtFile.text();
    if ( ! re.crt.test(content) ) {
        if ($alert) $alert('error', '证书文件(.crt)异常，文件内容不是PEM格式');
        return false;
    }

    content = await keyFile.text();
    if ( ! re.key.test(content) ) {
        if ($alert) $alert('error', '私钥文件(.key)异常，文件内容不是PEM格式');
        return false;
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
                if ($alert) $alert('success', '上传成功！');
            } else {
                if ($alert) $alert('error', rsp.msg);
            }
        })
        .finally(() => {
            loading.value = false;
        });
};
</script>
