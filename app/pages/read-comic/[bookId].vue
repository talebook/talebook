<template>
    <main class="comic-reader-page">
        <section
            v-if="pending"
            class="comic-reader-state"
            aria-live="polite"
        >
            <v-progress-circular
                indeterminate
                color="primary"
                size="48"
            />
            <p>{{ t('comicReader.loading') }}</p>
        </section>

        <section
            v-else-if="error || !readerManifest"
            class="comic-reader-state comic-reader-state--error"
            role="alert"
        >
            <v-icon
                color="error"
                size="56"
            >
                mdi-alert-circle
            </v-icon>
            <h1>{{ t('comicReader.loadError') }}</h1>
            <p>{{ errorMessage }}</p>
            <div class="comic-reader-state__actions">
                <v-btn
                    color="primary"
                    prepend-icon="mdi-refresh"
                    @click="reload"
                >
                    {{ t('common.retry') }}
                </v-btn>
                <v-btn
                    variant="tonal"
                    prepend-icon="mdi-arrow-left"
                    :to="`/book/${bookId}`"
                >
                    {{ t('comicReader.backToBook') }}
                </v-btn>
            </div>
        </section>

        <template v-else>
            <div
                ref="readerHost"
                class="comic-reader-host"
                data-testid="comic-reader-host"
            />
            <section
                v-if="readerLoading"
                class="comic-reader-state comic-reader-state--module"
                aria-live="polite"
            >
                <v-progress-circular
                    indeterminate
                    color="primary"
                    size="48"
                />
                <p>{{ t('comicReader.loading') }}</p>
            </section>
            <div
                v-if="readerError"
                class="comic-reader-notice"
                role="alert"
            >
                <span>{{ readerError }}</span>
                <button
                    type="button"
                    @click="reload"
                >
                    {{ t('common.retry') }}
                </button>
            </div>
            <div
                v-else-if="progressError"
                class="comic-reader-notice comic-reader-notice--warning"
                role="status"
            >
                {{ progressError }}
            </div>
        </template>
    </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';
import {
    toInitialProgress,
    toReaderManifest,
    toStoredProgress,
    type PageManifest,
    type ReaderError,
    type ReaderExit,
    type ReaderProgress,
    type StandaloneComicReader,
    type StandaloneComicReaderModule,
    type TalebookComicManifest,
} from '~/utils/comic-reader';

definePageMeta({ layout: 'blank' });

const route = useRoute();
const store = useMainStore();
const { $backend } = useNuxtApp();
const { t } = useI18n();

const READER_VERSION = 'd49a2e808601c7fc9b892a6c019a92eed017fd16';
const READER_MODULE_URL = `/static/komga-reader/komga-reader.es.js?v=${READER_VERSION}`;
const READER_STYLE_URL = `/static/komga-reader/style.css?v=${READER_VERSION}`;

const bookId = computed(() => Number(route.params.bookId));
const readerHost = ref<HTMLElement | null>(null);
const readerLoading = ref(true);
const readerError = ref('');
const progressError = ref('');
let standaloneReader: StandaloneComicReader | undefined;
let componentActive = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let queuedProgress: ReaderProgress | undefined;

store.setNavbar(false);

const { data, pending, error, refresh } = await useAsyncData(
    () => `comic-reader-${bookId.value}`,
    async () => {
        if (!Number.isInteger(bookId.value) || bookId.value <= 0) {
            throw new Error(t('comicReader.invalidBook'));
        }
        const [manifestResponse, progressResponse] = await Promise.all([
            $backend(`/book/${bookId.value}/comic/pages`),
            $backend(`/book/${bookId.value}/comic/progress`),
        ]);
        if (manifestResponse.err !== 'ok') {
            throw new Error(manifestResponse.msg || t('comicReader.loadErrorDescription'));
        }
        if (progressResponse.err !== 'ok') {
            throw new Error(progressResponse.msg || t('comicReader.progressLoadError'));
        }
        return {
            manifest: toReaderManifest(manifestResponse as TalebookComicManifest),
            progress: toInitialProgress(progressResponse.progress),
        };
    },
    { server: true },
);

const readerManifest = computed<PageManifest | null>(() => data.value?.manifest || null);
const initialProgress = computed(() => data.value?.progress || { pageIndex: 0 });
const errorMessage = computed(() => error.value?.message || t('comicReader.loadErrorDescription'));

