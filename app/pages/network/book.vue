<template>
    <div>
        <v-row v-if="book">
            <v-col
                cols="12"
                sm="3"
            >
                <v-img
                    :src="book.cover_url"
                    :aspect-ratio="11 / 15"
                    cover
                    class="rounded"
                />
            </v-col>
            <v-col
                cols="12"
                sm="9"
            >
                <h2>{{ book.name }}</h2>
                <div class="text-body-2 mt-2">
                    <span class="mr-4">{{ $t('network.author') }}：{{ book.author || '-' }}</span>
                    <SerializeStatusBadge :status="serializeStatus" />
                </div>
                <div
                    v-if="book.last_chapter"
                    class="text-body-2 mt-1"
                >
                    {{ $t('network.lastChapter') }}：{{ book.last_chapter }}
                </div>
                <div class="text-body-2 mt-2 book-intro">
                    {{ book.intro }}
                </div>
                <div class="mt-4">
                    <v-btn
                        color="primary"
                        class="mr-2"
                        :disabled="chapters.length === 0"
                        @click="readFrom(0)"
                    >
                        {{ $t('network.readOnline') }}
                    </v-btn>
                    <v-btn
                        color="success"
                        @click="saveDialog?.open()"
                    >
                        {{ $t('network.saveToLocal') }}
                    </v-btn>
                </div>
            </v-col>

            <v-col cols="12">
                <v-divider class="my-3" />
                <h3 class="text-subtitle-1 mb-2">
                    {{ $t('network.chapters') }}（{{ chapters.length }}）
                </h3>
                <div
                    v-if="tocLoading"
                    class="d-flex align-center"
                >
                    <v-progress-circular
                        indeterminate
                        size="22"
                        class="mr-2"
                    />
                    {{ $t('network.searching') }}
                </div>
                <v-row v-else>
                    <v-col
                        v-for="(ch, idx) in chapters"
                        :key="idx"
                        cols="12"
                        sm="6"
                        md="4"
                    >
                        <a
                            class="chapter-link"
                            @click="readFrom(idx)"
                        >{{ ch.name }}</a>
                    </v-col>
                </v-row>
            </v-col>
        </v-row>

        <SaveOnlineDialog
            ref="saveDialog"
            :source-id="sourceId"
            :book-url="bookUrl"
        />
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import SerializeStatusBadge from '~/components/SerializeStatusBadge.vue';
import SaveOnlineDialog from '~/components/SaveOnlineDialog.vue';
import { useMainStore } from '@/stores/main';

const { t } = useI18n();
const store = useMainStore();
const route = useRoute();
const router = useRouter();
const { $backend, $alert } = useNuxtApp();

store.setNavbar(true);

const sourceId = ref(route.query.source_id);
const bookUrl = ref(route.query.book_url || '');
const book = ref(null);
const chapters = ref([]);
const tocUrl = ref('');
const serializeStatus = ref('unknown');
const tocLoading = ref(true);
const saveDialog = ref(null);

const readFrom = (idx) => {
    const ch = chapters.value[idx];
    if (!ch) return;
    const q = new URLSearchParams({
        source_id: sourceId.value,
        chapter_url: ch.url,
        index: String(idx),
    });
    // 章节列表通过 sessionStorage 传递，避免超长 URL
    if (process.client) {
        sessionStorage.setItem('network_toc', JSON.stringify({
            name: book.value?.name,
            sourceId: sourceId.value,
            chapters: chapters.value,
        }));
    }
    router.push(`/network/read?${q.toString()}`);
};

const loadToc = async () => {
    tocLoading.value = true;
    try {
        const rsp = await $backend(
            `/network/toc?source_id=${sourceId.value}&book_url=${encodeURIComponent(bookUrl.value)}`,
        );
        if (rsp.err === 'ok') {
            chapters.value = rsp.chapters || [];
            serializeStatus.value = rsp.serialize_status || 'unknown';
        } else if ($alert) {
            $alert('error', rsp.msg || rsp.err);
        }
    } finally {
        tocLoading.value = false;
    }
};

onMounted(async () => {
    const rsp = await $backend(
        `/network/book?source_id=${sourceId.value}&book_url=${encodeURIComponent(bookUrl.value)}`,
    );
    if (rsp.err === 'ok') {
        book.value = rsp.book;
        tocUrl.value = rsp.toc_url;
        await loadToc();
    } else if ($alert) {
        $alert('error', rsp.msg || rsp.err);
    }
});

useHead(() => ({ title: book.value?.name || t('network.title') }));
</script>

<style scoped>
.book-intro {
    white-space: pre-wrap;
    max-height: 200px;
    overflow-y: auto;
}
.chapter-link {
    cursor: pointer;
    color: rgb(var(--v-theme-primary));
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
