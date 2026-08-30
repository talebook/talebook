<template>
    <div class="route-page-toolbar">
        <p>{{ description }}</p>
        <div
            v-if="$slots.actions"
            class="route-page-toolbar__actions"
        >
            <slot name="actions" />
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    description: string;
}>();
</script>

<style scoped>
.route-page-toolbar {
    align-items: center;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    margin: 0 4px 16px;
    min-height: 56px;
    padding: 10px 0;
}

.route-page-toolbar p {
    color: rgba(var(--v-theme-on-surface), .64);
    flex: 1 1 320px;
    font-size: .875rem;
    line-height: 1.5;
    margin: 0;
}

.route-page-toolbar__actions {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
}

@media (max-width: 600px) {
    .route-page-toolbar {
        align-items: flex-start;
        margin-inline: 0;
        min-height: 0;
        padding-block: 10px;
    }

    .route-page-toolbar p {
        flex-basis: auto;
        font-size: .8125rem;
    }
}
</style>
