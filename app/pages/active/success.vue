<template>
    <v-row
        justify="center"
        class="fill-height align-center"
    >
        <v-col
            cols="12"
            sm="8"
            md="4"
        >
            <v-card class="elevation-12">
                <v-toolbar
                    dark
                    color="primary"
                >
                    <v-toolbar-title align-center>
                        {{ $t('messages.activateSuccess') }}
                    </v-toolbar-title>
                </v-toolbar>
                <v-card-text>
                    <p class="mt-12 mb-8 text-center">
                        {{ $t('messages.activationMessage') }}
                    </p>
                </v-card-text>

                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        to="/"
                        color="primary"
                        variant="elevated"
                    >
                        Go
                    </v-btn>
                    <v-spacer />
                </v-card-actions>
            </v-card>
        </v-col>
    </v-row>
</template>

<script setup>
import { onMounted } from 'vue';
import { useMainStore } from '@/stores/main';

const mainStore = useMainStore();

import { useI18n } from 'vue-i18n';
const { t } = useI18n();

useHead({
    title: () => t('messages.activateSuccess')
});

onMounted(() => {
    mainStore.setNavbar(false);
});
</script>
