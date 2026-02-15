<template>
    <div>
        <v-app-bar
            class="px-0"
            :color="store.theme === 'light' ? 'blue' : undefined"
            density="compact"
            :theme="store.theme"
            :order="0"
            extension-height="64"
        >
            <template
                v-if="btn_search && display.xs.value"
                #extension
            >
                <v-container fluid>
                    <v-form @submit.prevent="do_search">
                        <v-row>
                            <v-col cols="9">
                                <v-text-field
                                    ref="mobile_search"
                                    v-model="search"
                                    class="ma-0 pa-0"
                                    hide-details
                                    single-line
                                    variant="solo-inverted"
                                    :theme="store.theme"
                                />
                            </v-col>
                            <v-col cols="3">
                                <v-btn
                                    :theme="store.theme"
                                    rounded
                                    color="primary"
                                    @click="do_mobile_search"
                                >
                                    {{ $t('common.search') }}
                                </v-btn>
                            </v-col>
                        </v-row>
                    </v-form>
                </v-container>
            </template>

            <v-app-bar-nav-icon @click.stop="sidebar = !sidebar" />
            <v-toolbar-title
                class="ml-2 mr-4 align-center"
                style="cursor: pointer"
                @click="router.push('/')"
            >
                {{ store.sys.title }}
            </v-toolbar-title>

            <template v-if="display.smAndUp.value">
                <div class="search-wrapper">
                    <v-text-field
                        ref="search_input"
                        v-model="search"
                        flat
                        variant="solo-inverted"
                        hide-details
                        prepend-inner-icon="mdi-magnify"
                        name="name"
                        :label="$t('common.search')"
                        class="d-none d-sm-flex search-field"
                        :theme="store.theme"
                        :bg-color="store.theme === 'light' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.3)'"
                        @keyup.enter="do_search"
                    />
                </div>
            </template>

            <v-btn
                v-else
                icon
                class="d-flex d-sm-none"
                @click="btn_search = !btn_search"
            >
                <v-icon>mdi-magnify</v-icon>
            </v-btn>

            <template v-if="err == 'ok'">
                <template v-if="store.user.is_login">
                    <v-menu
                        v-if="messages.length > 0"
                        offset-y
                        right
                        :close-on-content-click="false"
                    >
                        <template #activator="{ props }">
                            <v-btn
                                v-bind="props"
                                icon
                            >
                                <v-icon>mdi-bell</v-icon>
                            </v-btn>
                        </template>
                        <v-list
                            lines="three"
                            density="compact"
                            width="400"
                        >
                            <v-list-item
                                v-for="(msg, idx) in messages"
                                :key="msg.id"
                            >
                                <template #prepend>
                                    <v-avatar>
                                        <v-icon
                                            v-if="msg.status == 'success'"
                                            size="large"
                                            color="green"
                                        >
                                            mdi-information
                                        </v-icon>
                                        <v-icon
                                            v-else
                                            size="large"
                                            color="red"
                                        >
                                            mdi-alert
                                        </v-icon>
                                    </v-avatar>
                                </template>

                                <v-list-item-title style="white-space: normal; word-break: break-word;">
                                    {{ msg.data.message }}
                                </v-list-item-title>
                                <v-list-item-subtitle>{{ msg.create_time }}</v-list-item-subtitle>

                                <template #append>
                                    <v-btn @click.prevent="hidemsg(idx, msg.id)">
                                        {{ $t('messages.ok') }}
                                    </v-btn>
                                </template>
                            </v-list-item>
                        </v-list>
                    </v-menu>

                    <!-- 主题切换按钮 -->
                    <v-btn
                        icon
                        @click="toggleTheme"
                    >
                        <v-icon>{{ store.theme === 'light' ? 'mdi-weather-night' : 'mdi-weather-sunny' }}</v-icon>
                    </v-btn>

                    <!-- 多语言切换入口 -->
                    <v-menu
                        offset-y
                        right
                    >
                        <template #activator="{ props }">
                            <v-btn
                                v-bind="props"
                                icon
                            >
                                <v-icon>mdi-translate</v-icon>
                            </v-btn>
                        </template>
                        <v-list min-width="240">
                            <!-- 显示所有语言选项，当前语言高亮显示 -->
                            <v-list-item
                                v-for="localeItem in allLocales"
                                :key="localeItem.code"
                                :active="localeItem.code === locale"
                                @click="setLocale(localeItem.code)"
                            >
                                <template #prepend>
                                    <v-icon v-if="localeItem.code === locale">
                                        mdi-check
                                    </v-icon>
                                    <v-icon v-else>
                                        mdi-translate
                                    </v-icon>
                                </template>
                                <v-list-item-title>{{ localeItem.name }}</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>

                    <v-menu
                        offset-y
                        right
                    >
                        <template #activator="{ props }">
                            <v-btn
                                v-bind="props"
                                class="mr-4"
                                icon
                                size="45"
                                variant="outlined"
                            >
                                <v-avatar
                                    size="32"
                                    :image="store.user.avatar"
                                />
                            </v-btn>
                        </template>
                        <v-list min-width="240">
                            <v-list-item>
                                <template #prepend>
                                    <v-avatar
                                        size="40"
                                        :image="store.user.avatar"
                                    />
                                </template>
                                <v-list-item-title> {{ store.user.nickname }} </v-list-item-title>
                                <v-list-item-subtitle> {{ store.user.email }} </v-list-item-subtitle>
                            </v-list-item>
                            <v-divider class="my-2" />
                            <v-list-item
                                to="/user/detail"
                                :title="$t('messages.userCenter')"
                                prepend-icon="mdi-account-box"
                            />
                            <v-list-item
                                to="/user/history"
                                :title="$t('messages.readingHistory')"
                                prepend-icon="mdi-history"
                            />
                            <v-list-item
                                v-if="store.sys.allow.FEEDBACK"
                                target="_blank"
                                :href="store.sys.FEEDBACK_URL"
                                :title="$t('messages.feedback')"
                                prepend-icon="mdi-message-alert"
                            />
                            <v-divider />
                            <template v-if="store.user.is_admin">
                                <v-list-item
                                    to="/admin/settings"
                                    :title="$t('messages.adminEntry')"
                                >
                                    <template #prepend>
                                        <v-icon color="red">
                                            mdi-console
                                        </v-icon>
                                    </template>
                                </v-list-item>
                            </template>

                            <v-list-item
                                to="/logout"
                                :title="$t('messages.logout')"
                                prepend-icon="mdi-exit-to-app"
                            />
                        </v-list>
                    </v-menu>
                </template>

                <template v-else>
                    <!-- 主题切换按钮（未登录状态） -->
                    <v-btn
                        icon
                        @click="toggleTheme"
                    >
                        <v-icon>{{ store.theme === 'light' ? 'mdi-weather-night' : 'mdi-weather-sunny' }}</v-icon>
                    </v-btn>

                    <!-- 多语言切换入口（未登录状态） -->
                    <v-menu
                        offset-y
                        right
                    >
                        <template #activator="{ props }">
                            <v-btn
                                v-bind="props"
                                icon
                            >
                                <v-icon>mdi-translate</v-icon>
                            </v-btn>
                        </template>
                        <v-list min-width="240">
                            <v-list-item
                                v-for="localeItem in allLocales"
                                :key="localeItem.code"
                                :active="localeItem.code === locale"
                                @click="setLocale(localeItem.code)"
                            >
                                <template #prepend>
                                    <v-icon v-if="localeItem.code === locale">
                                        mdi-check
                                    </v-icon>
                                    <v-icon v-else>
                                        mdi-translate
                                    </v-icon>
                                </template>
                                <v-list-item-title>{{ localeItem.name }}</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>

                    <v-btn
                        class="px-xs-1 login-btn mr-4"
                        to="/login"
                        color="#304ffe"
                        variant="elevated"
                    >
                        <v-icon
                            class="d-none d-sm-flex me-0"
                            size="24"
                        >
                            mdi-account-circle
                        </v-icon> {{ $t('messages.pleaseLogin') }}
                    </v-btn>
                </template>
            </template>
        </v-app-bar>

        <v-navigation-drawer
            v-model="sidebar"
            :order="1"
            width="240"
        >
            <v-list
                v-if="items.length > 0"
                density="compact"
            >
                <template
                    v-for="(item, idx) in items"
                    :key="idx"
                >
                    <v-list-subheader v-if="item.heading">
                        {{ item.heading }}
                    </v-list-subheader>

                    <!-- 二级菜单 -->
                    <v-list-group
                        v-else-if="item.groups"
                        :value="item.text"
                    >
                        <template #activator="{ props }">
                            <v-list-item
                                v-bind="props"
                                :prepend-icon="item.icon"
                                :title="item.text"
                            />
                        </template>

                        <v-list-item
                            v-for="link in item.groups"
                            :key="link.href"
                            :to="link.href"
                            :title="link.text"
                            :prepend-icon="link.icon"
                        />
                    </v-list-group>

                    <!-- 友情链接 -->
                    <template v-else-if="item.links">
                        <v-list-item
                            v-for="(links, cidx) in chunk(item.links, 2)"
                            :key="idx + 'chunk' + cidx"
                            class="nav-links-item"
                        >
                            <v-row no-gutters>
                                <v-col
                                    v-for="link in links"
                                    :key="link.href"
                                    cols="6"
                                    class="nav-link-col"
                                >
                                    <v-btn
                                        v-if="item.target != ''"
                                        variant="text"
                                        target="_blank"
                                        :href="link.href"
                                        class="nav-link-btn"
                                    >
                                        <v-icon
                                            v-if="link.icon"
                                            start
                                        >
                                            {{ link.icon }}
                                        </v-icon> {{ link.text }}
                                    </v-btn>
                                    <v-btn
                                        v-else
                                        variant="text"
                                        :to="link.href"
                                        class="nav-link-btn"
                                    >
                                        <v-icon
                                            v-if="link.icon"
                                            start
                                        >
                                            {{ link.icon }}
                                        </v-icon> {{ link.text }}
                                    </v-btn>
                                </v-col>
                            </v-row>
                        </v-list-item>
                    </template>

                    <!-- 导航菜单 -->
                    <v-list-item
                        v-else
                        :key="item.text"
                        density="compact"
                        :to="item.href"
                        :target="item.target"
                        :title="item.text"
                        :prepend-icon="item.icon"
                    >
                        <template
                            v-if="item.count"
                            #append
                        >
                            <v-chip
                                size="small"
                                variant="outlined"
                            >
                                {{ item.count }}
                            </v-chip>
                        </template>
                    </v-list-item>
                </template>
                <v-list-item
                    v-if="store.sys.sidebar_extra_html"
                    class="sidebar-extra-item"
                >
                    <div
                        class="sidebar-extra-content press-content"
                        v-html="store.sys.sidebar_extra_html"
                    />
                </v-list-item>
            </v-list>
        </v-navigation-drawer>
    </div>
