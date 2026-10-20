import { withBasePath } from './base-path';

export function decodeBookCaptchaNext(value: unknown): string | null {
    if (typeof value !== 'string' || value.length > 16384 || !/^[a-z0-9_-]+$/i.test(value)) return null;
    try {
        const bytes = Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0));
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
        return null;
    }
}

export function bookCaptchaReturn(next: unknown, bookId: string, scene: string, basePath = import.meta.env.TALEBOOK_BASE_PATH || ''): string {
    const fallback = withBasePath(scene === 'download' ? `/book/${bookId}` : `/read/${bookId}`, basePath);
    if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || /[\\\u0000-\u0020]/.test(next)) return fallback;
    const url = new URL(next, 'https://talebook.invalid');
    if (url.origin !== 'https://talebook.invalid') return fallback;
    const allowed = scene === 'read'
        ? [withBasePath(`/read/${bookId}`, basePath), withBasePath(`/read-comic/${bookId}`, basePath), withBasePath(`/book/${bookId}/readtxt`, basePath)]
        : [];
    const downloadPrefix = withBasePath(`/api/book/${bookId}.`, basePath);
    const validDownload = scene === 'download' && url.pathname.startsWith(downloadPrefix)
        && /^[a-z0-9]+$/i.test(url.pathname.slice(downloadPrefix.length));
    return allowed.includes(url.pathname) || validDownload ? url.pathname + url.search + url.hash : fallback;
}
