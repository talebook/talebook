<template>
    <v-card>
        <v-card-title class="pl-4">
            {{ $t('booksource.title') }}
        </v-card-title>
        <v-card-actions class="flex-wrap">
            <v-btn
                variant="outlined"
                color="primary"
                @click="load"
            >
                <v-icon start>
                    mdi-reload
                </v-icon>{{ $t('common.refresh') }}
            </v-btn>
            <v-btn
                variant="elevated"
                color="primary"
                @click="importDialog?.open()"
            >
                <v-icon start>
                    mdi-import
                </v-icon>{{ $t('booksource.import') }}
            </v-btn>
            <v-spacer />
            <template v-if="items.length > 0">
                <span class="text-caption text-medium-emphasis mr-2">
                    {{ $t('booksource.selectedCount', { n: selected.length }) }}
                </span>
                <v-btn
                    size="small"
                    variant="text"
                    @click="toggleSelectAll"
                >
                    {{ allSelected ? $t('booksource.selectNone') : $t('booksource.selectAll') }}
                </v-btn>
                <v-btn
                    size="small"
                    variant="text"
                    color="primary"
                    :disabled="selected.length === 0"
                    @click="batchEnable(true)"
                >
                    {{ $t('booksource.enable') }}
                </v-btn>
                <v-btn
                    size="small"
                    variant="text"
                    :disabled="selected.length === 0"
                    @click="batchEnable(false)"
                >
                    {{ $t('booksource.disable') }}
                </v-btn>
                <v-btn
                    size="small"
                    variant="text"
                    color="error"
                    :disabled="selected.length === 0"
                    @click="batchRemove"
                >
                    {{ $t('booksource.delete') }}
                </v-btn>
            </template>
        </v-card-actions>

        <v-card-text>
            <v-text-field
                v-model="q"
                :placeholder="$t('booksource.searchPlaceholder')"
                prepend-inner-icon="mdi-magnify"
                density="compact"
                variant="outlined"
                hide-details
                clearable
                class="mb-3"
                style="max-width: 360px"
                @keyup.enter="doSearch"
                @click:clear="doSearch"
            />
            <v-data-table
                v-model="selected"
                :headers="headers"
                :items="items"
                :loading="loading"
                :items-per-page="pageSize"
                :page="page"
                show-select
                item-value="id"
                density="compact"
                class="elevation-1 text-body-2"
                @update:page="changePage"
            >
                <!-- 名称列 -->
                <template #item.name="{ item }">
                    {{ item.name }}
                    <div class="text-caption text-grey">
                        {{ item.url }}
                    </div>
                </template>

                <!-- 检测状态列 -->
                <template #item.check="{ item }">
                    <div class="check-cell">
                        <v-chip
                            size="x-small"
                            :color="checkColor(item)"
                            variant="tonal"
                        >
                            {{ checkText(item) }}
                        </v-chip>
                        <div
                            v-if="item.check_message"
                            class="text-caption text-medium-emphasis mt-1 check-message"
                        >
                            {{ item.check_message }}
                        </div>
                        <div
                            v-if="item.check_tags?.length"
                            class="check-tags mt-1"
                        >
                            <v-chip
                                v-for="tag in item.check_tags.slice(0, 4)"
                                :key="tag"
                                size="x-small"
                                variant="outlined"
                                class="mr-1 mb-1"
                            >
                                {{ tag }}
                            </v-chip>
                        </div>
                    </div>
                </template>

                <!-- 启用状态列 -->
                <template #item.enabled="{ item }">
                    <v-switch
                        :model-value="item.enabled"
                        color="primary"
                        hide-details
                        density="compact"
                        @update:model-value="toggle(item)"
                    />
                </template>

                <!-- 操作列 -->
                <template #item.actions="{ item }">
                    <v-btn
                        size="small"
                        variant="text"
                        color="primary"
                        @click="testSource(item)"
                    >
                        {{ $t('booksource.test') }}
                    </v-btn>
                    <v-btn
                        size="small"
                        variant="text"
                        color="error"
                        @click="remove(item)"
                    >
                        {{ $t('booksource.delete') }}
                    </v-btn>
                </template>

                <!-- 空数据 -->
                <template #no-data>
                    <v-alert
                        type="info"
                        variant="tonal"
                    >
                        {{ $t('booksource.empty') }}
                    </v-alert>
                </template>
            </v-data-table>
        </v-card-text>

        <BookSourceImportDialog
            ref="importDialog"
            @imported="load"
        />

        <v-dialog
            v-model="testDialog"
            max-width="640"
        >
            <v-card>
                <v-card-title>{{ $t('booksource.testResult') }}</v-card-title>
                <v-card-text>
                    <div
                        v-if="testing"
                        class="d-flex align-center"
                    >
                        <v-progress-circular
                            indeterminate
                            size="22"
                            class="mr-2"
                        />
                        {{ $t('network.searching') }}
                    </div>
                    <div v-else>
                        <v-alert
                            v-if="testRsp.js_skipped"
                            type="warning"
                            variant="tonal"
                        >
                            {{ $t('booksource.jsSkipped') }}
                        </v-alert>
                        <template v-else>
                            <p>{{ $t('booksource.testKey') }}: {{ testKey }} ({{ testRsp.elapsed_ms }}ms)</p>
                            <p
                                v-for="(b, i) in testRsp.search || []"
                                :key="i"
                            >
                                {{ b.name }} - {{ b.author }}
                            </p>
                            <v-divider class="my-2" />
                            <pre class="sample">{{ testRsp.sample_content }}</pre>
                        </template>
                    </div>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        variant="text"
                        @click="testDialog = false"
                    >
                        {{ $t('common.close') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-card>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import BookSourceImportDialog from '~/components/BookSourceImportDialog.vue';
import { useMainStore } from '@/stores/main';

const { t } = useI18n();
const store = useMainStore();
const { $backend, $alert } = useNuxtApp();

store.setNavbar(true);

// 表格列定义
const headers = [
    { title: t('booksource.name'), key: 'name', sortable: false },
    { title: t('booksource.group'), key: 'group', sortable: false, width: '180px' },
    { title: t('booksource.weight'), key: 'weight', sortable: false, width: '80px' },
    { title: t('booksource.check'), key: 'check', sortable: false, width: '220px' },
    { title: t('booksource.enabled'), key: 'enabled', sortable: false, width: '100px' },
    { title: t('booksource.actions'), key: 'actions', sortable: false, width: '150px' },
];

const items = ref([]);
const selected = ref([]);
const q = ref('');
const page = ref(1);
const total = ref(0);
const loading = ref(false);
const pageSize = 50;
const allSelected = computed(() => items.value.length > 0 && selected.value.length === items.value.length);
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));
const importDialog = ref(null);
const testDialog = ref(false);
const testing = ref(false);
const testRsp = ref({});
const testKey = ref('剑来');

