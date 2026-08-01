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
                            v-if="item.count"
                            #append
                        >
                            <v-chip
                                size="x-small"
                                variant="outlined"
                            >
                                {{ item.count }}
                            </v-chip>
                        </template>
                    </v-list-item>
                </template>
            </v-list>
        </v-navigation-drawer>
    </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useDisplay } from 'vuetify';
import { useMainStore } from '@/stores/main';
import { buildBuiltinThemeOverlayCss } from '@/utils/builtin-theme-overlay';
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

let injectedStyle = null;
let stopBodyClassWatch = null;

const BODY_THEME_CLASS_PREFIX = 'tb-current-builtin-theme-';
const BODY_MODE_CLASS_PREFIX = 'tb-current-builtin-theme-mode-';

function injectThemeStyles() {
    injectedStyle?.remove();
    const style = document.createElement('style');
    style.setAttribute('data-talebook-theme', props.variant);
    style.textContent = `${themeCss[props.variant]}\n${buildBuiltinThemeOverlayCss(props.variant)}`;
    document.head.appendChild(style);
    injectedStyle = style;
}

function clearThemeBodyClasses() {
    Array.from(document.body.classList).forEach((className) => {
        if (className.startsWith(BODY_THEME_CLASS_PREFIX) || className.startsWith(BODY_MODE_CLASS_PREFIX)) {
            document.body.classList.remove(className);
        }
    });
}

function syncThemeBodyClasses() {
    clearThemeBodyClasses();
    document.body.classList.add(`${BODY_THEME_CLASS_PREFIX}${props.variant}`);
    document.body.classList.add(`${BODY_MODE_CLASS_PREFIX}${store.theme}`);
}

onMounted(() => {
    sidebar.value = display.mdAndUp.value;
    injectThemeStyles();
    stopBodyClassWatch = watch(
        [() => props.variant, () => store.theme],
        syncThemeBodyClasses,
        { immediate: true },
    );
    if (store.user.is_login) {
        const { $backend } = useNuxtApp();
        $backend('/read-done').then((rsp) => {
            if (rsp.err === 'ok') {
                readDoneCount.value = rsp.total || 0;
            }
        }).catch(() => {});
    }
});

onUnmounted(() => {
    stopBodyClassWatch?.();
    clearThemeBodyClasses();
    injectedStyle?.remove();
});