</template>

<script setup>
import { useDisplay } from 'vuetify';
import { useMainStore } from '@/stores/main';
import { useI18n } from '#i18n';

const store = useMainStore();
const { $backend } = useNuxtApp();
const display = useDisplay();
const router = useRouter();
const route = useRoute();
const { locale, locales, setLocale, t } = useI18n();

const err = ref('');
const visit_admin_pages = ref(false);
const sidebar = ref(null);
const btn_search = ref(false);
const search = ref('');
const messages = ref([]);

const mobile_search = ref(null);
const search_input = ref(null);

// 多语言相关
const availableLocales = computed(() => {
    return (locales.value || []).filter(l => l.code !== locale.value);
});

const allLocales = computed(() => {
    return locales.value || [];
});

const items = computed(() => {
    var home_links = [
        // home
        { icon: 'mdi-home', href: '/', text: $t('navigation.home') },
    ];
    var library_links = [
        // home
        { icon: 'mdi-book', href: '/library', text: $t('navigation.library') },
    ];
    var admin_links = [
        {
            icon: 'mdi-cog',
            text: $t('navigation.admin'),
            // expand: route.path.indexOf("/admin/") == 0, // V3 list group handles expand differently (via value/opened)
            groups: [
                { icon: 'mdi-cog', href: '/admin/settings', text: $t('navigation.settings') },
                { icon: 'mdi-human-greeting', href: '/admin/users', text: $t('navigation.users') },
                { icon: 'mdi-library-shelves', href: '/admin/books', text: $t('navigation.books') },
                { icon: 'mdi-import', href: '/admin/imports', text: $t('navigation.import') },
            ],
        },
    ];
    var nav_links = [
        { heading: $t('navigation.categories') },
        { icon: 'mdi-widgets', href: '/nav', text: $t('navigation.browse'), count: store.sys.books },
        { icon: 'mdi-home-group', href: '/publisher', text: $t('navigation.publishers'), count: store.sys.publishers },
        { icon: 'mdi-human-greeting', href: '/author', text: $t('navigation.authors'), count: store.sys.authors },
        { icon: 'mdi-tag-heart', href: '/tag', text: $t('navigation.tags'), count: store.sys.tags },
        { icon: 'mdi-file', href: '/format', text: $t('navigation.formats'), count: store.sys.formats },
        {
            target: '',
            links: [
                { icon: 'mdi-library-shelves', href: '/series', text: $t('navigation.series'), count: store.sys.series },
                { icon: 'mdi-star-half', href: '/rating', text: $t('navigation.ratings') },
                { icon: 'mdi-trending-up', href: '/hot', text: $t('navigation.hot') },
                { icon: 'mdi-history', href: '/recent', text: $t('navigation.recent') },
            ],
        },
    ];
    var friend_links = [
        // links
        { heading: $t('messages.friendshipLinks') },
        { links: store.sys.friends, target: '_blank' },
    ];
    var sys_links = [
        { heading: $t('messages.system') },
        { icon: 'mdi-history', text: $t('messages.systemVersion'), href: '', count: store.sys.version },
        { icon: 'mdi-human', text: $t('messages.userCount'), href: '', count: store.sys.users },
        { icon: 'mdi-cellphone', text: $t('messages.opdsIntroduction'), href: '/opds-readme', count: 'OPDS', target: '_blank' },
    ];

    return home_links
        .concat(library_links)
        .concat(store.user.is_admin ? admin_links : [])
        .concat(nav_links)
        .concat(store.sys.friends.length > 0 ? friend_links : [])
        .concat(store.sys.show_sidebar_sys !== false ? sys_links : []);
});

