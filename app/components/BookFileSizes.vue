<template>
    <div
        v-if="entries.length"
        class="book-file-sizes text-body-2"
        data-testid="book-file-sizes"
    >
        <span
            v-for="[format, size] in entries"
            :key="format"
        >
            {{ format }} · {{ formatFileSize(size) }}
        </span>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatFileSize } from '@/utils/file-size';

const props = defineProps<{ sizes?: Record<string, number> }>();
const entries = computed(() => Object.entries(props.sizes || {}).sort(([a], [b]) => a.localeCompare(b)));
</script>

<style scoped>
.book-file-sizes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.15rem 0.75rem;
    margin-block: 0.25rem;
    overflow-wrap: anywhere;
    font-variant-numeric: tabular-nums;
}
</style>
