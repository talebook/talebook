<template>
<v-row align-center justify=center>
    <v-col xs=12 text-center>
        <p class="msg">
        Ooops! Not Found!
        <br/>
        <a href="/">Back to Home Page</a>
        </p>
    </v-col>
</v-row>
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
