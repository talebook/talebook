<template>
    <v-dialog
        :model-value="modelValue"
        persistent
        max-width="620"
        @update:model-value="emit('update:modelValue', $event)"
    >
        <v-card class="conversion-card">
            <v-card-title class="d-flex align-center pt-5 px-6">
                <v-avatar
                    color="primary"
                    variant="tonal"
                    size="40"
                    class="mr-3"
                >
                    <v-icon>mdi-swap-horizontal-bold</v-icon>
                </v-avatar>
                <div>
                    <div>{{ t('book.conversionDialogTitle') }}</div>
                    <div class="text-caption text-medium-emphasis font-weight-regular">
                        {{ bookTitle }}
                    </div>
                </div>
            </v-card-title>

            <v-card-text class="px-6 pt-5">
                <div class="text-subtitle-2 mb-2">
                    {{ t('book.currentFormats') }}
                </div>
                <div class="d-flex flex-wrap ga-2 mb-6">
                    <v-chip
                        v-for="format in currentFormats"
                        :key="format"
                        color="primary"
                        variant="tonal"
                        size="small"
                    >
                        {{ format }}
                    </v-chip>
                    <span
                        v-if="currentFormats.length === 0"
                        class="text-body-2 text-medium-emphasis"
                    >
                        {{ t('book.noDownloadFormats') }}
                    </span>
                </div>

                <div class="text-subtitle-2 mb-2">
                    {{ t('book.availableConversions') }}
                </div>
                <v-radio-group
                    v-model="selectedRoute"
                    hide-details
                    class="conversion-options"
                >
                    <v-sheet
                        v-for="option in availableOptions"
                        :key="routeKey(option)"
                        rounded="lg"
                        border
                        class="conversion-option pa-4 mb-3"
                    >
                        <v-radio
                            :value="routeKey(option)"
                            color="primary"
                        >
                            <template #label>
                                <div class="conversion-option__content">
                                    <div class="d-flex align-center flex-wrap ga-2">
                                        <strong>
                                            {{ option.source_format.toUpperCase() }}
                                            <v-icon
                                                size="18"
                                                class="mx-1"
                                            >
                                                mdi-arrow-right
                                            </v-icon>
                                            {{ option.target_format.toUpperCase() }}
                                        </strong>
                                        <v-chip
                                            color="success"
                                            size="x-small"
                                            variant="tonal"
                                        >
                                            {{ t('book.conversionReady') }}
                                        </v-chip>
                                    </div>
                                </div>
                            </template>
                        </v-radio>
                    </v-sheet>
                </v-radio-group>

                <v-alert
                    v-if="availableOptions.length === 0"
                    type="info"
                    variant="tonal"
                    density="comfortable"
                    class="mt-2"
                >
                    {{ t('book.noAvailableConversions') }}
                </v-alert>
            </v-card-text>

            <v-divider />
            <v-card-actions class="px-6 py-4">
                <v-spacer />
                <v-btn
                    variant="text"
                    :disabled="loading"
                    @click="emit('update:modelValue', false)"
                >
                    {{ t('common.cancel') }}
                </v-btn>
                <v-btn
                    data-testid="conversion-confirm"
                    color="primary"
                    variant="flat"
                    :loading="loading"
                    :disabled="!selectedOption"
                    @click="confirm"
                >
                    {{ t('book.startConversion') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
    bookTitle: {
        type: String,
        default: '',
    },
    files: {
        type: Array,
        default: () => [],
    },
    options: {
        type: Array,
        default: () => [],
    },
    loading: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['update:modelValue', 'confirm']);
const { t } = useI18n();
const selectedRoute = ref('');

const routeKey = option => `${option.source_format}:${option.target_format}`;
const currentFormats = computed(() => (
    [...new Set(props.files.map(file => String(file.format || '').toUpperCase()).filter(Boolean))]
));
const availableOptions = computed(() => props.options.filter(option => option.available));
const selectedOption = computed(() => (
    availableOptions.value.find(option => routeKey(option) === selectedRoute.value) || null
));

watch(
    () => [props.modelValue, props.options],
    () => {
        if (!props.modelValue) return;
        selectedRoute.value = availableOptions.value.length > 0
            ? routeKey(availableOptions.value[0])
            : '';
    },
    { immediate: true, deep: true },
);

const confirm = () => {
    if (selectedOption.value) {
        emit('confirm', selectedOption.value);
    }
};
</script>

<style scoped>
.conversion-card {
    overflow: hidden;
}

.conversion-options :deep(.v-selection-control) {
    width: 100%;
}

.conversion-option {
    transition: border-color 0.18s ease, background-color 0.18s ease;
}

.conversion-option:has(.v-selection-control--dirty) {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.06);
}

.conversion-option__content {
    min-width: 0;
    flex: 1;
}
</style>
