<template>
    <div>
        <v-btn
            class="upload-btn"
            color="pink"
            icon="mdi-upload"
            size="large"
            elevation="4"
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
                    <v-toolbar-title>上传书籍</v-toolbar-title>
                    <v-spacer />
                    <v-btn
                        variant="text"
                        @click="dialog = false"
                    >
                        关闭
                    </v-btn>
                </v-toolbar>
                <v-card-text>
                    <p>受限于服务器能力，请勿上传100M的大文件书籍。</p>
                    <v-form
                        ref="form"
                        @submit.prevent="do_upload"
                    >
                        <v-file-input
                            v-model="ebooks"
                            label="请选择要上传的电子书"
                        />
                    </v-form>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        :loading="loading"
                        color="primary"
                        @click="do_upload"
                    >
                        上传
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
const router = useRouter();

const loading = ref(false);
const dialog = ref(false);
const ebooks = ref(null);

function do_upload() {
    loading.value = true;
    var data = new FormData();
    // Vuetify 3 file input returns array
    if (ebooks.value) {
        if (Array.isArray(ebooks.value)) {
            data.append('ebook', ebooks.value[0]);
        } else {
            data.append('ebook', ebooks.value);
        }
    }
    
    $backend('/book/upload', {
        method: 'POST',
        body: data,
    })
        .then(rsp => {
            dialog.value = false;
            if (rsp.err === 'ok') {
                $alert('success', '上传成功！', '/book/' + rsp.book_id);
                router.push('/book/' + rsp.book_id);
            } else if (rsp.err === 'samebook') {
                $alert('error', rsp.msg, '/book/' + rsp.book_id);
                router.push('/book/' + rsp.book_id);
            } else {
                $alert('error', rsp.msg);
            }
        })
        .finally(() => {
            loading.value = false;
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
