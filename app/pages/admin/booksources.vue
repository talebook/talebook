<template>
    <v-card>
        <v-card-title class="pl-4">
            {{ $t('booksource.title') }}
        </v-card-title>
        <v-card-actions>
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
        </v-card-actions>

        <v-card-text>
            <v-table v-if="items.length > 0">
                <thead>
                    <tr>
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
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import BookSourceImportDialog from '~/components/BookSourceImportDialog.vue';
import { useMainStore } from '@/stores/main';

const { t } = useI18n();
const store = useMainStore();
const { $backend, $alert } = useNuxtApp();

store.setNavbar(true);

const items = ref([]);
const importDialog = ref(null);
const testDialog = ref(false);
const testing = ref(false);
const testRsp = ref({});
const testKey = ref('剑来');

const load = async () => {
    const rsp = await $backend('/admin/booksource/list');
    if (rsp.err === 'ok') items.value = rsp.items || [];
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
    const rsp = await $backend('/admin/booksource', {
        method: 'DELETE',
        body: JSON.stringify({ id: item.id }),
    });
    if (rsp.err === 'ok') load();
    else if ($alert) $alert('error', rsp.msg || rsp.err);
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
