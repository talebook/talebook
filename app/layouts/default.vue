<template>
    <v-app :theme="store.theme">
        <Loading />
        <template v-if="store.nav && themeRuntimeReady">
            <ClientOnly>
                <component :is="dynamicHeader" />
                <AppPress />
            </ClientOnly>
        </template>
        <v-main v-show="themeRuntimeReady">
            <v-container fluid>
                <slot />
                <template v-if="store.nav && themeRuntimeReady">
                    <ClientOnly>
                        <component :is="dynamicFooter" />
                    </ClientOnly>
                </template>
            </v-container>

            <v-dialog
                v-model="store.alert.show"
                persistent
                :width="display.smAndDown.value ? '80%' : '50%'"
            >
                <v-card>
                    <v-toolbar
                        dark
                        color="primary"
                    >
                        <v-toolbar-title align-center />
                    </v-toolbar>
                    <v-card-text class="pt-12">
                        <v-alert
                            outlined
                            :model-value="store.alert.show"
                            :type="store.alert.type"
                            v-html="store.alert.msg"
                        />
                    </v-card-text>
                    <v-card-actions v-if="store.alert.type!=='success' || store.alert.to">
                        <v-spacer />
                        <v-btn
                            v-if="store.alert.to"
                            color="primary"
                            @click="router.push(store.alert.to); store.closeAlert()"
                        >
                            {{ $t('messages.ok') }}
                        </v-btn>
                        <v-btn
                            v-else
                            color="primary"
                            @click="store.closeAlert()"
                        >
                            {{ $t('messages.dialogClose') }}
                        </v-btn>
                        <v-spacer />
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </v-main>
        <Upload v-if="store.nav" />
        <AudiobookPlayer />
    </v-app>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue';
import { useRouter, useHead } from 'nuxt/app';
import { useThemeRuntime } from '@/composables/useThemeRuntime';
import { useMainStore } from '@/stores/main';
import { useDisplay } from 'vuetify';
import Loading from '@/components/Loading.vue';
import AudiobookPlayer from '@/components/AudiobookPlayer.vue';

const store = useMainStore();
const display = useDisplay();
const router = useRouter();
const {
    dynamicFooter,
    dynamicHeader,
    ready: themeRuntimeReady,
} = useThemeRuntime();

useHead({
    title: computed(() => store.site_title),
    titleTemplate: computed(() => store.site_title_template),
});

onMounted(() => {
    store.bootstrap();
});

watch(themeRuntimeReady, value => store.setLoading(!value), { immediate: true });
</script>
