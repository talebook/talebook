<template>
    <div :class="['tb-theme-header', `tb-theme-${variant}`, modeClass, { 'tb-theme-rail': miniVariant }]">
        <v-app-bar
            class="tb-theme-appbar"
            :density="isMinimal ? 'default' : 'compact'"
            :order="0"
            :height="isMinimal ? 28 : undefined"
            :elevation="isMinimal ? 0 : 1"
        >
            <v-btn
                icon
                class="tb-theme-nav-toggle"
                @click.stop="toggleDrawer"
            >
                <v-avatar
                    v-if="isLightGray"
                    class="tb-theme-avatar-toggle"
                    size="34"
                    :image="store.user.is_login ? store.user.avatar : ''"
                >
                    <v-icon v-if="!store.user.avatar">
                        mdi-account-circle
                    </v-icon>
                </v-avatar>
                <v-icon v-else>
                    mdi-menu
                </v-icon>
            </v-btn>

            <button
                class="tb-theme-brand"
                type="button"
                @click="router.push('/')"
            >
                <span class="tb-theme-brand-mark">{{ brandMark }}</span>
                <span class="tb-theme-brand-title">{{ store.sys.title }}</span>
            </button>

            <v-spacer />

            <div
                v-if="display.smAndUp.value"
                class="tb-theme-search"
            >
                <form
                    v-if="isMinimal"
                    class="tb-theme-hn-search"
                    @submit.prevent="doSearch"
                >
                    <input
                        v-model="search"
                        type="search"
                        :aria-label="t('common.search')"
                    >
                    <button type="submit">
                        {{ t('common.search') }}
                    </button>
                </form>
                <v-text-field
                    v-else
                    v-model="search"
                    class="tb-theme-search-field"
                    density="compact"
                    hide-details
                    :label="t('common.search')"
                    :prepend-inner-icon="isLightGray ? undefined : 'mdi-magnify'"
                    :variant="isLightGray ? 'solo-inverted' : 'solo'"
                    @keyup.enter="doSearch"
                >
                    <template
                        v-if="isLightGray"
                        #prepend-inner
                    >
                        <v-menu>
                            <template #activator="{ props: menuProps }">
                                <v-btn
                                    v-bind="menuProps"
                                    class="tb-theme-search-category"
                                    size="x-small"
                                    variant="text"
                                >
                                    {{ activeSearchCategoryLabel }}
                                </v-btn>
                            </template>
                            <v-list density="compact">
                                <v-list-item
                                    v-for="category in searchCategories"
                                    :key="category.value"
                                    :active="category.value === searchCategory"
                                    @click="searchCategory = category.value"
                                >
                                    <v-list-item-title>{{ category.label }}</v-list-item-title>
                                </v-list-item>
                            </v-list>
                        </v-menu>
                    </template>
                </v-text-field>
            </div>

            <v-btn
                v-if="!display.smAndUp.value"
                icon
                class="tb-theme-icon"
                @click="mobileSearch = !mobileSearch"
            >
                <v-icon>mdi-magnify</v-icon>
            </v-btn>
            <v-btn
                icon
                class="tb-theme-icon"
                @click="store.toggleTheme"
            >
                <v-icon>{{ store.theme === 'light' ? 'mdi-weather-night' : 'mdi-weather-sunny' }}</v-icon>
            </v-btn>
            <v-menu>
                <template #activator="{ props }">
                    <v-btn
                        v-bind="props"
                        icon
                        class="tb-theme-icon"
                    >
                        <v-icon>mdi-translate</v-icon>
                    </v-btn>
                </template>
                <v-list density="compact">
                    <v-list-item
                        v-for="localeItem in locales"
                        :key="localeItem.code"
                        :active="localeItem.code === locale"
                        @click="setLocale(localeItem.code)"
                    >
                        <template #prepend>
                            <v-icon>{{ localeItem.code === locale ? 'mdi-check' : 'mdi-translate' }}</v-icon>
                        </template>
                        <v-list-item-title>{{ localeItem.name }}</v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-menu>
            <v-menu v-if="store.user.is_login">
                <template #activator="{ props }">
                    <v-btn
                        v-bind="props"
                        class="tb-theme-user"
                        variant="text"
                    >
                        <v-avatar
                            size="28"
                            :image="store.user.avatar"
                        />
                        <span v-if="display.mdAndUp.value">{{ store.user.nickname }}</span>
                    </v-btn>
                </template>
                <v-list density="compact">
                    <v-list-item
                        to="/user/detail"
                        :title="t('messages.userCenter')"
                        prepend-icon="mdi-account-box"
                    />
                    <v-list-item
                        to="/user/history"
                        :title="t('messages.readingHistory')"
                        prepend-icon="mdi-history"
                    />
                    <v-list-item
                        v-if="store.user.is_admin"
                        to="/admin/settings"
                        :title="t('messages.adminEntry')"
                        prepend-icon="mdi-console"
                    />
                    <v-divider />
                    <v-list-item
                        to="/logout"
                        :title="t('messages.logout')"
                        prepend-icon="mdi-exit-to-app"
                    />
                </v-list>
            </v-menu>
            <v-btn
                v-else
                class="tb-theme-login"
                to="/login"
                variant="flat"
            >
                {{ t('messages.pleaseLogin') }}
            </v-btn>

            <template
                v-if="mobileSearch"
                #extension
            >
                <v-form
                    class="tb-theme-mobile-search"
                    @submit.prevent="doSearch"
                >
                    <v-text-field
                        v-model="search"
                        density="compact"
                        hide-details
                        prepend-inner-icon="mdi-magnify"
                        :label="t('common.search')"
                        variant="solo"
                    />
                </v-form>
            </template>
        </v-app-bar>

        <v-navigation-drawer
            v-model="sidebar"
            class="tb-theme-drawer"
            :order="2"
            mobile-breakpoint="md"
            :rail="isLightGray && miniVariant"
            :rail-width="64"
            :width="drawerWidth"
        >
            <v-list density="compact">
                <template
                    v-for="item in navItems"
                    :key="item.key"
                >
                    <v-list-subheader v-if="item.heading">
                        {{ item.heading }}
                    </v-list-subheader>
                    <v-list-group
                        v-else-if="item.groups"
                        :value="item.text"
                    >
                        <template #activator="{ props }">
                            <v-list-item
                                v-bind="props"
                                :prepend-icon="isMinimal ? undefined : item.icon"
                                :title="item.text"
                            />
                        </template>
                        <v-list-item
                            v-for="link in item.groups"
                            :key="link.href"
                            :to="link.href"
                            :title="link.text"
                            :prepend-icon="isMinimal ? undefined : link.icon"
                        />
                    </v-list-group>
                    <div
                        v-else-if="item.links"
                        class="tb-theme-link-grid"
                    >
                        <v-list-item
                            v-for="link in item.links"
                            :key="link.href || link.text"
                            :to="item.target ? undefined : link.href"
                            :href="item.target ? link.href : undefined"
                            :target="item.target"
                            :title="link.text"
                            :prepend-icon="isMinimal ? undefined : link.icon"
                        />
                    </div>
                    <v-list-item
                        v-else
                        :to="item.href || undefined"
                        :title="item.text"
                        :prepend-icon="isMinimal ? undefined : item.icon"
                    >
                        <template
                            v-if="item.badge || item.count"
                            #append
                        >
                            <v-chip
                                size="x-small"
                                :color="item.badge ? 'amber-darken-3' : undefined"
                                :variant="item.badge ? 'tonal' : 'outlined'"
                                :data-testid="item.badge ? 'audiobook-nav-beta' : undefined"
                            >
                                {{ item.badge || item.count }}
                            </v-chip>
                        </template>
                    </v-list-item>
                </template>
            </v-list>
        </v-navigation-drawer>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useDisplay } from 'vuetify';
