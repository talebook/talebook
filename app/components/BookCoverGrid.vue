<template>
    <div
        v-if="books.length === 0"
        class="text-center py-8 text-grey"
    >
        {{ emptyText }}
    </div>
    <v-row v-else>
        <v-col
            v-for="book in books"
            :key="keyPrefix + '-' + book.id"
            :cols="cols"
            :sm="sm"
            :md="md"
            :lg="lg"
        >
            <v-card
                :to="book.href || '/book/' + book.id"
                :aria-label="book.title"
                class="book-cover-card ma-1"
                data-testid="book-cover-card"
            >
                <v-img
                    :src="book.img"
                    :aspect-ratio="11 / 15"
                    alt=""
                    aria-hidden="true"
                    data-testid="book-cover-image"
                />
                <BookCardText
                    v-if="showTitle"
                    :book="book"
                    :show-summary="showSummary"
                />
            </v-card>
        </v-col>
    </v-row>
</template>

<script setup>
import BookCardText from '@/components/BookCardText.vue';

defineProps({
    books: {
        type: Array,
        default: () => [],
    },
    emptyText: {
        type: String,
        required: true,
    },
    keyPrefix: {
        type: String,
        default: 'book',
    },
    cols: {
        type: [String, Number],
        default: 4,
    },
    sm: {
        type: [String, Number],
        default: 2,
    },
    md: {
        type: [String, Number],
        default: undefined,
    },
    lg: {
        type: [String, Number],
        default: undefined,
    },
    showTitle: {
        type: Boolean,
        default: false,
    },
    showSummary: {
        type: Boolean,
        default: false,
    },
});
</script>

<style scoped>
.book-cover-card:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
}
</style>
