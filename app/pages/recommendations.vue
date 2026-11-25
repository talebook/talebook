<template>
    <div class="recommendations-page">
        <header class="recommendations-hero">
            <div>
                <p class="recommendations-hero__eyebrow">
                    {{ t('recommendations.eyebrow') }}
                </p>
                <h1>{{ t('recommendations.title') }}</h1>
                <p>{{ t('recommendations.subtitle') }}</p>
            </div>
            <div class="recommendations-hero__actions">
                <v-btn
                    prepend-icon="mdi-shuffle"
                    variant="outlined"
                    :loading="loading"
                    @click="nextBatch"
                >
                    {{ t('recommendations.nextBatch') }}
                </v-btn>
                <v-btn
                    prepend-icon="mdi-refresh"
                    color="primary"
                    :loading="loading"
                    @click="loadRecommendations(true)"
                >
                    {{ t('recommendations.refresh') }}
                </v-btn>
            </div>
        </header>

        <v-alert
            v-if="fallback"
            type="info"
            variant="tonal"
            class="mb-4"
            data-testid="recommendation-fallback"
        >
            {{ t('recommendations.fallbackNotice') }}
        </v-alert>
        <v-alert
            v-else-if="cached"
            type="success"
            variant="tonal"
            class="mb-4"
        >
            {{ t('recommendations.cachedNotice') }}
        </v-alert>

        <v-expansion-panels
            v-model="settingsPanel"
            class="mb-5"
        >
            <v-expansion-panel value="settings">
                <v-expansion-panel-title>
                    <div>
                        <strong>{{ t('recommendations.tuneTitle') }}</strong>
                        <div class="text-body-2 text-medium-emphasis mt-1">
                            {{ coldStart ? t('recommendations.coldStartHint') : t('recommendations.tuneHint') }}
                        </div>
                    </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                    <v-row>
                        <v-col cols="12">
                            <v-switch
                                v-model="preferences.personalization_enabled"
                                color="primary"
                                hide-details
                                :label="t('recommendations.personalization')"
                            />
                            <p class="text-body-2 text-medium-emphasis mb-0">
                                {{ t('recommendations.personalizationHint') }}
                            </p>
                        </v-col>
                        <v-col cols="12">
                            <v-switch
                                v-model="preferences.popular_enabled"
                                color="primary"
                                hide-details
                                :label="t('recommendations.popularMode')"
                            />
                            <p class="text-body-2 text-medium-emphasis mb-0">
                                {{ t('recommendations.popularModeHint') }}
                            </p>
                        </v-col>
                        <v-col
                            cols="12"
                            md="6"
                        >
                            <v-combobox
                                v-model="preferences.topics"
                                chips
                                closable-chips
                                multiple
                                :label="t('recommendations.topics')"
                                :hint="t('recommendations.topicsHint')"
                                persistent-hint
                            />
                        </v-col>
                        <v-col
                            cols="12"
                            md="3"
                        >
                            <v-select
                                v-model="preferences.length"
                                :items="lengthOptions"
                                item-title="title"
                                item-value="value"
                                :label="t('recommendations.length')"
                            />
                        </v-col>
                        <v-col
                            cols="12"
                            md="3"
                        >
                            <v-select
                                v-model="preferences.difficulty"
                                :items="difficultyOptions"
                                item-title="title"
                                item-value="value"
                                :label="t('recommendations.difficulty')"
                            />
                        </v-col>
                        <v-col cols="12">
                            <v-select
                                v-model="preferences.seed_book_ids"
                                :items="seedBooks"
                                item-title="title"
                                item-value="id"
                                multiple
                                chips
                                closable-chips
                                :label="t('recommendations.seedBooks')"
                                :hint="t('recommendations.seedBooksHint')"
                                persistent-hint
                            />
                        </v-col>
                    </v-row>
                    <div class="d-flex flex-wrap ga-2 mt-3">
                        <v-btn
                            color="primary"
                            :loading="savingPreferences"
                            @click="savePreferences"
                        >
                            {{ t('recommendations.savePreferences') }}
                        </v-btn>
                        <v-btn
                            color="error"
                            variant="text"
                            @click="clearDialog = true"
                        >
                            {{ t('recommendations.clearFeedback') }}
                        </v-btn>
                    </div>
                </v-expansion-panel-text>
            </v-expansion-panel>
        </v-expansion-panels>

        <v-progress-linear
            v-if="loading"
            indeterminate
            color="primary"
            class="mb-5"
        />
        <v-alert
            v-if="errorMessage"
            type="error"
            variant="tonal"
            class="mb-5"
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
            v-if="!loading && books.length === 0"
            class="recommendations-empty"
        >
            <v-icon size="56">
                mdi-bookshelf
            </v-icon>
            <h2>{{ t('recommendations.emptyTitle') }}</h2>
            <p>{{ t('recommendations.emptyHint') }}</p>
            <v-btn
                variant="outlined"
                @click="settingsPanel = 'settings'"
            >
                {{ t('recommendations.adjustPreferences') }}
            </v-btn>
        </div>
        <v-row v-else>
            <v-col
                v-for="book in books"
                :key="book.id"
                cols="12"
                lg="6"
            >
                <RecommendationCard
                    :book="book"
                    @detail="track('detail_click', book)"
                    @start-read="track('start_read', book)"
                    @add-shelf="addShelf"
                    @feedback="submitFeedback"
                />
            </v-col>
        </v-row>

        <v-snackbar
            v-model="undo.visible"
            :timeout="10000"
        >
            {{ undo.message }}
            <template #actions>
                <v-btn
                    color="primary"
                    variant="text"
                    @click="undoFeedback"
                >
                    {{ t('recommendations.undo') }}
                </v-btn>
            </template>
        </v-snackbar>

        <v-dialog
            v-model="clearDialog"
            max-width="440"
        >
            <v-card>
                <v-card-title>{{ t('recommendations.clearFeedback') }}</v-card-title>
                <v-card-text>{{ t('recommendations.clearFeedbackConfirm') }}</v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn @click="clearDialog = false">
                        {{ t('recommendations.cancel') }}
                    </v-btn>
                    <v-btn
                        color="error"
                        @click="clearFeedback"
                    >
                        {{ t('recommendations.clear') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import RecommendationCard from '@/components/RecommendationCard.vue';
import { useMainStore } from '@/stores/main';
import { useI18n } from 'vue-i18n';

const { $backend } = useNuxtApp();
const store = useMainStore();
const { t } = useI18n();

const books = ref<any[]>([]);
const seedBooks = ref<any[]>([]);
const loading = ref(false);
const savingPreferences = ref(false);
const fallback = ref(false);
const cached = ref(false);
const source = ref('deterministic');
const errorMessage = ref('');
const batch = ref(0);
const coldStart = ref(false);
const settingsPanel = ref<string | undefined>();
const clearDialog = ref(false);
const preferences = reactive({
    personalization_enabled: true,
    popular_enabled: true,
    topics: [] as string[],
    length: '',
    difficulty: '',
    seed_book_ids: [] as number[],
});
const undo = reactive({ visible: false, id: 0, book: null as any, message: '' });

const lengthOptions = computed(() => [
    { title: t('recommendations.options.any'), value: '' },
    { title: t('recommendations.options.short'), value: 'short' },
    { title: t('recommendations.options.medium'), value: 'medium' },
    { title: t('recommendations.options.long'), value: 'long' },
]);
const difficultyOptions = computed(() => [
    { title: t('recommendations.options.any'), value: '' },
    { title: t('recommendations.options.light'), value: 'light' },
    { title: t('recommendations.options.balanced'), value: 'balanced' },
    { title: t('recommendations.options.deep'), value: 'deep' },
]);

useHead({ title: () => t('recommendations.pageTitle') });

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
        const rsp = await $backend(`/ai/recommendations?limit=8&batch=${batch.value}&refresh=${refresh ? 1 : 0}`);
        if (rsp.err !== 'ok') throw new Error(rsp.msg || t('recommendations.loadFailed'));
        books.value = rsp.books || [];
        fallback.value = !!rsp.fallback;
        cached.value = !!rsp.cached;
        source.value = rsp.source || 'deterministic';
        coldStart.value = !!rsp.signal_summary?.cold_start;
        applyPreferences(rsp.preferences);
        if (coldStart.value) settingsPanel.value = 'settings';
    } catch (error: any) {
        errorMessage.value = error?.message || t('recommendations.loadFailed');
    } finally {
        loading.value = false;
    }
};

