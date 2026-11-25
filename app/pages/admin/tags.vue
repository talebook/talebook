<template>
    <div class="tag-organizer-page">
        <div
            class="sr-only"
            role="status"
        >
            {{ statusMessage }}
        </div>

        <header class="workbench-header">
            <div>
                <div class="eyebrow">
                    {{ t('tagOrganizer.eyebrow') }}
                </div>
                <h1>{{ t('tagOrganizer.title') }}</h1>
                <p>{{ t('tagOrganizer.subtitle') }}</p>
            </div>
            <v-chip
                color="primary"
                variant="tonal"
                prepend-icon="mdi-shield-check"
            >
                {{ t('tagOrganizer.previewFirst') }}
            </v-chip>
        </header>

        <ol
            class="workflow-rail"
            :aria-label="t('tagOrganizer.workflow')"
        >
            <li
                v-for="(label, index) in steps"
                :key="label"
                :class="{ active: currentStep >= index + 1, current: currentStep === index + 1 }"
                :aria-current="currentStep === index + 1 ? 'step' : undefined"
            >
                <span>{{ index + 1 }}</span>{{ label }}
            </li>
        </ol>

        <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            closable
            class="mb-3"
            @click:close="error = ''"
        >
            {{ error }}
        </v-alert>

        <section
            v-if="!task"
            class="workbench-panel scope-panel"
        >
            <div class="panel-heading">
                <div>
                    <span class="step-label">01</span>
                    <h2>{{ t('tagOrganizer.chooseScope') }}</h2>
                </div>
                <p>{{ t('tagOrganizer.scopeHint') }}</p>
            </div>
            <div class="scope-grid">
                <v-radio-group
                    v-model="scopeType"
                    inline
                    hide-details
                    class="scope-options"
                >
                    <v-radio
                        :label="t('tagOrganizer.allEditableBooks')"
                        value="all"
                    />
                    <v-radio
                        :label="t('tagOrganizer.selectedTags')"
                        value="tags"
                    />
                    <v-radio
                        :label="t('tagOrganizer.selectedBooks')"
                        value="books"
                    />
                </v-radio-group>
                <v-combobox
                    v-if="scopeType === 'tags'"
                    v-model="scopeTags"
                    :label="t('tagOrganizer.tagNames')"
                    :hint="t('tagOrganizer.tagNamesHint')"
                    multiple
                    chips
                    closable-chips
                    persistent-hint
                    density="compact"
                    variant="outlined"
                />
                <v-text-field
                    v-if="scopeType === 'books'"
                    v-model="scopeBookIds"
                    :label="t('tagOrganizer.bookIds')"
                    :hint="t('tagOrganizer.bookIdsHint')"
                    persistent-hint
                    density="compact"
                    variant="outlined"
                />
            </div>
            <div class="scope-footer">
                <div class="privacy-note">
                    <v-icon size="18">
                        mdi-lock
                    </v-icon>
                    <span>{{ t('tagOrganizer.privacy') }}</span>
                </div>
                <v-btn
                    color="primary"
                    :loading="busy"
                    :disabled="!scopeValid"
                    prepend-icon="mdi-tag-multiple"
                    @click="startAnalysis"
                >
                    {{ t('tagOrganizer.analyze') }}
                </v-btn>
            </div>
        </section>

        <section
            v-else-if="task.status === 'analyzing'"
            class="workbench-panel analyzing-panel"
            aria-busy="true"
        >
            <v-progress-circular
                indeterminate
                color="primary"
                size="42"
                width="4"
            />
            <div>
                <h2>{{ t('tagOrganizer.analyzing') }}</h2>
                <p>{{ t('tagOrganizer.analyzingHint') }}</p>
            </div>
        </section>

        <section
            v-else-if="task.status === 'failed'"
            class="workbench-panel"
        >
            <v-alert
                type="error"
                variant="tonal"
            >
                {{ task.error?.message || t('tagOrganizer.analysisFailed') }}
            </v-alert>
            <v-btn
                class="mt-3"
                color="primary"
                :loading="busy"
                @click="retryAnalysis"
            >
                {{ t('common.retry') }}
            </v-btn>
        </section>

        <template v-else>
            <section
                v-if="!task.preview?.token && task.status !== 'executed'"
                class="workbench-panel review-panel"
            >
                <div class="panel-heading table-heading">
                    <div>
                        <span class="step-label">02</span>
                        <h2>{{ t('tagOrganizer.reviewSuggestions') }}</h2>
                    </div>
                    <p>{{ t('tagOrganizer.reviewHint') }}</p>
                </div>

                <div class="table-toolbar">
                    <v-text-field
                        v-model="suggestionSearch"
                        :label="t('tagOrganizer.searchSuggestions')"
                        prepend-inner-icon="mdi-magnify"
                        clearable
                        hide-details
                        density="compact"
                        variant="outlined"
                        class="toolbar-search"
                    />
                    <div class="batch-actions">
                        <v-btn
                            size="small"
                            variant="text"
                            :disabled="!filteredSuggestions.length"
                            @click="setFilteredSelection(true)"
                        >
                            {{ t('tagOrganizer.selectAll') }}
                        </v-btn>
                        <v-btn
                            size="small"
                            variant="text"
                            @click="selectHighConfidence"
                        >
                            {{ t('tagOrganizer.selectHighConfidence') }}
                        </v-btn>
                        <v-btn
                            size="small"
                            variant="text"
                            @click="setFilteredSelection(false)"
                        >
                            {{ t('tagOrganizer.clearSelection') }}
                        </v-btn>
                        <v-chip
                            size="small"
                            color="primary"
                            variant="tonal"
                        >
                            {{ t('tagOrganizer.selectedCount', { count: selectedSuggestionCount }) }}
                        </v-chip>
                    </div>
                </div>

                <v-alert
                    v-if="!editableSuggestions.length"
                    type="info"
                    variant="tonal"
                >
                    {{ t('tagOrganizer.noSuggestions') }}
                </v-alert>

                <div
                    v-else
                    class="data-table-wrap"
                    role="region"
                    tabindex="0"
                    :aria-label="t('tagOrganizer.suggestionTable')"
                >
                    <table class="data-table suggestion-table">
                        <thead>
                            <tr>
                                <th class="select-column sticky-select">
                                    <v-checkbox-btn
                                        :model-value="allFilteredSelected"
                                        :indeterminate="someFilteredSelected && !allFilteredSelected"
                                        density="compact"
                                        :aria-label="t('tagOrganizer.selectFiltered')"
                                        @update:model-value="setFilteredSelection(Boolean($event))"
                                    />
                                </th>
                                <th class="source-column sticky-source">
                                    {{ t('tagOrganizer.sourceTag') }}
                                </th>
                                <th>{{ t('tagOrganizer.suggestedAction') }}</th>
                                <th class="target-column">
                                    {{ t('tagOrganizer.targetTag') }}
                                </th>
                                <th>{{ t('tagOrganizer.confidenceLabel') }}</th>
                                <th>{{ t('tagOrganizer.impact') }}</th>
                                <th class="reason-column">
                                    {{ t('tagOrganizer.reason') }}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="item in pagedSuggestions"
                                :key="item.id"
                                :class="{ selected: item.selected }"
                            >
                                <td class="sticky-select">
                                    <v-checkbox-btn
                                        v-model="item.selected"
                                        density="compact"
                                        color="primary"
                                        :aria-label="t('tagOrganizer.selectSuggestion', { tag: item.source })"
                                    />
                                </td>
                                <td class="sticky-source source-cell">
                                    <strong>{{ item.source }}</strong>
                                    <small>{{ t(`tagOrganizer.origin.${item.origin}`) }}</small>
                                </td>
                                <td>
                                    <v-chip
                                        size="x-small"
                                        :color="actionColor(item.action)"
                                        variant="tonal"
                                    >
                                        {{ t(`tagOrganizer.action.${item.action}`) }}
                                    </v-chip>
                                </td>
                                <td>
                                    <v-text-field
                                        v-if="item.action === 'merge' || item.action === 'rename'"
                                        v-model="item.target"
                                        density="compact"
                                        variant="outlined"
                                        hide-details
                                        :aria-label="t('tagOrganizer.targetFor', { tag: item.source })"
                                        class="target-editor"
                                    />
                                    <span
                                        v-else
                                        class="muted-cell"
                                    >—</span>
                                </td>
                                <td>
                                    <span :class="['confidence-value', confidenceClass(item.confidence)]">
                                        {{ Math.round(item.confidence * 100) }}%
                                    </span>
                                </td>
                                <td>
                                    <v-btn
                                        size="small"
                                        variant="text"
                                        prepend-icon="mdi-book-multiple"
                                        @click="openExclusions(item)"
                                    >
                                        {{ t('tagOrganizer.impactCount', {
                                            count: affectedBooks(item).length,
                                            excluded: item.excluded_book_ids?.length || 0,
                                        }) }}
                                    </v-btn>
                                </td>
                                <td
                                    class="reason-cell"
                                    :title="item.reason"
                                >
                                    {{ item.reason }}
                                </td>
                            </tr>
                            <tr v-if="!pagedSuggestions.length">
                                <td
                                    colspan="7"
                                    class="empty-cell"
                                >
                                    {{ t('tagOrganizer.noMatchingSuggestions') }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="table-footer">
                    <span>{{ t('tagOrganizer.filteredCount', { count: filteredSuggestions.length }) }}</span>
                    <v-pagination
                        v-if="suggestionPageCount > 1"
                        v-model="suggestionPage"
                        :length="suggestionPageCount"
                        :total-visible="5"
                        density="compact"
                        size="small"
                    />
                </div>

                <div class="action-bar">
                    <v-btn
                        variant="text"
                        @click="resetTask"
                    >
                        {{ t('tagOrganizer.newAnalysis') }}
                    </v-btn>
                    <div>
                        <span>{{ t('tagOrganizer.readyToPreview', { count: selectedSuggestionCount }) }}</span>
                        <v-btn
                            color="primary"
                            :loading="busy"
                            :disabled="!selectedSuggestionCount"
                            prepend-icon="mdi-check-circle-outline"
                            @click="saveAndPreview"
                        >
                            {{ t('tagOrganizer.generatePreview') }}
                        </v-btn>
                    </div>
                </div>
            </section>

            <section
                v-else-if="task.preview?.token && task.status !== 'executed'"
                class="workbench-panel preview-panel"
            >
                <div class="panel-heading table-heading">
                    <div>
                        <span class="step-label">03</span>
                        <h2>{{ t('tagOrganizer.previewTitle') }}</h2>
                    </div>
                    <div class="summary-chips">
                        <v-chip
                            size="small"
                            color="primary"
                            variant="tonal"
                        >
                            {{ t('tagOrganizer.changedBooks', { count: task.preview.summary?.changed_books || 0 }) }}
                        </v-chip>
                        <v-chip
                            v-if="task.preview.summary?.conflicts"
                            size="small"
                            color="warning"
                            variant="tonal"
                        >
                            {{ t('tagOrganizer.conflictCount', { count: task.preview.summary.conflicts }) }}
                        </v-chip>
                    </div>
                </div>

                <v-alert
                    v-if="task.preview.conflicts?.length"
                    type="warning"
                    variant="tonal"
                    density="compact"
                    class="mb-3"
                >
                    {{ t('tagOrganizer.previewConflicts', { count: task.preview.conflicts.length }) }}
                </v-alert>

                <div class="table-toolbar preview-toolbar">
                    <v-text-field
                        v-model="previewSearch"
                        :label="t('tagOrganizer.searchPreview')"
                        prepend-inner-icon="mdi-magnify"
                        clearable
                        hide-details
                        density="compact"
                        variant="outlined"
                        class="toolbar-search"
                    />
                    <span>{{ t('tagOrganizer.filteredCount', { count: filteredPreviewChanges.length }) }}</span>
                </div>

                <div
                    class="data-table-wrap"
                    role="region"
                    tabindex="0"
                    :aria-label="t('tagOrganizer.previewTable')"
                >
                    <table class="data-table preview-table">
                        <thead>
                            <tr>
                                <th class="book-column">
                                    {{ t('tagOrganizer.book') }}
                                </th>
                                <th>{{ t('tagOrganizer.before') }}</th>
                                <th>{{ t('tagOrganizer.after') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="change in pagedPreviewChanges"
                                :key="change.book_id"
                            >
                                <td class="book-cell">
                                    <strong>{{ change.title }}</strong>
                                    <small>#{{ change.book_id }}</small>
                                </td>
                                <td>
                                    <div class="tag-list">
                                        <v-chip
                                            v-for="tag in change.before_tags"
                                            :key="tag"
                                            size="x-small"
                                            variant="outlined"
                                        >
                                            {{ tag }}
                                        </v-chip>
                                    </div>
                                </td>
                                <td>
                                    <div class="tag-list">
                                        <v-chip
                                            v-for="tag in change.after_tags"
                                            :key="tag"
                                            size="x-small"
                                            color="primary"
                                            variant="tonal"
                                        >
                                            {{ tag }}
                                        </v-chip>
                                    </div>
                                </td>
                            </tr>
                            <tr v-if="!pagedPreviewChanges.length">
                                <td
                                    colspan="3"
                                    class="empty-cell"
                                >
                                    {{ t('tagOrganizer.noMatchingChanges') }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="table-footer">
                    <span>{{ t('tagOrganizer.previewSummary', task.preview.summary || {}) }}</span>
                    <v-pagination
                        v-if="previewPageCount > 1"
                        v-model="previewPage"
                        :length="previewPageCount"
                        :total-visible="5"
                        density="compact"
                        size="small"
                    />
                </div>

                <div class="confirmation-bar">
                    <v-checkbox
                        v-model="confirmed"
                        color="primary"
                        density="compact"
                        hide-details
                        :label="t('tagOrganizer.confirmChanges')"
                    />
                    <div>
                        <v-btn
                            variant="text"
                            @click="backToSuggestions"
                        >
                            {{ t('tagOrganizer.backToSuggestions') }}
                        </v-btn>
                        <v-btn
                            color="primary"
                            :loading="busy"
                            :disabled="!confirmed || !task.preview.changes?.length"
                            prepend-icon="mdi-check-circle"
                            @click="execute"
                        >
                            {{ t('tagOrganizer.execute') }}
                        </v-btn>
                    </div>
                </div>
            </section>

            <section
                v-if="task.status === 'executed'"
                class="workbench-panel result-panel"
            >
                <div class="panel-heading table-heading">
                    <div>
                        <span class="step-label">04</span>
                        <h2>{{ t('tagOrganizer.resultTitle') }}</h2>
                    </div>
                </div>
                <div
                    class="result-table"
                    role="table"
                    :aria-label="t('tagOrganizer.resultTitle')"
                >
                    <div
                        role="row"
                        class="result-row result-head"
                    >
                        <span role="columnheader">{{ t('tagOrganizer.succeeded') }}</span>
                        <span role="columnheader">{{ t('tagOrganizer.skipped') }}</span>
                        <span role="columnheader">{{ t('tagOrganizer.failed') }}</span>
                        <span role="columnheader">{{ t('tagOrganizer.undone') }}</span>
                    </div>
                    <div
                        role="row"
                        class="result-row result-values"
                    >
                        <strong
                            role="cell"
                            class="success"
                        >{{ task.result.succeeded || 0 }}</strong>
                        <strong
                            role="cell"
                            class="warning"
                        >{{ task.result.skipped || 0 }}</strong>
                        <strong
                            role="cell"
                            class="danger"
                        >{{ task.result.failed || 0 }}</strong>
                        <strong role="cell">{{ task.result.undone || 0 }}</strong>
                    </div>
                </div>
                <v-alert
                    v-if="task.result.undo_conflicts"
                    type="warning"
                    variant="tonal"
                    density="compact"
                    class="mt-3"
                >
                    {{ t('tagOrganizer.undoConflicts', { count: task.result.undo_conflicts }) }}
                </v-alert>
                <div class="action-bar result-actions">
                    <v-btn
                        variant="text"
                        @click="resetTask"
                    >
                        {{ t('tagOrganizer.newAnalysis') }}
                    </v-btn>
                    <div>
                        <v-btn
                            v-if="task.result.failed || task.result.skipped"
                            variant="outlined"
                            :loading="busy"
                            @click="retryChanges"
                        >
                            {{ t('tagOrganizer.retryPartial') }}
                        </v-btn>
                        <v-btn
                            color="error"
                            variant="outlined"
                            :loading="busy"
                            :disabled="Boolean(task.result.undone || task.result.undo_conflicts)"
                            prepend-icon="mdi-backup-restore"
                            @click="undoDialog = true"
                        >
                            {{ t('tagOrganizer.undoTask') }}
                        </v-btn>
                    </div>
                </div>
            </section>
        </template>

        <v-dialog
            v-model="exclusionDialog"
            max-width="720"
        >
            <v-card class="exclusion-dialog">
                <v-card-title>
                    <h2 class="dialog-title">
                        {{ t('tagOrganizer.excludeTitle', { tag: activeSuggestion?.source || '' }) }}
                    </h2>
                </v-card-title>
                <v-card-subtitle>
                    {{ t('tagOrganizer.excludeSummary', {
                        excluded: exclusionDraft.length,
                        count: activeAffectedBooks.length,
                    }) }}
                </v-card-subtitle>
                <v-card-text>
                    <v-text-field
                        v-model="exclusionSearch"
                        :label="t('tagOrganizer.searchBooks')"
                        prepend-inner-icon="mdi-magnify"
                        clearable
                        hide-details
                        density="compact"
                        variant="outlined"
                        class="mb-3"
                    />
                    <div class="exclusion-table-wrap">
                        <table class="data-table exclusion-table">
                            <thead>
                                <tr>
                                    <th class="select-column">
                                        {{ t('tagOrganizer.exclude') }}
                                    </th>
                                    <th>{{ t('tagOrganizer.book') }}</th>
                                    <th>{{ t('tagOrganizer.currentTags') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="book in filteredExclusionBooks"
                                    :key="book.id"
                                >
                                    <td>
                                        <v-checkbox-btn
                                            :model-value="exclusionDraft.includes(book.id)"
                                            density="compact"
                                            :aria-label="t('tagOrganizer.excludeBook', { title: book.title })"
                                            @update:model-value="toggleExclusion(book.id, Boolean($event))"
                                        />
                                    </td>
                                    <td class="book-cell">
                                        <strong>{{ book.title }}</strong><small>#{{ book.id }}</small>
                                    </td>
                                    <td>
                                        <div class="tag-list">
                                            <v-chip
                                                v-for="tag in book.tags"
                                                :key="tag"
                                                size="x-small"
                                                variant="outlined"
                                            >
                                                {{ tag }}
                                            </v-chip>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn @click="closeExclusions">
                        {{ t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        @click="saveExclusions"
                    >
                        {{ t('tagOrganizer.saveExclusions') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog
            v-model="undoDialog"
            max-width="520"
        >
            <v-card>
                <v-card-title>
                    <h2 class="dialog-title">
                        {{ t('tagOrganizer.undoTitle') }}
                    </h2>
                </v-card-title>
                <v-card-text>{{ t('tagOrganizer.undoWarning') }}</v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn @click="undoDialog = false">
                        {{ t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        color="error"
                        :loading="busy"
                        @click="undo"
                    >
                        {{ t('tagOrganizer.confirmUndo') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';

const { $backend } = useNuxtApp();
const { t } = useI18n();

const SUGGESTION_PAGE_SIZE = 20;
const PREVIEW_PAGE_SIZE = 25;

const scopeType = ref('all');
const scopeTags = ref([]);
const scopeBookIds = ref('');
const task = ref(null);
const editableSuggestions = ref([]);
const busy = ref(false);
const error = ref('');
const confirmed = ref(false);
const undoDialog = ref(false);
const suggestionSearch = ref('');
const suggestionPage = ref(1);
const previewSearch = ref('');
const previewPage = ref(1);
const exclusionDialog = ref(false);
const activeSuggestionId = ref('');
const exclusionDraft = ref([]);
const exclusionSearch = ref('');
let pollTimer = null;

const steps = computed(() => [
    t('tagOrganizer.step.scope'),
    t('tagOrganizer.step.review'),
    t('tagOrganizer.step.preview'),
    t('tagOrganizer.step.result'),
]);
const currentStep = computed(() => {
    if (!task.value) return 1;
    if (task.value.status === 'executed') return 4;
    if (task.value.preview?.token) return 3;
    return 2;
});
const statusMessage = computed(() => {
    if (!task.value) return '';
    if (task.value.status === 'analyzing') return t('tagOrganizer.analyzing');
    if (task.value.status === 'failed') return task.value.error?.message || t('tagOrganizer.analysisFailed');
    if (task.value.status === 'executed') return t('tagOrganizer.resultAnnouncement', task.value.result || {});
    if (task.value.preview?.token) return t('tagOrganizer.previewAnnouncement', task.value.preview.summary || {});
    return t('tagOrganizer.suggestionsAnnouncement', { count: task.value.suggestions?.length || 0 });
});
const scopeValid = computed(() => {
    if (scopeType.value === 'tags') return scopeTags.value.length > 0;
    if (scopeType.value === 'books') return parseBookIds().length > 0;
    return true;
});
const filteredSuggestions = computed(() => {
    const query = normalizedSearch(suggestionSearch.value);
    if (!query) return editableSuggestions.value;
    return editableSuggestions.value.filter((item) => [
        item.source,
        item.target,
        item.reason,
        t(`tagOrganizer.action.${item.action}`),
    ].some(value => normalizedSearch(value).includes(query)));
});
const suggestionPageCount = computed(() => Math.max(1, Math.ceil(filteredSuggestions.value.length / SUGGESTION_PAGE_SIZE)));
const pagedSuggestions = computed(() => {
    const start = (suggestionPage.value - 1) * SUGGESTION_PAGE_SIZE;
    return filteredSuggestions.value.slice(start, start + SUGGESTION_PAGE_SIZE);
});
const selectedSuggestionCount = computed(() => editableSuggestions.value.filter(item => item.selected).length);
const allFilteredSelected = computed(() => filteredSuggestions.value.length > 0 && filteredSuggestions.value.every(item => item.selected));
const someFilteredSelected = computed(() => filteredSuggestions.value.some(item => item.selected));
const activeSuggestion = computed(() => editableSuggestions.value.find(item => item.id === activeSuggestionId.value));
const activeAffectedBooks = computed(() => activeSuggestion.value ? affectedBooks(activeSuggestion.value) : []);
const filteredExclusionBooks = computed(() => {
    const query = normalizedSearch(exclusionSearch.value);
    if (!query) return activeAffectedBooks.value;
    return activeAffectedBooks.value.filter(book => [book.title, book.id, ...(book.tags || [])]
        .some(value => normalizedSearch(value).includes(query)));
});
const filteredPreviewChanges = computed(() => {
    const changes = task.value?.preview?.changes || [];
    const query = normalizedSearch(previewSearch.value);
    if (!query) return changes;
    return changes.filter(change => [change.title, change.book_id, ...change.before_tags, ...change.after_tags]
        .some(value => normalizedSearch(value).includes(query)));
});
const previewPageCount = computed(() => Math.max(1, Math.ceil(filteredPreviewChanges.value.length / PREVIEW_PAGE_SIZE)));
const pagedPreviewChanges = computed(() => {
    const start = (previewPage.value - 1) * PREVIEW_PAGE_SIZE;
    return filteredPreviewChanges.value.slice(start, start + PREVIEW_PAGE_SIZE);
});

watch(suggestionSearch, () => { suggestionPage.value = 1; });
watch(previewSearch, () => { previewPage.value = 1; });
watch(suggestionPageCount, value => { suggestionPage.value = Math.min(suggestionPage.value, value); });
watch(previewPageCount, value => { previewPage.value = Math.min(previewPage.value, value); });

function normalizedSearch(value) {
    return String(value ?? '').trim().toLocaleLowerCase();
}

function parseBookIds() {
    return scopeBookIds.value.split(/[,，\s]+/).filter(Boolean).map(Number).filter(value => Number.isInteger(value) && value > 0);
}

function scopePayload() {
    if (scopeType.value === 'tags') return { type: 'tags', tags: scopeTags.value };
    if (scopeType.value === 'books') return { type: 'books', book_ids: parseBookIds() };
    return { type: 'all' };
}

function syncTask(value) {
    task.value = value;
    editableSuggestions.value = (value?.suggestions || []).map(item => ({
        ...item,
        excluded_book_ids: [...(item.excluded_book_ids || [])],
    }));
}

async function request(url, options) {
    error.value = '';
    const response = await $backend(url, options);
    if (response.err !== 'ok') {
        error.value = response.msg || response.err;
        return null;
    }
    if (response.task) syncTask(response.task);
    return response;
}

async function startAnalysis() {
    busy.value = true;
    try {
        const response = await request('/ai/tag_organizer/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scope: scopePayload() }),
        });
        if (response?.task?.status === 'analyzing') schedulePoll();
    } finally {
        busy.value = false;
    }
}

function schedulePoll() {
    clearTimeout(pollTimer);
    pollTimer = setTimeout(pollTask, 1200);
}

async function pollTask() {
    if (!task.value?.id) return;
    const response = await request(`/ai/tag_organizer/tasks/${task.value.id}`);
    if (response?.task?.status === 'analyzing') schedulePoll();
}

async function retryAnalysis() {
    busy.value = true;
    try {
        const response = await request(`/ai/tag_organizer/tasks/${task.value.id}/analysis-retry`, { method: 'POST' });
        if (response) schedulePoll();
    } finally {
        busy.value = false;
    }
}

function affectedBooks(item) {
    return (task.value?.books || []).filter(book => book.tags.includes(item.source));
}

function confidenceClass(value) {
    if (value >= 0.85) return 'high';
    if (value >= 0.65) return 'medium';
    return 'low';
}

function actionColor(action) {
    return { merge: 'indigo', rename: 'teal', keep: 'grey', remove: 'error' }[action] || 'grey';
}

function setFilteredSelection(selected) {
    filteredSuggestions.value.forEach((item) => { item.selected = selected; });
}

function selectHighConfidence() {
    editableSuggestions.value.forEach((item) => { item.selected = item.confidence >= 0.8 && item.action !== 'keep'; });
}

function openExclusions(item) {
    activeSuggestionId.value = item.id;
    exclusionDraft.value = [...(item.excluded_book_ids || [])];
    exclusionSearch.value = '';
    exclusionDialog.value = true;
}

function toggleExclusion(bookId, excluded) {
    const values = new Set(exclusionDraft.value);
    if (excluded) values.add(bookId);
    else values.delete(bookId);
    exclusionDraft.value = [...values].sort((left, right) => left - right);
}

function closeExclusions() {
    exclusionDialog.value = false;
    activeSuggestionId.value = '';
    exclusionDraft.value = [];
}

function saveExclusions() {
    if (activeSuggestion.value) activeSuggestion.value.excluded_book_ids = [...exclusionDraft.value];
    closeExclusions();
}

async function saveAndPreview() {
    busy.value = true;
    try {
        const adjustments = editableSuggestions.value.map(item => ({
            id: item.id,
            selected: item.selected,
            target: item.target,
            excluded_book_ids: item.excluded_book_ids || [],
        }));
        const saved = await request(`/ai/tag_organizer/tasks/${task.value.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adjustments }),
        });
        if (saved) {
            await request(`/ai/tag_organizer/tasks/${task.value.id}/preview`, { method: 'POST' });
            confirmed.value = false;
            previewPage.value = 1;
            previewSearch.value = '';
        }
    } finally {
        busy.value = false;
    }
}

function backToSuggestions() {
    task.value = { ...task.value, status: 'ready', preview: {} };
    confirmed.value = false;
}

function idempotencyKey(prefix) {
    return `${prefix}-${task.value.id}-${Date.now()}`;
}

async function execute() {
    busy.value = true;
    try {
        await request(`/ai/tag_organizer/tasks/${task.value.id}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                preview_token: task.value.preview.token,
                idempotency_key: idempotencyKey('execute'),
            }),
        });
    } finally {
        busy.value = false;
    }
}

async function retryChanges() {
    busy.value = true;
    try {
        await request(`/ai/tag_organizer/tasks/${task.value.id}/retry`, { method: 'POST' });
    } finally {
        busy.value = false;
    }
}

async function undo() {
    busy.value = true;
    try {
        const response = await request(`/ai/tag_organizer/tasks/${task.value.id}/undo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idempotency_key: idempotencyKey('undo') }),
        });
        if (response) undoDialog.value = false;
    } finally {
        busy.value = false;
    }
}

function resetTask() {
    clearTimeout(pollTimer);
    task.value = null;
    editableSuggestions.value = [];
    confirmed.value = false;
    suggestionSearch.value = '';
    previewSearch.value = '';
    suggestionPage.value = 1;
    previewPage.value = 1;
}

onBeforeUnmount(() => clearTimeout(pollTimer));
</script>

<style scoped>
.tag-organizer-page { --tag-ink:#243231; --tag-muted:#667472; --tag-line:rgba(69,91,87,.22); --tag-soft:rgba(var(--v-theme-primary),.055); max-width:1240px; margin:0 auto; padding:18px 18px 56px; color:var(--tag-ink); }
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; border:0; }
.workbench-header { display:flex; align-items:center; justify-content:space-between; gap:24px; padding:18px 22px; border-bottom:1px solid var(--tag-line); background:rgb(var(--v-theme-surface)); }
.workbench-header h1 { margin:1px 0 2px; font-size:30px; font-weight:760; line-height:1.15; letter-spacing:-.025em; }.workbench-header p { max-width:780px; margin:0; color:var(--tag-muted); font-size:13px; }.eyebrow { color:rgb(var(--v-theme-primary)); font-size:11px; font-weight:800; letter-spacing:.13em; text-transform:uppercase; }
.workflow-rail { display:grid; grid-template-columns:repeat(4,1fr); margin:0 0 14px; padding:10px 22px; border-bottom:1px solid var(--tag-line); list-style:none; }.workflow-rail li { display:flex; align-items:center; gap:7px; color:var(--tag-muted); font-size:12px; }.workflow-rail li::after { height:1px; flex:1; margin:0 12px; background:var(--tag-line); content:""; }.workflow-rail li:last-child::after { display:none; }.workflow-rail li span { display:grid; width:22px; height:22px; place-items:center; border:1px solid var(--tag-line); border-radius:50%; background:rgb(var(--v-theme-surface)); font-size:11px; font-weight:800; }.workflow-rail li.active { color:rgb(var(--v-theme-primary)); font-weight:700; }.workflow-rail li.active span { color:white; border-color:rgb(var(--v-theme-primary)); background:rgb(var(--v-theme-primary)); }.workflow-rail li.current span { box-shadow:0 0 0 3px rgba(var(--v-theme-primary),.13); }
.workbench-panel { border:1px solid var(--tag-line); border-radius:12px; background:rgb(var(--v-theme-surface)); box-shadow:0 8px 24px rgba(35,50,48,.055); }.panel-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding:18px 20px; border-bottom:1px solid var(--tag-line); }.panel-heading>div:first-child { display:flex; align-items:center; gap:9px; }.step-label { color:rgb(var(--v-theme-primary)); font:800 11px/1 ui-monospace,SFMono-Regular,Consolas,monospace; }.panel-heading h2 { margin:0; font-size:19px; line-height:1.3; }.panel-heading p { max-width:560px; margin:0; color:var(--tag-muted); font-size:12px; text-align:right; }.table-heading { align-items:center; }
.scope-grid { display:grid; gap:12px; padding:18px 20px 8px; }.scope-options { padding:5px 10px; border:1px solid var(--tag-line); border-radius:8px; }.scope-footer { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:10px 20px 18px; }.privacy-note { display:flex; align-items:center; gap:7px; color:var(--tag-muted); font-size:12px; }.analyzing-panel { display:flex; min-height:150px; align-items:center; justify-content:center; gap:18px; }.analyzing-panel h2 { margin:0 0 4px; font-size:18px; }.analyzing-panel p { margin:0; color:var(--tag-muted); font-size:13px; }
.table-toolbar { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:12px 14px; background:rgba(91,112,108,.045); border-bottom:1px solid var(--tag-line); }.toolbar-search { max-width:330px; }.batch-actions { display:flex; align-items:center; flex-wrap:wrap; justify-content:flex-end; gap:2px; }.preview-toolbar>span,.table-footer { color:var(--tag-muted); font-size:12px; }
.data-table-wrap { max-height:560px; overflow:auto; outline:none; }.data-table-wrap:focus-visible,.exclusion-table-wrap:focus-visible { outline:3px solid rgb(var(--v-theme-primary)); outline-offset:-3px; }.data-table { width:100%; min-width:970px; border-collapse:separate; border-spacing:0; font-size:13px; }.data-table th { position:sticky; z-index:2; top:0; height:38px; padding:7px 10px; color:var(--tag-muted); border-bottom:1px solid var(--tag-line); background:rgb(var(--v-theme-surface)); font-size:11px; font-weight:800; letter-spacing:.035em; text-align:left; white-space:nowrap; }.data-table td { height:48px; padding:6px 10px; border-bottom:1px solid var(--tag-line); vertical-align:middle; }.data-table tbody tr:last-child td { border-bottom:0; }.data-table tbody tr.selected td { background:var(--tag-soft); }.data-table tbody tr:hover td { background:rgba(var(--v-theme-primary),.035); }.select-column { width:46px; }.source-column { width:160px; }.target-column { width:210px; }.reason-column { min-width:250px; }.sticky-select { position:sticky; z-index:1; left:0; background:rgb(var(--v-theme-surface)); }.sticky-source { position:sticky; z-index:1; left:46px; background:rgb(var(--v-theme-surface)); }.data-table th.sticky-select,.data-table th.sticky-source { z-index:4; }.data-table tr.selected .sticky-select,.data-table tr.selected .sticky-source { background:color-mix(in srgb,rgb(var(--v-theme-primary)) 7%,rgb(var(--v-theme-surface))); }.source-cell strong,.book-cell strong { display:block; line-height:1.25; }.source-cell small,.book-cell small { display:block; margin-top:2px; color:var(--tag-muted); font-size:10px; }.target-editor { min-width:170px; }.confidence-value { font:750 13px/1 ui-monospace,SFMono-Regular,Consolas,monospace; }.confidence-value.high { color:#23724f; }.confidence-value.medium { color:#99640f; }.confidence-value.low { color:var(--tag-muted); }.reason-cell { max-width:330px; overflow:hidden; color:var(--tag-muted); text-overflow:ellipsis; white-space:nowrap; }.muted-cell { color:var(--tag-muted); }.empty-cell { padding:28px!important; color:var(--tag-muted); text-align:center; }
.table-footer { display:flex; min-height:44px; align-items:center; justify-content:space-between; gap:12px; padding:6px 14px; border-top:1px solid var(--tag-line); }.action-bar,.confirmation-bar { display:flex; align-items:center; justify-content:space-between; gap:18px; padding:12px 14px; border-top:1px solid var(--tag-line); background:rgb(var(--v-theme-surface)); }.action-bar>div,.confirmation-bar>div { display:flex; align-items:center; justify-content:flex-end; gap:10px; }.action-bar>div>span { color:var(--tag-muted); font-size:12px; }.confirmation-bar { position:sticky; z-index:5; bottom:0; box-shadow:0 -8px 22px rgba(35,50,48,.07); }.confirmation-bar .v-checkbox { flex:1; }
.summary-chips { justify-content:flex-end; }.preview-table { min-width:820px; }.book-column { width:220px; }.tag-list { display:flex; flex-wrap:wrap; gap:4px; }.result-table { margin:18px 20px 0; overflow:hidden; border:1px solid var(--tag-line); border-radius:8px; }.result-row { display:grid; grid-template-columns:repeat(4,1fr); }.result-row>* { padding:9px 14px; border-right:1px solid var(--tag-line); text-align:center; }.result-row>*:last-child { border-right:0; }.result-head { color:var(--tag-muted); background:rgba(91,112,108,.055); font-size:11px; font-weight:800; }.result-values>* { border-top:1px solid var(--tag-line); font:750 28px/1.2 ui-monospace,SFMono-Regular,Consolas,monospace; }.result-values .success { color:#23724f; }.result-values .warning { color:#99640f; }.result-values .danger { color:#b13e3e; }.result-actions { margin-top:18px; }.dialog-title { margin:0; font:inherit; }.exclusion-table-wrap { max-height:420px; overflow:auto; border:1px solid var(--tag-line); border-radius:8px; }.exclusion-table { min-width:580px; }
:global(.v-theme--dark) .tag-organizer-page { --tag-ink:#e5eeec; --tag-muted:#aebbb8; --tag-line:rgba(210,226,221,.18); --tag-soft:rgba(var(--v-theme-primary),.10); }:global(.v-theme--dark) .confidence-value.high { color:#6ec69d; }:global(.v-theme--dark) .confidence-value.medium { color:#e4b760; }:global(.v-theme--dark) .result-values .success { color:#6ec69d; }:global(.v-theme--dark) .result-values .warning { color:#e4b760; }:global(.v-theme--dark) .result-values .danger { color:#ef8b8b; }
@media (max-width:760px) { .tag-organizer-page { padding:8px 6px 40px; }.workbench-header { align-items:flex-start; flex-direction:column; gap:10px; padding:14px 12px; }.workbench-header h1 { font-size:24px; }.workflow-rail { grid-template-columns:repeat(4,max-content); gap:18px; overflow-x:auto; padding-inline:12px; }.workflow-rail li::after { display:none; }.panel-heading { align-items:flex-start; flex-direction:column; gap:6px; padding:14px 12px; }.panel-heading p { text-align:left; }.scope-grid { padding-inline:12px; }.scope-options :deep(.v-selection-control-group) { align-items:flex-start; flex-direction:column; }.scope-footer,.table-toolbar,.action-bar,.confirmation-bar { align-items:stretch; flex-direction:column; }.toolbar-search { width:100%; max-width:none; }.batch-actions { justify-content:flex-start; }.action-bar>div,.confirmation-bar>div { width:100%; justify-content:space-between; }.confirmation-bar .v-checkbox { width:100%; }.data-table-wrap { max-height:500px; }.table-footer { align-items:flex-start; flex-direction:column; }.result-table { margin-inline:12px; }.result-row>* { padding-inline:6px; }.result-head { font-size:9px; }.result-values>* { font-size:22px; }.result-actions { margin-top:14px; } }
@media (prefers-reduced-motion:reduce) { * { scroll-behavior:auto!important; transition:none!important; } }
</style>
