<template>
    <v-card class="booktool">
        <v-card-title class="d-flex align-center flex-wrap ga-2 px-4 pt-4">
            <v-btn icon="mdi-arrow-left" variant="text" :aria-label="t('common.back')" @click="router.back()" />
            <div>
                <h1 class="text-h6">{{ t('bookTools.zhConverter.title') }}</h1>
                <div class="text-body-2 text-medium-emphasis font-weight-regular">{{ t('bookTools.zhConverter.description') }}</div>
            </div>
        </v-card-title>
        <v-card-text>
            <v-alert type="info" variant="tonal" density="compact" class="mb-4">{{ t('bookTools.zhConverter.readOnly') }}</v-alert>

            <v-autocomplete
                v-model="bookId"
                :items="bookOptions"
                item-title="label"
                item-value="id"
                :label="t('bookTools.common.bookSelect')"
                :hint="selectedBook ? t('bookTools.common.bookHint', { formats: (selectedBook.formats || []).join(', ') }) : t('bookTools.common.bookSearchHint')"
                persistent-hint
                variant="outlined"
                density="compact"
                clearable
                :loading="booksLoading"
                :no-data-text="bookQuery ? t('bookTools.common.noBooks') : t('bookTools.common.typeToSearch')"
                @update:search="onBookSearch"
            />

            <v-select v-model="direction" :items="directions" item-title="title" item-value="value" :label="t('bookTools.zhConverter.direction')" variant="outlined" density="compact" class="mt-4 booktool-field" />

            <v-checkbox v-model="useA5" :label="t('bookTools.zhConverter.useA5')" density="compact" hide-details :disabled="!isA5Direction" :hint="!isA5Direction ? t('bookTools.zhConverter.a5Hint') : ''" persistent-hint class="mt-2" />
            <v-checkbox v-model="convertTitle" :label="t('bookTools.zhConverter.convertTitle')" density="compact" hide-details class="mt-0" />
            <v-checkbox v-model="backup" v-if="outputMode === 'replace'" :label="t('bookTools.zhConverter.backup')" density="compact" hide-details class="mt-0" />

            <v-divider class="my-4" />

            <v-radio-group v-model="outputMode" inline density="compact" hide-details>
                <v-radio value="new" :label="t('bookTools.common.newBook')" />
                <v-radio value="replace" :label="t('bookTools.common.overwrite')" />
            </v-radio-group>

            <v-btn
                :color="outputMode === 'replace' ? 'error' : 'primary'"
                class="mt-3"
                :loading="busy === 'run'"
                :disabled="!bookId || !direction"
                @click="doRun"
            >
                {{ t(outputMode === 'replace' ? 'bookTools.common.overwriteAction' : 'bookTools.common.saveNewAction') }}
            </v-btn>

            <v-alert v-if="error" type="error" variant="tonal" closable class="mt-4" @click:close="error = ''">{{ error }}</v-alert>
            <v-alert v-if="success" type="success" variant="tonal" closable class="mt-4" @click:close="success = ''">{{ success }}</v-alert>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';
import { confirmDestructiveBookWrite } from '@/utils/book-tools';

const { t } = useI18n();
const { $backend } = useNuxtApp();
const router = useRouter();
useMainStore().setNavbar(true);

const bookId = ref(null);
const bookOptions = ref([]);
const bookQuery = ref('');
const booksLoading = ref(false);
const direction = ref('t2s');
const useA5 = ref(false);
const convertTitle = ref(true);
const backup = ref(true);
const outputMode = ref('new');
const busy = ref('');
const error = ref('');
const success = ref('');

const selectedBook = computed(() => bookOptions.value.find((b) => b.id === bookId.value) || null);
const isA5Direction = computed(() => ['t2s', 'tw2s'].includes(direction.value));
watch(direction, (v) => { if (!['t2s', 'tw2s'].includes(v)) useA5.value = false; });

const directions = computed(() => [
    { title: '繁体 -> 简体 (t2s)', value: 't2s' },
    { title: '台湾繁体 -> 简体 (tw2s)', value: 'tw2s' },
    { title: '台湾繁体含台湾用词 -> 简体 (tw2sp)', value: 'tw2sp' },
    { title: '简体 -> 繁体 (s2t)', value: 's2t' },
    { title: '简体 -> 台湾繁体 (s2tw)', value: 's2tw' },
    { title: '简体 -> 台湾繁体含台湾用词 (s2twp)', value: 's2twp' },
    { title: '繁体 -> 台湾繁体 (t2tw)', value: 't2tw' },
    { title: '台湾繁体 -> 繁体 (tw2t)', value: 'tw2t' },
]);

let searchTimer = null;
function onBookSearch(val) {
    bookQuery.value = val || '';
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadBooks, 300);
}
async function loadBooks() {
    booksLoading.value = true;
    try {
        const rsp = await $backend(`/plugins/tools/books?query=${encodeURIComponent(bookQuery.value || '')}`);
        if (rsp.err === 'ok') {
            bookOptions.value = (rsp.books || []).map((b) => ({ ...b, id: b.id, label: `${b.title} — ${(b.authors || []).join(', ')} [${(b.formats || []).join('/')}]` }));
        }
    } catch (e) {}
    finally { booksLoading.value = false; }
}
watch(bookId, () => { error.value = ''; success.value = ''; });

async function doRun() {
    if (!confirmDestructiveBookWrite(
        outputMode.value === 'replace',
        t('bookTools.common.overwriteConfirm', { title: selectedBook.value?.title || '' }),
    )) return;
    error.value = '';
    success.value = '';
    busy.value = 'run';
    try {
        const rsp = await $backend('/plugins/tools/zh-converter/run', {
            method: 'POST',
            body: JSON.stringify({ book_id: bookId.value, direction: direction.value, use_a5: useA5.value, convert_title: convertTitle.value, output_mode: outputMode.value, backup: backup.value }),
        });
        if (rsp.err === 'ok') {
            const isNew = rsp.output_mode === 'new';
            success.value = t(isNew ? 'bookTools.zhConverter.successNew' : 'bookTools.zhConverter.successOverwrite', { direction: rsp.direction_label || rsp.direction, id: rsp.book_id });
        } else error.value = rsp.msg || rsp.err;
    } catch (e) { error.value = String(e); }
    finally { busy.value = ''; }
}
onMounted(loadBooks);
useHead(() => ({ title: t('bookTools.zhConverter.title') }));
</script>

<style scoped>
.booktool-field { max-width: 420px; }
@media (max-width: 600px) { .booktool-field { max-width: none; } }
</style>