const loadSeeds = async () => {
    try {
        const [shelf, favorites] = await Promise.all([$backend('/shelf'), $backend('/favorites')]);
        const unique = new Map();
        for (const book of [...(shelf.books || []), ...(favorites.books || [])]) unique.set(book.id, book);
        seedBooks.value = [...unique.values()];
    } catch (_error) {
        seedBooks.value = [];
    }
};

const savePreferences = async () => {
    savingPreferences.value = true;
    try {
        const rsp = await $backend('/ai/recommendations/preferences', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(preferences),
        });
        if (rsp.err !== 'ok') throw new Error(rsp.msg);
        applyPreferences(rsp.preferences);
        batch.value = 0;
        await loadRecommendations(true);
    } catch (error: any) {
        errorMessage.value = error?.message || t('recommendations.saveFailed');
    } finally {
        savingPreferences.value = false;
    }
};

const nextBatch = () => {
    batch.value = (batch.value + 1) % 51;
    loadRecommendations(true);
};

const track = async (eventType: string, book: any) => {
    try {
        await $backend('/ai/recommendations/events', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_type: eventType, book_id: book.id, source: source.value }),
        });
    } catch (_error) {
        // Metrics never block the user's navigation.
    }
};

const addShelf = async (book: any) => {
    try {
        const rsp = await $backend(`/book/${book.id}/shelf`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shelf: true }),
        });
        if (rsp.err !== 'ok') throw new Error(rsp.msg);
        book.state = { ...(book.state || {}), wants: 1 };
        track('add_shelf', book);
    } catch (error: any) {
        errorMessage.value = error?.message || t('recommendations.shelfFailed');
    }
};

