<template>
    <v-card class="booktool">
        <v-card-title class="d-flex align-center flex-wrap ga-2 px-4 pt-4">
            <v-btn icon="mdi-arrow-left" variant="text" :aria-label="t('common.back')" @click="router.back()" />
            <div>
                <h1 class="text-h6">{{ t('bookTools.epubBeautify.title') }}</h1>
                <div class="text-body-2 text-medium-emphasis font-weight-regular">{{ t('bookTools.epubBeautify.description') }}</div>
            </div>
        </v-card-title>
        <v-card-text>
            <v-alert type="info" variant="tonal" density="compact" class="mb-4">{{ t('bookTools.epubBeautify.readOnly') }}</v-alert>

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

            <div class="d-flex flex-wrap ga-3 mt-4">
                <v-select
                    v-model="preset"
                    :items="presetItems"
                    item-title="title"
                    item-value="value"
                    :label="t('bookTools.epubBeautify.preset')"
                    variant="outlined"
                    density="compact"
                    class="booktool-field"
                />
                <v-select
                    v-model="tocStyle"
                    :items="tocStyleItems"
                    item-title="title"
                    item-value="value"
                    :label="t('bookTools.epubBeautify.tocStyle')"
                    variant="outlined"
                    density="compact"
                    class="booktool-field"
                />
            </div>
            <div v-if="selectedPreset" class="text-body-2 text-medium-emphasis mb-2">
                <span class="booktool-swatch align-self-center" :style="{ background: selectedPreset.accent }" />
                {{ selectedPreset.scene || selectedPreset.description }}
            </div>

            <div class="d-flex flex-wrap ga-4 mt-2">
                <v-switch v-model="useSystemFonts" :label="t('bookTools.epubBeautify.useSystemFonts')" density="compact" hide-details color="primary" />
                <v-switch v-model="dialogue" :label="t('bookTools.epubBeautify.dialogue')" density="compact" hide-details color="primary" />
                <v-switch v-model="titleSplit" :label="t('bookTools.epubBeautify.titleSplit')" density="compact" hide-details color="primary" />
                <v-switch v-model="tocColumns" :label="t('bookTools.epubBeautify.tocColumns')" density="compact" hide-details color="primary" />
                <v-switch v-model="includeNotes" :label="t('bookTools.epubBeautify.notes')" density="compact" hide-details color="primary" />
            </div>

            <div class="d-flex flex-wrap ga-3 mt-2">
                <v-select v-model="pageTint" :items="pageTintItems" item-title="title" item-value="value" :label="t('bookTools.epubBeautify.pageTint')" variant="outlined" density="compact" class="booktool-field" hide-details />
                <v-select v-model="bgTexture" :items="textureItems" item-title="title" item-value="value" :label="t('bookTools.epubBeautify.bgTexture')" variant="outlined" density="compact" class="booktool-field" hide-details />
                <v-select v-model="noteMark" :items="noteMarkItems()" item-title="title" item-value="value" :label="t('bookTools.epubBeautify.noteMark')" variant="outlined" density="compact" class="booktool-field" hide-details :disabled="!includeNotes" />
                <v-select v-model="tocDepth" :items="tocDepthItems" item-title="title" item-value="value" :label="t('bookTools.epubBeautify.tocDepth')" variant="outlined" density="compact" class="booktool-field" hide-details />
                <v-select v-model="paraMode" :items="paraModeItems" item-title="title" item-value="value" :label="t('bookTools.epubBeautify.paraMode')" variant="outlined" density="compact" class="booktool-field" hide-details />
                <v-text-field v-model="paraGap" type="number" min="0" max="3" step="0.1" :label="t('bookTools.epubBeautify.paraGap')" variant="outlined" density="compact" class="booktool-field" hide-details />
            </div>

            <v-expansion-panels variant="accordion" class="mt-3">
                <v-expansion-panel :title="t('bookTools.epubBeautify.cleanup')">
                    <v-expansion-panel-text>
                        <div class="d-flex flex-wrap ga-4">
                            <v-switch v-model="cleanupLeading" :label="t('bookTools.epubBeautify.cleanupLeading')" density="compact" hide-details color="primary" />
                            <v-switch v-model="cleanupEmpty" :label="t('bookTools.epubBeautify.cleanupEmpty')" density="compact" hide-details color="primary" />
                            <v-switch v-model="cleanupMeta" :label="t('bookTools.epubBeautify.cleanupMeta')" density="compact" hide-details color="primary" />
                            <v-switch v-model="cleanupTocBlank" :label="t('bookTools.epubBeautify.cleanupTocBlank')" density="compact" hide-details color="primary" />
                        </div>
                    </v-expansion-panel-text>
                </v-expansion-panel>
            </v-expansion-panels>

            <div class="d-flex ga-3 mt-3">
                <v-btn color="primary" variant="tonal" :loading="busy === 'preview'" :disabled="!bookId" @click="doPreview">{{ t('bookTools.common.analyze') }}</v-btn>
            </div>

            <div v-if="analysis" class="booktool-analysis mt-3 pa-3 rounded border text-body-2">
                <div class="d-flex flex-wrap ga-4">
                    <span>{{ t('bookTools.epubBeautify.analysisTitle', { title: analysis.title || '-' }) }}</span>
                    <span>{{ t('bookTools.epubBeautify.analysisEntries', { count: analysis.text_entries, ncx: analysis.ncx_entries, nav: analysis.nav_entries }) }}</span>
                    <span>{{ t('bookTools.epubBeautify.analysisToc', { value: analysis.has_inbook_toc ? t('bookTools.epubBeautify.yes') : t('bookTools.epubBeautify.no') }) }}</span>
                    <span>{{ t('bookTools.epubBeautify.analysisHeadings', { h: headingTotal, text: analysis.text_headings }) }}</span>
                    <span v-if="analysis.notes_refs">{{ t('bookTools.epubBeautify.analysisNotes', { count: analysis.notes_refs }) }}</span>
                    <span v-if="analysis.dialogue_paras">{{ t('bookTools.epubBeautify.analysisDialogue', { count: analysis.dialogue_paras }) }}</span>
                </div>
                <div v-if="(analysis.toc_preview_titles || []).length" class="mt-2 d-flex flex-wrap ga-1">
                    <v-chip v-for="(title, i) in analysis.toc_preview_titles" :key="i" size="small" variant="tonal">{{ title }}</v-chip>
                </div>
            </div>

            <v-divider class="my-4" />

            <v-text-field v-model="suffix" :label="t('bookTools.common.suffix')" :placeholder="t('bookTools.epubBeautify.defaultSuffix')" variant="outlined" density="compact" class="booktool-field" />

            <v-btn color="primary" class="mt-3" :loading="busy === 'run'" :disabled="!bookId || !preset" @click="doRun">
                {{ t('bookTools.common.saveNewAction') }}
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
import { useBookToolSelection } from '@/composables/useBookToolSelection';

