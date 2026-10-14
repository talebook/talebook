<template>
    <v-app :theme="store.theme">
        <Loading />
        <v-main v-show="themeRuntimeReady">
            <slot />

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
    </v-app>
</template>

<script setup>
import { useMainStore } from '@/stores/main';
import { useThemeRuntime } from '@/composables/useThemeRuntime';
import { useDisplay } from 'vuetify';

const store = useMainStore();
const display = useDisplay();
const router = useRouter();
const { ready: themeRuntimeReady } = useThemeRuntime();

useHead({
    title: computed(() => store.site_title),
    titleTemplate: computed(() => store.site_title_template),
});

// 同 default.vue：主题运行时只在 onMounted 里就绪，服务端恒为 false。
// 在 SSR 阶段置 loading 会让服务端渲染遮罩、客户端渲染内容，触发水合不匹配。
if (import.meta.client) {
    watch(themeRuntimeReady, value => store.setLoading(!value), { immediate: true });
}
</script>
