<template>
    <section
        :aria-label="label"
        :aria-busy="loading"
        data-testid="metadata-list"
    >
        <v-text-field
            v-model="query"
            :label="t('library.searchFilter', { label })"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            clearable
            hide-details
            class="mb-3"
            data-testid="metadata-search"
        />
        <p
            class="text-body-2 mb-3"
            role="status"
            aria-live="polite"
        >
            {{ loading ? t('book.loading') : failed ? '' : summary }}
        </p>
        <v-progress-linear
            v-if="loading"
            indeterminate
            color="primary"
            :aria-label="t('book.loading')"
        />
        <v-alert
            v-else-if="failed"
            type="error"
            variant="tonal"
            role="alert"
        >
            {{ t('errors.networkError') }}
            <v-btn
                variant="text"
                @click="reload"
            >
                {{ t('common.retry') }}
            </v-btn>
        </v-alert>
        <div
            v-else-if="items.length"
            class="metadata-chips"
            data-testid="metadata-items"
        >
            <v-chip
                v-for="item in items"
                :key="item.id"
                :to="'/' + meta + '/' + encodeURIComponent(item.name)"
                :title="String(item.name)"
                variant="outlined"
                color="primary"
                size="small"
            >
                {{ item.name }}<template v-if="meta === 'rating'">
                    {{ t('admin.books.label.star') }}
                </template>
                <span v-if="item.count">&nbsp;({{ item.count }})</span>
            </v-chip>
        </div>
        <div
            v-else
            class="pa-6 text-center"
            role="status"
        >
            {{ t('library.noMatchingFilter', { label }) }}
        </div>
        <v-pagination
            v-if="pages > 1"
            v-model="page"
            :length="pages"
            :total-visible="xs ? 3 : 5"
            :disabled="loading"
            class="mt-4"
            density="compact"
            data-testid="metadata-pagination"
        />
    </section>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useDisplay } from 'vuetify';
import { useRoute } from 'vue-router';
import { useNuxtApp, useHead } from 'nuxt/app';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';
import { metadataPageUrl, useMetadataPage } from '@/composables/useMetadataPage';

const props = defineProps({ metaType: { type: String, default: '' } });
const route = useRoute();
const { xs } = useDisplay();
const { t } = useI18n();
const { $backend } = useNuxtApp();
useMainStore().setNavbar(true);
const meta = computed(() => props.metaType || route.path.split('/')[1]);
const label = computed(() => t(`messages.titles.${meta.value}`));
const { page, query, items, total, unfilteredTotal, pages, loading, failed, reload } = useMetadataPage(
    (p, q, size) => $backend(metadataPageUrl(meta.value, p, q, size)),
    { key: meta }
);
watch(meta, () => { query.value = ''; }, { flush: 'sync' });
const summary = computed(() => t(
    query.value?.trim() ? 'library.filterPickerSearchSummary' : 'library.filterPickerSummary',
    { count: total.value, total: unfilteredTotal.value, page: page.value, pages: pages.value }
));
useHead({ title: () => label.value });
</script>

<style scoped>
.metadata-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
}
.metadata-chips :deep(.v-chip) { max-width: 100%; }
.metadata-chips :deep(.v-chip__content) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
