import { computed } from 'vue';

export interface PrimaryNavigationItem {
    key: string;
    icon?: string;
    href?: string;
    activePrefix?: string;
    text?: string;
    heading?: string;
    badge?: string;
    count?: number | string;
    target?: string;
    groups?: PrimaryNavigationItem[];
    links?: PrimaryNavigationItem[];
}

export function isPrimaryNavigationItemActive(item: PrimaryNavigationItem, path: string): boolean | undefined {
    if (!item.activePrefix) return undefined;
    return path === item.activePrefix || path.startsWith(`${item.activePrefix}/`);
}

export function usePrimaryNavigation(store: ReturnType<typeof useMainStore>, t: (key: string) => string) {
    return computed<PrimaryNavigationItem[]>(() => {
        const items: PrimaryNavigationItem[] = [
            { key: 'home', icon: 'mdi-home', href: '/', text: t('navigation.home') },
        ];

        if (store.user.is_login) {
            items.push({
                key: 'my-reading',
                icon: 'mdi-bookshelf',
                href: '/me/shelf',
                activePrefix: '/me',
                text: t('navigation.myReading'),
            });
        }

        items.push(
            { key: 'library', icon: 'mdi-book-open-page-variant', href: '/library/local', activePrefix: '/library', text: t('navigation.libraryBrowse') },
            { key: 'audios', icon: 'mdi-book-music', href: '/audios', text: t('navigation.audiobooks'), badge: t('audiobook.beta') },
        );

        if (store.user.is_admin) {
            items.push({
                key: 'admin',
                icon: 'mdi-cog',
                text: t('navigation.admin'),
                groups: [
                    { key: 'settings', icon: 'mdi-cog', href: '/admin/settings/general', activePrefix: '/admin/settings', text: t('navigation.settings') },
                    { key: 'users', icon: 'mdi-human-greeting', href: '/admin/users', text: t('navigation.users') },
                    { key: 'books', icon: 'mdi-library-shelves', href: '/admin/books', text: t('navigation.books') },
                    { key: 'audio-jobs', icon: 'mdi-playlist-music', href: '/audio-jobs', text: t('navigation.audiobookJobs') },
                    { key: 'imports', icon: 'mdi-import', href: '/admin/imports', text: t('navigation.import') },
                    { key: 'logs', icon: 'mdi-text-box-outline', href: '/admin/logs', text: t('navigation.systemLogs') },
                ],
            });
        }

        items.push(
            { key: 'categories', heading: t('navigation.categories') },
            { key: 'nav', icon: 'mdi-widgets', href: '/nav', text: t('navigation.browse'), count: store.sys.books },
            { key: 'publisher', icon: 'mdi-home-group', href: '/publisher', text: t('navigation.publishers'), count: store.sys.publishers },
            { key: 'author', icon: 'mdi-human-greeting', href: '/author', text: t('navigation.authors'), count: store.sys.authors },
            { key: 'tag', icon: 'mdi-tag-heart', href: '/tag', text: t('navigation.tags'), count: store.sys.tags },
            { key: 'format', icon: 'mdi-file', href: '/format', text: t('navigation.formats'), count: store.sys.formats },
            {
                key: 'secondary-categories',
                target: '',
                links: [
                    { key: 'series', icon: 'mdi-library-shelves', href: '/series', text: t('navigation.series'), count: store.sys.series },
                    { key: 'rating', icon: 'mdi-star-half', href: '/rating', text: t('navigation.ratings') },
                    { key: 'hot', icon: 'mdi-trending-up', href: '/hot', text: t('navigation.hot') },
                    { key: 'recent', icon: 'mdi-history', href: '/recent', text: t('navigation.recent') },
                ],
            },
        );

        if (store.sys.friends?.length) {
            items.push(
                { key: 'friends', heading: t('messages.friendshipLinks') },
                {
                    key: 'friend-links',
                    target: '_blank',
                    links: store.sys.friends.map((friend: PrimaryNavigationItem, index: number) => ({
                        key: `friend-${index}`,
                        icon: friend.icon || 'mdi-open-in-new',
                        href: friend.href,
                        text: friend.text,
                    })),
                },
            );
        }

        return items;
    });
}
