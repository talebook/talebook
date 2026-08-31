<template>
    <section class="route-tab-shell">
        <nav
            class="route-tab-shell__nav"
            :aria-label="title"
        >
            <v-tabs
                :model-value="activePath"
                color="primary"
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
    tabs: RouteTab[];
}>();

const route = useRoute();
const activeTab = computed(() => props.tabs.find(tab => route.path === tab.to || route.path.startsWith(`${tab.to}/`)));
const activePath = computed(() => activeTab.value?.to);
</script>

<style scoped>
.route-tab-shell {
    min-width: 0;
}

.route-tab-shell__nav {
    background: rgb(var(--v-theme-background));
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), .18);
    margin: 6px 4px 0;
    position: sticky;
    top: 48px;
    z-index: 5;
}

.route-tab-shell__nav :deep(.v-tabs) {
    max-width: 100%;
}

.route-tab-shell__nav :deep(.v-tab) {
    --v-btn-size: 1rem;
    align-items: end;
    color: rgba(var(--v-theme-on-surface), .6);
    font-size: var(--v-btn-size);
    font-weight: 600;
    height: auto;
    letter-spacing: 0;
    line-height: 1.3;
    min-width: max-content;
    padding: 0 18px 12px;
    text-transform: none;
    transition: color .15s ease;
}

.route-tab-shell__nav :deep(.v-tab.v-tab--selected) {
    --v-btn-size: 1.5rem;
    color: rgb(var(--v-theme-primary));
    font-weight: 700;
}

.route-tab-shell__nav :deep(.v-tab > .v-btn__content) {
    font-size: var(--v-btn-size);
    line-height: 1.3;
}

.route-tab-shell__nav :deep(.v-tab:not(.v-tab--selected) > .v-btn__content) {
    transform: translateY(2px);
}

.route-tab-shell__nav :deep(.v-tab:first-child) {
    padding-inline-start: 2px;
}

.route-tab-shell__nav :deep(.v-tab__slider) {
    height: 4px;
}

.route-tab-shell__content {
    padding-top: 0;
}

@media (max-width: 600px) {
    .route-tab-shell__nav {
        margin-top: 6px;
        margin-inline: -12px;
        padding-inline: 12px;
    }

    .route-tab-shell__nav :deep(.v-tab) {
        padding-inline: 12px;
    }

}
</style>
