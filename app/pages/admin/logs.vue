
<template>
    <v-card>
        <v-card-title class="pl-4">
            {{ t('admin.logs.title') }}
        </v-card-title>
        <v-card-actions class="px-4 flex-wrap">
            <v-select
                v-model="lineCount"
                :items="lineOptions"
                :label="t('admin.logs.label.lines')"
                density="compact"
                hide-details
                style="max-width: 160px"
                class="mr-2"
            />
            <v-checkbox
                v-model="showInfo"
                :label="t('admin.logs.label.showInfo')"
                density="compact"
                hide-details
                class="mr-2 flex-grow-0"
            />
            <v-checkbox
                v-model="showWarning"
                :label="t('admin.logs.label.showWarning')"
                density="compact"
                hide-details
                class="mr-2 flex-grow-0"
            />
            <v-checkbox
                v-model="showError"
                :label="t('admin.logs.label.showError')"
                density="compact"
                hide-details
                class="mr-2 flex-grow-0"
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
                v-else-if="!loading && filteredLines.length === 0"
                class="text-medium-emphasis pa-2"
            >
                {{ t('admin.logs.message.allFiltered') }}
            </div>
            <div
                v-else
                ref="logContainer"
                class="log-container"
            >
                <div
                    v-for="(entry, idx) in filteredLines"
                    :key="idx"
                    :class="['log-line', entry.cls]"
                >{{ entry.text }}</div>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
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

const showInfo = ref(true);
const showWarning = ref(true);
const showError = ref(true);

const lineOptions = [100, 200, 500, 1000, 2000];

const downloadUrl = '/api/admin/log/download';

// tornado 的 LogFormatter 在行首输出单字母级别，如 "[E 260101 12:00:00 module:1] message"
const levelInfo = (line) => {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('[E ') || /ERROR/.test(line)) return { cls: 'log-error', group: 'error' };
    if (trimmed.startsWith('[W ') || /WARNING/.test(line)) return { cls: 'log-warning', group: 'warning' };
    if (trimmed.startsWith('[D ') || /DEBUG/.test(line)) return { cls: 'log-debug', group: 'info' };
    return { cls: 'log-info', group: 'info' };
};

const filteredLines = computed(() => lines.value.filter((entry) => {
    if (entry.group === 'error') return showError.value;
    if (entry.group === 'warning') return showWarning.value;
    return showInfo.value;
}));

const loadLogs = async () => {
    loading.value = true;
    errorMsg.value = '';
    try {
        const rsp = await $backend(`/admin/log?lines=${lineCount.value}`);
        if (rsp.err !== 'ok') {
            errorMsg.value = rsp.msg || t('admin.logs.message.loadError');
            lines.value = [];
        } else {
            lines.value = (rsp.lines || []).map(line => ({ text: line || ' ', ...levelInfo(line) }));
            await nextTick();
            if (logContainer.value) {
                logContainer.value.scrollTop = logContainer.value.scrollHeight;
            }
        }
    } catch {
        errorMsg.value = t('admin.logs.message.loadError');
        lines.value = [];
    } finally {
        loading.value = false;
    }
};

// 调节显示行数后立即生效，无需再手动点击一次刷新按钮
watch(lineCount, loadLogs);

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
