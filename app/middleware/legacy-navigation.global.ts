const LEGACY_PATHS: Record<string, string> = {
    '/network': '/library/network',
    '/opds-readme': '/library/apps',
    '/webdav-readme': '/library/apps',
    '/user/shelf': '/me/shelf',
    '/user/history': '/me/history',
    '/user/detail': '/me/account',
    '/scopedbooks': '/me/private',
    '/plugins': '/me/plugins',
    '/admin/plugins': '/admin/settings/plugins',
    '/admin/themes': '/admin/settings/themes',
};

export default defineNuxtRouteMiddleware((to) => {
    if ((to.path === '/user/detail' || to.path === '/me/account') && 'tab' in to.query) {
        const query = { ...to.query };
        const path = to.query.tab === 'devices' ? '/me/devices' : '/me/account';
        delete query.tab;
        return navigateTo({ path, query, hash: to.hash }, { replace: true });
    }

    if (
        (to.path === '/admin/plugins' || to.path === '/admin/settings/plugins')
        && to.query.section === 'personal'
    ) {
        const query = { ...to.query };
        delete query.section;
        return navigateTo({ path: '/me/plugins', query, hash: to.hash }, { replace: true });
    }

    const path = LEGACY_PATHS[to.path];
    if (!path) return;
    return navigateTo({ path, query: to.query, hash: to.hash }, { replace: true });
});