const submitFeedback = async (book: any, action: string) => {
    try {
        const rsp = await $backend('/ai/recommendations/feedback', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ book_id: book.id, action }),
        });
        if (rsp.err !== 'ok') throw new Error(rsp.msg);
        books.value = books.value.filter(item => item.id !== book.id);
        Object.assign(undo, {
            visible: true, id: rsp.feedback.id, book,
            message: t(`recommendations.feedbackSaved.${action}`),
        });
    } catch (error: any) {
        errorMessage.value = error?.message || t('recommendations.feedbackFailed');
    }
};

const undoFeedback = async () => {
    try {
        const rsp = await $backend(`/ai/recommendations/feedback/${undo.id}`, { method: 'DELETE' });
        if (rsp.err !== 'ok') throw new Error(rsp.msg);
        if (undo.book && !books.value.some(book => book.id === undo.book.id)) books.value.unshift(undo.book);
        undo.visible = false;
    } catch (error: any) {
        errorMessage.value = error?.message || t('recommendations.undoFailed');
    }
};

const clearFeedback = async () => {
    try {
        const rsp = await $backend('/ai/recommendations/feedback', { method: 'DELETE' });
        if (rsp.err !== 'ok') throw new Error(rsp.msg);
        clearDialog.value = false;
        batch.value = 0;
        await loadRecommendations(true);
    } catch (error: any) {
        errorMessage.value = error?.message || t('recommendations.clearFailed');
    }
};

onMounted(() => {
    store.setNavbar(true);
    loadSeeds();
    loadRecommendations();
});
</script>

<style scoped>
.recommendations-page { max-width: 1260px; margin: 0 auto; padding-bottom: 40px; }
.recommendations-hero { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin: 4px 0 24px; padding: 28px; color: rgb(var(--v-theme-on-surface)); border: 1px solid rgba(var(--v-border-color), .35); border-radius: 22px; background: linear-gradient(135deg, rgba(var(--v-theme-primary), .12), rgba(var(--v-theme-secondary), .06)); }
.recommendations-hero h1 { margin: 0; font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.06; letter-spacing: -.035em; }
.recommendations-hero p { max-width: 720px; margin: 10px 0 0; }
.recommendations-hero__eyebrow { margin: 0 0 8px !important; color: rgb(var(--v-theme-primary)); font-size: .78rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.recommendations-hero__actions { display: flex; flex: none; flex-wrap: wrap; gap: 8px; }
.recommendations-empty { padding: 56px 20px; text-align: center; color: rgb(var(--v-theme-on-surface-variant)); }
.recommendations-empty h2 { margin: 14px 0 8px; }
@media (max-width: 760px) { .recommendations-hero { align-items: stretch; flex-direction: column; padding: 22px 18px; border-radius: 16px; } .recommendations-hero__actions .v-btn { flex: 1; } }
</style>
