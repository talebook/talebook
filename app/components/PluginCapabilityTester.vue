<template>
    <section
        v-if="kind"
        class="capability-tester mt-5"
    >
        <h3 class="text-subtitle-1 mb-1">
            {{ t('pluginManagement.capabilityTest') }}
        </h3>
        <p class="text-body-2 text-medium-emphasis mb-3">
            {{ t('pluginManagement.capabilityTestDescription', { capability }) }}
        </p>
        <v-tabs
            v-if="availableKinds.length > 1"
            v-model="selectedKind"
            class="mb-3"
            density="compact"
        >
            <v-tab
                v-for="availableKind in availableKinds"
                :key="availableKind"
                :value="availableKind"
            >
                {{ labelFor(availableKind) }}
            </v-tab>
        </v-tabs>

        <v-form @submit.prevent="submit">
            <template v-if="kind === 'source'">
                <v-text-field
                    v-model="form.keyword"
                    :label="t('pluginManagement.queryKeyword')"
                    density="compact"
                    variant="outlined"
                    hide-details="auto"
                    :error-messages="validationError"
                    autocomplete="off"
                />
            </template>
            <div
                v-else
                class="capability-tester__book-query"
            >
                <v-text-field
                    v-model="form.title"
                    :label="t('pluginManagement.queryTitle')"
                    density="compact"
                    variant="outlined"
                    hide-details="auto"
                    :error-messages="validationError"
                    autocomplete="off"
                />
                <v-text-field
                    v-model="form.isbn"
                    :label="t('pluginManagement.queryIsbn')"
                    density="compact"
                    variant="outlined"
                    hide-details="auto"
                    autocomplete="off"
                />
                <v-text-field
                    v-model="form.authors"
                    :label="t('pluginManagement.queryAuthors')"
                    density="compact"
                    variant="outlined"
                    hide-details
                    autocomplete="off"
                />
                <v-text-field
                    v-model="form.publisher"
                    :label="t('pluginManagement.queryPublisher')"
                    density="compact"
                    variant="outlined"
                    hide-details
                    autocomplete="off"
                />
            </div>
            <v-btn
                class="mt-3"
                color="primary"
                variant="tonal"
                type="submit"
                :loading="loading"
                :disabled="!plugin.installation?.enabled"
            >
                {{ submitLabel }}
            </v-btn>
        </v-form>

        <v-alert
            v-if="error"
            class="mt-3"
            type="error"
            variant="tonal"
            density="compact"
        >
            {{ error }}
        </v-alert>
        <template v-else-if="submitted">
            <div
                class="capability-tester__summary mt-4"
                role="status"
                aria-live="polite"
            >
                {{ t('pluginManagement.capabilityResultCount', { count: items.length }) }}
            </div>
            <v-alert
                v-if="items.length === 0"
                class="mt-2"
                type="info"
                variant="tonal"
                density="compact"
            >
                {{ t('pluginManagement.capabilityNoResult') }}
            </v-alert>
            <v-list
                v-else
                class="capability-tester__results mt-1"
                lines="three"
            >
                <v-list-item
                    v-for="(item, index) in items"
                    :key="resultKey(item, index)"
                    :title="resultTitle(item)"
                    :subtitle="resultSubtitle(item)"
                />
            </v-list>
        </template>
    </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

type ProbeKind = 'metadata' | 'source' | 'review';
type ProbeItem = Record<string, any>;
type PluginDefinition = {
    plugin_key: string;
    capabilities?: string[];
    connection_owners?: string[];
    installation?: { enabled?: boolean } | null;
};

const props = defineProps<{ plugin: PluginDefinition }>();
const { t } = useI18n();
const { $backend } = useNuxtApp();

const availableKinds = computed<ProbeKind[]>(() => {
    if (!props.plugin.connection_owners?.includes('instance')) return [];
    const capabilities = props.plugin.capabilities || [];
    const kinds: ProbeKind[] = [];
    if (capabilities.includes('metadata.lookup')) kinds.push('metadata');
    if (capabilities.includes('book_sources.search')) kinds.push('source');
    if (capabilities.includes('reviews.lookup')) kinds.push('review');
    return kinds;
});
const selectedKind = ref<ProbeKind>('metadata');
const kind = computed<ProbeKind | null>(() => (
    availableKinds.value.includes(selectedKind.value) ? selectedKind.value : availableKinds.value[0] || null
));
const capability = computed(() => ({
    metadata: 'MetadataProvider.search_books()',
    source: 'SourceProvider.search()',
    review: 'ReviewProvider.get_reviews()',
})[kind.value || 'metadata']);
const submitLabel = computed(() => ({
    metadata: t('pluginManagement.metadataSearch'),
    source: t('pluginManagement.sourceSearch'),
    review: t('pluginManagement.reviewLookup'),
})[kind.value || 'metadata']);

