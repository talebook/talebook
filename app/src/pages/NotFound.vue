<template>
<v-layout align-center justify-center>
    <v-flex xs12 text-center>
        <p class="msg">
        Ooops! Not Found!
        <br/>
        <a href="/">Back to Home Page</a>
        </p>
    </v-flex>
</v-layout>
</template>

<script>
export default {
    created() {
        this.$store.commit("puremode", true);
    },
    data: () => ({
    }),
    methods: {
    },
}
</script>

<style scoped>
.msg {
    text-align: center;
}
</style>
