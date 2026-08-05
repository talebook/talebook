<template>
    <div
        class="library-metadata-filter"
        :data-testid="`library-filter-${filterKey}`"
    >
        <span class="library-filter-label">
            {{ label }}{{ t('messages.colon') }}
        </span>
        <div
            class="library-filter-chips"
            role="group"
            :aria-label="label"
        >
            <v-chip
                :class="modelValue === null ? 'filter-chip-active' : 'filter-chip-inactive'"
                :aria-pressed="modelValue === null"
                class="library-filter-chip"
                density="compact"
                label
                role="button"
                @click="select(null)"
            >
                {{ t('messages.all') }}
            </v-chip>

            <v-chip
                v-for="item in visibleItems"
                :key="item.id"
                :class="modelValue === item.name ? 'filter-chip-active' : 'filter-chip-inactive'"
                :aria-pressed="modelValue === item.name"
                :title="item.name"
                class="library-filter-chip library-filter-option"
                density="compact"
                label
                role="button"
                @click="select(item.name)"
            >
                {{ item.name }}
            </v-chip>

            <button
                v-if="remainingCount > 0"
                type="button"
                class="library-filter-control library-filter-more"
                :data-testid="`library-filter-${filterKey}-more`"
                :aria-label="`${t('messages.more')} ${label}（${remainingCount}）`"
                @click="openPicker"
            >
                {{ t('messages.more') }}（{{ remainingCount }}）
            </button>
        </div>

        <v-dialog
            v-model="pickerOpen"
            :fullscreen="xs"
            max-width="860"
            scrollable
        >
            <v-card
                class="library-filter-picker"
                :data-testid="`library-filter-${filterKey}-picker`"
            >
                <v-card-title class="library-filter-picker__header">
                    <div class="library-filter-picker__heading">
                        <span>{{ t('library.selectFilter', { label }) }}</span>
                        <small>
                            {{ pickerSummary }}
                        </small>
                    </div>
                    <v-btn
                        :aria-label="t('library.closeFilterPicker', { label })"
                        density="comfortable"
                        icon="mdi-close"
                        variant="text"
                        @click="pickerOpen = false"
                    />
                </v-card-title>

                <v-divider />

                <div class="library-filter-picker__search">
                    <v-text-field
                        v-model="searchQuery"
                        :data-testid="`library-filter-${filterKey}-search`"
                        :label="t('library.searchFilter', { label })"
                        :placeholder="t('library.searchFilterHint')"
                        density="compact"
                        hide-details
                        prepend-inner-icon="mdi-magnify"
                        variant="outlined"
                        @update:model-value="resetSearchPage"
                    >
                        <template #append-inner>
                            <v-btn
                                v-if="searchQuery"
                                :aria-label="t('library.clearFilterSearch')"
                                :data-testid="`library-filter-${filterKey}-inline-clear-search`"
                                density="compact"
                                icon="mdi-close-circle"
                                size="small"
                                variant="text"
                                @click="clearSearch"
                            />
                        </template>
                    </v-text-field>
                </div>

                <v-divider />

                <v-card-text class="library-filter-picker__body">
                    <div
                        v-if="pickerItems.length > 0"
                        class="library-filter-picker__chips"
                        role="group"
                        :aria-label="t('library.selectFilter', { label })"
                    >
                        <v-chip
                            v-for="item in pickerItems"
                            :key="item.id"
                            :class="modelValue === item.name ? 'filter-chip-active' : 'filter-chip-inactive'"
                            :aria-pressed="modelValue === item.name"
                            :title="item.name"
                            class="library-filter-picker__option"
                            density="compact"
                            label
                            role="button"
                            @click="selectFromPicker(item.name)"
                        >
                            {{ item.name }}
                        </v-chip>
                    </div>
                    <div
                        v-else
                        class="library-filter-picker__empty"
                        :data-testid="`library-filter-${filterKey}-empty`"
                        role="status"
                    >
                        <v-icon icon="mdi-magnify" />
                        <span>{{ t('library.noMatchingFilter', { label }) }}</span>
                        <v-btn
                            :data-testid="`library-filter-${filterKey}-clear-search`"
                            density="comfortable"
                            variant="tonal"
                            @click="clearSearch"
                        >
                            {{ t('library.clearFilterSearch') }}
                        </v-btn>
                    </div>
                </v-card-text>

                <v-divider />

                <v-card-actions class="library-filter-picker__footer">
                    <span>{{ t('library.filterPickerPageSize', { count: pageSize }) }}</span>
                    <v-pagination
                        v-if="pickerPageCount > 1"
                        v-model="pickerPage"
                        :data-testid="`library-filter-${filterKey}-pagination`"
                        :length="pickerPageCount"
                        :total-visible="5"
                        density="compact"
                    />
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup>
import { useDisplay } from 'vuetify';
import { useI18n } from 'vue-i18n';

const props = defineProps({
    modelValue: {
        type: String,
        default: null
    },
    items: {
        type: Array,
        default: () => []
    },
    label: {
        type: String,
        required: true
    },
    filterKey: {
        type: String,
        required: true
    },
    initialLimit: {
        type: Number,
        default: 10
    },
    pageSize: {
        type: Number,
        default: 100
    }
});

const emit = defineEmits(['update:modelValue']);
const { t } = useI18n();
const { xs } = useDisplay();
const pickerOpen = ref(false);
const pickerPage = ref(1);
const searchQuery = ref('');

