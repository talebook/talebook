<template>
    <div>
        <v-row
            v-if="history.length == 0"
            align="start"
        >
            <v-col cols="12">
                <p class="title">
                    {{ t('user.history.noHistory') }} <NuxtLink to="/">
                        {{ t('user.history.exploreBooks') }}
                    </NuxtLink>{{ t('user.history.exploreBooksEnd') }}
                </p>
            </v-col>
        </v-row>
        <v-row
            v-for="item in history"
            v-else
            :key="item.name"
        >
            <v-col cols="12">
                <legend>{{ item.name }}</legend>
                <v-divider />
            </v-col>
            <v-col
                v-if="item.books.length == 0"
                cols="12"
            >
                <p class="pb-6">
                    {{ t('user.history.noRecords') }}
                </p>
            </v-col>
            <v-col
                v-for="book in item.books"
                v-else
                :key="item.name + book.id"
                cols="4"
                sm="2"
            >
                <v-card
                    :to="book.href"
                    class="ma-1"
                >
                    <v-img
                        :src="book.img"
                        :aspect-ratio="11 / 15"
                    />
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMainStore } from '@/stores/main';
import { useI18n } from 'vue-i18n';

const { $backend } = useNuxtApp();
const mainStore = useMainStore();
const { t } = useI18n();
const user = ref({});

useHead({
    title: t('user.history.pageTitle'),
});

const get_history = (his) => {
    if (!his) { return []; }
    return his.map(b => {
        b.href = '/book/' + b.id;
        return b;
    });
};

const history = computed(() => {
    if (user.value.extra === undefined) { return []; }
    return [
        { name: t('user.history.onlineReading'), books: get_history(user.value.extra.read_history) },
        { name: t('user.history.pushedBooks'), books: get_history(user.value.extra.push_history) },
        { name: t('user.history.browseHistory'), books: get_history(user.value.extra.visit_history) },
    ];
});

onMounted(() => {
    mainStore.setNavbar(true);
    $backend('/user/info?detail=1')
        .then(rsp => {
            user.value = rsp.user;
        });
});
</script>

<style></style>
