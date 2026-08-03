import type { Component, InjectionKey, Ref } from 'vue';
import { inject } from 'vue';

export interface ThemeRuntimeContext {
    ready: Readonly<Ref<boolean>>
    dynamicHeader: Readonly<Ref<Component>>
    dynamicFooter: Readonly<Ref<Component>>
}

export const themeRuntimeKey: InjectionKey<ThemeRuntimeContext> = Symbol('talebook-theme-runtime');

export function useThemeRuntime() {
    const runtime = inject(themeRuntimeKey);
    if (!runtime) {
        throw new Error('useThemeRuntime must be used inside ThemeRuntimeProvider');
    }
    return runtime;
}
