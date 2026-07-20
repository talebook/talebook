<template>
    <div
        v-if="readState === 2"
        class="book-read-badge"
        :title="$t('readingState.done')"
    >
        <v-icon
            size="12"
            color="white"
        >
            mdi-check
        </v-icon>
    </div>
</template>

<script setup>
defineProps({
    readState: {
        type: Number,
        default: 0,
    },
});
</script>

<style scoped>
.book-read-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgb(33, 150, 243);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    z-index: 1;
}
</style>
