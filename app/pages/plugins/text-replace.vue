<template>
    <v-card class="booktool">
        <v-card-title class="d-flex align-center flex-wrap ga-2 px-4 pt-4">
            <v-btn icon="mdi-arrow-left" variant="text" :aria-label="t('common.back')" @click="router.back()" />
            <div>
                <h1 class="text-h6">{{ t('bookTools.textReplace.title') }}</h1>
                <div class="text-body-2 text-medium-emphasis font-weight-regular">{{ t('bookTools.textReplace.description') }}</div>
            </div>
        </v-card-title>
        <v-card-text>
            <v-alert type="info" variant="tonal" density="compact" class="mb-4">{{ t('bookTools.textReplace.readOnly') }}</v-alert>

            <!-- 书籍选择 -->
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

            <!-- 规则 -->
            <div class="d-flex flex-wrap ga-3 mt-4">
                <v-text-field v-model="pattern" :label="t('bookTools.textReplace.pattern')" variant="outlined" density="compact" class="booktool-field" :error-messages="ruleError" />
                <v-text-field v-model="replacement" :label="t('bookTools.textReplace.replacement')" variant="outlined" density="compact" class="booktool-field" />
            </div>
            <v-checkbox v-model="useRegex" :label="t('bookTools.textReplace.useRegex')" density="compact" hide-details class="mt-0" />

            <!-- 预览 -->
            <div class="d-flex ga-3 mt-2">
                <v-btn color="primary" variant="tonal" :loading="busy === 'preview'" :disabled="!bookId || !pattern" @click="doPreview">{{ t('bookTools.common.preview') }}</v-btn>
                <span v-if="previewResult" class="text-body-2 align-self-center">{{ t('bookTools.textReplace.matched', { count: previewResult.matches, truncated: previewResult.truncated ? t('bookTools.textReplace.truncated') : '' }) }}</span>
            </div>
            <v-alert v-if="previewResult && previewResult.regex_error" type="error" variant="tonal" density="compact" class="mt-3">{{ previewResult.regex_error }}</v-alert>
            <div v-if="previewResult && previewResult.samples && previewResult.samples.length" class="mt-3">
                <div class="text-subtitle-2 mb-2">{{ t('bookTools.textReplace.samples') }}</div>
                <div v-for="(s, i) in previewResult.samples" :key="i" class="booktool-sample pa-2 mb-2 rounded border text-body-2" style="word-break: break-all; white-space: pre-wrap"><span>{{ s.pre }}</span><mark class="px-1 rounded" style="background: rgb(var(--v-theme-warning)); color: #fff">{{ s.match }}</mark><span>{{ s.post }}</span></div>
            </div>

            <v-divider class="my-4" />

            <!-- 输出方式 -->
            <v-radio-group v-model="outputMode" inline density="compact" hide-details>
                <v-radio value="new" :label="t('bookTools.common.newBook')" />
                <v-radio value="overwrite" :label="t('bookTools.common.overwrite')" />
            </v-radio-group>
            <v-text-field v-if="outputMode === 'new'" v-model="suffix" :label="t('bookTools.common.suffix')" variant="outlined" density="compact" class="booktool-field mt-2" />

            <v-btn
                :color="outputMode === 'overwrite' ? 'error' : 'primary'"
                class="mt-3"
                :loading="busy === 'run'"
                :disabled="!bookId || !pattern"
                @click="doRun"
            >
                {{ t(outputMode === 'overwrite' ? 'bookTools.common.overwriteAction' : 'bookTools.common.saveNewAction') }}
            </v-btn>

            <v-alert v-if="error" type="error" variant="tonal" closable class="mt-4" @click:close="error = ''">{{ error }}</v-alert>
            <v-alert v-if="success" type="success" variant="tonal" closable class="mt-4" @click:close="success = ''">{{ success }}</v-alert>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';
import { confirmDestructiveBookWrite } from '@/utils/book-tools';
import { useBookToolSelection } from '@/composables/useBookToolSelection';

const { t } = useI18n();
const { $backend } = useNuxtApp();
const router = useRouter();
useMainStore().setNavbar(true);

const { bookId, bookOptions, bookQuery, booksLoading, selectedBook, onBookSearch } = useBookToolSelection();
const pattern = ref('');
const replacement = ref('');
const useRegex = ref(false);
const outputMode = ref('new');
const suffix = ref('');
const busy = ref('');
const error = ref('');
const success = ref('');
const previewResult = ref(null);
const ruleError = ref('');

watch(bookId, () => {
    previewResult.value = null;
    error.value = '';
    success.value = '';
});

async function doPreview() {
    error.value = '';
    ruleError.value = '';
    previewResult.value = null;
    busy.value = 'preview';
    try {
        const rsp = await $backend('/plugins/tools/text-replace/preview', {
            method: 'POST',
            body: JSON.stringify({ book_id: bookId.value, pattern: pattern.value, replacement: replacement.value, use_regex: useRegex.value }),
        });
        if (rsp.err === 'ok') {
            previewResult.value = rsp;
        } else if (rsp.err === 'booktools.rule_invalid') {
            ruleError.value = rsp.msg;
        } else {
            error.value = rsp.msg || rsp.err;
        }
    } catch (e) {
        error.value = String(e);
    } finally {
        busy.value = '';
    }
}
async function doRun() {
    if (!confirmDestructiveBookWrite(
        outputMode.value === 'overwrite',
        t('bookTools.common.overwriteConfirm', { title: selectedBook.value?.title || '' }),
    )) return;
    error.value = '';
    success.value = '';
    busy.value = 'run';
    try {
        const rsp = await $backend('/plugins/tools/text-replace/run', {
            method: 'POST',
            body: JSON.stringify({
                book_id: bookId.value,
                pattern: pattern.value,
                replacement: replacement.value,
                use_regex: useRegex.value,
                output_mode: outputMode.value,
                suffix: suffix.value,
            }),
        });
        if (rsp.err === 'ok') {
            const isNew = rsp.output_mode === 'new';
            success.value = t(isNew ? 'bookTools.textReplace.successNew' : 'bookTools.textReplace.successOverwrite', { count: rsp.matches, id: rsp.book_id });
        } else {
            error.value = rsp.msg || rsp.err;
        }
    } catch (e) {
        error.value = String(e);
    } finally {
        busy.value = '';
    }
}
useHead(() => ({ title: t('bookTools.textReplace.title') }));
</script>

<style scoped>
.booktool-field { flex: 1 1 280px; max-width: 520px; }
.booktool-sample { background: rgba(var(--v-theme-surface-variant), 0.5); }
@media (max-width: 600px) { .booktool-field { max-width: none; flex-basis: 100%; } }
</style>
