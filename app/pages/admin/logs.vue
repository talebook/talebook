
<template>
    <v-card>
        <v-card-title class="pl-4">
            {{ t('admin.logs.title') }}
        </v-card-title>
        <v-card-actions class="px-4">
            <v-select
                v-model="lineCount"
                :items="lineOptions"
                :label="t('admin.logs.label.lines')"
                density="compact"
                hide-details
                style="max-width: 160px"
                class="mr-2"
            />
            <v-spacer />
            <v-btn
                color="primary"
                class="mr-2"
                :loading="loading"
                @click="loadLogs"
            >
                <v-icon start>
                    mdi-refresh
                </v-icon>
                {{ t('admin.logs.button.refresh') }}
            </v-btn>
            <v-btn
                color="secondary"
                :href="downloadUrl"
            >
                <v-icon start>
                    mdi-download
                </v-icon>
                {{ t('admin.logs.button.download') }}
            </v-btn>
        </v-card-actions>

        <v-card-text class="pa-2">
            <div
                v-if="errorMsg"
                class="text-error pa-2"
            >
                {{ errorMsg }}
            </div>
            <div
                v-else-if="!loading && lines.length === 0"
                class="text-medium-emphasis pa-2"
            >
                {{ t('admin.logs.message.noLogs') }}
            </div>
            <div
                v-else
                ref="logContainer"
                class="log-container"
            >
                <div
                    v-for="(line, idx) in lines"
                    :key="idx"
                    :class="['log-line', levelClass(line)]"
                >{{ line || ' ' }}</div>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';

const store = useMainStore();
const { $backend } = useNuxtApp();
const { t } = useI18n();

store.setNavbar(true);

const lines = ref([]);
const loading = ref(false);
const errorMsg = ref('');
const lineCount = ref(500);
const logContainer = ref(null);

const lineOptions = [100, 200, 500, 1000, 2000];

const downloadUrl = computed(() => '/api/admin/log/download');

const levelClass = (line) => {
    if (/\[E\]|\[ERROR\]|ERROR/.test(line)) return 'log-error';
    if (/\[W\]|\[WARNING\]|WARNING/.test(line)) return 'log-warning';
    if (/\[D\]|\[DEBUG\]|DEBUG/.test(line)) return 'log-debug';
    return 'log-info';
};

const loadLogs = async () => {
    loading.value = true;
    errorMsg.value = '';
    try {
        const rsp = await $backend(`/admin/log?lines=${lineCount.value}`);
        if (rsp.err !== 'ok') {
            errorMsg.value = rsp.msg || t('admin.logs.message.loadError');
            lines.value = [];
        } else {
            lines.value = rsp.lines || [];
            await nextTick();
            if (logContainer.value) {
                logContainer.value.scrollTop = logContainer.value.scrollHeight;
            }
        }
    } catch {
        errorMsg.value = t('admin.logs.message.loadError');
    } finally {
        loading.value = false;
    }
};

onMounted(loadLogs);
</script>

<style scoped>
.log-container {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    background: #1e1e1e;
    color: #d4d4d4;
    border-radius: 4px;
    padding: 8px;
    max-height: 70vh;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-all;
}

.log-line {
    line-height: 1.5;
    padding: 1px 0;
}

.log-error {
    color: #f48771;
}

.log-warning {
    color: #cca700;
}

.log-debug {
    color: #9cdcfe;
}

.log-info {
    color: #b5cea8;
}
</style>
