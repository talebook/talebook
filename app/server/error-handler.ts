import { defineNitroErrorHandler } from 'nitropack/runtime';

const RECOVERY_MODULE = "import '/readest/stale-nuxt-recovery.js';\n";

export default defineNitroErrorHandler((error, event) => {
    const path = new URL(event.node.req.url || '/', 'http://localhost').pathname;
    if (error.statusCode !== 404 || !/^\/_nuxt\/.+\.js$/.test(path)) return;

    event.node.res.statusCode = 200;
    event.node.res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    event.node.res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    event.node.res.setHeader('X-Content-Type-Options', 'nosniff');
    event.node.res.end(RECOVERY_MODULE);
});