const { t, locale } = useI18n();
const { $backend } = useNuxtApp();
const router = useRouter();
useMainStore().setNavbar(true);

const { bookId, bookOptions, bookQuery, booksLoading, selectedBook, onBookSearch } = useBookToolSelection({ formats: ['EPUB'] });

const presets = ref([]);
const tocStyles = ref([]);
const textures = ref([]);
const preset = ref('classic');
const tocStyle = ref('elegant');
const useSystemFonts = ref(true);
const dialogue = ref(false);
const titleSplit = ref(false);
const tocColumns = ref(false);
const pageTint = ref('auto');
const bgTexture = ref('');
const includeNotes = ref(false);
const noteMark = ref('orig');
const tocDepth = ref('all');
const paraMode = ref('default');
const paraGap = ref('');
const cleanupLeading = ref(true);
const cleanupEmpty = ref(false);
const cleanupMeta = ref(true);
const cleanupTocBlank = ref(true);
const suffix = ref('');
const busy = ref('');
const error = ref('');
const success = ref('');
const previewResult = ref(null);

const analysis = computed(() => previewResult.value?.analysis || null);
const headingTotal = computed(() => {
    const stats = analysis.value?.heading_stats || {};
    return Object.values(stats).reduce((sum, value) => sum + (Number(value) || 0), 0);
});
const isEn = computed(() => String(locale.value || '').toLowerCase().startsWith('en'));
function localizedName(item) {
    return isEn.value ? (item.name_en || item.name) : item.name;
}
const presetItems = computed(() => presets.value.map(item => ({
    title: localizedName(item),
    value: item.id,
    accent: item.accent || '',
    scene: item.scene || item.description || '',
})));
const selectedPreset = computed(() => presetItems.value.find(item => item.value === preset.value) || null);
const tocStyleItems = computed(() => tocStyles.value.map(item => ({
    title: localizedName(item),
    value: item.id,
})));
const pageTintItems = computed(() => [
    { title: t('bookTools.epubBeautify.tintAuto'), value: 'auto' },
    { title: t('bookTools.epubBeautify.tintOn'), value: 'on' },
    { title: t('bookTools.epubBeautify.tintOff'), value: 'off' },
]);
const textureItems = computed(() => [
    { title: t('bookTools.epubBeautify.texturesNone'), value: '' },
    ...textures.value.map(item => ({ title: localizedName(item), value: item.id })),
]);
const tocDepthItems = computed(() => [
    { title: t('bookTools.epubBeautify.depthAll'), value: 'all' },
    { title: t('bookTools.epubBeautify.depth1'), value: '1' },
    { title: t('bookTools.epubBeautify.depth2'), value: '2' },
    { title: t('bookTools.epubBeautify.depth3'), value: '3' },
]);
const paraModeItems = computed(() => [
    { title: t('bookTools.epubBeautify.paraDefault'), value: 'default' },
    { title: t('bookTools.epubBeautify.paraIndent'), value: 'indent' },
    { title: t('bookTools.epubBeautify.paraSpacing'), value: 'spacing' },
]);

