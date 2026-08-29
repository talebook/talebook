const LEGACY_PATHS: Record<string, string> = {
    '/network': '/library/network',
    '/opds-readme': '/library/apps',
    '/webdav-readme': '/library/apps',
    '/user/shelf': '/me/shelf',
    '/user/history': '/me/history',
    '/user/detail': '/me/account',
    '/scopedbooks': '/me/private',
    '/admin/plugins': '/admin/settings/plugins',
    '/admin/themes': '/admin/settings/themes',
};

export default defineNuxtRouteMiddleware((to) => {
    const path = LEGACY_PATHS[to.path];
    if (!path) return;
    return navigateTo({ path, query: to.query, hash: to.hash }, { replace: true });
});
