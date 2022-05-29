<template>
    <div>
        <v-navigation-drawer v-model="sidebar" app fixed width="240" :clipped="$vuetify.breakpoint.lgAndUp">
            <v-list dense v-if="items.length > 0">
                <template v-for="(item, idx) in items">
                    <v-subheader v-if="item.heading" :key="idx">{{ item.heading }}</v-subheader>

                    <!-- 二级菜单 -->
                    <v-list-group v-else-if="item.groups" no-action :value="item.expand">
                        <template v-slot:activator>
                            <v-list-item-action class="mt-1 mb-1 mr-2" dense>
                                <v-icon class="pa-0 ma-0">{{ item.icon }}</v-icon>
                            </v-list-item-action>
                            <v-list-item-content>
                                <v-list-item-title v-text="item.text"> 管理员 </v-list-item-title>
                            </v-list-item-content>
                        </template>

                        <v-list-item v-for="link in item.groups" :key="link.href" :to="link.href">
                            <v-list-item-content>
                                <v-list-item-title
                                    ><v-icon>{{ link.icon }}</v-icon> {{ link.text }}</v-list-item-title
                                >
                            </v-list-item-content>
                        </v-list-item>
                    </v-list-group>

                    <!-- 友情链接 -->
                    <template v-else-if="item.links">
                        <v-list-item dense v-for="(links, cidx) in chunk(item.links, 2)" :key="idx + 'chunk' + cidx">
                            <v-row>
                                <v-col class="pa-0" cols="6" v-for="link in links" :key="link.href">
                                    <v-btn v-if="item.target != ''" text target="_blank" :href="link.href">
                                        <v-icon v-if="link.icon" left>{{ link.icon }}</v-icon> {{ link.text }}
                                    </v-btn>
                                    <v-btn v-else text :to="link.href">
                                        <v-icon v-if="link.icon" left>{{ link.icon }}</v-icon> {{ link.text }}
                                    </v-btn>
                                </v-col>
                            </v-row>
                        </v-list-item>
                    </template>

                    <!-- 导航菜单 -->
                    <v-list-item dense v-else :key="item.text" :to="item.href" :target="item.target">
                        <v-list-item-action class="mt-1 mb-1 mr-2" dense>
                            <v-icon class="pa-0 ma-0">{{ item.icon }}</v-icon>
                        </v-list-item-action>
                        <v-list-item-content>
                            <v-list-item-title>
                                {{ item.text }}
                            </v-list-item-title>
                        </v-list-item-content>
                        <v-list-item-action class="mt-1 mb-1 mr-2" v-if="item.count">
                            <v-chip small outlined>{{ item.count }}</v-chip>
                        </v-list-item-action>
                    </v-list-item>
                </template>
                <v-list-item>
                    <v-img class="ma-auto" max-width="128" src="/logo/link.png"></v-img>
                </v-list-item>
            </v-list>
        </v-navigation-drawer>

        <v-app-bar class="px-0" color="blue" dense dark app fixed clipped-left extension-height="64">
            <template v-if="btn_search && $vuetify.breakpoint.xs" #extension>
                <v-container fluid>
                    <v-form @submit.prevent="do_serach">
                        <v-row>
                            <v-col cols="9">
                                <v-text-field
                                    class="ma-0 pa-0"
                                    hide-details
                                    single-line
                                    solo-inverted
                                    v-model="search"
                                    ref="mobile_search"
                                ></v-text-field>
                            </v-col>
                            <v-col cols="3">
                                <v-btn dark rounded @click="do_mobile_search" color="primary">搜索</v-btn>
                            </v-col>
                        </v-row>
                    </v-form>
                </v-container>
            </template>

            <v-toolbar-title class="ml-n5 mr-12 align-center">
                <v-app-bar-nav-icon @click.stop="sidebar = !sidebar"><v-icon>menu</v-icon></v-app-bar-nav-icon>
                <span class="cursor-pointer" @click="$router.push('/')">{{ sys.title }}</span>
            </v-toolbar-title>

            <v-spacer></v-spacer>
            <template v-if="$vuetify.breakpoint.smAndUp">
                <v-text-field
                    flat
                    solo-inverted
                    hide-details
                    prepend-inner-icon="search"
                    @keyup.enter="do_search"
                    ref="search"
                    v-model="search"
                    name="name"
                    label="Search"
                    class="d-none d-sm-flex ml-8"
                >
                </v-text-field>
                <v-spacer></v-spacer>
            </template>

            <v-btn v-else icon class="d-flex d-sm-none" @click="btn_search = !btn_search"> <v-icon>search</v-icon> </v-btn>

            <template v-if="err == 'ok'">
                <template v-if="user.is_login">
                    <v-menu offset-y right :close-on-content-click="false" v-if="messages.length > 0">
                        <template v-slot:activator="{ on }">
                            <v-btn v-on="on" icon> <v-icon>notifications</v-icon> </v-btn>
                        </template>
                        <v-list three-line dense width="400">
                            <v-list-item v-for="(msg, idx) in messages" :key="msg.id">
                                <v-list-item-avatar>
                                    <v-icon large color="green" v-if="msg.status == 'success'">mdi-information</v-icon>
                                    <v-icon large color="red" v-else>mdi-alert</v-icon>
                                </v-list-item-avatar>

                                <v-list-item-content>
                                    <p class="body-2">
                                        {{ msg.data.message }}
                                        <br />
                                        <span>{{ msg.create_time }}</span>
                                    </p>
                                </v-list-item-content>

                                <v-list-item-action>
                                    <v-btn @click.prevent="hidemsg(idx, msg.id)">好的</v-btn>
                                </v-list-item-action>
                            </v-list-item>
                        </v-list>
                    </v-menu>

                    <v-menu offset-y right>
                        <template v-slot:activator="{ on }">
                            <v-btn v-on="on" class="mr-2" icon large outlined
                                ><v-avatar size="32px"><img :src="user.avatar" /></v-avatar
                            ></v-btn>
                        </template>
                        <v-list min-width="240">
                            <v-list-item>
                                <v-list-item-avatar>
                                    <img :src="user.avatar" />
                                </v-list-item-avatar>
                                <v-list-item-content>
                                    <v-list-item-title> {{ user.nickname }} </v-list-item-title>
                                    <v-list-item-subtitle> {{ user.email }} </v-list-item-subtitle>
                                </v-list-item-content>
                            </v-list-item>
                            <v-divider></v-divider>
                            <v-list-item to="/user/detail">
                                <v-list-item-action><v-icon>contacts</v-icon></v-list-item-action>
                                <v-list-item-title> 用户中心 </v-list-item-title>
                            </v-list-item>
                            <v-list-item to="/user/history">
                                <v-list-item-action><v-icon>history</v-icon></v-list-item-action>
                                <v-list-item-title> 阅读记录 </v-list-item-title>
                            </v-list-item>
                            <v-list-item target="_blank" href="https://github.com/talebook/talebook/issues">
                                <v-list-item-action><v-icon>sms_failed</v-icon></v-list-item-action>
                                <v-list-item-title> 反馈 </v-list-item-title>
                            </v-list-item>
                            <v-divider></v-divider>
                            <template v-if="user.is_admin">
                                <v-list-item to="/admin/settings">
                                    <v-list-item-action><v-icon color="red">mdi-console</v-icon></v-list-item-action>
                                    <v-list-item-title> 管理员入口 </v-list-item-title>
                                </v-list-item>
                            </template>

                            <v-list-item to="/logout">
                                <v-list-item-action><v-icon>exit_to_app</v-icon></v-list-item-action>
                                <v-list-item-title> 退出 </v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </template>

                <v-btn v-else class="px-xs-1" to="/login" color="indigo accent-4">
                    <v-icon class="d-none d-sm-flex">account_circle</v-icon> 请登录
                </v-btn>
            </template>
        </v-app-bar>
    </div>
