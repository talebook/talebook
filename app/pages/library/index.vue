<template>
    <div />
</template>

<script setup>
definePageMeta({
    redirect: to => ({ path: '/library/local', query: to.query, hash: to.hash }),
});
</script>