onMounted(() => {
    visit_admin_pages.value = route.path.indexOf('/admin/') == 0;
    sidebar.value = display.lgAndUp.value;
    $backend('/user/info').then((rsp) => {
        err.value = rsp.err;
        store.login(rsp);
        store.setTitle(rsp.sys.title);
    });
    $backend('/user/messages').then((rsp) => {
        if (rsp.err == 'ok') {
            messages.value = rsp.messages;
        }
    });
});

function chunk(arr, len) {
    var e = arr.length;
    var r = [];
    for (var idx = 0; idx < e; idx += len) {
        var n = Math.min(idx + len, e);
        r.push(arr.slice(idx, n));
    }
    return r;
}

function do_mobile_search() {
    if (search.value.trim() != '') {
        router.push('/search?name=' + search.value.trim());
    } else {
        mobile_search.value?.focus();
    }
}

function do_search() {
    if (search.value.trim() != '') {
        router.push('/search?name=' + search.value.trim());
    } else {
        search_input.value?.focus();
    }
}

function hidemsg(idx, msgid) {
    $backend('/user/messages', {
        method: 'POST',
        body: JSON.stringify({ id: msgid }),
    }).then((rsp) => {
        if (rsp.err == 'ok') {
            messages.value.splice(idx, 1);
        }
    });
}

