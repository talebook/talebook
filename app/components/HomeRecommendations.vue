<template>
    <section
        class="home-recommendations"
        data-testid="home-recommendations"
        aria-labelledby="home-recommendations-title"
    >
        <div class="home-recommendations__header">
            <div>
                <h2
                    id="home-recommendations-title"
                    class="title"
                >
                    {{ t('recommendations.title') }}
                </h2>
                <p class="home-recommendations__hint text-medium-emphasis">
                    {{ t('recommendations.homeHint') }}
                </p>
            </div>
            <div class="home-recommendations__actions">
                <v-btn
                    icon="mdi-refresh"
                    size="small"
                    variant="text"
                    :loading="loading"
                    :aria-label="t('recommendations.refresh')"
                    @click="loadRecommendations(true)"
                />
                <v-menu
                    v-model="optionsOpen"
                    :close-on-content-click="false"
                    :activator-props="{ 'aria-haspopup': 'dialog' }"
                    :content-props="{
                        role: 'dialog',
                        'aria-labelledby': 'home-recommendations-options-title',
                    }"
                    location="bottom end"
                    width="320"
                    max-width="calc(100vw - 24px)"
                >
                    <template #activator="{ props }">
                        <v-btn
                            v-bind="props"
                            icon="mdi-tune"
                            size="small"
                            variant="text"
                            data-testid="recommendation-options"
                            :aria-label="t('recommendations.optionsTitle')"
                        />
                    </template>
                    <v-card
                        class="home-recommendations__options"
                    >
                        <v-card-title
                            id="home-recommendations-options-title"
                            class="text-subtitle-1"
                        >
                            {{ t('recommendations.optionsTitle') }}
                        </v-card-title>
                        <v-card-text>
                            <v-switch
                                v-model="preferences.personalization_enabled"
                                color="primary"
                                density="compact"
                                hide-details
                                :disabled="saving"
                                :label="t('recommendations.historyMode')"
                                @update:model-value="saveModes"
                            />
                            <p class="home-recommendations__option-hint text-medium-emphasis">
                                {{ t('recommendations.historyModeHint') }}
                            </p>
                            <v-switch
                                v-model="preferences.popular_enabled"
                                color="primary"
                                density="compact"
                                hide-details
                                :disabled="saving"
                                :label="t('recommendations.popularMode')"
                                @update:model-value="saveModes"
                            />
                            <p class="home-recommendations__option-hint text-medium-emphasis">
                                {{ t('recommendations.popularModeHint') }}
                            </p>
                            <v-list-item
                                class="home-recommendations__notes"
                                disabled
                                prepend-icon="mdi-note-text-outline"
                                :title="t('recommendations.notesMode')"
                                :subtitle="t('recommendations.notesUnavailable')"
                            />
                        </v-card-text>
                        <v-divider />
                        <v-card-actions>
                            <v-btn
                                to="/recommendations"
                                variant="text"
                                append-icon="mdi-arrow-right"
                            >
                                {{ t('recommendations.advancedSettings') }}
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </v-menu>
            </div>
        </div>

        <p
            v-if="fallback"
            class="home-recommendations__fallback text-medium-emphasis"
            role="status"
        >
            <v-icon
                size="16"
                aria-hidden="true"
            >
                mdi-information-outline
            </v-icon>
            {{ t('recommendations.homeFallback') }}
        </p>

        <v-progress-linear
            v-if="loading && books.length"
            indeterminate
            color="primary"
            class="mb-3"
        />
        <v-row
            v-if="loading && !books.length"
            dense
        >
            <v-col
                v-for="index in 12"
                :key="index"
                cols="6"
                sm="4"
                md="2"
            >
                <v-skeleton-loader type="image, list-item-two-line" />
            </v-col>
        </v-row>
        <v-alert
            v-else-if="errorMessage"
            type="error"
            variant="tonal"
        >
            <div class="d-flex flex-wrap align-center justify-space-between ga-2">
                <span>{{ errorMessage }}</span>
                <v-btn
                    size="small"
                    variant="outlined"
                    @click="loadRecommendations(true)"
                >
                    {{ t('recommendations.retry') }}
                </v-btn>
            </div>
        </v-alert>
        <div
            v-else-if="!books.length"
            class="home-recommendations__empty text-medium-emphasis"
        >
            {{ t('recommendations.emptyHint') }}
        </div>
        <v-row
            v-else
            dense
        >
            <v-col
                v-for="book in books"
                :key="book.id"
                cols="6"
                sm="4"
                md="2"
            >
                <v-card
                    :to="`/book/${book.id}`"
                    class="home-recommendation-card h-100"
                    data-testid="home-recommendation-card"
                    @click="track('detail_click', book)"
                >
                    <v-img
                        :src="book.img"
                        :alt="book.title"
                        :aspect-ratio="11 / 15"
                        cover
                    />
                    <v-card-item class="home-recommendation-card__body">
                        <v-card-title class="home-recommendation-card__title">
                            {{ book.title }}
                        </v-card-title>
                        <v-card-subtitle class="home-recommendation-card__author">
                            {{ book.author }}
                        </v-card-subtitle>
                        <p class="home-recommendation-card__reason">
                            {{ book.recommendation.reason }}
                        </p>
                    </v-card-item>
                </v-card>
            </v-col>
        </v-row>
    </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useNuxtApp } from 'nuxt/app';
