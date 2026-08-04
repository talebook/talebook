import { defineStore } from 'pinia'

export interface ThemeComponent {
    [key: string]: string
}

export interface Theme {
    id: number | string
    name: string
    version: string
    author: string
    description: string
    active: boolean
    installed_at: string | null
    builtin?: boolean
    components: ThemeComponent
}

const ACTIVE_THEME_CACHE_KEY = 'talebook.activeTheme'

function readCachedActiveTheme(): Theme | null {
    if (!import.meta.client) return null
    try {
        const raw = window.localStorage.getItem(ACTIVE_THEME_CACHE_KEY)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

function writeCachedActiveTheme(theme: Theme | null) {
    if (!import.meta.client) return
    if (theme) {
        window.localStorage.setItem(ACTIVE_THEME_CACHE_KEY, JSON.stringify(theme))
    } else {
        window.localStorage.removeItem(ACTIVE_THEME_CACHE_KEY)
    }
}

export const useThemeStore = defineStore('themePlugin', () => {
    const activeTheme = ref<Theme | null>(readCachedActiveTheme())
    const loading = ref(false)

    function hydrateCachedTheme() {
        activeTheme.value = readCachedActiveTheme()
        return activeTheme.value
    }

    async function fetchActiveTheme() {
        const { $backend } = useNuxtApp()
        try {
            const res = await $backend('/themes/active')
            if (res.err === 'ok') {
                activeTheme.value = res.theme
                writeCachedActiveTheme(activeTheme.value)
            }
        } catch (e) {
            // 静默失败：主题加载失败不影响主站功能
        }
    }

    async function activate(name: string) {
        const { $backend } = useNuxtApp()
        const res = await $backend('/themes/activate', {
            method: 'POST',
            body: JSON.stringify({ name }),
            headers: { 'Content-Type': 'application/json' },
        })
        if (res.err === 'ok') {
            activeTheme.value = res.theme ?? null
            writeCachedActiveTheme(activeTheme.value)
        }
        return res
    }

    async function deactivate() {
        const { $backend } = useNuxtApp()
        const res = await $backend('/themes/activate', {
            method: 'POST',
            body: JSON.stringify({ name: '' }),
            headers: { 'Content-Type': 'application/json' },
        })
        if (res.err === 'ok') {
            activeTheme.value = null
            writeCachedActiveTheme(null)
        }
        return res
    }

    return {
        activeTheme,
        loading,
        hydrateCachedTheme,
        fetchActiveTheme,
        activate,
        deactivate,
    }
})