const visibleItems = computed(() => {
    const items = props.items.slice(0, props.initialLimit);
    if (!props.modelValue || items.some(item => item.name === props.modelValue)) {
        return items;
    }

    const selected = props.items.find(item => item.name === props.modelValue);
    return selected ? [...items, selected] : items;
});

const remainingCount = computed(() => Math.max(props.items.length - visibleItems.value.length, 0));
const normalizedSearchQuery = computed(() => String(searchQuery.value || '').trim().toLocaleLowerCase());
const filteredItems = computed(() => {
    if (!normalizedSearchQuery.value) {
        return props.items;
    }

    return props.items.filter(item => item.name.toLocaleLowerCase().includes(normalizedSearchQuery.value));
});
const pickerPageCount = computed(() => Math.max(1, Math.ceil(filteredItems.value.length / props.pageSize)));
const pickerItems = computed(() => {
    const start = (pickerPage.value - 1) * props.pageSize;
    return filteredItems.value.slice(start, start + props.pageSize);
});
const pickerSummary = computed(() => {
    const params = {
        count: filteredItems.value.length,
        total: props.items.length,
        page: pickerPage.value,
        pages: pickerPageCount.value
    };
    return t(
        normalizedSearchQuery.value ? 'library.filterPickerSearchSummary' : 'library.filterPickerSummary',
        params
    );
});

watch(() => props.items.length, () => {
    pickerPage.value = Math.min(pickerPage.value, pickerPageCount.value);
});

const select = (value) => {
    emit('update:modelValue', value);
};

const openPicker = () => {
    searchQuery.value = '';
    const selectedIndex = props.modelValue
        ? props.items.findIndex(item => item.name === props.modelValue)
        : -1;
    pickerPage.value = selectedIndex >= 0
        ? Math.floor(selectedIndex / props.pageSize) + 1
        : 1;
    pickerOpen.value = true;
};

const resetSearchPage = () => {
    pickerPage.value = 1;
};

const clearSearch = () => {
    searchQuery.value = '';
    pickerPage.value = 1;
};

const selectFromPicker = (value) => {
    select(value);
    pickerOpen.value = false;
};
</script>

<style scoped>
.library-metadata-filter {
  display: grid;
  grid-template-columns: 4.25rem minmax(0, 1fr);
  gap: 6px;
  align-items: start;
}

.library-filter-label {
  padding-top: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.library-filter-chips,
.library-filter-picker__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.library-filter-chip,
.library-filter-control,
.library-filter-picker__option {
  height: 28px;
  min-height: 28px;
  padding: 0 8px;
  font-size: 0.75rem;
}

.library-filter-option,
.library-filter-picker__option {
  max-width: min(18rem, 100%);
}

.library-filter-option :deep(.v-chip__content),
.library-filter-picker__option :deep(.v-chip__content) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.library-filter-control {
  padding: 0 8px;
  border-radius: 5px;
  cursor: pointer;
  font-family: inherit;
}

.library-filter-more {
  color: rgb(var(--v-theme-primary));
  border: 1px dashed rgba(var(--v-theme-primary), .62);
  background: rgba(var(--v-theme-primary), .08);
  font-weight: 600;
}

.library-filter-control:hover {
  filter: brightness(.96);
}

.library-filter-control:focus-visible {
  outline: 3px solid rgba(var(--v-theme-primary), .34);
  outline-offset: 2px;
}

.library-filter-picker {
  max-height: min(78dvh, 760px);
}

.library-filter-picker__header {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
}

.library-filter-picker__heading {
  display: grid;
  gap: 2px;
  min-width: 0;
  font-size: 1rem;
  font-weight: 600;
}

.library-filter-picker__heading small {
  color: rgba(var(--v-theme-on-surface), .65);
  font-size: 0.75rem;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}

.library-filter-picker__body {
  min-height: 170px;
  padding: 10px 14px;
}

.library-filter-picker__search {
  padding: 8px 14px;
  background: rgba(var(--v-theme-on-surface), .035);
}

.library-filter-picker__search :deep(.v-field) {
  font-size: 0.875rem;
}

.library-filter-picker__empty {
  display: grid;
  gap: 10px;
  place-items: center;
  min-height: 156px;
  color: rgba(var(--v-theme-on-surface), .68);
  text-align: center;
}

.library-filter-picker__footer {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  min-height: 46px;
  padding: 6px 10px 6px 14px;
}

.library-filter-picker__footer > span {
  flex: 0 0 auto;
  color: rgba(var(--v-theme-on-surface), .65);
  font-size: 0.75rem;
}

.library-filter-picker__footer :deep(.v-pagination) {
  flex: 0 1 auto;
  justify-content: flex-end;
}

.filter-chip-active {
  color: rgb(var(--v-theme-on-primary)) !important;
  background-color: rgb(var(--v-theme-primary)) !important;
}

.filter-chip-inactive {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background-color: transparent !important;
}

@media (max-width: 600px) {
  .library-metadata-filter {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .library-filter-label {
    padding-top: 0;
  }

  .library-filter-picker {
    max-height: 100dvh;
    border-radius: 0;
  }

  .library-filter-picker__footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .library-filter-picker__footer :deep(.v-pagination) {
    width: 100%;
    justify-content: center;
  }
}
</style>
