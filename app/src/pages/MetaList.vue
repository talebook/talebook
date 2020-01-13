<template>
    <v-row>
        <template v-if="meta == 'rating'">
            <v-col cols=4 sm=2 v-for="item in items" :key="item.name" >
                <v-chip :to="item.href" outlined color="primary" >
                    {{item.name}}星
                    <span v-if="item.count">&nbsp;({{item.count}})</span>
                </v-chip>
            </v-col>
        </template >
        <v-col v-else>
            <v-chip small class="ma-1" v-for="item in items" :to="item.href" :key="item.name" outlined color="primary" >
                {{item.name}}
                <span v-if="item.count">&nbsp;({{item.count}})</span>
            </v-chip>
            <v-btn v-if="total > items.length" @click="expand()" color="primary" rounded small>显示全部...</v-btn>
        </v-col>
    </v-row>
</template>

<script>
export default {
    components: {
    },
    computed: {
        page_cnt: function() {
            return parseInt(this.total/this.page_size);
        },
        items: function() {
            var prefix = "/" + this.$route.params.meta + "/";
            return this.data.map(d => {
                d.href = prefix + d.name;
                return d;
            });
        },
    },
    data: () => ({
        meta: "",
        title: "",
        page: 0,
        data: [],
        total: 0,
        show_all: false,
        page_size: 20,
    }),
    created() {
        this.init(this.$route);
    },
    beforeRouteEnter(to, from, next) {
        next();
    },
    beforeRouteUpdate(to, from, next) {
        this.init(to, next);
    },
    methods: {
        init(route, next) {
            this.$store.commit('navbar', true);
            this.$store.commit('loading');
            this.meta = route.params.meta;
            this.backend("/"+this.meta + (this.show_all?"?show=all":"") )
            .then(rsp => {
                this.title = rsp.title;
                this.data = rsp.items;
                this.total = rsp.total;
                this.$store.commit('loaded');
            })
            if ( next ) next()
        },
        expand() {
            this.show_all = !this.show_all;
            this.init(this.$route);
        },
    },
}
</script>

<style>

</style>
