<template>
    <div>
        <RoutePageToolbar
            class="network-page-toolbar"
            :description="t('navigationSections.libraryNetworkDescription')"
        >
            <template
                v-if="store.user.is_admin"
                #actions
            >
                <v-btn
                    class="comic-source-button"
                    to="/admin/plugins?plugin=talebook.source.venera"
                    variant="outlined"
                    prepend-icon="mdi-book-open-page-variant"
                >
                    {{ t('network.manageComicSources') }}
                </v-btn>
                <v-btn
                    to="/plugins/legado"
                    variant="outlined"
                    color="primary"
                    prepend-icon="mdi-book-cog-outline"
                >
                    {{ t('network.manageSources') }}
                </v-btn>
            </template>
        </RoutePageToolbar>
        <NetworkLibraryContent />
    </div>
</template>

<script setup>
import RoutePageToolbar from '@/components/RoutePageToolbar.vue';
import NetworkLibraryContent from '@/pages/network/index.vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';

const { t } = useI18n();
const store = useMainStore();
</script>

<style scoped>
.comic-source-button:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 3px;
}
@media (max-width: 600px) {
    .network-page-toolbar {
        flex-direction: column;
        align-items: stretch;
    }
    .network-page-toolbar :deep(p) {
        flex: none;
    }
    .network-page-toolbar :deep(.route-page-toolbar__actions) {
        justify-content: flex-start;
    }
}
</style>
