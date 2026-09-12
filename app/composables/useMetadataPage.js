import { computed, onScopeDispose, ref, toValue, watch } from 'vue';

export function metadataPageUrl(type, page = 1, query = '', pageSize = 100) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (query.trim()) params.set('q', query.trim());
  return `/${type}?${params}`;
}

// Shared by category pages and the library's remote filter picker.
export function useMetadataPage(fetchPage, { key, enabled = true, pageSize = 100 } = {}) {
  const page = ref(1);
  const query = ref('');
  const normalizedQuery = computed(() => String(query.value || '').trim());
  const items = ref([]);
  const total = ref(0);
  const unfilteredTotal = ref(0);
  const pages = ref(1);
  const loading = ref(false);
  const failed = ref(false);
  let sequence = 0;

  watch([() => toValue(key), normalizedQuery], () => { page.value = 1; }, { flush: 'sync' });

  const reload = async () => {
    const request = ++sequence;
    if (!toValue(enabled)) {
      loading.value = false;
      return;
    }
    loading.value = true;
    failed.value = false;
    items.value = [];
    try {
      const result = await fetchPage(page.value, normalizedQuery.value, toValue(pageSize));
      if (request !== sequence) return;
      if (result.err && result.err !== 'ok') throw new Error('Metadata request failed');
      pages.value = Math.max(1, result.pages || 1);
      total.value = result.total || 0;
      unfilteredTotal.value = result.unfiltered_total ?? total.value;
      // A deletion may leave the current page beyond the last page.
      if (page.value > pages.value) {
        page.value = pages.value;
        return;
      }
      items.value = result.items || [];
    } catch {
      if (request === sequence) failed.value = true;
    } finally {
      if (request === sequence) loading.value = false;
    }
  };

  watch([() => toValue(key), normalizedQuery, page, () => toValue(enabled)], reload, {
    immediate: true,
    flush: 'post'
  });
  onScopeDispose(() => { sequence++; });

  return { page, query, items, total, unfilteredTotal, pages, loading, failed, reload };
}