function noteMarkItems() {
    return [
        { title: t('bookTools.epubBeautify.noteMarks.orig'), value: 'orig' },
        { title: t('bookTools.epubBeautify.noteMarks.sym'), value: 'sym' },
        { title: t('bookTools.epubBeautify.noteMarks.num'), value: 'num' },
        { title: t('bookTools.epubBeautify.noteMarks.zhu'), value: 'zhu' },
        { title: t('bookTools.epubBeautify.noteMarks.svgDot'), value: 'svg:dot' },
        { title: t('bookTools.epubBeautify.noteMarks.svgFold'), value: 'svg:fold' },
        { title: t('bookTools.epubBeautify.noteMarks.svgInkdrop'), value: 'svg:inkdrop' },
        { title: t('bookTools.epubBeautify.noteMarks.svgSpark'), value: 'svg:spark' },
        { title: t('bookTools.epubBeautify.noteMarks.svgSealdot'), value: 'svg:sealdot' },
    ];
}

watch(bookId, () => {
    previewResult.value = null;
    error.value = '';
    success.value = '';
});

function buildPayload() {
    const depth = tocDepth.value === 'all' ? null : Number(tocDepth.value);
    let paraIndent = null;
    if (paraMode.value === 'indent') paraIndent = true;
    else if (paraMode.value === 'spacing') paraIndent = false;
    const gap = paraGap.value === '' || paraGap.value === null ? null : Number(paraGap.value);
    let tint = null;
    if (pageTint.value === 'on') tint = true;
    else if (pageTint.value === 'off') tint = false;
    return {
        preset: preset.value,
        toc_style: tocStyle.value,
        use_system_fonts: useSystemFonts.value,
        toc_depth: depth,
        cleanup: {
            leading: cleanupLeading.value,
            empty: cleanupEmpty.value,
            meta: cleanupMeta.value,
            toc_blank: cleanupTocBlank.value,
        },
        page_tint: tint,
        bg_texture: bgTexture.value,
        dialogue: dialogue.value,
        title_split: titleSplit.value,
        toc_columns: tocColumns.value,
        para_mode: paraMode.value === 'default' ? null : paraMode.value,
        para_indent: paraIndent,
        para_gap: gap,
        notes: includeNotes.value,
        note_mark: noteMark.value,
    };
}

async function loadOptions() {
    try {
        const rsp = await $backend('/plugins/tools/epub-beautify/presets');
        if (rsp.err === 'ok') {
            presets.value = rsp.presets || [];
            tocStyles.value = rsp.toc_styles || [];
            textures.value = rsp.textures || [];
            if (!presets.value.some(item => item.id === preset.value) && presets.value.length) {
                preset.value = presets.value[0].id;
            }
        }
    } catch (e) {
        error.value = String(e);
    }
}

async function doPreview() {
    error.value = '';
    success.value = '';
    previewResult.value = null;
    busy.value = 'preview';
    try {
        const rsp = await $backend('/plugins/tools/epub-beautify/preview', {
            method: 'POST',
            body: JSON.stringify({ book_id: bookId.value }),
        });
        if (rsp.err === 'ok') previewResult.value = rsp;
        else error.value = rsp.msg || rsp.err;
    } catch (e) {
        error.value = String(e);
    } finally {
        busy.value = '';
    }
}

async function doRun() {
    error.value = '';
    success.value = '';
    busy.value = 'run';
    try {
        const rsp = await $backend('/plugins/tools/epub-beautify/run', {
            method: 'POST',
            body: JSON.stringify({ book_id: bookId.value, suffix: suffix.value, ...buildPayload() }),
        });
        if (rsp.err === 'ok') {
            success.value = t('bookTools.epubBeautify.successNew', {
                preset: selectedPreset.value?.title || rsp.preset,
                id: rsp.book_id,
            });
        } else {
            error.value = rsp.msg || rsp.err;
        }
    } catch (e) {
        error.value = String(e);
    } finally {
        busy.value = '';
    }
}

onMounted(loadOptions);
useHead(() => ({ title: t('bookTools.epubBeautify.title') }));
</script>

<style scoped>
.booktool-field { flex: 1 1 240px; max-width: 520px; }
.booktool-swatch { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 6px; }
.booktool-analysis { background: rgba(var(--v-theme-surface-variant), 0.35); }
@media (max-width: 600px) { .booktool-field { max-width: none; flex-basis: 100%; } }
</style>