import { useI18n } from 'vue-i18n';

const { $backend } = useNuxtApp();
const { t } = useI18n();

const books = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const fallback = ref(false);
const source = ref('deterministic');
const errorMessage = ref('');
const optionsOpen = ref(false);
const preferences = reactive({
    personalization_enabled: true,
    popular_enabled: true,
    topics: [] as string[],
    length: '',
    difficulty: '',
    seed_book_ids: [] as number[],
});

const applyPreferences = (value: any) => {
    Object.assign(preferences, {
        personalization_enabled: value?.personalization_enabled !== false,
        popular_enabled: value?.popular_enabled !== false,
        topics: value?.topics || [],
        length: value?.length || '',
        difficulty: value?.difficulty || '',
        seed_book_ids: value?.seed_book_ids || [],
    });
};

const loadRecommendations = async (refresh = false) => {
    loading.value = true;
    errorMessage.value = '';
    try {
        const rsp = await $backend(`/ai/recommendations?limit=12&refresh=${refresh ? 1 : 0}`);
        if (rsp.err !== 'ok') throw new Error(rsp.msg || t('recommendations.loadFailed'));
        books.value = rsp.books || [];
        fallback.value = !!rsp.fallback;
        source.value = rsp.source || 'deterministic';
        applyPreferences(rsp.preferences);
    } catch (error: any) {
        errorMessage.value = error?.message || t('recommendations.loadFailed');
    } finally {
        loading.value = false;
    }
};

const saveModes = async () => {
    saving.value = true;
    errorMessage.value = '';
    try {
        const rsp = await $backend('/ai/recommendations/preferences', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(preferences),
        });
        if (rsp.err !== 'ok') throw new Error(rsp.msg || t('recommendations.saveFailed'));
        applyPreferences(rsp.preferences);
        await loadRecommendations(true);
    } catch (error: any) {
        errorMessage.value = error?.message || t('recommendations.saveFailed');
    } finally {
        saving.value = false;
    }
};

const track = async (eventType: string, book: any) => {
    try {
        await $backend('/ai/recommendations/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_type: eventType, book_id: book.id, source: source.value }),
        });
    } catch (_error) {
        // Metrics never block navigation.
    }
};

onMounted(() => loadRecommendations());
</script>

<style scoped>
.home-recommendations { margin-bottom: 22px; }
.home-recommendations__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.home-recommendations__header h2 { margin: 0; }
.home-recommendations__hint { margin: 2px 0 0; font-size: .82rem; }
.home-recommendations__actions { display: flex; flex: none; gap: 2px; }
.home-recommendations__options { width: 100%; max-height: calc(100vh - 24px); overflow-y: auto; overscroll-behavior: contain; }
.home-recommendations__option-hint { margin: 0 0 10px 48px; font-size: .78rem; line-height: 1.45; }
.home-recommendations__notes { margin-inline: -16px; }
.home-recommendations__fallback { display: flex; align-items: center; gap: 5px; margin: -4px 0 10px; font-size: .78rem; }
.home-recommendations__empty { padding: 32px 16px; text-align: center; }
.home-recommendation-card { overflow: hidden; }
.home-recommendation-card__body { padding: 10px 11px 12px; }
.home-recommendation-card__title { display: -webkit-box; overflow: hidden; padding: 0; font-size: .94rem; font-weight: 650; line-height: 1.35; -webkit-box-orient: vertical; -webkit-line-clamp: 1; }
.home-recommendation-card__author { overflow: hidden; padding: 0; margin-top: 2px; font-size: .78rem; text-overflow: ellipsis; white-space: nowrap; }
.home-recommendation-card__reason { display: -webkit-box; overflow: hidden; margin: 8px 0 0; color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)); font-size: .78rem; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
@media (max-width: 599px) {
    .home-recommendations__hint { max-width: 230px; }
    .home-recommendation-card__body { padding: 9px; }
}
</style>
