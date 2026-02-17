<template>
    <v-app dark>
        <h1 v-if="error.statusCode === 404">
            {{ $t('error.pageNotFound') }}
        </h1>
        <h1 v-else>
            {{ $t('error.otherError') }}
        </h1>
        <NuxtLink to="/">
            {{ $t('common.home') }}
        </NuxtLink>
    </v-app>
</template>

<script>
export default {
    name: 'EmptyLayout',
    layout: 'empty',

    props: {
        error: {
            type: Object,
            default: null,
        },
    },

    data() {
        return {};
    },
    head() {
        const title = this.error && this.error.statusCode === 404 ? this.$t('error.pageNotFound') : this.$t('error.otherError');
        return {
            title,
        };
    },
    created() {
    //this.$store.commit("puremode", true);
    },
};
</script>

<style scoped>
h1 {
  font-size: 20px;
}
.msg {
  text-align: center;
}
</style>

