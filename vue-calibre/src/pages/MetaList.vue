<template>
    <v-layout wrap >
        <v-flex>
            <v-chip v-for="item in items" @click="$router.push(item.href)" :key="item.name" outline color="primary" >
                {{item.name}}
                <span v-if="item.count">&nbsp;({{item.count}})</span>
            </v-chip>
        </v-flex>
    </v-layout>
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
        this.$store.commit('loading');
        var meta = this.$route.params.meta;
        this.backend("/"+meta+"?fmt=json")
        .then(rsp => rsp.json())
        .then(rsp => {
            this.title = rsp.title;
            this.data = rsp.items;
            this.$store.commit('loaded');
        })
    },

}
</script>

<style>

</style>
