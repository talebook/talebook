export type ReaderPageId = string | number;

export interface ReaderPage {
    id: ReaderPageId;
    src: string;
    alt?: string;
    width?: number;
    height?: number;
    mimeType?: string;
}

export interface PageManifest {
    id?: ReaderPageId;
    title?: string;
    pages: readonly ReaderPage[];
}

export interface InitialReaderProgress {
    pageId?: ReaderPageId;
    pageIndex?: number;
}

export interface ReaderProgress {
    pageId: ReaderPageId;
    pageIndex: number;
    pageNumber: number;
    pagesCount: number;
    percent: number;
    completed: boolean;
    timestamp: number;
}

export interface ReaderExit {
    reason: 'button' | 'keyboard' | 'end';
    progress: ReaderProgress;
}

export interface ReaderError {
    code: 'empty-manifest' | 'invalid-manifest' | 'image-load' | 'fullscreen';
    message: string;
    page?: ReaderPage;
    cause?: unknown;
}

export interface StandaloneComicReader {
    destroy(): void;
}

export interface StandaloneComicReaderModule {
    Reader: new (target: Element, options: {
        manifest: PageManifest;
        initialProgress?: InitialReaderProgress;
        onProgress?: (progress: ReaderProgress) => void;
        onExit?: (event: ReaderExit) => void;
        onError?: (error: ReaderError) => void;
    }) => StandaloneComicReader;
}

export interface TalebookComicPage {
    id: string;
    index: number;
    url: string;
    width: number;
    height: number;
    mime_type: string;
}

export interface TalebookComicManifest {
    err: 'ok';
    contract_version: 1;
    book_id: number;
    title: string;
    revision: string;
    pages_count: number;
    pages: TalebookComicPage[];
}

export interface ComicStoredProgress {
    kind: 'comic';
    version: 1;
    pageId: string | number;
    pageIndex: number;
    percent: number;
    completed: boolean;
}

const COMIC_CONTAINERS = new Set(['cbz', 'zip', 'cbr', 'rar']);
const EXISTING_READER_FORMATS = new Set(['epub', 'azw3', 'pdf', 'txt', 'mobi', 'azw']);

function bookFormats(book: any): string[] {
    if (!Array.isArray(book?.files)) return [];
    return book.files
        .map((file: any) => typeof file?.format === 'string' ? file.format.toLowerCase() : '')
        .filter(Boolean);
}

export function readerPathForBook(book: any): string | null {
    if (!Number.isInteger(Number(book?.id)) || Number(book.id) <= 0) return null;
    const formats = bookFormats(book);
    if (book.media_type === 'comic' && formats.some(format => COMIC_CONTAINERS.has(format))) {
        return `/read-comic/${book.id}`;
    }
    if (formats.some(format => EXISTING_READER_FORMATS.has(format))) {
        return `/read/${book.id}`;
    }
    return null;
}

export function toReaderManifest(source: TalebookComicManifest): PageManifest {
    if (source.contract_version !== 1 || !Array.isArray(source.pages) || source.pages.length === 0) {
        throw new Error('invalid comic manifest');
    }
    const pages = [...source.pages].sort((left, right) => left.index - right.index);
    pages.forEach((page, index) => {
        if (
            page.index !== index
            || (typeof page.id !== 'string' && typeof page.id !== 'number')
            || typeof page.url !== 'string'
            || !page.url.startsWith('/')
            || !Number.isInteger(page.width)
            || page.width <= 0
            || !Number.isInteger(page.height)
            || page.height <= 0
            || !page.mime_type.startsWith('image/')
        ) {
            throw new Error('invalid comic page');
        }
    });
    return {
        id: `${source.book_id}:${source.revision}`,
        title: source.title,
        pages: pages.map((page, index) => ({
            id: page.id,
            src: page.url,
            alt: `${source.title} · ${index + 1}`,
            width: page.width,
            height: page.height,
            mimeType: page.mime_type,
        })),
    };
}

export function toInitialProgress(progress: unknown): InitialReaderProgress {
    const value = progress as Partial<ComicStoredProgress> | null;
    if (
        !value
        || value.kind !== 'comic'
        || value.version !== 1
        || !Number.isInteger(value.pageIndex)
        || Number(value.pageIndex) < 0
    ) {
        return { pageIndex: 0 };
    }
    const initial: InitialReaderProgress = { pageIndex: Number(value.pageIndex) };
    if (typeof value.pageId === 'string' || typeof value.pageId === 'number') {
        initial.pageId = value.pageId;
    }
    return initial;
}

export function toStoredProgress(progress: ReaderProgress): ComicStoredProgress {
    return {
        kind: 'comic',
        version: 1,
        pageId: progress.pageId,
        pageIndex: progress.pageIndex,
        percent: progress.percent,
        completed: progress.completed,
    };
}