import { useMainStore } from '@/stores/main';
import { useI18n } from '#i18n';

const props = defineProps({
    variant: {
        type: String,
        required: true,
        validator: value => ['light-gray', 'minimal', 'graphite', 'brass', 'warm-red'].includes(value),
    },
});

const store = useMainStore();
const router = useRouter();
const display = useDisplay();
const { locale, locales, setLocale, t } = useI18n();

const sidebar = ref(true);
const miniVariant = ref(false);
const mobileSearch = ref(false);
const search = ref('');
const searchCategory = ref('all');
const readDoneCount = ref(0);

const isLightGray = computed(() => props.variant === 'light-gray');
const isMinimal = computed(() => props.variant === 'minimal');
const modeClass = computed(() => `tb-theme-mode-${store.theme}`);
const drawerWidth = computed(() => {
    if (props.variant === 'light-gray') return 240;
    if (props.variant === 'minimal') return 190;
    if (props.variant === 'graphite') return 224;
    if (props.variant === 'brass') return 224;
    if (props.variant === 'warm-red') return 230;
    return 236;
});

const searchCategories = computed(() => [
    { value: 'all', label: t('common.search') },
    { value: 'title', label: t('book.title') },
    { value: 'author', label: t('book.author') },
    { value: 'isbn', label: 'ISBN' },
    { value: 'tag', label: t('navigation.tags') },
]);

