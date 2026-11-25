<template>
    <v-card
        class="recommendation-card h-100"
        data-testid="recommendation-card"
    >
        <div class="recommendation-card__layout">
            <NuxtLink
                :to="`/book/${book.id}`"
                class="recommendation-card__cover-link"
                :aria-label="t('recommendations.openDetailsFor', { title: book.title })"
                @click="emit('detail', book)"
            >
                <v-img
                    :src="book.img"
                    :alt="book.title"
                    cover
                    class="recommendation-card__cover"
                />
            </NuxtLink>
            <div class="recommendation-card__content">
                <div class="d-flex align-start ga-2">
                    <div class="flex-grow-1 min-width-0">
                        <h2 class="recommendation-card__title">
                            {{ book.title }}
                        </h2>
                        <p class="recommendation-card__author text-medium-emphasis">
                            {{ book.author }}
                        </p>
                    </div>
                    <v-chip
                        size="x-small"
                        :color="confidenceColor"
                        variant="tonal"
                    >
                        {{ confidenceText }}
                    </v-chip>
                </div>

                <p class="recommendation-card__reason">
                    {{ book.recommendation.reason }}
                </p>
                <div
                    v-if="book.recommendation.evidence?.length"
                    class="recommendation-card__evidence"
                    :aria-label="t('recommendations.evidence')"
                >
                    <v-chip
                        v-for="evidence in book.recommendation.evidence"
                        :key="evidence"
                        size="x-small"
                        variant="outlined"
                    >
                        {{ evidenceLabel(evidence) }}
                    </v-chip>
                </div>

                <div class="recommendation-card__actions">
                    <v-btn
                        size="small"
                        color="primary"
                        variant="flat"
                        :href="`/read/${book.id}`"
                        @click="emit('start-read', book)"
                    >
                        {{ t('recommendations.startReading') }}
                    </v-btn>
                    <v-btn
                        size="small"
                        variant="outlined"
                        :to="`/book/${book.id}`"
                        @click="emit('detail', book)"
                    >
                        {{ t('recommendations.details') }}
                    </v-btn>
                    <v-btn
                        size="small"
                        variant="text"
                        :disabled="book.state?.wants === 1"
                        @click="emit('add-shelf', book)"
                    >
                        {{ book.state?.wants === 1 ? t('recommendations.onShelf') : t('recommendations.addShelf') }}
                    </v-btn>
                    <v-menu>
                        <template #activator="{ props }">
                            <v-btn
                                v-bind="props"
                                size="small"
                                variant="text"
                                append-icon="mdi-chevron-down"
                            >
                                {{ t('recommendations.adjust') }}
                            </v-btn>
                        </template>
                        <v-list density="compact">
                            <v-list-item
                                :title="t('recommendations.notInterested')"
                                prepend-icon="mdi-book-remove-outline"
                                @click="emit('feedback', book, 'not_interested')"
                            />
                            <v-list-item
                                :title="t('recommendations.lessLikeThis')"
                                prepend-icon="mdi-book-remove-outline"
                                @click="emit('feedback', book, 'less_like')"
                            />
                            <v-list-item
                                :title="t('recommendations.alreadyRead')"
                                prepend-icon="mdi-history"
                                @click="emit('feedback', book, 'read')"
                            />
                        </v-list>
                    </v-menu>
                </div>
            </div>
        </div>
    </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

type RecommendationBook = {
    id: number
    title: string
    author: string
    img: string
    state?: { wants?: number }
    recommendation: {
        reason: string
        evidence: string[]
        confidence: 'low' | 'medium' | 'high'
    }
}

const props = defineProps<{ book: RecommendationBook }>();
const emit = defineEmits<{
    detail: [book: RecommendationBook]
    'start-read': [book: RecommendationBook]
    'add-shelf': [book: RecommendationBook]
    feedback: [book: RecommendationBook, action: string]
}>();
const { t } = useI18n();

const confidenceText = computed(() => t(`recommendations.confidence.${props.book.recommendation.confidence}`));
const confidenceColor = computed(() => ({ high: 'success', medium: 'primary', low: 'warning' }[
    props.book.recommendation.confidence
]));

const evidenceLabel = (value: string) => {
    const [kind, detail] = value.split(':', 2);
    if (detail) return t(`recommendations.evidenceTypes.${kind}`, { value: detail });
    return t(`recommendations.evidenceTypes.${kind}`);
};
</script>

<style scoped>
.recommendation-card { border: 1px solid rgba(var(--v-border-color), .35); }
.recommendation-card__layout { display: grid; grid-template-columns: 138px minmax(0, 1fr); min-height: 220px; }
.recommendation-card__cover-link { display: block; min-height: 220px; background: rgb(var(--v-theme-surface-variant)); }
.recommendation-card__cover { width: 100%; height: 100%; min-height: 220px; }
.recommendation-card__content { display: flex; min-width: 0; flex-direction: column; padding: 18px; }
.min-width-0 { min-width: 0; }
.recommendation-card__title { margin: 0; overflow: hidden; font-size: 1.08rem; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
.recommendation-card__author { margin: 4px 0 0; font-size: .86rem; }
.recommendation-card__reason { margin: 16px 0 12px; font-size: .94rem; line-height: 1.65; }
.recommendation-card__evidence { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.recommendation-card__actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; }
@media (max-width: 600px) {
    .recommendation-card__layout { grid-template-columns: 104px minmax(0, 1fr); min-height: 246px; }
    .recommendation-card__cover-link, .recommendation-card__cover { min-height: 246px; }
    .recommendation-card__content { padding: 14px; }
}
</style>
