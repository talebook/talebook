<template>
    <div class="plugin-item-preview">
        <dl
            v-if="fields.length"
            class="plugin-item-preview__fields"
        >
            <div
                v-for="field in fields"
                :key="field.field"
                class="plugin-item-preview__field"
            >
                <dt>
                    <span class="font-weight-medium">{{ field.field }}</span>
                    <span
                        class="plugin-item-preview__decision"
                        :data-decision="field.decision"
                    >{{ decisionLabel(field.decision) }}</span>
                </dt>
                <dd>
                    <span class="text-medium-emphasis">{{ display(field.current) }}</span>
                    <span aria-hidden="true"> → </span>
                    <span>{{ display(field.candidate) }}</span>
                </dd>
            </div>
        </dl>
        <dl
            v-else-if="rating"
            class="plugin-item-preview__rating"
        >
            <div>
                <dt>{{ t('pluginManagement.previewSource') }}</dt>
                <dd>{{ data.source || '—' }}</dd>
            </div>
            <div>
                <dt>{{ t('pluginManagement.previewRating') }}</dt>
                <dd>{{ display(rating.value) }} / {{ display(rating.scale) }}</dd>
            </div>
            <div v-if="rating.sample_count != null">
                <dt>{{ t('pluginManagement.previewSamples') }}</dt>
                <dd>{{ rating.sample_count }}</dd>
            </div>
            <div v-if="data.source_time">
                <dt>{{ t('pluginManagement.previewSourceTime') }}</dt>
                <dd>{{ data.source_time }}</dd>
            </div>
            <div v-if="data.summary">
                <dt>{{ t('pluginManagement.previewSummary') }}</dt>
                <dd>{{ data.summary }}</dd>
            </div>
            <div v-if="safeSourceUrl">
                <dt>{{ t('pluginManagement.previewLink') }}</dt>
                <dd>
                    <a
                        :href="safeSourceUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                    >{{ t('pluginManagement.openSource') }}</a>
                </dd>
            </div>
        </dl>
        <span
            v-else
            class="text-medium-emphasis"
        >—</span>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

type FieldDecision = {
    field: string;
    current?: unknown;
    candidate?: unknown;
    decision: string;
};

type PreviewData = {
    source?: string;
    source_time?: string;
    source_url?: string;
    summary?: string;
    fields?: FieldDecision[];
    rating?: { value?: unknown; scale?: unknown; sample_count?: number | null };
};

const props = defineProps<{ data?: PreviewData }>();
const { t } = useI18n();
const data = computed(() => props.data || {});
const fields = computed(() => Array.isArray(data.value.fields) ? data.value.fields : []);
const rating = computed(() => data.value.rating || null);
const safeSourceUrl = computed(() => {
    const value = data.value.source_url || '';
    return /^https?:\/\//i.test(value) ? value : '';
});

function decisionLabel(value: string) {
    return t(`pluginManagement.preview_${value}`);
}

function display(value: unknown) {
    if (value === null || value === undefined || value === '') return '—';
    if (Array.isArray(value)) return value.join(', ') || '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}
</script>

<style scoped>
.plugin-item-preview { min-width: 240px; max-width: 560px; padding-block: 6px; overflow-wrap: anywhere; }
.plugin-item-preview dl { margin: 0; }
.plugin-item-preview__field + .plugin-item-preview__field { margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
.plugin-item-preview__field dt { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.plugin-item-preview__field dd { margin: 3px 0 0; }
.plugin-item-preview__decision { padding: 1px 7px; border-radius: 999px; color: rgb(var(--v-theme-on-surface)); background: rgba(var(--v-theme-on-surface), 0.08); font-size: 12px; }
.plugin-item-preview__decision[data-decision="locked"] { background: rgba(var(--v-theme-warning), 0.18); }
.plugin-item-preview__decision[data-decision="fill_empty"] { background: rgba(var(--v-theme-success), 0.18); }
.plugin-item-preview__rating > div { display: grid; grid-template-columns:minmax(86px,auto) minmax(0,1fr); gap: 8px; }
.plugin-item-preview__rating dt { color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)); }
.plugin-item-preview__rating dd { margin: 0; }
@media (max-width: 600px) { .plugin-item-preview { min-width: 190px; } .plugin-item-preview__rating > div { grid-template-columns:1fr; gap: 0; margin-bottom: 6px; } }
</style>