function toggleTheme() {
    store.toggleTheme();
}
</script>

<style scoped>
.search-wrapper {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 40vw;
    max-width: 600px;
    min-width: 250px;
}
.search-field {
    width: 100% !important;
}
.search-field :deep(.v-input__control) {
    width: 100% !important;
}
.search-field :deep(.v-field) {
    border-radius: 10px !important;
}
.search-field :deep(.v-field__overlay) {
    background-color: transparent !important;
}
.search-field :deep(.v-field__input) {
    color: white !important;
}
.search-field :deep(.v-label) {
    color: rgba(255, 255, 255, 0.85) !important;
}
.search-field :deep(.v-icon) {
    color: rgba(255, 255, 255, 1) !important;
    opacity: 1 !important;
}
.search-field :deep(.v-field--variant-solo-inverted) {
    background-color: rgba(255, 255, 255, 0.2) !important;
}

/* 侧边栏字体大小 */
:deep(.v-navigation-drawer) .v-list-item-title {
    font-size: 13px !important;
    font-weight: 500 !important;
}
:deep(.v-navigation-drawer) .v-list-subheader__text {
    font-size: 12px !important;
    font-weight: 500 !important;
}
:deep(.v-navigation-drawer) .v-list-item--density-compact .v-list-item-title {
    font-size: 13px !important;
    font-weight: 500 !important;
}
:deep(.v-navigation-drawer) .v-btn__content {
    font-size: 14px !important;
    font-weight: 500 !important;
}

/* 侧边栏额外内容居中 */
:deep(.v-navigation-drawer) .sidebar-extra-item .v-list-item__content {
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
}
:deep(.v-navigation-drawer) .sidebar-extra-content {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
}
:deep(.v-navigation-drawer) .sidebar-extra-content img {
    margin: 0 auto;
    display: block;
}

/* 侧边栏图标和文字间距 */
:deep(.v-navigation-drawer) .v-list-item__spacer {
    width: 8px !important;
}

/* 导航链接样式 */
:deep(.v-navigation-drawer) .nav-links-item {
    padding-left: 8px;
    padding-right: 8px;
}
:deep(.v-navigation-drawer) .nav-links-item .v-list-item__content {
    display: block;
    width: 100%;
}
:deep(.v-navigation-drawer) .nav-link-col {
    padding: 0 4px;
    display: flex;
    justify-content: flex-start;
}
:deep(.v-navigation-drawer) .nav-link-btn {
    justify-content: flex-start;
    padding-left: 8px;
    padding-right: 8px;
    width: auto;
    min-width: unset;
}
</style>
