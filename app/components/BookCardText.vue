<template>
    <div
        class="book-card-text text-body-2"
        data-testid="book-card-text"
    >
        <div
            class="book-card-title book-card-lines"
            data-testid="book-card-title"
            :title="book.title"
            dir="auto"
        >
            {{ book.title }}
        </div>
        <div
            v-if="showSummary"
            class="book-card-summary book-card-lines text-medium-emphasis mt-1"
            data-testid="book-card-summary"
            dir="auto"
        >
            {{ summary || $t('book.viewDetails') }}
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { bookSummary } from '@/utils/book-summary';

const props = defineProps({
    book: { type: Object, required: true },
    showSummary: { type: Boolean, default: true },
});
const summary = computed(() => bookSummary(props.book.comments));
</script>

<style scoped>
.book-card-text {
    padding: 12px;
}
.book-card-lines {
    display: -webkit-box;
    overflow: hidden;
    overflow-wrap: anywhere;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.5;
    text-align: start;
}
</style>
