<template>
    <div>
        <v-tabs
            v-model="activeTab"
            class="mb-4"
        >
            <v-tab :value="0">
                {{ t('user.readingRecord.currentlyReading') }} [{{ readingCount }}]
            </v-tab>
            <v-tab :value="1">
                {{ t('user.readingRecord.finishedReading') }} [{{ finishedCount }}]
            </v-tab>
            <v-tab :value="2">
                {{ t('user.readingRecord.readingRecord') }}
            </v-tab>
        </v-tabs>

        <v-tabs-window v-model="activeTab">
            <v-tabs-window-item :value="0">
                <BookCoverGrid
                    :books="readingBooks"
                    :empty-text="t('user.readingRecord.noCurrentlyReading')"
                    key-prefix="reading"
                />
            </v-tabs-window-item>

            <v-tabs-window-item :value="1">
                <BookCoverGrid
                    :books="finishedBooks"
                    :empty-text="t('user.readingRecord.noFinishedReading')"
                    key-prefix="finished"
                />
            </v-tabs-window-item>

            <v-tabs-window-item :value="2">
                <div
                    v-if="history.length === 0"
                    class="text-center py-8 text-grey"
                >
                    {{ t('user.history.noHistory') }}
                </div>
                <template v-else>
                    <div
                        v-for="item in history"
                        :key="item.name"
                    >
                        <v-row>
                            <v-col cols="12">
                                <legend>{{ item.name }}</legend>
                                <v-divider class="mb-2" />
                            </v-col>
                        </v-row>
                        <BookCoverGrid
                            :books="item.books"
                            :empty-text="t('user.history.noRecords')"
                            :key-prefix="'history-' + item.name"
                        />
                    </div>
                </template>
            </v-tabs-window-item>
        </v-tabs-window>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import BookCoverGrid from '@/components/BookCoverGrid.vue';
import { useMainStore } from '@/stores/main';
import { useI18n } from 'vue-i18n';

const { $backend } = useNuxtApp();
const mainStore = useMainStore();
const route = useRoute();
const { t } = useI18n();

const activeTab = ref(route.query.tab === 'finished' ? 1 : 0);
const user = ref({});
const readingBooks = ref([]);
const finishedBooks = ref([]);

const readingCount = computed(() => readingBooks.value.length);
const finishedCount = computed(() => finishedBooks.value.length);

watch(() => route.query.tab, (tab) => {
    activeTab.value = tab === 'finished' ? 1 : 0;
});

useHead({
    title: t('user.readingRecord.pageTitle'),
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

const loadReadingBooks = async () => {
    try {
        const rsp = await $backend('/reading');
        if (rsp.err === 'ok') {
            readingBooks.value = rsp.books || [];
        }
    } catch (e) {
        console.error('Failed to load reading books:', e);
    }
};

const loadFinishedBooks = async () => {
    try {
        const rsp = await $backend('/read-done');
        if (rsp.err === 'ok') {
            finishedBooks.value = rsp.books || [];
        }
    } catch (e) {
        console.error('Failed to load finished books:', e);
    }
};

onMounted(() => {
    mainStore.setNavbar(true);
    loadReadingBooks();
    loadFinishedBooks();
    $backend('/user/info?detail=1')
        .then(rsp => {
            user.value = rsp.user;
        });
});
</script>
