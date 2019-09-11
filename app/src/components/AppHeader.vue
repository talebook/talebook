<template>
    <div v-if="loaded">
        <v-navigation-drawer app v-model="sidebar" width="240px" :clipped="$vuetify.breakpoint.lgAndUp" >
            <v-list dense>
                <template v-for="(item, idx) in items">
                    <v-subheader v-if="item.heading" :key="idx" >{{ item.heading }}</v-subheader>

                    <!-- 友情链接 -->
                    <template v-else-if="item.links" >
                    <v-list-item dense v-for="(links, cidx) in chunk(item.links, 2)" :key="'chunk'+cidx">
                        <v-row>
                            <v-col class="pa-0" cols=6 v-for="link in links" :key="link.href" >
                                <v-btn text :to="link.href">{{link.text}}</v-btn>
                            </v-col>
                        </v-row>
                    </v-list-item>
                    </template>

                    <!-- 导航菜单 -->
                    <v-list-item dense v-else :key="item.text" :to="item.href" >
                        <v-list-item-action class="mt-1 mb-1 mr-2" dense>
                            <v-icon class="pa-0 ma-0">{{ item.icon }}</v-icon>
                        </v-list-item-action>
                        <v-list-item-content>
                            <v-list-item-title>
                                {{ item.text }}
                            </v-list-item-title>
                        </v-list-item-content>
                        <v-list-item-action class="mt-1 mb-1 mr-2" v-if="item.count">
                            <v-chip small outlined>{{item.count}}</v-chip>
                        </v-list-item-action>
                    </v-list-item>
                </template>
            </v-list>
        </v-navigation-drawer>

        <v-app-bar color="blue" dark fixed app :clipped-left="$vuetify.breakpoint.lgAndUp" dense >

            <v-toolbar-title class="mr-12 align-center" >
                <v-app-bar-nav-icon @click.stop="sidebar = !sidebar"><v-icon>menu</v-icon></v-app-bar-nav-icon>
                {{sysinfo.title}}(size={{$vuetify.breakpoint.name}})
            </v-toolbar-title>
            <v-spacer></v-spacer>

            <form action="/search" method="GET">
            <v-text-field flat solo-inverted hide-details prepend-inner-icon="search"
                      name="name" label="Search" class="d-none d-sm-flex">
            </v-text-field>
            </form>

            <v-spacer></v-spacer>
            <v-menu offset-y v-if="user.is_login">
                <template v-slot:activator="{on}">
                <v-btn v-on="on" icon> <v-icon>notifications</v-icon> </v-btn>
                </template>
                <v-list>
                    <template v-if="messages">
                    <v-list-item v-for="msg in messages" :key="msg.id">
                        <v-list-item-title>{{msg.message}}</v-list-item-title>
                    </v-list-item>
                    </template>
                    <v-list-item v-else>
                        <v-list-item-title> 暂无消息 </v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-menu>


            <v-menu offset-y right v-if="user.is_login">
                <template v-slot:activator="{on}">
                <v-btn v-on="on" icon large ><v-avatar size="32px"><img :src="user.avatar" ></v-avatar></v-btn>
                </template>
                <v-list width=240>
                    <v-list-item to="(user.is_login)?'':'/login'" >
                        <v-list-item-avatar>
                            <img :src="user.avatar">
                        </v-list-item-avatar>
                        <v-list-item-content>
                        <v-list-item-title> {{user.nickname}} </v-list-item-title>
                        <v-list-item-subtitle> {{user.email}} </v-list-item-subtitle>
                        </v-list-item-content>
                    </v-list-item>
                </v-list>
                <v-list>
                    <v-divider></v-divider>
                    <v-list-item to="/user/view">
                        <v-list-item-action><v-icon>contacts</v-icon></v-list-item-action>
                        <v-list-item-title> 用户中心 </v-list-item-title>
                    </v-list-item>
                    <v-list-item to="/user/history">
                        <v-list-item-action><v-icon>history</v-icon></v-list-item-action>
                        <v-list-item-title> 阅读记录 </v-list-item-title>
                    </v-list-item>
                    <v-list-item to="http://github.com">
                        <v-list-item-action><v-icon>sms_failed</v-icon></v-list-item-action>
                        <v-list-item-title> 反馈 </v-list-item-title>
                    </v-list-item>
                    <v-divider></v-divider>

                    <v-list-item to="/logout">
                        <v-list-item-action><v-icon>exit_to_app</v-icon></v-list-item-action>
                        <v-list-item-title> 退出 </v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-menu>
            <v-btn v-else to="/login" color="indigo accent-4">
                <v-icon>account_circle</v-icon> 请登录
            </v-btn>

        </v-app-bar>
    </div>
</template>

<script>
export default {
    computed: {
    },
    created() {
        this.sidebar = this.$vuetify.breakpoint.lgAndUp;
        this.backend('/user/messages').then(rsp=>rsp.json()).then(rsp => {
            if ( rsp.err == 'ok' ) {
                this.messages = rsp.messages;
            }
        });
        this.backend('/user/info')
        .then(rsp=>rsp.json())
        .then(rsp => {
            this.$store.commit('login', rsp);
            this.sysinfo = rsp.sys;
            this.user = rsp.user;
            var sys = rsp.sys;
            var nav_items = [
                { icon: 'home',         href:'/',       text: '首页',         },
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
                { icon: 'settings', text: '管理入口', href: "/admin" },
                { icon: 'settings', text: '安装页面', href: "/install" },
                { icon: 'settings', text: '入口密码', href: "/welcome" },
                { icon: 'help', text: '系统版本' },
            ]);
            this.items = nav_items;
            this.loaded = true;
        }).catch(error => {
            error || error;
            //if ( error ) { 1 + 2 }
            var next = this.$router.fullPath;
            next = next ? "?next="+next : "";
            this.$router.push("/welcome"+next);
        });
    },
    data: () => ({
        loaded: false,
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
        messages: [],
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
