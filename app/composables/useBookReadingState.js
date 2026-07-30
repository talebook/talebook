import { ref, watch } from 'vue';

export const READING_STATE = { UNREAD: 0, READING: 1, FINISHED: 2 };

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const calculateReadDays = (readDate, now = Date.now()) => {
  const startedAt = Date.parse(readDate || '');
  const currentTime = typeof now === 'number' ? now : Date.parse(now);
  if (!Number.isFinite(startedAt) || !Number.isFinite(currentTime)) {
    return 0;
  }
  return Math.max(0, Math.floor((currentTime - startedAt) / MILLISECONDS_PER_DAY));
};

export const useBookReadingState = ({ bookId, isLogin, backend, now = Date.now }) => {
  const isInShelf = ref(false);
  const readingState = ref(READING_STATE.UNREAD);
  const readDays = ref(0);
  const lastReadTime = ref('');
  let requestId = 0;

  const reset = () => {
    isInShelf.value = false;
    readingState.value = READING_STATE.UNREAD;
    readDays.value = 0;
    lastReadTime.value = '';
  };

  const load = async (targetBookId, targetRequestId) => {
    try {
      const rsp = await backend(`/book/${targetBookId}/readstate`);
      if (targetRequestId !== requestId || bookId.value !== targetBookId || !isLogin.value) {
        return;
      }
      if (rsp.err === 'ok') {
        isInShelf.value = !!rsp.wants;
        readingState.value = rsp.read_state || READING_STATE.UNREAD;
        lastReadTime.value = rsp.read_date || '';
        readDays.value = readingState.value === READING_STATE.READING
          ? calculateReadDays(lastReadTime.value, now())
          : 0;
      }
    } catch (e) {
      console.error('Failed to load reading state:', e);
    }
  };

  watch([bookId, isLogin], ([targetBookId, loggedIn]) => {
    const targetRequestId = ++requestId;
    reset();
    if (targetBookId && loggedIn) {
      load(targetBookId, targetRequestId);
    }
  }, { immediate: true });

  return {
    isInShelf,
    readingState,
    readDays,
    lastReadTime,
  };
};
