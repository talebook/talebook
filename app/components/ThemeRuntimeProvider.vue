<template>
    <slot />
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import { markRaw, onMounted, onUnmounted, provide, readonly, ref, shallowRef, watch } from 'vue';
import AppHeader from '@/components/AppHeader.vue';
import AppFooter from '@/components/AppFooter.vue';
import { themeRuntimeKey } from '@/composables/useThemeRuntime';
import { useMainStore } from '@/stores/main';
import type { Theme } from '@/stores/theme';
import { useThemeStore } from '@/stores/theme';
import {
    applyBuiltinThemeRuntimeDescriptor,
    buildBuiltinThemeRuntimeDescriptor,
    clearBuiltinThemeRuntime,
} from '@/utils/builtin-theme-runtime';
import { isBuiltinTheme, loadBuiltinThemeComponent } from '@/utils/builtin-themes';
import { clearInjectedThemeStyles, resolveThemeModuleUrl } from '@/utils/theme-runtime';

const mainStore = useMainStore();
const themeStore = useThemeStore();
const route = useRoute();

const ready = ref(false);
const dynamicHeader = shallowRef<Component>(markRaw(AppHeader));
const dynamicFooter = shallowRef<Component>(markRaw(AppFooter));

let applyGeneration = 0;
let appliedRuntimeKey = '';
let mounted = false;

provide(themeRuntimeKey, {
    ready: readonly(ready),
    dynamicHeader: readonly(dynamicHeader),
    dynamicFooter: readonly(dynamicFooter),
});

function runtimeEnabled() {
    return route.meta.themeRuntime !== false;
}

async function loadThemeModule(url: string) {
    return await import(/* @vite-ignore */ url);
}

async function stageTheme(theme: Theme | null) {
    let header: Component = markRaw(AppHeader);
    let footer: Component = markRaw(AppFooter);

    if (isBuiltinTheme(theme)) {
        const [loadedHeader, loadedFooter] = await Promise.all([
            loadBuiltinThemeComponent(theme!.name, 'AppHeader'),
            loadBuiltinThemeComponent(theme!.name, 'AppFooter'),
        ]);
        if (!loadedHeader || !loadedFooter) {
            throw new Error(`Built-in theme ${theme!.name} is incomplete`);
        }
        header = markRaw(loadedHeader);
        footer = markRaw(loadedFooter);
    } else if (theme?.components) {
        const [loadedHeader, loadedFooter] = await Promise.all([
            theme.components.AppHeader
                ? loadThemeModule(resolveThemeModuleUrl(theme.components.AppHeader, theme))
                : Promise.resolve(null),
            theme.components.AppFooter
                ? loadThemeModule(resolveThemeModuleUrl(theme.components.AppFooter, theme))
                : Promise.resolve(null),
        ]);
        header = loadedHeader ? markRaw(loadedHeader.default || loadedHeader) : markRaw(AppHeader);
        footer = loadedFooter ? markRaw(loadedFooter.default || loadedFooter) : markRaw(AppFooter);
    }

    const descriptor = isBuiltinTheme(theme)
        ? buildBuiltinThemeRuntimeDescriptor(theme!.name, mainStore.theme === 'dark' ? 'dark' : 'light')
        : null;
    return { descriptor, footer, header };
}

function getRuntimeKey(theme: Theme | null) {
    if (!runtimeEnabled()) return 'disabled';
    if (!theme) return `default:${mainStore.theme}`;
    return [theme.id, theme.name, theme.version, theme.installed_at, mainStore.theme].join(':');
}

function clearRuntimeDom() {
    if (!import.meta.client) return;
    clearBuiltinThemeRuntime();
    clearInjectedThemeStyles();
}

async function applyTheme(theme: Theme | null) {
    const runtimeKey = getRuntimeKey(theme);
    if (ready.value && runtimeKey === appliedRuntimeKey) return;

    const generation = ++applyGeneration;

    if (!runtimeEnabled()) {
        clearRuntimeDom();
        dynamicHeader.value = markRaw(AppHeader);
        dynamicFooter.value = markRaw(AppFooter);
        appliedRuntimeKey = runtimeKey;
        ready.value = true;
        return;
    }

    try {
        const staged = await stageTheme(theme);
        if (generation !== applyGeneration || !mounted) return;

        dynamicHeader.value = staged.header;
        dynamicFooter.value = staged.footer;
        clearRuntimeDom();
        if (staged.descriptor) {
            applyBuiltinThemeRuntimeDescriptor(document, staged.descriptor);
        }
        appliedRuntimeKey = runtimeKey;
    } catch (error) {
        if (generation !== applyGeneration || !mounted) return;
        console.warn('主题运行时加载失败，已完整回退到默认主题', error);
        dynamicHeader.value = markRaw(AppHeader);
        dynamicFooter.value = markRaw(AppFooter);
        clearRuntimeDom();
        appliedRuntimeKey = runtimeKey;
    } finally {
        if (generation === applyGeneration && mounted) {
            ready.value = true;
        }
    }
}

onMounted(async () => {
    mounted = true;
    const cachedTheme = themeStore.hydrateCachedTheme();

    if (!runtimeEnabled()) {
        await applyTheme(null);
        await themeStore.fetchActiveTheme();
        return;
    }

    if (cachedTheme) {
        await applyTheme(cachedTheme);
        await themeStore.fetchActiveTheme();
        await applyTheme(themeStore.activeTheme);
    } else {
        await themeStore.fetchActiveTheme();
        await applyTheme(themeStore.activeTheme);
    }
});

watch(() => themeStore.activeTheme, theme => {
    if (mounted) void applyTheme(theme);
});

watch(() => mainStore.theme, () => {
    if (mounted) void applyTheme(themeStore.activeTheme);
});

watch(() => route.meta.themeRuntime, () => {
    if (mounted) void applyTheme(themeStore.activeTheme);
});

onUnmounted(() => {
    mounted = false;
    ++applyGeneration;
    clearRuntimeDom();
});
</script>
