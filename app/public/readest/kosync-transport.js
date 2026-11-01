/** Transport adapter for the standalone React reader; Nuxt plugins are unavailable here. */
export function usesTalebookKOSync(location) {
  if (!location) return false;
  const params = new URLSearchParams(location.search);
  if (params.get('moke') !== '1') return false;
  try {
    const source = new URL(params.get('mokeSourceServerUrl') || '');
    return source.origin === location.origin && ['http:', 'https:'].includes(source.protocol);
  } catch {
    return false;
  }
}

export async function requestTalebookKOSync(payload, fetchImpl = fetch, location = window.location) {
  const proxyPath = new URL('../api/kosync', location.href).pathname;
  const response = await fetchImpl(proxyPath, {
    method: 'POST',
    credentials: 'same-origin',
    redirect: 'error',
    headers: { 'Content-Type': 'application/json', 'X-Talebook-KOSync': '1' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Talebook KOSync proxy failed (HTTP ${response.status})`);
  const result = await response.json();
  if (result.err !== 'ok') throw new Error(result.msg || result.err || 'Talebook KOSync proxy failed');
  if (!Number.isInteger(result.status) || result.status < 200 || result.status > 599 ||
      !result.data || typeof result.data !== 'object' || Array.isArray(result.data)) {
    throw new Error('Invalid Talebook KOSync proxy response');
  }
  return new Response(JSON.stringify(result.data), {
    status: result.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
