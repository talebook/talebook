const HOP_BY_HOP_HEADERS = [
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
];

const BODYLESS_STATUS = new Set([204, 205, 304]);

export function buildReadProxyTarget(apiUrl: string, requestUrl: URL): URL {
    const target = new URL(apiUrl);
    const basePath = target.pathname.replace(/\/$/, '');
    target.pathname = `${basePath}${requestUrl.pathname}`;
    target.search = requestUrl.search;
    target.hash = '';
    return target;
}

export function buildReadProxyRequestHeaders(requestHeaders: Headers, requestUrl: URL): Headers {
    const headers = new Headers(requestHeaders);
    for (const name of HOP_BY_HOP_HEADERS) headers.delete(name);
    headers.delete('content-length');
    headers.delete('host');

    // Avoid transparent upstream compression: fetch() decodes response bodies,
    // which would make an upstream compressed Content-Length unsafe to forward.
    headers.set('accept-encoding', 'identity');
    headers.set('x-forwarded-host', requestUrl.host);
    headers.set('x-forwarded-proto', requestUrl.protocol.slice(0, -1));
    headers.set('x-scheme', requestUrl.protocol.slice(0, -1));
    return headers;
}

export function rewriteReadProxyLocation(
    location: string | null,
    requestOrigin: string,
    upstreamOrigin: string,
): string | null {
    if (!location) return null;

    const target = new URL(location, upstreamOrigin);
    const isLocalRedirect = location.startsWith('/') || target.origin === upstreamOrigin;
    if (!isLocalRedirect) return location;

    if (target.pathname === '/readest/reader.html') {
        const file = target.searchParams.get('file');
        if (file) {
            const resource = new URL(file, upstreamOrigin);
            if (resource.origin === upstreamOrigin && /^\/read\/resource\/[0-9]+\.epub$/.test(resource.pathname)) {
                target.searchParams.set('file', `${requestOrigin}${resource.pathname}${resource.search}`);
            }
        }
    }

    return `${target.pathname}${target.search}${target.hash}`;
}

export function buildReadProxyResponse(
    upstream: Response,
    method: string,
    requestOrigin: string,
    upstreamOrigin: string,
): Response {
    const headers = new Headers(upstream.headers);
    for (const name of HOP_BY_HOP_HEADERS) headers.delete(name);

    const location = rewriteReadProxyLocation(headers.get('location'), requestOrigin, upstreamOrigin);
    if (location) headers.set('location', location);

    const hasBody = method !== 'HEAD' && !BODYLESS_STATUS.has(upstream.status);
    return new Response(hasBody ? upstream.body : null, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
    });
}