async function mountReader() {
    standaloneReader?.destroy();
    standaloneReader = undefined;
    readerLoading.value = true;
    await nextTick();
    if (!componentActive || !readerHost.value || !readerManifest.value) return;

    try {
        const browserModule = await import(/* @vite-ignore */ READER_MODULE_URL) as StandaloneComicReaderModule;
        if (!componentActive || !readerHost.value || !readerManifest.value) return;
        standaloneReader = new browserModule.Reader(readerHost.value, {
            manifest: readerManifest.value,
            initialProgress: initialProgress.value,
            onProgress: queueProgress,
            onExit: handleExit,
            onError: handleReaderError,
        });
        readerLoading.value = false;
    } catch {
        readerLoading.value = false;
        readerError.value = t('comicReader.readerError');
    }
}

async function saveProgress(progress: ReaderProgress) {
    const response = await $backend(`/book/${bookId.value}/comic/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: toStoredProgress(progress) }),
    });
    if (response.err !== 'ok') {
        throw new Error(response.msg || t('comicReader.progressSaveError'));
    }
    progressError.value = '';
}

function queueProgress(progress: ReaderProgress) {
    queuedProgress = progress;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        const value = queuedProgress;
        queuedProgress = undefined;
        if (!value) return;
        try {
            await saveProgress(value);
        } catch {
            progressError.value = t('comicReader.progressSaveError');
        }
    }, 250);
}

async function handleExit(event: ReaderExit) {
    if (saveTimer) clearTimeout(saveTimer);
    queuedProgress = undefined;
    try {
        await saveProgress(event.progress);
    } catch {
        progressError.value = t('comicReader.progressSaveError');
    }
    await navigateTo(`/book/${bookId.value}`);
}

function handleReaderError(event: ReaderError) {
    readerError.value = event.code === 'image-load'
        ? t('comicReader.imageLoadError')
        : (event.message || t('comicReader.readerError'));
}

async function reload() {
    readerError.value = '';
    progressError.value = '';
    await refresh();
    await mountReader();
}

useHead({
    title: () => readerManifest.value?.title || t('comicReader.title'),
    bodyAttrs: { class: 'comic-reader-body' },
    link: [{ rel: 'stylesheet', href: READER_STYLE_URL }],
});

onMounted(() => {
    componentActive = true;
    void mountReader();
});

onBeforeUnmount(() => {
    componentActive = false;
    standaloneReader?.destroy();
    standaloneReader = undefined;
    if (saveTimer) clearTimeout(saveTimer);
    store.setNavbar(true);
});
</script>

<style scoped>
.comic-reader-page {
    position: relative;
    width: 100%;
    height: 100dvh;
    min-height: 420px;
    color: #f8fafc;
    background: #111827;
    overflow: hidden;
}

.comic-reader-host,
.comic-reader-page :deep(.kr-reader) {
    width: 100%;
    height: 100%;
}

.comic-reader-state {
    display: flex;
    width: min(640px, calc(100% - 32px));
    height: 100%;
    margin: auto;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 18px;
    text-align: center;
}

.comic-reader-state h1,
.comic-reader-state p {
    margin: 0;
}

.comic-reader-state p {
    max-width: 560px;
    color: #cbd5e1;
}

.comic-reader-state--module {
    position: absolute;
    z-index: 10;
    inset: 0;
    color: #f8fafc;
    background: #111827;
}

.comic-reader-state__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
}

.comic-reader-notice {
    position: fixed;
    z-index: 20;
    top: max(76px, env(safe-area-inset-top));
    left: 50%;
    display: flex;
    max-width: min(560px, calc(100vw - 24px));
    padding: 10px 14px;
    align-items: center;
    gap: 12px;
    color: #fff;
    background: rgba(185, 28, 28, .94);
    border-radius: 12px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, .34);
    transform: translateX(-50%);
}

.comic-reader-notice--warning {
    background: rgba(146, 64, 14, .94);
}

.comic-reader-notice button {
    flex: none;
    color: inherit;
    font-weight: 700;
    text-decoration: underline;
}

:global(body.comic-reader-body) {
    overflow: hidden;
    overscroll-behavior: none;
}

@media (max-width: 600px) {
    .comic-reader-page {
        min-height: 320px;
    }

    .comic-reader-notice {
        top: max(64px, env(safe-area-inset-top));
    }
}
</style>