const activeSearchCategoryLabel = computed(() => {
    return searchCategories.value.find(category => category.value === searchCategory.value)?.label || t('common.search');
});

const brandMark = computed(() => {
    return '书';
});

const navItems = computed(() => {
    const items = [
        { key: 'home', icon: 'mdi-home', href: '/', text: t('navigation.home') },
        { key: 'library', icon: 'mdi-book', href: '/library', text: t('navigation.localLibrary') },
        { key: 'network', icon: 'mdi-cloud-search', href: '/network', text: t('navigation.networkLibrary') },
        { key: 'audios', icon: 'mdi-book-music', href: '/audios', text: t('navigation.audiobooks'), badge: t('audiobook.beta') },
    ];
    if (store.user.is_admin) {
        items.push({
            key: 'admin',
            icon: 'mdi-cog',
            text: t('navigation.admin'),
            groups: [
                { icon: 'mdi-cog', href: '/admin/settings', text: t('navigation.settings') },
                { icon: 'mdi-human-greeting', href: '/admin/users', text: t('navigation.users') },
                { icon: 'mdi-library-shelves', href: '/admin/books', text: t('navigation.books') },
                { icon: 'mdi-playlist-music', href: '/audio-jobs', text: t('navigation.audiobookJobs') },
                { icon: 'mdi-import', href: '/admin/imports', text: t('navigation.import') },
                { icon: 'mdi-book-cog', href: '/admin/booksources', text: t('navigation.bookSources') },
                { icon: 'mdi-palette', href: '/admin/themes', text: t('navigation.themes') },
                { icon: 'mdi-text-box-outline', href: '/admin/logs', text: t('navigation.systemLogs') },
            ],
        });
    }
    items.push(
        { key: 'categories', heading: t('navigation.categories') },
    );
    if (store.user.is_login) {
        items.push({
            key: 'read-books',
            icon: 'mdi-check-circle',
            href: '/user/history?tab=finished',
            text: t('navigation.readBooks'),
            count: readDoneCount.value,
        });
    }
    items.push(
        { key: 'nav', icon: 'mdi-widgets', href: '/nav', text: t('navigation.browse'), count: store.sys.books },
        { key: 'publisher', icon: 'mdi-home-group', href: '/publisher', text: t('navigation.publishers'), count: store.sys.publishers },
        { key: 'author', icon: 'mdi-human-greeting', href: '/author', text: t('navigation.authors'), count: store.sys.authors },
        { key: 'tag', icon: 'mdi-tag-heart', href: '/tag', text: t('navigation.tags'), count: store.sys.tags },
        { key: 'format', icon: 'mdi-file', href: '/format', text: t('navigation.formats'), count: store.sys.formats },
        { key: 'series', icon: 'mdi-library-shelves', href: '/series', text: t('navigation.series'), count: store.sys.series },
        { key: 'rating', icon: 'mdi-star-half', href: '/rating', text: t('navigation.ratings') },
        { key: 'hot', icon: 'mdi-trending-up', href: '/hot', text: t('navigation.hot') },
        { key: 'recent', icon: 'mdi-history', href: '/recent', text: t('navigation.recent') },
    );
    if (store.sys.friends?.length > 0) {
        items.push(
            { key: 'friends', heading: t('messages.friendshipLinks') },
            {
                key: 'friend-links',
                target: '_blank',
                links: store.sys.friends.map(friend => ({
                    icon: 'mdi-open-in-new',
                    href: friend.href,
                    text: friend.text,
                })),
            },
        );
    }
    if (store.sys.show_sidebar_sys !== false) {
        items.push(
            { key: 'system', heading: t('messages.system') },
            { key: 'version', icon: 'mdi-history', href: '', text: t('messages.systemVersion'), count: store.sys.version },
            { key: 'users', icon: 'mdi-human', href: '', text: t('messages.userCount'), count: store.sys.users },
            { key: 'opds', icon: 'mdi-cellphone', href: '/opds-readme', text: t('messages.opdsIntroduction'), count: 'OPDS' },
            { key: 'webdav', icon: 'mdi-cloud-sync', href: '/webdav-readme', text: t('messages.webdavIntroduction'), count: 'WebDAV' },
        );
    }
    return items;
});

