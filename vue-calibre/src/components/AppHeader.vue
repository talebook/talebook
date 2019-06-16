<template>
    <div>
        <v-navigation-drawer v-model="sidebar" fixed app width="240px" :clipped="$vuetify.breakpoint.lgAndUp" >
            <v-list dense>
                <template v-for="(item, idx) in items">
                    <v-subheader v-if="item.heading" :key="idx" >{{ item.heading }}</v-subheader>
                    <template v-else-if="item.links" >
                    <v-list-tile v-for="(links, cidx) in chunk(item.links, 2)" :key="'chunk'+cidx">
                        <v-layout row wrap>
                            <v-flex xs6 v-for="link in links" :key="link.href" >
                                <v-btn flat :href="link.href">{{link.text}}</v-btn>
                            </v-flex>
                        </v-layout>
                    </v-list-tile>
                    </template>

                    <v-list-tile v-else :key="item.text" :href="item.href">
                        <v-list-tile-action>
                            <v-icon>{{ item.icon }}</v-icon>
                        </v-list-tile-action>
                        <v-list-tile-content>
                            <v-list-tile-title>
                                {{ item.text }}
                            </v-list-tile-title>
                        </v-list-tile-content>
                    </v-list-tile>
                </template>
            </v-list>
        </v-navigation-drawer>

        <v-toolbar color="blue" dark fixed app :clipped-left="$vuetify.breakpoint.lgAndUp" dense >
            <v-toolbar-side-icon @click.stop="sidebar = !sidebar"></v-toolbar-side-icon>
            <v-toolbar-title style="width: 300px" class="ml-0 pl-3">
                <span class="hidden-sm-and-down">
                    <v-btn flat href="/">
                        <v-avatar tile size="24px">
                        <v-img src="https://cdn.vuetifyjs.com/images/logos/logo.svg" alt="Vuetify" ></v-img>
                        </v-avatar>
                        奇异书屋
                    </v-btn>
                </span>
            </v-toolbar-title>
            <v-text-field flat solo-inverted hide-details prepend-inner-icon="search"
                      label="Search" class="hidden-sm-and-down">
            </v-text-field>
            <v-spacer></v-spacer>
            <v-btn icon> <v-icon>apps</v-icon> </v-btn>
            <v-btn icon> <v-icon>notifications</v-icon> </v-btn>
            <v-btn icon large>
                <v-avatar size="32px">
                    <img src="https://q.qlogo.cn/qqapp/101187047/D7B5E27D5440740246E23C8E981E22A2/40" >
                </v-avatar>
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
    },
    data: () => ({
        sidebar: false,
        right: null,
        items: [
            { heading: '分类浏览' },
            { icon: 'contacts', text: '所有数据', href: '/all' },
            { icon: 'history', text: '出版社', href: '/pub' },
            { icon: 'content_copy', text: '作者', href: '/author' },
            { icon: 'content_copy', text: '标签', href: '/tag' },
            { icon: 'content_copy', text: '全部评分', href: '/rating' },
            { icon: 'content_copy', text: '最近更新', href: '/recent' },
            { icon: 'content_copy', text: '热度榜单', href: '/hot' },

            { heading: '友情链接' },
            {
                links: [
                    { text: '奇异书屋', href: 'https://www.talebook.org' },
                    { text: '芒果读书', href: 'http://diumx.com/' },
                    { text: '陈芸书屋', href: 'https://book.killsad.top/' },
                ],
            },

            { heading: '系统管理' },
            { icon: 'settings', text: '管理入口', href: "/settings" },
            { icon: 'settings', text: '安装页面', href: "/install" },
            { icon: 'settings', text: '入口密码', href: "/welcome" },
            { icon: 'help', text: '系统版本' },
        ],
        sysinfo: {
            version: "v2.1.1",
            update: "2019-06-09",
            total: 10855,
            active: 198,
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

<style>

.link-friend {
    text-align: center;
}

</style>
