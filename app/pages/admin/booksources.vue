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
            <v-table v-if="items.length > 0">
                <thead>
                    <tr>
                        <th style="width: 1%">
                            <v-checkbox-btn
                                :model-value="allSelected"
                                :indeterminate="someSelected"
                                density="compact"
                                @update:model-value="toggleSelectAll"
                            />
                        </th>
                        <th>{{ $t('booksource.name') }}</th>
                        <th>{{ $t('booksource.group') }}</th>
                        <th>{{ $t('booksource.weight') }}</th>
                        <th>{{ $t('booksource.enabled') }}</th>
                        <th>{{ $t('booksource.actions') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="item in items"
                        :key="item.id"
                    >
                        <td>
                            <v-checkbox-btn
                                :model-value="selected.includes(item.id)"
                                density="compact"
                                @update:model-value="toggleOne(item.id)"
                            />
                        </td>
                        <td>
                            {{ item.name }}
                            <div class="text-caption text-grey">
                                {{ item.url }}
                            </div>
                        </td>
                        <td>{{ item.group }}</td>
                        <td>{{ item.weight }}</td>
                        <td>
                            <v-switch
                                :model-value="item.enabled"
                                color="primary"
                                hide-details
                                density="compact"
                                @update:model-value="toggle(item)"
                            />
                        </td>
                        <td>
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
                        </td>
                    </tr>
                </tbody>
            </v-table>
            <v-alert
                v-else
                type="info"
                variant="tonal"
            >
                {{ $t('booksource.empty') }}
            </v-alert>

            <div
                v-if="pageCount > 1"
                class="d-flex justify-center mt-4"
            >
                <v-pagination
                    :model-value="page"
                    :length="pageCount"
                    :total-visible="7"
                    density="compact"
                    @update:model-value="changePage"
                />
            </div>
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

const items = ref([]);
const selected = ref([]);
const q = ref('');
const page = ref(1);
const total = ref(0);
const pageSize = 50;
const allSelected = computed(() => items.value.length > 0 && selected.value.length === items.value.length);
const someSelected = computed(() => selected.value.length > 0 && !allSelected.value);
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));
const importDialog = ref(null);
const testDialog = ref(false);
const testing = ref(false);
const testRsp = ref({});
const testKey = ref('剑来');

const load = async () => {
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

const toggleOne = (id) => {
    const i = selected.value.indexOf(id);
    if (i >= 0) selected.value.splice(i, 1);
    else selected.value.push(id);
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
</style>
