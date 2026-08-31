<template>
    <div>
        <RoutePageToolbar :description="t('navigationSections.libraryNetworkDescription')">
            <template
                v-if="store.user.is_admin"
                #actions
            >
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
