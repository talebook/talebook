<template>
    <v-app :theme="store.theme">
        <Loading />
        <template v-if="store.nav && themeRuntimeReady">
            <ClientOnly>
                <component :is="dynamicHeader" />
                <AppPress />
            </ClientOnly>
        </template>
        <!-- 服务端 themeRuntimeReady 恒为 false；若用 v-show 会让 SSR 输出
             display:none，客户端首帧又显示，造成水合不匹配。
             改为只在客户端挂载后才隐藏。 -->
        <v-main v-show="themeRuntimeReady || !mounted">
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
import { computed, onMounted, ref, watch } from 'vue';
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

// 服务端为 false，挂载后置 true。用于让 SSR 与客户端首帧渲染一致。
const mounted = ref(false);

useHead({
    title: computed(() => store.site_title),
    titleTemplate: computed(() => store.site_title_template),
});

onMounted(() => {
    mounted.value = true;
    store.bootstrap();
});

// 主题运行时只在 onMounted 里就绪，服务端永远是 false。
// 若在 SSR 阶段就把 loading 置 true，服务端会渲染遮罩、客户端首帧渲染内容，
// 触发 hydration mismatch（服务端空、客户端有内容）。
// 因此只在客户端同步 loading，服务端保持初始值 false。
if (import.meta.client) {
    watch(themeRuntimeReady, value => store.setLoading(!value), { immediate: true });
}
</script>
