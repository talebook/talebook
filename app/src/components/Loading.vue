<template>
    <div v-show="$store.state.loading" class="loading-page">
        <v-progress-circular indeterminate size=128 color="deep-orange lighten-2"></v-progress-circular>
    </div>
</template>

<script>
export default {
    data: () => ({
    }),
};
</script>

<style scoped>
.loading-page {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
    background: white;
    text-align: center;
    padding-top: 200px;
    font-size: 30px;
    font-family: sans-serif;
}
</style>
