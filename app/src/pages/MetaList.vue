<template>
    <v-row>
        <v-col>
            <v-chip v-for="item in items" :to="item.href" :key="item.name" outlined color="primary" >
                {{item.name}}
                <span v-if="item.count">&nbsp;({{item.count}})</span>
            </v-chip>
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
        title: "",
        page: 0,
        data: [],
        total: 0,
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
            var meta = route.params.meta;
            this.backend("/"+meta+"?fmt=json")
            .then(rsp => rsp.json())
            .then(rsp => {
                this.title = rsp.title;
                this.data = rsp.items;
                this.$store.commit('loaded');
            })
            if ( next ) next()
        },
    },
}
</script>

<style>

</style>
