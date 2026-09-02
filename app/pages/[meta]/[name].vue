
<template>
    <div>
        <AuthorAliasPanel
            v-if="route.params.meta === 'author'"
            :name="String(route.params.name)"
        />
        <BookList />
    </div>
</template>

<script setup>
import { useRoute } from 'vue-router';
import AuthorAliasPanel from '~/components/AuthorAliasPanel.vue';
import BookList from '~/components/BookList.vue';

const route = useRoute();
</script>
