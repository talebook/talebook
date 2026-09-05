import {
    buildReadProxyRequestHeaders,
    buildReadProxyResponse,
    buildReadProxyTarget,
} from '../../utils/readProxy';

const readProxyHandler = async (event: any) => {
    const nodeRequest = (event as any).node.req;
    const method = String(nodeRequest.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
        return new Response('Method Not Allowed', {
            status: 405,
            headers: { Allow: 'GET, HEAD' },
        });
    }

    const forwardedProtocol = String(nodeRequest.headers['x-forwarded-proto'] || nodeRequest.headers['x-scheme'] || '');
    const protocol = forwardedProtocol.split(',')[0].trim() || (nodeRequest.socket?.encrypted ? 'https' : 'http');
    const forwardedHost = String(nodeRequest.headers['x-forwarded-host'] || nodeRequest.headers.host || 'localhost');
    const host = forwardedHost.split(',')[0].trim();
    const requestUrl = new URL(nodeRequest.url || '/', `${protocol}://${host}`);
    const requestHeaders = new Headers();
    for (const [name, value] of Object.entries(nodeRequest.headers)) {
        if (Array.isArray(value)) value.forEach(item => requestHeaders.append(name, String(item)));
        else if (value !== undefined) requestHeaders.set(name, String(value));
    }

    const config = useRuntimeConfig(event);
    const target = buildReadProxyTarget(String(config.api_url), requestUrl);
    const headers = buildReadProxyRequestHeaders(requestHeaders, requestUrl);

    let upstream: Response;
    try {
        upstream = await fetch(target, {
            method,
            headers,
            redirect: 'manual',
        });
    } catch (error) {
        console.error('Read proxy request failed', error);
        return new Response('Bad Gateway', { status: 502 });
    }

    return buildReadProxyResponse(upstream, method, requestUrl.origin, target.origin);
};

// Nuxt currently carries H3 v1 internally while the E2E mock server uses H3
// v2. Mark this handler explicitly so Nitro does not reinterpret a v2 handler
// wrapper or emit the deprecated implicit-handler warning.
(readProxyHandler as typeof readProxyHandler & { __is_handler__?: boolean }).__is_handler__ = true;

export default readProxyHandler;
