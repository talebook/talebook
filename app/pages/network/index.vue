<template>
    <div>
        <v-row>
            <v-col cols="12">
                <h2>{{ $t('network.title') }}</h2>
                <v-divider class="mt-3 mb-0" />
            </v-col>

            <v-col cols="12">
                <v-form @submit.prevent="doSearch">
                    <v-text-field
                        v-model="keyword"
                        :label="$t('network.search')"
                        :placeholder="$t('network.searchPlaceholder')"
                        prepend-inner-icon="mdi-magnify"
                        variant="solo"
                        hide-details
                        clearable
                        @keyup.enter="doSearch"
                    >
                        <template #append>
                            <v-btn
                                color="primary"
                                :loading="loading"
                                @click="doSearch"
                            >
                                {{ $t('common.search') }}
                            </v-btn>
                        </template>
                    </v-text-field>
                </v-form>
            </v-col>

            <v-col
                v-if="sources.length > 0"
                cols="12"
            >
                <div class="d-flex align-center flex-wrap">
                    <span class="mr-3">{{ $t('network.sources') }}{{ $t('messages.colon') }}</span>
                    <v-chip
                        :color="selected.length === 0 ? 'primary' : undefined"
                        label
                        size="small"
                        class="mr-1 mb-1"
                        @click="selected = []"
                    >
                        {{ $t('network.allSources') }}
                    </v-chip>
                    <v-chip
                        v-for="s in sources"
                        :key="s.id"
                        :color="selected.includes(s.id) ? 'primary' : undefined"
                        label
                        size="small"
                        class="mr-1 mb-1"
                        @click="toggleSource(s.id)"
                    >
                        {{ s.name }}
                    </v-chip>
                </div>
            </v-col>

            <v-col
                v-else
                cols="12"
            >
                <v-alert
                    type="info"
                    variant="tonal"
                >
                    {{ $t('network.noSource') }}
                </v-alert>
            </v-col>

            <v-col
                v-if="partial.length > 0"
                cols="12"
            >
                <v-alert
                    type="warning"
                    variant="tonal"
                    density="compact"
                >
                    {{ $t('network.partialFailed') }}：{{ partial.map(p => p.source_name).join('、') }}
                </v-alert>
            </v-col>

            <v-col
                v-for="group in results"
                :key="group.source_id"
                cols="12"
            >
                <h3 class="text-subtitle-1 mb-2">
                    {{ group.source_name }}
                </h3>
                <BookCards :books="toCards(group)" />
            </v-col>

            <v-col
                v-if="searched && results.length === 0 && !loading"
                cols="12"
            >
                <v-alert
                    type="info"
                    variant="tonal"
                >
                    {{ $t('network.noResult') }}
                </v-alert>
            </v-col>
        </v-row>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import BookCards from '~/components/BookCards.vue';
import { useMainStore } from '@/stores/main';

const { t } = useI18n();
const store = useMainStore();
const { $backend, $alert } = useNuxtApp();

store.setNavbar(true);

const sources = ref([]);
const selected = ref([]);
const keyword = ref('');
const results = ref([]);
const partial = ref([]);
const loading = ref(false);
const searched = ref(false);

const toggleSource = (id) => {
    const i = selected.value.indexOf(id);
    if (i >= 0) selected.value.splice(i, 1);
    else selected.value.push(id);
};

const toCards = (group) => {
    return (group.books || []).map((b) => ({
        id: b.book_url,
        title: b.name,
        img: b.cover_url,
        comments: [b.author, b.intro].filter(Boolean).join(' · '),
        href: `/network/book?source_id=${group.source_id}&book_url=${encodeURIComponent(b.book_url)}`,
    }));
};

const doSearch = async () => {
    const key = (keyword.value || '').trim();
    if (!key) return;
    loading.value = true;
    searched.value = true;
    results.value = [];
    partial.value = [];
    try {
        let url = `/network/search?key=${encodeURIComponent(key)}`;
        if (selected.value.length > 0) url += `&sources=${selected.value.join(',')}`;
        const rsp = await $backend(url);
        if (rsp.err === 'ok') {
            results.value = (rsp.results || []).filter((g) => (g.books || []).length > 0);
            partial.value = rsp.partial || [];
        } else if ($alert) {
            $alert('error', rsp.msg || rsp.err);
        }
    } finally {
        loading.value = false;
    }
};

onMounted(async () => {
    const rsp = await $backend('/network/sources');
    if (rsp.err === 'ok') sources.value = rsp.items || [];
});

useHead(() => ({ title: t('network.title') }));
</script>
