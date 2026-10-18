<template>
    <div class="app-pagination">
        <v-pagination
            v-bind="$attrs"
            :model-value="modelValue"
            :length="length"
            :disabled="disabled"
            :total-visible="xs ? 1 : (totalVisible ?? 5)"
            @update:model-value="emit('update:modelValue', $event)"
        />
        <PageJump
            v-if="length > 1"
            :model-value="modelValue"
            :length="length"
            :disabled="disabled"
            @update:model-value="emit('update:modelValue', $event)"
        />
    </div>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify';
import PageJump from './PageJump.vue';

defineOptions({ inheritAttrs: false });
defineProps<{ modelValue: number; length: number; disabled?: boolean; totalVisible?: number }>();
const emit = defineEmits<{ 'update:modelValue': [page: number] }>();
const { xs } = useDisplay();
</script>

<style scoped>
.app-pagination {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    max-width: 100%;
}
.app-pagination :deep(.v-pagination) {
    max-width: 100%;
}
</style>
