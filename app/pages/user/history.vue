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
                {{ t('user.readingRecord.wantToRead') }} [{{ wantsCount }}]
            </v-tab>
            <v-tab :value="2">
                {{ t('user.readingRecord.finishedReading') }} [{{ finishedCount }}]
            </v-tab>
            <v-tab :value="3">
                {{ t('user.readingRecord.readingRecord') }}
            </v-tab>
        </v-tabs>

        <v-tabs-window v-model="activeTab">
            <v-tabs-window-item :value="0">
                <div v-if="readingBooks.length === 0" class="text-center py-8 text-grey">
                    {{ t('user.readingRecord.noCurrentlyReading') }}
                </div>
                <v-row v-else>
                    <v-col
                        v-for="book in readingBooks"
                        :key="'reading-' + book.id"
                        cols="4"
                        sm="2"
                    >
                        <v-card
                            :to="'/book/' + book.id"
                            class="ma-1"
                        >
                            <v-img
                                :src="book.img"
                                :aspect-ratio="11 / 15"
                            />
                        </v-card>
                    </v-col>
                </v-row>
            </v-tabs-window-item>

            <v-tabs-window-item :value="1">
                <div v-if="wantsBooks.length === 0" class="text-center py-8 text-grey">
                    {{ t('user.readingRecord.noWantToRead') }}
                </div>
                <v-row v-else>
                    <v-col
                        v-for="book in wantsBooks"
                        :key="'wants-' + book.id"
                        cols="4"
                        sm="2"
                    >
                        <v-card
                            :to="'/book/' + book.id"
                            class="ma-1"
                        >
                            <v-img
                                :src="book.img"
                                :aspect-ratio="11 / 15"
                            />
                        </v-card>
                    </v-col>
                </v-row>
            </v-tabs-window-item>

            <v-tabs-window-item :value="2">
                <div v-if="finishedBooks.length === 0" class="text-center py-8 text-grey">
                    {{ t('user.readingRecord.noFinishedReading') }}
                </div>
                <v-row v-else>
                    <v-col
                        v-for="book in finishedBooks"
                        :key="'finished-' + book.id"
                        cols="4"
                        sm="2"
                    >
                        <v-card
                            :to="'/book/' + book.id"
                            class="ma-1"
                        >
                            <v-img
                                :src="book.img"
                                :aspect-ratio="11 / 15"
                            />
                        </v-card>
                    </v-col>
                </v-row>
            </v-tabs-window-item>

            <v-tabs-window-item :value="3">
                <div v-if="history.length === 0" class="text-center py-8 text-grey">
                    {{ t('user.history.noHistory') }}
                </div>
                <template v-else>
                    <div v-for="item in history" :key="item.name">
                        <v-row>
                            <v-col cols="12">
                                <legend>{{ item.name }}</legend>
                                <v-divider class="mb-2" />
                            </v-col>
                        </v-row>
                        <v-row v-if="item.books.length > 0">
                            <v-col
                                v-for="book in item.books"
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
                        <v-row v-else>
                            <v-col cols="12">
                                <p class="pb-6 text-grey">
                                    {{ t('user.history.noRecords') }}
                                </p>
                            </v-col>
                        </v-row>
                    </div>
                </template>
            </v-tabs-window-item>
        </v-tabs-window>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMainStore } from '@/stores/main';
import { useI18n } from 'vue-i18n';

const { $backend } = useNuxtApp();
const mainStore = useMainStore();
const { t } = useI18n();

const activeTab = ref(0);
const user = ref({});
const readingBooks = ref([]);
const wantsBooks = ref([]);
const finishedBooks = ref([]);

const readingCount = computed(() => readingBooks.value.length);
const wantsCount = computed(() => wantsBooks.value.length);
const finishedCount = computed(() => finishedBooks.value.length);

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

const loadWantsBooks = async () => {
    try {
        const rsp = await $backend('/wants');
        if (rsp.err === 'ok') {
            wantsBooks.value = rsp.books || [];
        }
    } catch (e) {
        console.error('Failed to load wants books:', e);
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
    loadWantsBooks();
    loadFinishedBooks();
    $backend('/user/info?detail=1')
        .then(rsp => {
            user.value = rsp.user;
        });
});
</script>