function toggleDrawer() {
    if (isLightGray.value && sidebar.value) {
        miniVariant.value = !miniVariant.value;
        return;
    }
    sidebar.value = !sidebar.value;
}

function doSearch() {
    let keyword = search.value.trim();
    if (!keyword) return;
    if (isLightGray.value && searchCategory.value !== 'all') {
        keyword = `${searchCategory.value}:${keyword.replace(/^(title:|author:|isbn:|tag:)/i, '').trim()}`;
    }
    router.push({ path: '/search', query: { name: keyword } });
}

onMounted(() => {
    sidebar.value = display.mdAndUp.value;
    if (store.user.is_login) {
        const { $backend } = useNuxtApp();
        $backend('/read-done').then((rsp) => {
            if (rsp.err === 'ok') {
                readDoneCount.value = rsp.total || 0;
            }
        }).catch(() => {});
    }
});

</script>

<style scoped>
.tb-theme-brand {
    align-items: center;
    background: transparent;
    border: 0;
    cursor: pointer;
    display: inline-flex;
    gap: 8px;
    min-width: 0;
    padding: 0 10px 0 2px;
}

.tb-theme-brand-mark {
    align-items: center;
    border-radius: 5px;
    display: inline-flex;
    font-size: 12px;
    font-weight: 800;
    height: 24px;
    justify-content: center;
    width: 24px;
}

.tb-theme-brand-title {
    font-size: 15px;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.v-app-bar :deep(.v-toolbar__content) {
    position: relative;
}
.tb-theme-search {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    max-width: 560px;
    min-width: 240px;
    width: 40vw;
}

.tb-theme-nav-toggle,
.tb-theme-icon {
    flex: 0 0 auto;
}

.tb-theme-user {
    display: inline-flex;
    gap: 6px;
    min-width: 0;
    padding-inline: 6px;
}

.tb-theme-login {
    margin-right: 8px;
}

.tb-theme-mobile-search {
    padding: 8px 12px;
    width: 100%;
}

.tb-theme-hn-search {
    align-items: center;
    display: flex;
    gap: 3px;
}

.tb-theme-hn-search input {
    background: #fff;
    border: 1px solid #000;
    border-radius: 0;
    color: #000;
    font-family: Verdana, Geneva, sans-serif;
    font-size: 11px;
    height: 19px;
    max-width: 220px;
    padding: 1px 3px;
    width: 24vw;
}

.tb-theme-hn-search button {
    background: #f6f6ef;
    border: 1px solid #000;
    border-radius: 0;
    color: #000;
    font-family: Verdana, Geneva, sans-serif;
    font-size: 11px;
    height: 19px;
    line-height: 16px;
    padding: 0 5px;
}

.tb-theme-minimal :deep(.v-toolbar__content) {
    height: 28px !important;
    padding-inline: 2px !important;
}

.tb-theme-minimal .tb-theme-brand,
.tb-theme-minimal .tb-theme-icon,
.tb-theme-minimal .tb-theme-nav-toggle {
    height: 24px !important;
    min-height: 24px !important;
    width: 24px;
}

.tb-theme-minimal .tb-theme-brand {
    width: auto;
}

.tb-theme-minimal :deep(.v-btn__content .v-icon) {
    font-size: 16px;
}

.tb-theme-light-gray :deep(.v-toolbar__content) {
    min-height: 48px;
}

.tb-theme-light-gray.tb-theme-rail :deep(.v-list-subheader),
.tb-theme-light-gray.tb-theme-rail :deep(.v-list-item-title),
.tb-theme-light-gray.tb-theme-rail :deep(.v-list-item__append),
.tb-theme-light-gray.tb-theme-rail :deep(.v-list-group__items) {
    display: none !important;
}

.tb-theme-light-gray.tb-theme-rail :deep(.v-list-item) {
    justify-content: center;
    padding-inline: 0 !important;
}

.tb-theme-light-gray.tb-theme-rail :deep(.v-list-item__prepend) {
    justify-content: center;
    width: 64px !important;
}

.tb-theme-light-gray.tb-theme-rail :deep(.v-list-item__prepend > .v-icon) {
    margin-inline-end: 0 !important;
}
</style>