const themeCss = {
    'light-gray': `
        .v-application { background: #111315 !important; color: #e8eaed; font-family: Poppins, Roboto, "Noto Sans SC", system-ui, sans-serif; }
        .v-main { background: #111315 !important; }
        .v-main .v-container { padding: 18px !important; }
        .v-main .v-card { background: #1b1d20 !important; color: #e8eaed !important; border: 1px solid #34383d !important; box-shadow: 0 12px 30px rgba(0,0,0,.28) !important; border-radius: 8px !important; }
        .v-main .text-medium-emphasis { color: #a1a7ae !important; }
        .v-main .v-btn { border-radius: 7px !important; text-transform: none !important; }
        .v-main .v-btn.bg-primary { background: #747b84 !important; color: #fff !important; }
        .v-main .v-avatar.bg-primary { background: #747b84 !important; }
        .v-main .v-btn.v-btn--variant-tonal { background: #2f3338 !important; color: #eceff1 !important; }
        .v-main .v-btn.v-btn--variant-outlined { border-color: #555b63 !important; color: #c4c8ce !important; }
        .v-main .v-btn.v-btn--variant-text { color: #c4c8ce !important; }
        .v-main .v-btn.v-btn--disabled { color: #737a82 !important; opacity: .7; }
        .v-main .text-primary,
        .v-main a { color: #c4c8ce !important; }
        .v-main .v-field { border-radius: 7px !important; }
        .v-main .v-chip.text-primary,
        .v-main .v-chip.v-chip--variant-tonal { background: #2f3338 !important; color: #e5e7eb !important; }
        .upload-btn { background: #747b84 !important; color: #fff !important; box-shadow: 0 10px 24px rgba(0,0,0,.28) !important; }
        .tb-theme-light-gray .tb-theme-appbar { background: #202326 !important; color: #eceff1 !important; border-bottom: 1px solid #33383d; box-shadow: 0 1px 0 rgba(255,255,255,.03) inset !important; }
        .tb-theme-light-gray .tb-theme-drawer { background: #17191c !important; color: #d7dadd !important; border-right: 1px solid #30343a; }
        .tb-theme-light-gray .tb-theme-brand-mark { background: #747b84; color: #fff; box-shadow: none; }
        .tb-theme-light-gray .tb-theme-brand-title { color: #eceff1; }
        .tb-theme-light-gray .tb-theme-icon,
        .tb-theme-light-gray .tb-theme-nav-toggle { color: #d2d6da !important; }
        .tb-theme-light-gray .tb-theme-search-field .v-field { background: #2b2f33 !important; color: #f3f4f6 !important; border: 1px solid #444a50; box-shadow: none !important; }
        .tb-theme-light-gray .tb-theme-search-field .v-field__input { color: #f3f4f6 !important; }
        .tb-theme-light-gray .tb-theme-search-category { color: #e5e7eb !important; margin-right: 6px; }
        .tb-theme-light-gray .v-list { padding-top: 6px !important; }
        .tb-theme-light-gray .v-list-item { min-height: 34px !important; padding-inline: 10px !important; }
        .tb-theme-light-gray .v-list-item__prepend { width: 30px !important; }
        .tb-theme-light-gray .v-list-item__prepend > .v-icon { color: #aeb4bc; font-size: 20px !important; margin-inline-end: 10px !important; }
        .tb-theme-light-gray .v-list-group__items .v-list-item { padding-inline-start: 22px !important; }
        .tb-theme-light-gray .v-list-group__items .v-list-item__prepend { width: 28px !important; }
        .tb-theme-light-gray .v-list-item-title { font-size: 13px !important; font-weight: 500; }
        .tb-theme-light-gray .v-list-item--active { color: #fff; background: #2f3338; }
        .tb-theme-light-gray .v-list-subheader { color: #8f969e !important; font-size: 11px !important; font-weight: 700; letter-spacing: .06em; }
        .tb-theme-light-gray * { scrollbar-width: thin; scrollbar-color: #555b63 #17191c; }
        .tb-theme-light-gray ::-webkit-scrollbar { width: 8px; height: 8px; }
        .tb-theme-light-gray ::-webkit-scrollbar-thumb { background: #555b63; border-radius: 6px; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-application { background: #f2f3f3 !important; color: #2b2f33; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main { background: #f2f3f3 !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main .v-card { background: #ffffff !important; color: #2b2f33 !important; border-color: #d7dadd !important; box-shadow: 0 8px 22px rgba(39,43,48,.08) !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main .text-medium-emphasis { color: #697079 !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main .v-btn.bg-primary { background: #555c64 !important; color: #fff !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main .v-avatar.bg-primary { background: #555c64 !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main .v-btn.v-btn--variant-tonal { background: #e2e5e8 !important; color: #34383d !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main .v-btn.v-btn--variant-outlined { border-color: #b9bec4 !important; color: #41474e !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main .v-btn.v-btn--variant-text,
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main .text-primary,
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main a { color: #41474e !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main .v-chip.text-primary,
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main .v-chip.v-chip--variant-tonal { background: #e6e8ea !important; color: #34383d !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .upload-btn { background: #555c64 !important; color: #fff !important; box-shadow: 0 10px 22px rgba(85,92,100,.22) !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-appbar { background: #f7f8f8 !important; color: #2b2f33 !important; border-bottom-color: #d0d3d6; box-shadow: 0 1px 8px rgba(39,43,48,.06) !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-drawer { background: #eceeef !important; color: #34383d !important; border-right-color: #d0d3d6; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray * { scrollbar-color: #b3b8bf #eceeef; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray ::-webkit-scrollbar-thumb { background: #b3b8bf; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray ::-webkit-scrollbar-track { background: #eceeef; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-brand-mark { background: #555c64; color: #fff; box-shadow: none; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-brand-title { color: #24282d; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-icon,
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-nav-toggle { color: #555c64 !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-search-field .v-field { background: #ffffff !important; border: 1px solid #cfd3d7; color: #2b2f33 !important; box-shadow: 0 1px 2px rgba(39,43,48,.04) !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-search-field .v-field__input { color: #2b2f33 !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-search-field .v-label,
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-search-field .v-icon { color: #697079 !important; opacity: 1; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-search-category { color: #555c64 !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .v-list-item-title { color: #34383d !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .v-list-item__prepend > .v-icon { color: #6f757d; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .v-list-item--active { background: #dfe2e5 !important; color: #2b2f33 !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .v-list-subheader { color: #737a82 !important; }
    `,
    'minimal': `
        .v-application { background: #f6f6ef !important; color: #000; font-family: Verdana, Geneva, sans-serif; font-size: 12px; }
        .v-main { background: #f6f6ef !important; }
        .v-main .v-container { padding: 4px 6px !important; }
        .v-main .v-card { background: #f6f6ef !important; color: #000 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
        .v-main .v-card-title { font-size: 13px !important; line-height: 18px !important; padding: 4px 6px !important; }
        .v-main .v-card-text { font-size: 12px !important; line-height: 16px !important; padding: 4px 6px !important; }
        .v-main .v-row { margin: 0 !important; }
        .v-main .v-col { padding: 3px !important; }
        .v-main .v-btn { border-radius: 0 !important; font-family: Verdana, Geneva, sans-serif !important; font-size: 11px !important; min-height: 22px !important; padding: 0 5px !important; text-transform: none !important; }
        .v-main .v-btn.bg-primary { background: #ff6600 !important; color: #000 !important; }
        .v-main .v-avatar.bg-primary { background: #ff6600 !important; }
        .v-main .v-btn.v-btn--variant-tonal { background: #fff3df !important; color: #000 !important; }
        .v-main .v-btn.v-btn--variant-outlined { border-color: #ff6600 !important; color: #ff6600 !important; }
        .v-main .v-btn.v-btn--variant-text,
        .v-main .text-primary,
        .v-main a { color: #ff6600 !important; }
        .v-main .v-btn.v-btn--disabled { color: #828282 !important; opacity: .75; }
        .v-main .v-chip { border-radius: 0 !important; font-size: 10px !important; height: 18px !important; padding-inline: 4px !important; }
        .v-main .v-chip.text-primary,
        .v-main .v-chip.v-chip--variant-tonal { background: #fff3df !important; color: #ff6600 !important; }
        .v-main .v-field { border-radius: 0 !important; font-size: 12px !important; min-height: 28px !important; }
        .upload-btn { background: #ff6600 !important; color: #000 !important; box-shadow: none !important; }
        .tb-theme-minimal .tb-theme-appbar { background: #ff6600 !important; color: #000 !important; min-height: 28px !important; }
        .tb-theme-minimal .tb-theme-drawer { background: #f6f6ef !important; color: #000 !important; border-right: 1px solid #e6e1c8; font-size: 11px; }
        .tb-theme-minimal .tb-theme-brand-mark { background: #fff; border: 1px solid #fff; border-radius: 0; color: #ff6600; height: 18px; width: 18px; }
        .tb-theme-minimal .tb-theme-brand-title { color: #000; font-size: 13px; font-weight: 700; }
        .tb-theme-minimal .v-list { background: #f6f6ef !important; padding: 2px 0 !important; }
        .tb-theme-minimal .v-list-item { min-height: 20px !important; padding: 0 5px !important; }
        .tb-theme-minimal .v-list-item__content { align-self: center !important; }
        .tb-theme-minimal .v-list-item-title { color: #000 !important; font-family: Verdana, Geneva, sans-serif !important; font-size: 11px !important; line-height: 16px !important; }
        .tb-theme-minimal .v-list-item__prepend { display: none !important; }
        .tb-theme-minimal .v-list-group__items .v-list-item { padding-inline-start: 14px !important; }
        .tb-theme-minimal .v-list-item__append { margin-left: 3px !important; }
        .tb-theme-minimal .v-list-item--active { background: #fff3df !important; color: #000 !important; }
        .tb-theme-minimal .v-list-subheader { color: #828282 !important; font-family: Verdana, Geneva, sans-serif !important; font-size: 10px !important; font-weight: 400 !important; min-height: 18px !important; padding: 0 5px !important; text-transform: lowercase; }
        .tb-theme-minimal .v-chip { border: 0 !important; color: #828282 !important; font-size: 10px !important; height: 14px !important; padding: 0 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-application { background: #1f2118 !important; color: #d8d2b8; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main { background: #1f2118 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .v-card { background: #1f2118 !important; color: #d8d2b8 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .v-card-title,
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .v-card-text { color: #d8d2b8 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .text-medium-emphasis { color: #9c967d !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .v-btn.bg-primary { background: #d35400 !important; color: #111 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .v-avatar.bg-primary { background: #d35400 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .v-btn.v-btn--variant-tonal { background: #3a2a18 !important; color: #ffd0a3 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .v-btn.v-btn--variant-outlined { border-color: #ff8a2a !important; color: #ff8a2a !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .v-btn.v-btn--variant-text,
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .text-primary,
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main a { color: #ff8a2a !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .v-chip.text-primary,
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .v-chip.v-chip--variant-tonal { background: #3a2a18 !important; color: #ffd0a3 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .upload-btn { background: #d35400 !important; color: #111 !important; box-shadow: none !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-minimal .tb-theme-appbar { background: #d35400 !important; color: #111 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-minimal .tb-theme-drawer { background: #181a13 !important; color: #d8d2b8 !important; border-right-color: #3b382a; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-minimal .tb-theme-brand-mark { background: #1f2118; border-color: #1f2118; color: #ff8a2a; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-minimal .tb-theme-brand-title { color: #111; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-minimal .v-list { background: #181a13 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-minimal .v-list-item-title { color: #d8d2b8 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-minimal .v-list-item--active { background: #3a2a18 !important; color: #ffd0a3 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-minimal .v-list-subheader,
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-minimal .v-chip { color: #9c967d !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-hn-search input { background: #2b2d22; border-color: #8b7b56; color: #f4ecd1; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-hn-search button { background: #181a13; border-color: #8b7b56; color: #f4ecd1; }
    `,
    'graphite': `
        .v-application { background: #14171a !important; color: #e7eaed; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif; }
        .v-main { background: #14171a !important; }
        .v-main .v-container { padding: 18px !important; }
        .v-main .v-row { margin: -8px !important; }
        .v-main .v-col { padding: 8px !important; }
        .v-main .v-card { background: #1c2024 !important; color: #e7eaed !important; border: 1px solid #2b3238 !important; box-shadow: 0 1px 2px rgba(0,0,0,.4) !important; border-radius: 8px !important; }
        .v-main .v-card-title { color: #eef1f4; font-size: 16px !important; font-weight: 600; padding: 16px 18px 8px !important; }
        .v-main .v-card-subtitle { color: #97a0aa !important; padding-inline: 18px !important; }
        .v-main .v-card-text { color: #c6ccd3; padding: 12px 18px 18px !important; }
        .v-main .text-medium-emphasis { color: #97a0aa !important; }
        .v-main .v-btn { border-radius: 7px !important; text-transform: none !important; }
        .v-main .v-btn.bg-primary { background: #6f9dd6 !important; color: #0d1013 !important; }
        .v-main .v-avatar.bg-primary { background: #6f9dd6 !important; }
        .v-main .v-btn.v-btn--variant-tonal { background: #23303d !important; color: #bcd4ee !important; }
        .v-main .v-btn.v-btn--variant-outlined { border-color: #3f5a75 !important; color: #9fc2e6 !important; }
        .v-main .v-btn.v-btn--variant-text { color: #8fb4de !important; }
        .v-main .v-btn.v-btn--disabled { color: #6a747e !important; opacity: .7; }
        .v-main .text-primary, .v-main a { color: #8fb4de !important; }
        .v-main .v-field { border-radius: 7px !important; }
        .v-main .v-table { border: 1px solid #2b3238 !important; border-radius: 8px !important; }
        .v-main .v-chip.text-primary, .v-main .v-chip.v-chip--variant-tonal { background: #23303d !important; color: #bcd4ee !important; }
        .upload-btn { background: #6f9dd6 !important; color: #0d1013 !important; box-shadow: 0 10px 24px rgba(111,157,214,.28) !important; }
        .tb-theme-graphite * { scrollbar-width: thin; scrollbar-color: #3f4750 #16191d; }
        .tb-theme-graphite ::-webkit-scrollbar { width: 8px; height: 8px; }
        .tb-theme-graphite ::-webkit-scrollbar-thumb { background: #3f4750; border-radius: 6px; }
        .tb-theme-graphite .tb-theme-appbar { background: #191d21 !important; color: #e7eaed !important; border-bottom: 1px solid #262b31; box-shadow: none !important; }
        .tb-theme-graphite .tb-theme-drawer { background: #16191d !important; color: #c2cad2 !important; border-right: 1px solid #242a30; }
        .tb-theme-graphite .tb-theme-brand-mark { background: #6f9dd6; color: #0d1013; }
        .tb-theme-graphite .tb-theme-brand-title { color: #e7eaed; }
        .tb-theme-graphite .tb-theme-icon, .tb-theme-graphite .tb-theme-nav-toggle { color: #aab3bd !important; }
        .tb-theme-graphite .tb-theme-search-field .v-field { background: #1f242a !important; border: 1px solid #2f353d; box-shadow: none !important; color: #e7eaed !important; }
        .tb-theme-graphite .tb-theme-search-field .v-field__input { color: #e7eaed !important; min-height: 34px !important; }
        .tb-theme-graphite .tb-theme-search-field .v-field__input::placeholder { color: #7f8993 !important; opacity: 1; }
        .tb-theme-graphite .tb-theme-search-field .v-label { color: #7f8993 !important; opacity: 1; }
        .tb-theme-graphite .tb-theme-search-field .v-icon { color: #7f8993 !important; opacity: 1; }
        .tb-theme-graphite .v-list { padding-top: 6px !important; }
        .tb-theme-graphite .v-list-item { min-height: 34px !important; padding-inline: 12px !important; }
        .tb-theme-graphite .v-list-item__prepend { width: 30px !important; }
        .tb-theme-graphite .v-list-item__prepend > .v-icon { color: #7f8993; font-size: 20px !important; margin-inline-end: 10px !important; }
        .tb-theme-graphite .v-list-group__items .v-list-item { padding-inline-start: 22px !important; }
        .tb-theme-graphite .v-list-group__items .v-list-item__prepend { width: 28px !important; }
        .tb-theme-graphite .v-list-item-title { color: #c2cad2 !important; font-size: 13px !important; font-weight: 500; }
        .tb-theme-graphite .v-list-item--active { background: rgba(111,157,214,.12) !important; box-shadow: inset 2px 0 0 #6f9dd6; }
        .tb-theme-graphite .v-list-item--active .v-list-item-title { color: #ffffff !important; font-weight: 600; }
        .tb-theme-graphite .v-list-item--active .v-list-item__prepend > .v-icon { color: #6f9dd6; }
        .tb-theme-graphite .v-list-item__append { color: #6a747e; }
        .tb-theme-graphite .v-list-subheader { color: #6a747e !important; font-size: 11px !important; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-application { background: #eef1f4 !important; color: #1b1f24; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main { background: #eef1f4 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .v-card { background: #ffffff !important; color: #1b1f24 !important; border-color: #d9dee4 !important; box-shadow: 0 1px 2px rgba(15,23,42,.06) !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .v-card-title { color: #14181d !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .v-card-text { color: #3a434d !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .text-medium-emphasis { color: #5f6771 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .v-btn.bg-primary { background: #3f6da3 !important; color: #fff !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .v-avatar.bg-primary { background: #3f6da3 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .v-btn.v-btn--variant-tonal { background: #e3edf7 !important; color: #235489 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .v-btn.v-btn--variant-outlined { border-color: #9dbfe0 !important; color: #235489 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .v-btn.v-btn--variant-text,
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .text-primary,
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main a { color: #235489 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .v-chip.text-primary,
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .v-chip.v-chip--variant-tonal { background: #e3edf7 !important; color: #235489 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .upload-btn { background: #3f6da3 !important; color: #fff !important; box-shadow: 0 10px 22px rgba(63,109,163,.22) !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-appbar { background: #ffffff !important; color: #1b1f24 !important; border-bottom-color: #dde2e8; box-shadow: 0 1px 2px rgba(15,23,42,.05) !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-drawer { background: #f5f7f9 !important; color: #3a434d !important; border-right-color: #e2e6eb; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite * { scrollbar-color: #c3ccd5 #eef1f4; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite ::-webkit-scrollbar-thumb { background: #c3ccd5; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite ::-webkit-scrollbar-track { background: #eef1f4; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-brand-mark { background: #3f6da3; color: #fff; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-brand-title { color: #14181d; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-icon,
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-nav-toggle { color: #3f6da3 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-search-field .v-field { background: #eef1f4 !important; border-color: #d4dae0; color: #1b1f24 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-search-field .v-field__input { color: #1b1f24 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-search-field .v-field__input::placeholder,
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-search-field .v-label,
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-search-field .v-icon { color: #5f6771 !important; opacity: 1; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .v-list-item-title { color: #3a434d !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .v-list-item__prepend > .v-icon { color: #6b7783; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .v-list-item--active { background: rgba(63,109,163,.12) !important; box-shadow: inset 2px 0 0 #3f6da3; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .v-list-item--active .v-list-item-title { color: #235489 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .v-list-item--active .v-list-item__prepend > .v-icon { color: #3f6da3; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .v-list-subheader { color: #6b7580 !important; }
    `,
    'brass': `
        .v-application { background: #1a1815 !important; color: #ece7dd; font-family: "Noto Sans SC", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .v-main { background: #1a1815 !important; }
        .v-main .v-container { padding: 18px !important; }
        .v-main .v-row { margin: -8px !important; }
        .v-main .v-col { padding: 8px !important; }
        .v-main .v-card { background: #232019 !important; color: #ece7dd !important; border: 1px solid #34302a !important; box-shadow: 0 12px 30px rgba(0,0,0,.3) !important; border-radius: 6px !important; }
        .v-main .v-card-title { color: #f4ead6; font-family: Georgia, "Songti SC", "Noto Serif SC", serif; font-size: 17px !important; font-weight: 600; padding: 16px 18px 8px !important; }
        .v-main .v-card-subtitle { color: #a89f90 !important; padding-inline: 18px !important; }
        .v-main .v-card-text { color: #cfc6b6; padding: 12px 18px 18px !important; }
        .v-main .text-medium-emphasis { color: #a89f90 !important; }
        .v-main .v-btn { border-radius: 6px !important; text-transform: none !important; }
        .v-main .v-btn.bg-primary { background: #c99a5b !important; color: #1f1a10 !important; }
        .v-main .v-avatar.bg-primary { background: #c99a5b !important; }
        .v-main .v-btn.v-btn--variant-tonal { background: #332b1d !important; color: #e7d3af !important; }
        .v-main .v-btn.v-btn--variant-outlined { border-color: #6a5636 !important; color: #d8b981 !important; }
        .v-main .v-btn.v-btn--variant-text { color: #d8b981 !important; }
        .v-main .v-btn.v-btn--disabled { color: #776f61 !important; opacity: .7; }
        .v-main .text-primary, .v-main a { color: #d8b981 !important; }
        .v-main .v-field { border-radius: 6px !important; }
        .v-main .v-table { border: 1px solid #34302a !important; border-radius: 6px !important; }
        .v-main .v-chip.text-primary, .v-main .v-chip.v-chip--variant-tonal { background: #332b1d !important; color: #e7d3af !important; }
        .upload-btn { background: #c99a5b !important; color: #1f1a10 !important; box-shadow: 0 10px 24px rgba(201,154,91,.26) !important; }
        .tb-theme-brass * { scrollbar-width: thin; scrollbar-color: #4a4030 #17150f; }
        .tb-theme-brass ::-webkit-scrollbar { width: 8px; height: 8px; }
        .tb-theme-brass ::-webkit-scrollbar-thumb { background: #4a4030; border-radius: 6px; }
        .tb-theme-brass .tb-theme-appbar { background: #1f1c17 !important; color: #ece7dd !important; border-bottom: 1px solid rgba(201,154,91,.55); box-shadow: none !important; }
        .tb-theme-brass .tb-theme-drawer { background: #17150f !important; color: #cabfad !important; border-right: 1px solid #2c281f; }
        .tb-theme-brass .tb-theme-brand-mark { background: transparent; color: #c99a5b; border: 1px solid #c99a5b; font-family: Georgia, "Songti SC", serif; }
        .tb-theme-brass .tb-theme-brand-title { color: #ece7dd; font-family: Georgia, "Songti SC", "Noto Serif SC", serif; letter-spacing: .01em; }
        .tb-theme-brass .tb-theme-icon, .tb-theme-brass .tb-theme-nav-toggle { color: #bcae94 !important; }
        .tb-theme-brass .tb-theme-search-field .v-field { background: #262219 !important; border: 1px solid #3a3428; box-shadow: none !important; color: #ece7dd !important; }
        .tb-theme-brass .tb-theme-search-field .v-field__input { color: #ece7dd !important; min-height: 34px !important; }
        .tb-theme-brass .tb-theme-search-field .v-field__input::placeholder { color: #8a8069 !important; opacity: 1; }
        .tb-theme-brass .tb-theme-search-field .v-label { color: #8a8069 !important; opacity: 1; }
        .tb-theme-brass .tb-theme-search-field .v-icon { color: #8a8069 !important; opacity: 1; }
        .tb-theme-brass .v-list { padding-top: 6px !important; }
        .tb-theme-brass .v-list-item { min-height: 34px !important; padding-inline: 12px !important; }
        .tb-theme-brass .v-list-item__prepend { width: 30px !important; }
        .tb-theme-brass .v-list-item__prepend > .v-icon { color: #8a8069; font-size: 20px !important; margin-inline-end: 10px !important; }
        .tb-theme-brass .v-list-group__items .v-list-item { padding-inline-start: 22px !important; }
        .tb-theme-brass .v-list-group__items .v-list-item__prepend { width: 28px !important; }
        .tb-theme-brass .v-list-item-title { color: #cabfad !important; font-size: 13px !important; font-weight: 500; }
        .tb-theme-brass .v-list-item--active { background: rgba(201,154,91,.12) !important; }
        .tb-theme-brass .v-list-item--active .v-list-item-title { color: #f4ead6 !important; font-weight: 600; }
        .tb-theme-brass .v-list-item--active .v-list-item__prepend > .v-icon { color: #c99a5b; }
        .tb-theme-brass .v-list-item__append { color: #776f61; }
        .tb-theme-brass .v-list-subheader { color: #8a8069 !important; font-size: 11px !important; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-application { background: #f2efe8 !important; color: #2a251d; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main { background: #f2efe8 !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .v-card { background: #fbf9f4 !important; color: #2a251d !important; border-color: #e2dccc !important; box-shadow: 0 1px 2px rgba(60,50,30,.07) !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .v-card-title { color: #2a251d !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .v-card-text { color: #4a4436 !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .text-medium-emphasis { color: #7a7263 !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .v-btn.bg-primary { background: #a9773a !important; color: #fff !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .v-avatar.bg-primary { background: #a9773a !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .v-btn.v-btn--variant-tonal { background: #efe4cf !important; color: #7a5320 !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .v-btn.v-btn--variant-outlined { border-color: #cbb384 !important; color: #7a5320 !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .v-btn.v-btn--variant-text,
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .text-primary,
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main a { color: #8a5a1f !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .v-chip.text-primary,
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .v-chip.v-chip--variant-tonal { background: #efe4cf !important; color: #7a5320 !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .upload-btn { background: #a9773a !important; color: #fff !important; box-shadow: 0 10px 22px rgba(169,119,58,.22) !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-appbar { background: #fbf9f4 !important; color: #2a251d !important; border-bottom: 1px solid rgba(169,119,58,.6); box-shadow: 0 1px 2px rgba(60,50,30,.05) !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-drawer { background: #efebe1 !important; color: #4a4436 !important; border-right-color: #e2dccc; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass * { scrollbar-color: #cdbb95 #efebe1; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass ::-webkit-scrollbar-thumb { background: #cdbb95; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass ::-webkit-scrollbar-track { background: #efebe1; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-brand-mark { background: transparent; color: #a9773a; border: 1px solid #a9773a; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-brand-title { color: #2a251d; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-icon,
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-nav-toggle { color: #a9773a !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-search-field .v-field { background: #f2efe8 !important; border-color: #ddd5c4; color: #2a251d !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-search-field .v-field__input { color: #2a251d !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-search-field .v-field__input::placeholder,
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-search-field .v-label,
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-search-field .v-icon { color: #7a7263 !important; opacity: 1; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .v-list-item-title { color: #4a4436 !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .v-list-item__prepend > .v-icon { color: #8a8069; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .v-list-item--active { background: rgba(169,119,58,.16) !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .v-list-item--active .v-list-item-title { color: #7a5320 !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .v-list-item--active .v-list-item__prepend > .v-icon { color: #a9773a; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .v-list-subheader { color: #8a8069 !important; }
    `,
    'warm-red': `
        .v-application { background: #f4f2ec !important; color: #2a2622; font-family: "Noto Sans SC", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .v-main { background: #f4f2ec !important; }
        .v-main .v-container { padding: 18px !important; }
        .v-main .v-row { margin: -8px !important; }
        .v-main .v-col { padding: 8px !important; }
        .v-main .v-card { background: #fbfaf6 !important; color: #2a2622 !important; border: 1px solid #ddd8cc !important; box-shadow: 0 1px 2px rgba(60,50,40,.06) !important; border-radius: 3px !important; }
        .v-main .v-card-title { color: #2a2622; font-family: Georgia, "Songti SC", "Noto Serif SC", serif; font-size: 17px !important; font-weight: 600; padding: 16px 18px 8px !important; }
        .v-main .v-card-subtitle { color: #857e70 !important; padding-inline: 18px !important; }
        .v-main .v-card-text { color: #4a453c; padding: 12px 18px 18px !important; }
        .v-main .text-medium-emphasis { color: #857e70 !important; }
        .v-main .v-btn { border-radius: 3px !important; text-transform: none !important; }
        .v-main .v-btn.bg-primary { background: #8f3a34 !important; color: #fbfaf6 !important; }
        .v-main .v-avatar.bg-primary { background: #8f3a34 !important; }
        .v-main .v-btn.v-btn--variant-tonal { background: #f0e2e0 !important; color: #8f3a34 !important; }
        .v-main .v-btn.v-btn--variant-outlined { border-color: #d3a9a4 !important; color: #8f3a34 !important; }
        .v-main .v-btn.v-btn--variant-text { color: #8f3a34 !important; }
        .v-main .v-btn.v-btn--disabled { color: #a49c8b !important; opacity: .7; }
        .v-main .text-primary, .v-main a { color: #8f3a34 !important; }
        .v-main .v-field { border-radius: 3px !important; }
        .v-main .v-table { border: 1px solid #ddd8cc !important; border-radius: 3px !important; }
        .v-main .v-chip.text-primary, .v-main .v-chip.v-chip--variant-tonal { background: #f0e2e0 !important; color: #8f3a34 !important; }
        .upload-btn { background: #8f3a34 !important; color: #fbfaf6 !important; box-shadow: 0 10px 22px rgba(143,58,52,.22) !important; }
        .tb-theme-warm-red * { scrollbar-width: thin; scrollbar-color: #c9c2b1 #efece3; }
        .tb-theme-warm-red ::-webkit-scrollbar { width: 8px; height: 8px; }
        .tb-theme-warm-red ::-webkit-scrollbar-thumb { background: #c9c2b1; border-radius: 6px; }
        .tb-theme-warm-red .tb-theme-appbar { background: #fbfaf6 !important; color: #2a2622 !important; border-bottom: 1px solid #ddd8cc; box-shadow: 0 1px 2px rgba(60,50,40,.05) !important; }
        .tb-theme-warm-red .tb-theme-drawer { background: #efece3 !important; color: #4a453c !important; border-right: 1px solid #ddd8cc; }
        .tb-theme-warm-red .tb-theme-brand-mark { background: #8f3a34; color: #fbfaf6; }
        .tb-theme-warm-red .tb-theme-brand-title { color: #2a2622; font-family: Georgia, "Songti SC", "Noto Serif SC", serif; }
        .tb-theme-warm-red .tb-theme-icon, .tb-theme-warm-red .tb-theme-nav-toggle { color: #8f3a34 !important; }
        .tb-theme-warm-red .tb-theme-search-field .v-field { background: #f0eee6 !important; border: 1px solid #d9d3c5; box-shadow: none !important; color: #2a2622 !important; }
        .tb-theme-warm-red .tb-theme-search-field .v-field__input { color: #2a2622 !important; min-height: 34px !important; }
        .tb-theme-warm-red .tb-theme-search-field .v-field__input::placeholder { color: #857e70 !important; opacity: 1; }
        .tb-theme-warm-red .tb-theme-search-field .v-label { color: #857e70 !important; opacity: 1; }
        .tb-theme-warm-red .tb-theme-search-field .v-icon { color: #857e70 !important; opacity: 1; }
        .tb-theme-warm-red .v-list { padding-top: 4px !important; }
        .tb-theme-warm-red .v-list-item { min-height: 32px !important; padding-inline: 14px !important; border-bottom: 1px dotted #d7d0bf; }
        .tb-theme-warm-red .v-list-item__prepend { width: 30px !important; }
        .tb-theme-warm-red .v-list-item__prepend > .v-icon { color: #a49c8b; font-size: 19px !important; margin-inline-end: 10px !important; }
        .tb-theme-warm-red .v-list-group__items .v-list-item { padding-inline-start: 24px !important; }
        .tb-theme-warm-red .v-list-group__items .v-list-item__prepend { width: 28px !important; }
        .tb-theme-warm-red .v-list-item-title { color: #4a453c !important; font-size: 13px !important; font-weight: 500; }
        .tb-theme-warm-red .v-list-item--active { background: transparent !important; }
        .tb-theme-warm-red .v-list-item--active .v-list-item-title { color: #8f3a34 !important; font-weight: 700; }
        .tb-theme-warm-red .v-list-item--active .v-list-item__prepend > .v-icon { color: #8f3a34; }
        .tb-theme-warm-red .v-list-item__append { color: #857e70; }
        .tb-theme-warm-red .v-list-subheader { color: #a49c8b !important; font-size: 11px !important; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; border-bottom: 0 !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-application { background: #201d18 !important; color: #ece7dd; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main { background: #201d18 !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .v-card { background: #2a251f !important; color: #ece7dd !important; border-color: #3a342b !important; box-shadow: 0 8px 22px rgba(0,0,0,.34) !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .v-card-title { color: #ece7dd !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .v-card-text { color: #cfc6b6 !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .text-medium-emphasis { color: #a49c8b !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .v-btn.bg-primary { background: #b5524a !important; color: #201d18 !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .v-avatar.bg-primary { background: #b5524a !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .v-btn.v-btn--variant-tonal { background: #3a2624 !important; color: #e9b6b1 !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .v-btn.v-btn--variant-outlined { border-color: #7a463f !important; color: #e0938c !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .v-btn.v-btn--variant-text,
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .text-primary,
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main a { color: #e0938c !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .v-chip.text-primary,
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .v-chip.v-chip--variant-tonal { background: #3a2624 !important; color: #e9b6b1 !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .upload-btn { background: #b5524a !important; color: #201d18 !important; box-shadow: 0 10px 22px rgba(181,82,74,.28) !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-appbar { background: #262019 !important; color: #ece7dd !important; border-bottom-color: #3a342b; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-drawer { background: #1c1914 !important; color: #cabfad !important; border-right-color: #33302a; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red * { scrollbar-color: #574b3f #1c1914; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red ::-webkit-scrollbar-thumb { background: #574b3f; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red ::-webkit-scrollbar-track { background: #1c1914; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-brand-mark { background: #b5524a; color: #201d18; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-brand-title { color: #ece7dd; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-icon,
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-nav-toggle { color: #d06a62 !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-search-field .v-field { background: #2a251f !important; border-color: #3a342b; color: #ece7dd !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-search-field .v-field__input { color: #ece7dd !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-search-field .v-field__input::placeholder,
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-search-field .v-label,
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-search-field .v-icon { color: #a49c8b !important; opacity: 1; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .v-list-item { border-bottom-color: #33302a; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .v-list-item-title { color: #cabfad !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .v-list-item__prepend > .v-icon { color: #8a8069; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .v-list-item--active .v-list-item-title { color: #e58a82 !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .v-list-item--active .v-list-item__prepend > .v-icon { color: #d06a62; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .v-list-subheader { color: #8a8069 !important; }
    `,
};
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
