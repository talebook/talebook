<template>
    <div>
        <v-navigation-drawer v-model="sidebar" fixed app width="240px" :clipped="$vuetify.breakpoint.lgAndUp" >
            <v-list dense>
                <template v-for="(item, idx) in items">
                    <v-subheader v-if="item.heading" :key="idx" >{{ item.heading }}</v-subheader>

                    <!-- 友情链接 -->
                    <template v-else-if="item.links" >
                    <v-list-tile v-for="(links, cidx) in chunk(item.links, 2)" :key="'chunk'+cidx">
                        <v-layout row wrap>
                            <v-flex xs6 v-for="link in links" :key="link.href" >
                                <v-btn flat :href="link.href">{{link.text}}</v-btn>
                            </v-flex>
                        </v-layout>
                    </v-list-tile>
                    </template>

                    <!-- 导航菜单 -->
                    <v-list-tile v-else :key="item.text" :href="item.href">
                        <v-list-tile-action>
                            <v-icon>{{ item.icon }}</v-icon>
                        </v-list-tile-action>
                        <v-list-tile-content>
                            <v-list-tile-title>
                                {{ item.text }}
                            </v-list-tile-title>
                        </v-list-tile-content>
                        <v-list-tile-action v-if="item.count">
                            <v-chip small outline>{{item.count}}</v-chip>
                        </v-list-tile-action>
                    </v-list-tile>
                </template>
            </v-list>
        </v-navigation-drawer>

        <v-toolbar color="blue" dark fixed app :clipped-left="$vuetify.breakpoint.lgAndUp" dense >
            <v-toolbar-side-icon @click.stop="sidebar = !sidebar"></v-toolbar-side-icon>
                    <v-btn flat class='btn-home' href="/">
                        <v-avatar tile size="24px">
                        <v-img src="https://cdn.vuetifyjs.com/images/logos/logo.svg" alt="Vuetify" ></v-img>
                        </v-avatar>
                        {{sysinfo.title}}
                    </v-btn>
            <v-spacer></v-spacer>
            <form action="/search" method="GET">
            <v-text-field flat solo-inverted hide-details prepend-inner-icon="search"
                      name="name" label="Search" class="hidden-sm-and-down">
            </v-text-field>
            </form>
            <v-spacer></v-spacer>
            <v-btn icon> <v-icon>apps</v-icon> </v-btn>
            <v-btn icon> <v-icon>notifications</v-icon> </v-btn>

            <v-menu offset-y v-if="user.is_login">
                <template v-slot:activator="{on}">
                <v-btn v-on="on" icon large ><v-avatar size="32px"><img :src="user.avatar" ></v-avatar></v-btn>
                </template>
                <v-list>
                    <v-list-tile :href="(user.is_login)?'':'/login'" >
                        <v-list-tile-avatar>
                            <img :src="user.avatar">
                        </v-list-tile-avatar>
                        <v-list-tile-content>
                        <v-list-tile-title> {{user.nickname}} </v-list-tile-title>
                        <v-list-tile-sub-title> {{user.kindle_email}} </v-list-tile-sub-title>
                        </v-list-tile-content>
                    </v-list-tile>
                </v-list>
                <v-list>

                    <v-divider></v-divider>
                    <v-list-tile href="/user/view">
                        <v-list-tile-action><v-icon>contacts</v-icon></v-list-tile-action>
                        <v-list-tile-title> 用户中心 </v-list-tile-title>
                    </v-list-tile>
                    <v-list-tile href="/user/history">
                        <v-list-tile-action><v-icon>history</v-icon></v-list-tile-action>
                        <v-list-tile-title> 阅读记录 </v-list-tile-title>
                    </v-list-tile>
                    <v-list-tile href="http://github.com">
                        <v-list-tile-action><v-icon>sms_failed</v-icon></v-list-tile-action>
                        <v-list-tile-title> 反馈 </v-list-tile-title>
                    </v-list-tile>
                    <v-divider></v-divider>

                    <v-list-tile href="/logout">
                        <v-list-tile-action><v-icon>exit_to_app</v-icon></v-list-tile-action>
                        <v-list-tile-title> 退出 </v-list-tile-title>
                    </v-list-tile>
                </v-list>
            </v-menu>
            <v-btn v-else href="/login" color="indigo accent-4">
                <v-icon>account_circle</v-icon> 请登录
            </v-btn>

        </v-toolbar>
    </div>
</template>

<script>
export default {
    computed: {
    },
    created() {
        this.sidebar = this.$vuetify.breakpoint.lgAndUp;
        this.backend('/user/info').then(rsp=>rsp.json()) .then( rsp => {
            this.$store.commit('login', rsp);
            this.sysinfo = rsp.sys;
            this.user = rsp.user;
            var sys = rsp.sys;
            var nav_items = [
                { heading: '分类浏览' },
                { icon: 'contacts',     href:'/nav',    text: '所有书籍', count: sys.books      },
                { icon: 'history',      href:'/pub',    text: '出版社',   count: sys.publishers },
                { icon: 'content_copy', href:'/author', text: '作者',     count: sys.authors    },
                { icon: 'content_copy', href:'/tag',    text: '标签',     count: sys.tags       },
                { icon: 'content_copy', href:'/rating', text: '全部评分', },
                { icon: 'content_copy', href:'/recent', text: '最近更新', },
                { icon: 'content_copy', href:'/hot',    text: '热度榜单', },
            ].concat(  ( sys.friends.length > 0 ) ? [
                { heading: '友情链接' },
                { links: sys.friends },
            ] : [] ).concat([
                { heading: '系统管理' },
                { icon: 'settings', text: '管理入口', href: "/settings" },
                { icon: 'settings', text: '安装页面', href: "/install" },
                { icon: 'settings', text: '入口密码', href: "/welcome" },
                { icon: 'help', text: '系统版本' },
            ]);
            this.items = nav_items;
        });
    },
    data: () => ({
        user: {},
        sidebar: false,
        right: null,
        items: [ ],
        sysinfo: {
            version: "v2.1.1",
            update: "2019-06-09",
            total: 10855,
            active: 198,
            title: 'Calibre',
        },
    }),
    methods: {
        chunk: function(arr, len) {
            var e = arr.length;
            var r = [];
            for ( var idx = 0; idx < e; idx += len ) {
                var n = Math.min(idx+len, e);
                r.push( arr.slice(idx, n) );
            }
            return r;
        },
    },
}
</script>

<style scoped>

.btn-home {
    padding: 0;
}

.link-friend {
    text-align: center;
}

</style>
