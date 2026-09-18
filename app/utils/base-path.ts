/** Only local absolute paths are deployment-relative; router `to` stays logical. */
export function normalizeBasePath(value: string = ''): string {
    if (value === '' || value === '/') return '';
    if (!/^(?:\/[A-Za-z0-9_-]+)+\/?$/.test(value)) {
        throw new Error('TALEBOOK_BASE_PATH must be empty or /path[/path] using letters, digits, _ and -');
    }
    return value.replace(/\/$/, '');
}

export function withBasePath<T extends string | null | undefined>(url: T, basePath = import.meta.env.TALEBOOK_BASE_PATH || ''): T {
    const prefix = normalizeBasePath(basePath);
    if (!url || !prefix || !url.startsWith('/') || url.startsWith('//')) return url;
    const path = url.split(/[?#]/, 1)[0];
    if (path === prefix || path.startsWith(prefix + '/')) return url;
    return (prefix + url) as T;
}
