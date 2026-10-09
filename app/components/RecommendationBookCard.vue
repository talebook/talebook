<template>
    <v-card
        :to="book.href ?? '/book/' + book.id"
        :aria-label="book.title"
        class="recommendation-book-card ma-1"
        data-testid="recommendation-book-card"
    >
        <div
            class="recommendation-cover"
            :title="book.title"
        >
            <v-img
                :src="book.img"
                :aspect-ratio="11/15"
                alt=""
                aria-hidden="true"
                data-testid="recommendation-cover"
                cover
            />
            <BookReadBadge :read-state="book.state?.read_state" />
        </div>
        <div class="recommendation-title-area text-body-2">
            <div
                class="recommendation-title"
                data-testid="recommendation-title"
                :title="book.title"
                dir="auto"
            >
                {{ book.title }}
            </div>
        </div>
    </v-card>
</template>

<script setup>
import BookReadBadge from '@/components/BookReadBadge.vue';

defineProps({
    book: {
        type: Object,
        required: true,
    },
});
</script>

<style scoped>
.recommendation-book-card:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
}
.recommendation-cover {
    position: relative;
}
.recommendation-title-area {
    padding-block: 8px;
    padding-inline: 4px;
}
.recommendation-title {
    display: -webkit-box;
    min-block-size: 3em;
    overflow: hidden;
    overflow-wrap: anywhere;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.5;
    text-align: start;
}
</style>
