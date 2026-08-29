<template>
    <section class="route-tab-shell">
        <header class="route-tab-shell__header">
            <h1>{{ title }}</h1>
            <p v-if="description">
                {{ description }}
            </p>
        </header>
        <nav
            class="route-tab-shell__nav"
            :aria-label="title"
        >
            <v-tabs
                :model-value="activePath"
                color="primary"
                density="compact"
                show-arrows
            >
                <v-tab
                    v-for="tab in tabs"
                    :key="tab.to"
                    :to="tab.to"
                    :value="tab.to"
                    :prepend-icon="tab.icon"
                >
                    {{ tab.label }}
                </v-tab>
            </v-tabs>
        </nav>
        <div class="route-tab-shell__content">
            <slot />
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface RouteTab {
    label: string;
    to: string;
    icon?: string;
}

const props = defineProps<{
    title: string;
    description?: string;
    tabs: RouteTab[];
}>();

const route = useRoute();
const activePath = computed(() => {
    return props.tabs.find(tab => route.path === tab.to || route.path.startsWith(`${tab.to}/`))?.to;
});
</script>

<style scoped>
.route-tab-shell {
    min-width: 0;
}

.route-tab-shell__header {
    padding: 6px 4px 12px;
}

.route-tab-shell__header h1 {
    font-size: clamp(1.35rem, 2.5vw, 1.75rem);
    font-weight: 700;
    line-height: 1.3;
    margin: 0;
}

.route-tab-shell__header p {
    color: rgba(var(--v-theme-on-surface), .68);
    font-size: .875rem;
    margin: 5px 0 0;
}

.route-tab-shell__nav {
    background: rgb(var(--v-theme-background));
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    position: sticky;
    top: 48px;
    z-index: 5;
}

.route-tab-shell__nav :deep(.v-tabs) {
    max-width: 100%;
}

.route-tab-shell__nav :deep(.v-tab) {
    font-size: .875rem;
    letter-spacing: 0;
    min-width: max-content;
    text-transform: none;
}

.route-tab-shell__content {
    padding-top: 16px;
}

@media (max-width: 600px) {
    .route-tab-shell__header {
        padding-inline: 0;
    }

    .route-tab-shell__nav {
        margin-inline: -12px;
        padding-inline: 4px;
    }

    .route-tab-shell__content {
        padding-top: 12px;
    }
}
</style>
