import { flushPromises } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import {
    calculateReadDays,
    READING_STATE,
    useBookReadingState,
} from '~/composables/useBookReadingState';

const flushState = async () => {
    await nextTick();
    await flushPromises();
    await nextTick();
};

const deferred = <T>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((resolvePromise) => {
        resolve = resolvePromise;
    });
    return { promise, resolve };
};

describe('useBookReadingState', () => {
    it('derives elapsed reading days from the API read date', () => {
        expect(calculateReadDays('2026-07-19T08:00:00.000Z', Date.parse('2026-07-22T08:00:00.000Z'))).toBe(3);
        expect(calculateReadDays('invalid', Date.parse('2026-07-22T08:00:00.000Z'))).toBe(0);
    });

    it('clears state on logout and restores it after login', async () => {
        const bookId = ref(1);
        const isLogin = ref(true);
        const backend = vi.fn().mockResolvedValue({
            err: 'ok',
            wants: true,
            read_state: READING_STATE.READING,
            read_date: '2026-07-19T08:00:00.000Z',
        });
        const state = useBookReadingState({
            bookId,
            isLogin,
            backend,
            now: () => Date.parse('2026-07-22T08:00:00.000Z'),
        });

        await flushState();
        expect(state.isInShelf.value).toBe(true);
        expect(state.readingState.value).toBe(READING_STATE.READING);
        expect(state.readDays.value).toBe(3);

        isLogin.value = false;
        await flushState();
        expect(state.isInShelf.value).toBe(false);
        expect(state.readingState.value).toBe(READING_STATE.UNREAD);
        expect(state.readDays.value).toBe(0);

        isLogin.value = true;
        await flushState();
        expect(backend).toHaveBeenCalledTimes(2);
        expect(state.isInShelf.value).toBe(true);
        expect(state.readingState.value).toBe(READING_STATE.READING);
    });

    it('ignores an old response after switching books', async () => {
        const firstResponse = deferred<Record<string, unknown>>();
        const bookId = ref(1);
        const isLogin = ref(true);
        const backend = vi.fn((url: string) => {
            if (url === '/book/1/readstate') {
                return firstResponse.promise;
            }
            return Promise.resolve({
                err: 'ok',
                wants: false,
                read_state: READING_STATE.FINISHED,
                read_date: '2026-07-22T08:00:00.000Z',
            });
        });
        const state = useBookReadingState({ bookId, isLogin, backend });

        await nextTick();
        bookId.value = 2;
        await flushState();
        expect(state.isInShelf.value).toBe(false);
        expect(state.readingState.value).toBe(READING_STATE.FINISHED);

        firstResponse.resolve({
            err: 'ok',
            wants: true,
            read_state: READING_STATE.READING,
            read_date: '2026-07-19T08:00:00.000Z',
        });
        await flushState();

        expect(state.isInShelf.value).toBe(false);
        expect(state.readingState.value).toBe(READING_STATE.FINISHED);
    });
});
