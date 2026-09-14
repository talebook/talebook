// Mirror webserver.handlers.meta.MetaList for the mock's pre-grouped categories.
// Fixture names use Chinese/ASCII, for which lowercasing matches API casefold.
export function metadataPage(meta, source, query) {
  const integer = (value, fallback) => {
    if (value === undefined) return fallback;
    const text = String(value).trim();
    return /^[+-]?\d+$/.test(text) ? Number(text) : NaN;
  };
  const page = integer(query.page, 1);
  const pageSize = integer(query.page_size, 100);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 1000) {
    return { err: 'params.pagination.invalid', msg: '分页参数无效' };
  }
  const search = String(query.q || '').trim().toLowerCase();
  const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const items = source.filter(item => String(item.name).toLowerCase().includes(search)).sort((a, b) => (
    (meta === 'rating' ? Number(b.name) - Number(a.name) : b.count - a.count)
    || compare(String(a.name).toLowerCase(), String(b.name).toLowerCase())
    || compare(String(a.name), String(b.name))
    || compare(String(a.id), String(b.id))
  ));
  const total = items.length;
  const paginated = total >= 1000 || query.page !== undefined || query.page_size !== undefined;
  const titles = { tag: '全部标签', author: '全部作者', publisher: '全部出版社', series: '丛书列表', rating: '全部评分', format: '全部格式' };
  return {
    err: 'ok', meta, title: titles[meta],
    items: paginated ? items.slice((page - 1) * pageSize, page * pageSize) : items,
    total, unfiltered_total: source.length, page,
    page_size: paginated ? pageSize : Math.max(total, 1),
    pages: paginated ? Math.max(1, Math.ceil(total / pageSize)) : 1,
    paginated,
  };
}