const form = ref({ title: '', isbn: '', authors: '', publisher: '', keyword: '' });
const loading = ref(false);
const submitted = ref(false);
const items = ref<ProbeItem[]>([]);
const error = ref('');
const validationError = ref('');

function reset() {
    form.value = { title: '', isbn: '', authors: '', publisher: '', keyword: '' };
    loading.value = false;
    submitted.value = false;
    items.value = [];
    error.value = '';
    validationError.value = '';
}

watch(() => props.plugin.plugin_key, () => {
    selectedKind.value = availableKinds.value[0] || 'metadata';
    reset();
});
watch(selectedKind, reset);

function labelFor(kindValue: ProbeKind) {
    return ({
        metadata: t('pluginManagement.metadataSearch'),
        source: t('pluginManagement.sourceSearch'),
        review: t('pluginManagement.reviewLookup'),
    })[kindValue];
}

function requestFor(kindValue: ProbeKind) {
    const base = `/admin/plugins/${props.plugin.plugin_key}`;
    if (kindValue === 'source') {
        return { url: `${base}/source/search`, body: { query: form.value.keyword.trim() } };
    }
    const query = {
        title: form.value.title.trim(),
        isbn: form.value.isbn.trim(),
        authors: form.value.authors.split(',').map(item => item.trim()).filter(Boolean),
        publisher: form.value.publisher.trim(),
    };
    return {
        url: kindValue === 'metadata' ? `${base}/metadata/search` : `${base}/reviews/lookup`,
        body: { query },
    };
}

async function submit() {
    const kindValue = kind.value;
    if (!kindValue) return;
    validationError.value = '';
    error.value = '';
    if (kindValue === 'source' && !form.value.keyword.trim()) {
        validationError.value = t('pluginManagement.keywordRequired');
        return;
    }
    if (kindValue !== 'source' && !form.value.title.trim() && !form.value.isbn.trim()) {
        validationError.value = t('pluginManagement.queryRequired');
        return;
    }
    loading.value = true;
    submitted.value = false;
    items.value = [];
    try {
        const request = requestFor(kindValue);
        const response = await $backend(request.url, {
            method: 'POST',
            body: JSON.stringify(request.body),
        });
        if (response.err !== 'ok') {
            error.value = response.msg || t('pluginManagement.capabilityTestFailed');
            return;
        }
        items.value = response.items || [];
        submitted.value = true;
    } catch {
        error.value = t('pluginManagement.capabilityTestFailed');
    } finally {
        loading.value = false;
    }
}

function resultKey(item: ProbeItem, index: number) {
    return item.external_id || item.provider_value || `${resultTitle(item)}-${index}`;
}

function resultTitle(item: ProbeItem) {
    return item.title || item.source || item.external_id || '—';
}

function resultSubtitle(item: ProbeItem) {
    if (kind.value === 'review') {
        const rating = item.rating || {};
        const count = rating.sample_count ?? 0;
        return [
            rating.value != null
                ? t('pluginManagement.ratingSummary', { value: rating.value, scale: rating.scale || '—', count })
                : '',
            item.summary,
        ].filter(Boolean).join(' · ');
    }
    const authors = Array.isArray(item.authors) ? item.authors.join('、') : '';
    return [authors, item.publisher, item.isbn, item.format, item.access].filter(Boolean).join(' · ');
}
</script>

<style scoped>
.capability-tester { padding-top:16px; border-top:1px solid rgba(var(--v-theme-on-surface),.12); }
.capability-tester__book-query { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.capability-tester__summary { color:rgba(var(--v-theme-on-surface),.62); font-size:12px; }
.capability-tester__results { max-height:280px; overflow-y:auto; border:1px solid rgba(var(--v-theme-on-surface),.1); border-radius:8px; }
@media (max-width: 520px) { .capability-tester__book-query { grid-template-columns:1fr; } }
</style>
