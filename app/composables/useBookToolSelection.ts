import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useNuxtApp } from 'nuxt/app';

type BookOption = {
    id: number;
    title: string;
    authors: string[];
    formats: string[];
    label: string;
};

type SelectionOptions = {
    formats?: string[];
};

export function useBookToolSelection(options: SelectionOptions = {}) {
    const route = useRoute();
    const { $backend } = useNuxtApp();
    const allowedFormats = new Set((options.formats || []).map(format => format.toUpperCase()));
    const bookId = ref<number | null>(null);
    const bookOptions = ref<BookOption[]>([]);
    const bookQuery = ref('');
    const booksLoading = ref(false);
    const selectedBook = computed(() => bookOptions.value.find(book => book.id === bookId.value) || null);

    const routeBookId = computed(() => {
        const raw = Array.isArray(route.query.book_id) ? route.query.book_id[0] : route.query.book_id;
        const value = Number(raw || 0);
        return Number.isInteger(value) && value > 0 ? value : null;
    });

    let searchTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadBooks(selectedId: number | null = null) {
        booksLoading.value = true;
        try {
            const query = selectedId
                ? `book_id=${encodeURIComponent(selectedId)}`
                : `query=${encodeURIComponent(bookQuery.value || '')}`;
            const response = await $backend(`/plugins/tools/books?${query}`);
            if (response.err !== 'ok') return;
            const previousSelected = selectedBook.value;
            const nextOptions = (response.books || [])
                .filter((book: BookOption) => (
                    allowedFormats.size === 0
                    || (book.formats || []).some(format => allowedFormats.has(format.toUpperCase()))
                ))
                .map((book: BookOption) => ({
                    ...book,
                    id: Number(book.id),
                    label: `${book.title} — ${(book.authors || []).join(', ')} [${(book.formats || []).join('/')}]`,
                }));
            if (!selectedId && previousSelected && !nextOptions.some(book => book.id === previousSelected.id)) {
                nextOptions.unshift(previousSelected);
            }
            bookOptions.value = nextOptions;
            if (selectedId) {
                bookId.value = nextOptions.some(book => book.id === selectedId) ? selectedId : null;
            }
        } catch {
            if (selectedId) bookId.value = null;
        } finally {
            booksLoading.value = false;
        }
    }

    function onBookSearch(value: string | null) {
        bookQuery.value = value || '';
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(() => loadBooks(), 300);
    }

    watch(routeBookId, selectedId => loadBooks(selectedId), { immediate: true });
    onBeforeUnmount(() => {
        if (searchTimer) clearTimeout(searchTimer);
    });

    return {
        bookId,
        bookOptions,
        bookQuery,
        booksLoading,
        selectedBook,
        onBookSearch,
    };
}
