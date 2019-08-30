<template>
    <v-layout wrap >
        <template v-for="nav in navs">
        <v-flex :key="nav.legend">
            <h2>{{nav.legend}}</h2>
            <v-chip v-for="item in nav.tags" :key="item.name" outline :color="item.count != 0 ? 'primary': 'default'" >
                {{item.name}}
                <span v-if="item.count">&nbsp;({{item.count}})</span>
            </v-chip>
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
