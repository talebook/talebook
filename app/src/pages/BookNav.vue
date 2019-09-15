<template>
    <v-row>
        <template v-for="nav in navs">
        <v-col cols=12 :key="nav.legend">
            <h2>{{nav.legend}}</h2>
            <v-btn rounded small class="ma-1" v-for="item in nav.tags" :to="'/tag/'+item.name" :key="item.name" outlined :color="item.count != 0 ? 'primary': 'grey'" >
                {{item.name}}
                <span v-if="item.count">&nbsp;({{item.count}})</span>
            </v-btn>
        </v-col>
        </template>
    </v-row>
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
        this.backend("/book/nav")
        .then(rsp => {
            this.navs = rsp.navs;
            this.$store.commit('loaded');
        })
    },

}
</script>

<style>

</style>