const load = async () => {
    loading.value = true;
    try {
        const url = `/admin/booksource/list?page=${page.value}&size=${pageSize}&q=${encodeURIComponent(q.value.trim())}`;
        const rsp = await $backend(url);
        if (rsp.err === 'ok') {
            items.value = rsp.items || [];
            total.value = rsp.count || 0;
            // 批量删除后当前页可能越界，回退到最后一页
            if (items.value.length === 0 && total.value > 0 && page.value > 1) {
                page.value = pageCount.value;
                return load();
            }
        }
    } finally {
        loading.value = false;
    }
};

const doSearch = () => {
    page.value = 1;
    selected.value = [];
    load();
};

const changePage = (n) => {
    page.value = n;
    selected.value = [];
    load();
};

const toggle = async (item) => {
    const rsp = await $backend('/admin/booksource/toggle', {
        method: 'POST',
        body: JSON.stringify({ id: item.id, enabled: !item.enabled }),
    });
    if (rsp.err === 'ok') item.enabled = rsp.enabled;
    else if ($alert) $alert('error', rsp.msg || rsp.err);
};

const remove = async (item) => {
    if (!confirm(t('booksource.deleteConfirm'))) return;
    const rsp = await $backend('/admin/booksource?id=' + item.id, {
        method: 'DELETE',
    });
    if (rsp.err === 'ok') load();
    else if ($alert) $alert('error', rsp.msg || rsp.err);
};

const toggleSelectAll = () => {
    selected.value = allSelected.value ? [] : items.value.map((i) => i.id);
};

const batchEnable = async (enabled) => {
    if (selected.value.length === 0) return;
    const rsp = await $backend('/admin/booksource/toggle', {
        method: 'POST',
        body: JSON.stringify({ ids: selected.value, enabled }),
    });
    if (rsp.err === 'ok') load();
    else if ($alert) $alert('error', rsp.msg || rsp.err);
};

const batchRemove = async () => {
    if (selected.value.length === 0) return;
    if (!confirm(t('booksource.deleteSelectedConfirm', { n: selected.value.length }))) return;
    const qs = selected.value.map((id) => 'ids=' + id).join('&');
    const rsp = await $backend('/admin/booksource?' + qs, { method: 'DELETE' });
    if (rsp.err === 'ok') {
        selected.value = [];
        load();
    } else if ($alert) {
        $alert('error', rsp.msg || rsp.err);
    }
};

const checkColor = (item) => {
    if (item.check_status === 'ok' || item.last_check_ok) return 'success';
    if (item.check_status === 'js_unsupported' || item.check_status === 'incomplete') return 'warning';
    return 'error';
};

const checkText = (item) => {
    if (item.check_status === 'ok' || item.last_check_ok) return t('booksource.checkOk');
    if (item.check_status === 'js_unsupported') return t('booksource.checkJs');
    if (item.check_status === 'incomplete') return t('booksource.checkIncomplete');
    if (item.check_status === 'dns_failed') return t('booksource.checkDns');
    if (item.check_status === 'connect_failed') return t('booksource.checkConnect');
    return t('booksource.checkFailed');
};

const testSource = async (item) => {
    testDialog.value = true;
    testing.value = true;
    testRsp.value = {};
    try {
        const rsp = await $backend('/admin/booksource/test', {
            method: 'POST',
            body: JSON.stringify({ id: item.id, key: testKey.value }),
        });
        testRsp.value = rsp;
    } finally {
        testing.value = false;
    }
};

onMounted(load);

useHead(() => ({ title: t('booksource.title') }));
</script>

<style scoped>
.sample {
    white-space: pre-wrap;
    max-height: 200px;
    overflow-y: auto;
    font-size: 12px;
}
.check-cell {
    min-width: 180px;
}
.check-message {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.check-tags {
    line-height: 1.5;
}
</style>
