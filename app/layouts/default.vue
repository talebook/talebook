<template>
    <v-app :theme="store.theme">
        <Loading />
        <template v-if="store.nav && themeComponentsReady">
            <ClientOnly>
                <component :is="dynamicHeader" />
                <AppPress />
            </ClientOnly>
        </template>
        <v-main v-show="!store.nav || themeComponentsReady">
            <v-container fluid>
                <slot />
                <template v-if="store.nav && themeComponentsReady">
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
import { shallowRef, ref, computed, onMounted, watch } from 'vue';
import { useRouter, useHead } from 'nuxt/app';
import { useMainStore } from '@/stores/main';
import { useThemeStore } from '@/stores/theme';
import { useDisplay } from 'vuetify';
import Loading from '@/components/Loading.vue';
import AppHeader from '@/components/AppHeader.vue';
import AppFooter from '@/components/AppFooter.vue';
import AudiobookPlayer from '@/components/AudiobookPlayer.vue';
import { isBuiltinTheme, loadBuiltinThemeComponent } from '@/utils/builtin-themes';
import { clearInjectedThemeStyles, resolveThemeModuleUrl } from '@/utils/theme-runtime';

const store = useMainStore();
const themeStore = useThemeStore();
const display = useDisplay();
const router = useRouter();

const dynamicHeader = shallowRef(AppHeader);
const dynamicFooter = shallowRef(AppFooter);
const themeComponentsReady = ref(false);

let applyThemeGeneration = 0;

useHead({
    title: computed(() => store.site_title),
    titleTemplate: computed(() => store.site_title_template),
});

async function loadThemeModule(url) {
    return await import(/* @vite-ignore */ url);
}

async function applyThemeComponents(theme) {
    const generation = ++applyThemeGeneration;

    let header = AppHeader;
    let footer = AppFooter;

    if (isBuiltinTheme(theme)) {
        const [headerComponent, footerComponent] = await Promise.all([
            loadBuiltinThemeComponent(theme.name, 'AppHeader'),
            loadBuiltinThemeComponent(theme.name, 'AppFooter'),
        ]);
        header = headerComponent || AppHeader;
        footer = footerComponent || AppFooter;
    } else if (theme?.components) {
        if (theme.components.AppHeader) {
            try {
                const mod = await loadThemeModule(resolveThemeModuleUrl(theme.components.AppHeader, theme));
                header = mod.default || mod;
            } catch (e) {
                console.warn('主题 Header 加载失败，使用默认', e);
            }
        }

        if (theme.components.AppFooter) {
            try {
                const mod = await loadThemeModule(resolveThemeModuleUrl(theme.components.AppFooter, theme));
                footer = mod.default || mod;
            } catch (e) {
                console.warn('主题 Footer 加载失败，使用默认', e);
            }
        }
    }

    // Discard if a newer activation started while we were awaiting imports
    if (generation !== applyThemeGeneration) return;

    if (import.meta.client && !isBuiltinTheme(theme)) {
        clearInjectedThemeStyles();
    }

    dynamicHeader.value = header;
    dynamicFooter.value = footer;
    themeComponentsReady.value = true;
}

onMounted(async () => {
    store.setLoading(false);
    const bootstrapPromise = store.bootstrap();

    if (themeStore.activeTheme) {
        await applyThemeComponents(themeStore.activeTheme);
        await Promise.all([bootstrapPromise, themeStore.fetchActiveTheme()]);
        await applyThemeComponents(themeStore.activeTheme);
    } else {
        await Promise.all([bootstrapPromise, themeStore.fetchActiveTheme()]);
        await applyThemeComponents(themeStore.activeTheme);
    }
});

// 管理员激活/停用主题后立即切换组件，无需刷新页面
watch(() => themeStore.activeTheme, async (theme) => {
    await applyThemeComponents(theme);
});
</script>
