<template>
    <div>
        <v-row>
            <template
                v-for="nav in navs"
                :key="nav.legend"
            >
                <v-col
                    cols="12"
                >
                    <h2>{{ nav.legend }}</h2>
                    <v-btn
                        v-for="item in nav.tags"
                        :key="item.name"
                        rounded
                        small
                        class="ma-1"
                        :to="'/tag/'+encodeURIComponent(item.name)"
                        outlined
                        :color="item.count != 0 ? 'primary': 'grey'"
                    >
                        {{ item.name }}
                        <span v-if="item.count">&nbsp;({{ item.count }})</span>
                    </v-btn>
                </v-col>
            </template>
        </v-row>
        
        <!-- 空状态提示 -->
        <v-row
            v-if="!hasAnyBooks"
            class="empty-state"
        >
            <v-col cols="12">
                <v-card class="ma-1 pa-6 text-center">
                    <v-icon
                        large
                        color="grey lighten-2"
                    >
                        mdi-book-open-variant
                    </v-icon>
                    <h3 class="text-h6 grey--text">
                        本书库暂无藏书
                    </h3>
                    <p class="text-caption grey--text">
                        请先添加书籍到书库
                    </p>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<script>
export default {
    components: {
    },
    async asyncData({ params, app, res }) {
        if ( res !== undefined ) {
            res.setHeader('Cache-Control', 'no-cache');
        }
        return app.$backend('/book/nav');
    },
    data: () => ({
        navs: [],
    }),
    head: () => ({
        title: '书籍索引'
    }),
    computed: {
        hasAnyBooks: function() {
            // 检查是否有任何标签的count大于0
            for (let nav of this.navs) {
                for (let tag of nav.tags) {
                    if (tag.count > 0) {
                        return true;
                    }
                }
            }
            return false;
        },
    },
    created() {
        this.$store.commit('navbar', true);
    },
};
</script>
