<template>
    <div>
        <v-app-bar class="px-0" color="blue" density="compact" theme="dark" :order="0" extension-height="64">
            <template v-if="btn_search && display.xs.value" #extension>
                <v-container fluid>
                    <v-form @submit.prevent="do_search">
                        <v-row>
                            <v-col cols="9">
                                <v-text-field
                                    class="ma-0 pa-0"
                                    hide-details
                                    single-line
                                    variant="solo-inverted"
                                    v-model="search"
                                    ref="mobile_search"
                                    theme="light"
                                ></v-text-field>
                            </v-col>
                            <v-col cols="3">
                                <v-btn theme="dark" rounded @click="do_mobile_search" color="primary">搜索</v-btn>
                            </v-col>
                        </v-row>
                    </v-form>
                </v-container>
            </template>

            <v-app-bar-nav-icon @click.stop="sidebar = !sidebar"></v-app-bar-nav-icon>
            <v-toolbar-title class="ml-2 mr-4 align-center" @click="router.push('/')" style="cursor: pointer">
                {{ store.sys.title }}
            </v-toolbar-title>

            <template v-if="display.smAndUp.value">
                <div class="search-wrapper">
                    <v-text-field
                        flat
                        variant="solo-inverted"
                        hide-details
                        prepend-inner-icon="mdi-magnify"
                        @keyup.enter="do_search"
                        ref="search_input"
                        v-model="search"
                        name="name"
                        label="Search"
                        class="d-none d-sm-flex search-field"
                        theme="light"
                        bg-color="rgba(255, 255, 255, 0.15)"
                    >
                    </v-text-field>
                </div>
            </template>

            <v-btn v-else icon class="d-flex d-sm-none" @click="btn_search = !btn_search"> <v-icon>mdi-magnify</v-icon> </v-btn>

            <template v-if="err == 'ok'">
                <template v-if="store.user.is_login">
                    <v-menu offset-y right :close-on-content-click="false" v-if="messages.length > 0">
                        <template v-slot:activator="{ props }">
                            <v-btn v-bind="props" icon> <v-icon>mdi-bell</v-icon> </v-btn>
                        </template>
                        <v-list lines="three" density="compact" width="400">
                            <v-list-item v-for="(msg, idx) in messages" :key="msg.id">
                                <template v-slot:prepend>
                                    <v-avatar>
                                        <v-icon size="large" color="green" v-if="msg.status == 'success'">mdi-information</v-icon>
                                        <v-icon size="large" color="red" v-else>mdi-alert</v-icon>
                                    </v-avatar>
                                </template>

                                <v-list-item-title>{{ msg.data.message }}</v-list-item-title>
                                <v-list-item-subtitle>{{ msg.create_time }}</v-list-item-subtitle>

                                <template v-slot:append>
                                    <v-btn @click.prevent="hidemsg(idx, msg.id)">好的</v-btn>
                                </template>
                            </v-list-item>
                        </v-list>
                    </v-menu>

                    <v-menu offset-y right>
                        <template v-slot:activator="{ props }">
                            <v-btn v-bind="props" class="mr-2" icon size="large" variant="outlined">
                                <v-avatar size="32px"><img :src="store.user.avatar" /></v-avatar>
                            </v-btn>
                        </template>
                        <v-list min-width="240">
                            <v-list-item>
                                <template v-slot:prepend>
                                    <v-avatar>
                                        <img :src="store.user.avatar" />
                                    </v-avatar>
                                </template>
                                <v-list-item-title> {{ store.user.nickname }} </v-list-item-title>
                                <v-list-item-subtitle> {{ store.user.email }} </v-list-item-subtitle>
                            </v-list-item>
                            <v-divider></v-divider>
                            <v-list-item to="/user/detail" title="用户中心" prepend-icon="mdi-account-box"></v-list-item>
                            <v-list-item to="/user/history" title="阅读记录" prepend-icon="mdi-history"></v-list-item>
                            <v-list-item v-if="store.sys.allow.FEEDBACK" target="_blank" :href="store.sys.FEEDBACK_URL" title="反馈" prepend-icon="mdi-message-alert"></v-list-item>
                            <v-divider></v-divider>
                            <template v-if="store.user.is_admin">
                                <v-list-item to="/admin/settings" title="管理员入口">
                                    <template v-slot:prepend>
                                        <v-icon color="red">mdi-console</v-icon>
                                    </template>
                                </v-list-item>
                            </template>

                            <v-list-item to="/logout" title="退出" prepend-icon="mdi-exit-to-app"></v-list-item>
                        </v-list>
                    </v-menu>
                </template>

                <v-btn v-else class="px-xs-1 login-btn" to="/login" color="#304ffe" variant="elevated">
                    <v-icon class="d-none d-sm-flex me-0" size="24">mdi-account-circle</v-icon> 请登录
                </v-btn>
            </template>
        </v-app-bar>

        <v-navigation-drawer v-model="sidebar" :order="1" width="240">
            <v-list density="compact" v-if="items.length > 0">
                <template v-for="(item, idx) in items" :key="idx">
                    <v-list-subheader v-if="item.heading">{{ item.heading }}</v-list-subheader>

                    <!-- 二级菜单 -->
                    <v-list-group v-else-if="item.groups" :value="item.text">
                        <template v-slot:activator="{ props }">
                             <v-list-item v-bind="props" :prepend-icon="item.icon" :title="item.text"></v-list-item>
                        </template>

                        <v-list-item v-for="link in item.groups" :key="link.href" :to="link.href" :title="link.text" :prepend-icon="link.icon">
                        </v-list-item>
                    </v-list-group>

                    <!-- 友情链接 -->
                    <template v-else-if="item.links">
                        <v-list-item density="compact" v-for="(links, cidx) in chunk(item.links, 2)" :key="idx + 'chunk' + cidx">
                            <v-row>
                                <v-col class="pa-0" cols="6" v-for="link in links" :key="link.href">
                                    <v-btn v-if="item.target != ''" variant="text" target="_blank" :href="link.href">
                                        <v-icon v-if="link.icon" start>{{ link.icon }}</v-icon> {{ link.text }}
                                    </v-btn>
                                    <v-btn v-else variant="text" :to="link.href">
                                        <v-icon v-if="link.icon" start>{{ link.icon }}</v-icon> {{ link.text }}
                                    </v-btn>
                                </v-col>
                            </v-row>
                        </v-list-item>
                    </template>

                    <!-- 导航菜单 -->
                    <v-list-item density="compact" v-else :key="item.text" :to="item.href" :target="item.target" :title="item.text" :prepend-icon="item.icon">
                        <template v-slot:append v-if="item.count">
                            <v-chip size="small" variant="outlined">{{ item.count }}</v-chip>
                        </template>
                    </v-list-item>
                </template>
                <v-list-item v-if="store.sys.sidebar_extra_html" class="sidebar-extra-item">
                    <div class="sidebar-extra-content" v-html="store.sys.sidebar_extra_html"></div>
                </v-list-item>
            </v-list>
        </v-navigation-drawer>
    </div>
