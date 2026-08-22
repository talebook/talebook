<template>
    <v-card class="booktool">
        <v-card-title class="d-flex align-center flex-wrap ga-2 px-4 pt-4">
            <v-btn icon="mdi-arrow-left" variant="text" :aria-label="t('common.back')" @click="router.back()" />
            <div>
                <h1 class="text-h6">{{ t('bookTools.txtFixer.title') }}</h1>
                <div class="text-body-2 text-medium-emphasis font-weight-regular">{{ t('bookTools.txtFixer.description') }}</div>
            </div>
        </v-card-title>
        <v-card-text>
            <v-alert type="info" variant="tonal" density="compact" class="mb-4">{{ t('bookTools.txtFixer.readOnly') }}</v-alert>

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

            <div class="d-flex ga-3 mt-4">
                <v-btn color="primary" variant="tonal" :loading="busy === 'analyze'" :disabled="!bookId" @click="doAnalyze">{{ t('bookTools.common.analyze') }}</v-btn>
            </div>

            <div v-if="report" class="mt-4">
                <v-card variant="outlined" density="compact">
                    <v-card-text>
                        <div class="d-flex flex-wrap ga-2 mb-2">
                            <v-chip size="small" :color="report.garbage ? 'error' : report.mojibake ? 'warning' : 'success'">{{ report.encoding }} · {{ Math.round((report.confidence || 0) * 100) }}%</v-chip>
                            <v-chip v-if="report.mojibake" size="small" color="warning">{{ t('bookTools.txtFixer.mojibake') }}</v-chip>
                            <v-chip v-if="report.garbage" size="small" color="error">{{ t('bookTools.txtFixer.garbage') }}</v-chip>
                            <v-chip v-if="report.unrecoverable" size="small" color="error">{{ t('bookTools.txtFixer.unrecoverable') }}</v-chip>
                        </div>
                        <div v-if="report.reasons && report.reasons.length" class="text-body-2 mb-2">
                            <div v-for="(r, i) in report.reasons" :key="i" class="text-medium-emphasis">· {{ r }}</div>
                        </div>
                        <div class="text-body-2 mt-2">
                            <div class="text-caption text-medium-emphasis mb-1">{{ t('bookTools.txtFixer.preview') }}</div>
                            <pre class="pa-3 rounded border text-body-2" style="white-space: pre-wrap; word-break: break-all; max-height: 260px; overflow: auto">{{ report.preview || report.sample || '' }}</pre>
                        </div>
                    </v-card-text>
                </v-card>
            </div>

            <v-divider class="my-4" />

            <v-radio-group v-model="outputMode" inline density="compact" hide-details>
                <v-radio value="new" :label="t('bookTools.common.newBook')" />
                <v-radio value="overwrite" :label="t('bookTools.common.overwrite')" />
            </v-radio-group>

            <v-btn color="primary" class="mt-3" :loading="busy === 'run'" :disabled="!bookId" @click="doRun">{{ t('bookTools.common.run') }}</v-btn>

            <v-alert v-if="error" type="error" variant="tonal" closable class="mt-4" @click:close="error = ''">{{ error }}</v-alert>
            <v-alert v-if="success" type="success" variant="tonal" closable class="mt-4" @click:close="success = ''">{{ success }}</v-alert>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';

const { t } = useI18n();
const { $backend } = useNuxtApp();
const router = useRouter();
useMainStore().setNavbar(true);

const bookId = ref(null);
const bookOptions = ref([]);
const bookQuery = ref('');
const booksLoading = ref(false);
const outputMode = ref('new');
const busy = ref('');
const error = ref('');
const success = ref('');
const report = ref(null);

const selectedBook = computed(() => bookOptions.value.find((b) => b.id === bookId.value) || null);

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
            bookOptions.value = (rsp.books || [])
                .filter((b) => (b.formats || []).includes('TXT'))
                .map((b) => ({ ...b, id: b.id, label: `${b.title} — ${(b.authors || []).join(', ')} [${(b.formats || []).join('/')}]` }));
        }
    } catch (e) {}
    finally { booksLoading.value = false; }
}
watch(bookId, () => { report.value = null; error.value = ''; success.value = ''; });

async function doAnalyze() {
    error.value = '';
    report.value = null;
    busy.value = 'analyze';
    try {
        const rsp = await $backend('/plugins/tools/txt-fixer/analyze', { method: 'POST', body: JSON.stringify({ book_id: bookId.value }) });
        if (rsp.err === 'ok') report.value = rsp;
        else error.value = rsp.msg || rsp.err;
    } catch (e) { error.value = String(e); }
    finally { busy.value = ''; }
}
async function doRun() {
    error.value = '';
    success.value = '';
    busy.value = 'run';
    try {
        const rsp = await $backend('/plugins/tools/txt-fixer/run', { method: 'POST', body: JSON.stringify({ book_id: bookId.value, output_mode: outputMode.value }) });
        if (rsp.err === 'ok') {
            success.value = t(rsp.output_mode === 'new' ? 'bookTools.txtFixer.successNew' : 'bookTools.txtFixer.successOverwrite', { encoding: rsp.encoding, id: rsp.book_id });
        } else error.value = rsp.msg || rsp.err;
    } catch (e) { error.value = String(e); }
    finally { busy.value = ''; }
}
onMounted(loadBooks);
useHead(() => ({ title: t('bookTools.txtFixer.title') }));
</script>
