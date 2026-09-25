import { withBasePath } from './base-path'

interface ThemeVersionSource {
    version?: string | null
    installed_at?: string | null
}

export function withThemeVersion(url: string, theme?: ThemeVersionSource | null) {
    const version = encodeURIComponent(theme?.version || theme?.installed_at || Date.now().toString())
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}v=${version}`
}

export function resolveThemeModuleUrl(url: string, theme?: ThemeVersionSource | null) {
    return withThemeVersion(withBasePath(url), theme)
}

export function clearInjectedThemeStyles(doc: Document = document) {
    for (const node of doc.querySelectorAll('style[data-talebook-theme]')) {
        node.remove()
    }
}