</template>

<script setup>
import { useDisplay } from 'vuetify'
import { useMainStore } from '@/stores/main'

const store = useMainStore()
const { $backend } = useNuxtApp()
const display = useDisplay()
const router = useRouter()
const route = useRoute()

const err = ref("")
const visit_admin_pages = ref(false)
const sidebar = ref(null)
const btn_search = ref(false)
const search = ref("")
const messages = ref([])

const mobile_search = ref(null)
const search_input = ref(null)

const items = computed(() => {
    var home_links = [
        // home
        { icon: "mdi-home", href: "/", text: "首页" },
    ];
    var library_links = [
        // home
        { icon: "mdi-book", href: "/library", text: "书库" },
    ];
    var admin_links = [
        {
            icon: "mdi-cog",
            text: "管理",
            // expand: route.path.indexOf("/admin/") == 0, // V3 list group handles expand differently (via value/opened)
            groups: [
                { icon: "mdi-cog", href: "/admin/settings", text: "系统设置" },
                { icon: "mdi-human-greeting", href: "/admin/users", text: "用户管理" },
                { icon: "mdi-library-shelves", href: "/admin/books", text: "图书管理" },
                { icon: "mdi-import", href: "/admin/imports", text: "导入图书" },
            ],
        },
    ];
    var nav_links = [
        { heading: "分类浏览" },
        { icon: "mdi-widgets", href: "/nav", text: "分类导览", count: store.sys.books },
        { icon: "mdi-home-group", href: "/publisher", text: "出版社", count: store.sys.publishers },
        { icon: "mdi-human-greeting", href: "/author", text: "作者", count: store.sys.authors },
        { icon: "mdi-tag-heart", href: "/tag", text: "标签", count: store.sys.tags },
        { icon: "mdi-file", href: "/format", text: "文件格式", count: store.sys.formats },
        {
            target: "",
            links: [
                { icon: "mdi-library-shelves", href: "/series", text: "丛书", count: store.sys.series },
                { icon: "mdi-star-half", href: "/rating", text: "评分" },
                { icon: "mdi-trending-up", href: "/hot", text: "热度榜单" },
                { icon: "mdi-history", href: "/recent", text: "所有书籍" },
            ],
        },
    ];
    var friend_links = [
        // links
        { heading: "友情链接" },
        { links: store.sys.friends, target: "_blank" },
    ];
    var sys_links = [
        { heading: "系统" },
        { icon: "mdi-history", text: "系统版本", href: "", count: store.sys.version },
        { icon: "mdi-human", text: "用户数", href: "", count: store.sys.users },
        { icon: "mdi-cellphone", text: "OPDS介绍", href: "/opds-readme", count: "OPDS", target: "_blank" },
    ];

    return home_links
        .concat(library_links)
        .concat(store.user.is_admin ? admin_links : [])
        .concat(nav_links)
        .concat(store.sys.friends.length > 0 ? friend_links : [])
        .concat(store.sys.show_sidebar_sys !== false ? sys_links : []);
})

onMounted(() => {
    visit_admin_pages.value = route.path.indexOf("/admin/") == 0;
    sidebar.value = display.lgAndUp.value;
    $backend("/user/info").then((rsp) => {
        err.value = rsp.err;
        store.login(rsp);
        store.setTitle(rsp.sys.title);
    });
    $backend("/user/messages").then((rsp) => {
        if (rsp.err == "ok") {
            messages.value = rsp.messages;
        }
    });
})

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
    if (search.value.trim() != "") {
        router.push("/search?name=" + search.value.trim());
    } else {
        mobile_search.value?.focus();
    }
}

function do_search() {
    if (search.value.trim() != "") {
        router.push("/search?name=" + search.value.trim());
    } else {
        search_input.value?.focus();
    }
}

function hidemsg(idx, msgid) {
    $backend("/user/messages", {
        method: "POST",
        body: JSON.stringify({ id: msgid }),
    }).then((rsp) => {
        if (rsp.err == "ok") {
            messages.value.splice(idx, 1);
        }
    });
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
    background-color: rgba(255, 255, 255, 0.2) !important;
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
    font-size: 14px !important;
    font-weight: 500 !important;
}
:deep(.v-navigation-drawer) .v-list-subheader__text {
    font-size: 13px !important;
    font-weight: 500 !important;
}
:deep(.v-navigation-drawer) .v-list-item--density-compact .v-list-item-title {
    font-size: 14px !important;
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
    width: 12px !important;
}
</style>
