<template>
    <v-layout wrap >
        <template v-for="nav in navs">
        <v-flex :key="nav.legend">
            <h2>{{nav.legend}}</h2>
            <v-btn round small v-for="item in nav.tags" :to="'/tag/'+item.name" :key="item.name" outline :color="item.count != 0 ? 'primary': 'grey'" >
                {{item.name}}
                <span v-if="item.count">&nbsp;({{item.count}})</span>
            </v-btn>
        </v-flex>
        </template>
    </v-layout>
</template>

<script>
export default {
    components: {
    },
    computed: {
    },
    data: () => ({
        navs: [],
    }),
    created() {
        this.$store.commit('navbar', true);
        this.$store.commit('loading');
        this.backend("/book/nav?fmt=json")
        .then(rsp => rsp.json())
        .then(rsp => {
            this.navs = rsp.navs;
            this.$store.commit('loaded');
        })
    },

}
</script>

<style>

</style>
