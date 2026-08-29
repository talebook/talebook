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