</template>

<script>
export default {
    data: () => ({
        err: "",
        visit_admin_pages: false,
        sidebar: null,
        right: null,
        btn_search: false,
        search: "",
        user: {},
        sys: {
            books: 0,
            tags: 0,
            authors: 0,
            publishers: 0,
            series: 0,
            users: 0,
            active: 0,
            version: "",
            mtime: "",
            title: "",
            footer: "",
            socials: [],
            friends: [],
            allow: {
                register: true,
                download: true,
                push: true,
                read: true,
            },
        },
        messages: [],
    }),
    computed: {
        items: function () {
            var home_links = [
                // home
                { icon: "home", href: "/", text: "首页" },
            ];
            var admin_links = [
                {
                    icon: "mdi-cog",
                    text: "管理",
                    expand: this.$route.path.indexOf("/admin/") == 0,
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
                { icon: "widgets", href: "/nav", text: "分类导览", count: this.sys.books },
                { icon: "mdi-home-group", href: "/publisher", text: "出版社", count: this.sys.publishers },
                { icon: "mdi-human-greeting", href: "/author", text: "作者", count: this.sys.authors },
                { icon: "mdi-tag-heart", href: "/tag", text: "标签", count: this.sys.tags },
                {
                    target: "",
                    links: [
                        { icon: "mdi-library-shelves", href: "/series", text: "丛书", count: this.sys.series },
                        { icon: "mdi-star-half", href: "/rating", text: "评分" },
                        { icon: "mdi-trending-up", href: "/hot", text: "热度榜单" },
                        { icon: "mdi-history", href: "/recent", text: "所有书籍" },
                    ],
                },
            ];
            var friend_links = [
                // links
                { heading: "友情链接" },
                { links: this.sys.friends, target: "_blank" },
            ];
            var sys_links = [
                { heading: "系统" },
                { icon: "mdi-history", text: "系统版本", href: "", count: this.sys.version },
                { icon: "mdi-human", text: "用户数", href: "", count: this.sys.users },
                { icon: "mdi-cellphone", text: "OPDS接口", href: "/opds/", count: "OPDS", target: "_blank" },
            ];

            return home_links
                .concat(this.user.is_admin ? admin_links : [])
                .concat(nav_links)
                .concat(this.sys.friends.length > 0 ? friend_links : [])
                .concat(sys_links);
        },
    },
    mounted() {
        this.visit_admin_pages = this.$route.path.indexOf("/admin/") == 0;
        this.sidebar = this.$vuetify.breakpoint.lgAndUp;
        this.$backend("/user/info").then((rsp) => {
            this.err = rsp.err;
            this.sys = rsp.sys;
            this.user = rsp.user;
            this.$store.commit("login", rsp);
        });
        this.$backend("/user/messages").then((rsp) => {
            if (rsp.err == "ok") {
                this.messages = rsp.messages;
            }
        });
    },
    methods: {
        chunk: function (arr, len) {
            var e = arr.length;
            var r = [];
            for (var idx = 0; idx < e; idx += len) {
                var n = Math.min(idx + len, e);
                r.push(arr.slice(idx, n));
            }
            return r;
        },
        do_mobile_search: function () {
            if (this.search.trim() != "") {
                this.$router.push("/search?name=" + this.search).catch(() => {});
            } else {
                this.$refs.mobile_search.focus();
            }
        },
        do_search: function () {
            if (this.search.trim() != "") {
                this.$router.push("/search?name=" + this.search).catch(() => {});
            } else {
                this.$refs.search.focus();
            }
        },
        hidemsg: function (idx, msgid) {
            this.$backend("/user/messages", {
                method: "POST",
                body: JSON.stringify({ id: msgid }),
            }).then((rsp) => {
                if (rsp.err == "ok") {
                    this.messages.splice(idx, 1);
                }
            });
        },
    },
};
</script>
