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
        >
            <v-card
                :to="book.href || '/book/' + book.id"
                class="ma-1"
            >
                <v-img
                    :src="book.img"
                    :aspect-ratio="11 / 15"
                />
                <v-card-subtitle
                    v-if="showTitle"
                    class="text-truncate px-1"
                >
                    {{ book.title }}
                </v-card-subtitle>
                <BookFileSizes :sizes="book.format_sizes" class="px-2 pb-2" />
            </v-card>
        </v-col>
    </v-row>
</template>

<script setup>
import BookFileSizes from '@/components/BookFileSizes.vue';
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
    showTitle: {
        type: Boolean,
        default: false,
    },
});
</script>
