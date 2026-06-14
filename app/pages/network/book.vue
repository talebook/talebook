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

                <!-- 保存进度 -->
                <div
                    v-if="saveState"
                    class="mt-4"
                    style="max-width: 420px"
                >
                    <template v-if="saveState.status === 'running'">
                        <v-progress-linear
                            :model-value="saveState.progress"
                            :indeterminate="!saveState.total"
                            color="success"
                            height="6"
                            rounded
                            class="mb-1"
                        />
                        <div class="text-caption text-medium-emphasis">
                            {{ saveState.total
                                ? $t('network.save.progress', { done: saveState.done, total: saveState.total })
                                : $t('network.save.preparing') }}
                        </div>
                    </template>
                    <v-alert
                        v-else-if="saveState.status === 'completed'"
                        type="success"
                        variant="tonal"
                        density="compact"
                    >
                        {{ $t('network.save.completed') }}
                        <NuxtLink
                            v-if="saveState.book_id"
                            :to="`/book/${saveState.book_id}`"
                            class="ml-2"
                        >
                            {{ $t('network.save.viewBook') }}
                        </NuxtLink>
                    </v-alert>
                    <v-alert
                        v-else-if="saveState.status === 'failed'"
                        type="error"
                        variant="tonal"
                        density="compact"
                    >
                        {{ $t('network.save.failed', { msg: saveState.error }) }}
                    </v-alert>
                    <v-alert
                        v-else-if="saveState.status === 'lost'"
                        type="info"
                        variant="tonal"
                        density="compact"
                    >
                        {{ $t('network.save.lost') }}
                    </v-alert>
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
            @started="onSaveStarted"
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

// 保存到本地的后台进度（按 source_id+book_url 轮询）
const saveState = ref(null);
let saveToken = 0;
let saveMisses = 0;
const SAVE_POLL_INTERVAL = 1500;
const SAVE_MAX_MISSES = 3; // 连续查不到/请求失败 N 次才判定丢失，容忍瞬时错误与任务注册竞态
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 本会话是否对该书发起过保存：仅此时进入页面才恢复进度，避免每次打开详情页都白白请求
const saveFlagKey = () => `network_save:${sourceId.value}:${bookUrl.value}`;
const setSaveFlag = () => process.client && sessionStorage.setItem(saveFlagKey(), '1');
const clearSaveFlag = () => process.client && sessionStorage.removeItem(saveFlagKey());

const fetchSaveStatus = async () => {
    const rsp = await $backend(
        `/network/save/status?source_id=${sourceId.value}&book_url=${encodeURIComponent(bookUrl.value)}`,
    );
    return rsp && rsp.err === 'ok' ? rsp : null;
};

const applyTerminal = (s) => {
    saveState.value = {
        status: s.status === 'completed' ? 'completed' : 'failed',
        done: s.done || 0,
        total: s.total || 0,
        book_id: s.book_id || 0,
        error: s.error || '',
    };
    clearSaveFlag();
};

// 轮询直到完成/失败/任务丢失，或被新一轮取代（token 失配）
const pollSave = async (token) => {
    while (token === saveToken) {
        const s = await fetchSaveStatus();
        if (token !== saveToken) return;
        if (!s || !s.found) {
            // 瞬时错误或任务尚未注册：宽限重试，连续多次才判定丢失（内存任务可能因后端重启丢失）
            saveMisses += 1;
            if (saveMisses >= SAVE_MAX_MISSES) {
                saveState.value = saveState.value ? { status: 'lost' } : null;
                clearSaveFlag();
                return;
            }
            await sleep(SAVE_POLL_INTERVAL);
            continue;
        }
        saveMisses = 0;
        if (s.status === 'running') {
            saveState.value = {
                status: 'running',
                progress: s.progress || 0,
                done: s.done || 0,
                total: s.total || 0,
            };
            await sleep(SAVE_POLL_INTERVAL);
            continue;
        }
        applyTerminal(s);
        return;
    }
};

const onSaveStarted = () => {
    saveMisses = 0;
    setSaveFlag();
    saveState.value = { status: 'running', progress: 0, done: 0, total: 0 };
    pollSave(++saveToken);
};

// 进入/刷新页面时，仅当本会话发起过保存才恢复其进度
const resumeSave = async () => {
    if (!process.client || !sessionStorage.getItem(saveFlagKey())) return;
    const s = await fetchSaveStatus();
    if (!s || !s.found) {
        clearSaveFlag();
        return;
    }
    if (s.status === 'running') {
        saveMisses = 0;
        saveState.value = { status: 'running', progress: s.progress || 0, done: s.done || 0, total: s.total || 0 };
        pollSave(++saveToken);
    } else {
        applyTerminal(s);
    }
};

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

    // 进入/刷新页面时，仅当本会话发起过保存才恢复其进度
    await resumeSave();
});

onBeforeUnmount(() => {
    // 让进行中的轮询因 token 失配而退出
    saveToken += 1;
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
