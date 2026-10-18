<template>
    <section>
        <div class="directory-heading">
            <h1 class="text-h5">
                {{ t('directories.title') }}
            </h1>
            <v-btn
                variant="outlined"
                :disabled="booksLoading || treeLoading.size > 0"
                @click="refresh"
            >
                {{ t('common.refresh') }}
            </v-btn>
        </div>
        <p class="text-body-2 my-3">
            {{ t('directories.description') }}
        </p>
        <div class="directory-browser">
            <v-card
                variant="outlined"
                class="directory-sidebar"
            >
                <v-card-title class="text-subtitle-1">
                    {{ t('directories.tree') }}
                </v-card-title>
                <p class="text-body-2 px-4 mb-2">
                    {{ t('directories.countHint') }}
                </p>
                <v-progress-linear
                    v-if="treeLoading.size"
                    indeterminate
                    :aria-label="t('book.loading')"
                />
                <v-alert
                    v-if="treeError"
                    type="error"
                    variant="tonal"
                    class="ma-2"
                    role="alert"
                >
                    {{ t('directories.loadFailed') }}
                    <v-btn
                        variant="text"
                        @click="loadChildren(failedPath)"
                    >
                        {{ t('common.retry') }}
                    </v-btn>
                </v-alert>
                <nav
                    :aria-label="t('directories.tree')"
                    data-testid="directory-tree"
                >
                    <v-virtual-scroll
                        :items="visibleNodes"
                        :height="420"
                        :item-height="48"
                    >
                        <template #default="{ item }">
                            <div
                                class="directory-node"
                                :style="{ paddingInlineStart: `${Math.min(item.depth, 8) * 12}px` }"
                            >
                                <v-btn
                                    v-if="item.has_children"
                                    :icon="expanded.has(item.path) ? 'mdi-chevron-down' : 'mdi-chevron-right'"
                                    :aria-label="t(expanded.has(item.path) ? 'directories.collapse' : 'directories.expand', { name: item.name })"
                                    :aria-expanded="expanded.has(item.path)"
                                    :loading="treeLoading.has(item.path)"
                                    size="small"
                                    variant="text"
                                    @click="toggle(item.path)"
                                />
                                <span
                                    v-else
                                    class="directory-node__spacer"
                                />
                                <button
                                    type="button"
                                    class="directory-node__select"
                                    :class="{ 'directory-node__select--active': selected === item.path }"
                                    :aria-current="selected === item.path ? 'true' : undefined"
                                    :title="item.path"
                                    :data-directory-path="item.path"
                                    @click="selectDirectory(item.path)"
                                >
                                    <span class="directory-node__name">{{ item.name }}</span>
                                    <span>{{ item.count }}</span>
                                </button>
                            </div>
                        </template>
                    </v-virtual-scroll>
                </nav>
                <p
                    v-if="children['']?.length === 0 && !treeLoading.size"
                    class="pa-4"
                    role="status"
                >
                    {{ t('directories.noDirectories') }}
                </p>
            </v-card>
            <div
                class="directory-books"
                :aria-busy="booksLoading"
            >
                <template v-if="selected">
                    <h2
                        class="text-h6 directory-path"
                        data-testid="directory-selected-path"
                    >
                        {{ selected }}
                    </h2>
                    <v-checkbox
                        :model-value="recursive"
                        :label="t('directories.recursive')"
                        :disabled="booksLoading"
                        density="compact"
                        hide-details
                        data-testid="directory-recursive"
                        @update:model-value="setRecursive(Boolean($event))"
                    />
                    <p
                        class="text-body-2 mb-3"
                        role="status"
                    >
                        {{ t('directories.bookCount', { count: total }) }}
                    </p>
                    <v-progress-linear
                        v-if="booksLoading"
                        indeterminate
                        :aria-label="t('book.loading')"
                    />
                    <v-alert
                        v-else-if="booksError"
                        type="error"
                        variant="tonal"
                        role="alert"
                    >
                        {{ t('directories.loadFailed') }}
                        <v-btn
                            variant="text"
                            @click="loadBooks"
                        >
                            {{ t('common.retry') }}
                        </v-btn>
                    </v-alert>
                    <template v-else>
                        <BookCards :books="books" />
                        <p
                            v-if="!books.length"
                            class="pa-4"
                            role="status"
                        >
                            {{ t('directories.empty') }}
                        </p>
                        <AppPagination
                            v-if="pages > 1"
                            :model-value="page"
                            :length="pages"
                            :disabled="booksLoading"
                            @update:model-value="setPage"
                        />
                    </template>
                </template>
                <p
                    v-else
                    class="pa-6"
                    role="status"
                >
                    {{ t('directories.choose') }}
                </p>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useNuxtApp, useRoute, useRouter, useHead } from 'nuxt/app';
import { useI18n } from 'vue-i18n';
import BookCards from '@/components/BookCards.vue';
import AppPagination from '@/components/AppPagination.vue';
import { useMainStore } from '@/stores/main';

interface Directory { path: string; name: string; count: number; has_children: boolean }
const { t } = useI18n();
const { $backend } = useNuxtApp();
const route = useRoute();
const router = useRouter();
useMainStore().setNavbar(true);
useHead(() => ({ title: t('directories.title') }));
const selected = computed(() => typeof route.query.path === 'string' ? route.query.path : '');
const page = computed(() => {
    const n = Number(route.query.page || 1);
    return Number.isSafeInteger(n) && n > 0 ? n : 1;
});
const recursive = computed(() => route.query.recursive === '1');
const children = reactive<Record<string, Directory[]>>({});
const expanded = reactive(new Set<string>());
const treeLoading = reactive(new Set<string>());
const treeError = ref(false);
const failedPath = ref('');
const books = ref<Array<Record<string, unknown>>>([]);
const total = ref(0);
const booksLoading = ref(false);
const booksError = ref(false);
const pageSize = 60;
const pages = computed(() => Math.ceil(total.value / pageSize));
let disposed = false;
let booksSequence = 0;
const pending = new Map<string, Promise<void>>();
const visibleNodes = computed(() => {
    const result: (Directory & { depth: number })[] = [];
    function walk(parent: string, depth: number) {
        for (const item of children[parent] || []) {
            result.push({ ...item, depth });
            if (expanded.has(item.path)) walk(item.path, depth + 1);
        }
    }
    walk('', 0);
    return result;
});
async function loadChildren(path: string, fresh = false) {
    if (children[path] && !fresh) return;
    if (pending.has(path)) return pending.get(path);
    treeLoading.add(path);
    treeError.value = false;
    const task = (async () => {
        try {
            const rsp = await $backend('/library/directories?' + new URLSearchParams({ path, children_only: '1', refresh: fresh ? '1' : '0' }));
            if (rsp.err !== 'ok') throw new Error(rsp.err);
            if (!disposed) children[path] = rsp.directories || [];
        } catch {
            if (!disposed) { treeError.value = true; failedPath.value = path; }
        } finally {
            treeLoading.delete(path);
            pending.delete(path);
        }
    })();
    pending.set(path, task);
    return task;
}
async function revealSelection() {
    await loadChildren('');
    let nodes = children[''] || [];
    while (!disposed && selected.value) {
        const parent = nodes.find(n => selected.value.startsWith(n.path + '/'));
        if (!parent) break;
        expanded.add(parent.path);
        await loadChildren(parent.path);
        nodes = children[parent.path] || [];
    }
}
async function toggle(path: string) {
    if (expanded.has(path)) expanded.delete(path);
    else { expanded.add(path); await loadChildren(path); }
}
function selectDirectory(path: string) {
    router.push({ query: { ...route.query, path, page: '1' } });
}
function setPage(value: number) {
    router.push({ query: { ...route.query, page: String(value) } });
}
function setRecursive(value: boolean) {
    router.push({ query: { ...route.query, recursive: value ? '1' : undefined, page: '1' } });
}
async function loadBooks() {
    const seq = ++booksSequence;
    books.value = [];
    total.value = 0;
    booksError.value = false;
    booksLoading.value = false;
    if (!selected.value) return;
    booksLoading.value = true;
    try {
        const query = new URLSearchParams({ path: selected.value, start: String((page.value - 1) * pageSize), size: String(pageSize), recursive: recursive.value ? '1' : '0' });
        const rsp = await $backend('/library/directories?' + query);
        if (disposed || seq !== booksSequence) return;
        if (rsp.err !== 'ok') throw new Error(rsp.err);
        books.value = rsp.books || [];
        total.value = rsp.total || 0;
        if (pages.value > 0 && page.value > pages.value) {
            await router.replace({ query: { ...route.query, page: String(pages.value) } });
        }
    } catch {
        if (!disposed && seq === booksSequence) booksError.value = true;
    } finally {
        if (!disposed && seq === booksSequence) booksLoading.value = false;
    }
}
async function refresh() {
    for (const key of Object.keys(children)) delete children[key];
    await loadChildren('', true);
    await Promise.allSettled([revealSelection(), loadBooks()]);
}
watch(() => route.fullPath, () => { loadBooks(); revealSelection(); });
onMounted(() => { loadBooks(); revealSelection(); });
onBeforeUnmount(() => { disposed = true; booksSequence++; });
</script>

<style scoped>
.directory-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; }
.directory-browser { display: grid; grid-template-columns: minmax(240px, 300px) minmax(0, 1fr); gap: 1rem; align-items: start; }
.directory-sidebar { min-width: 0; position: sticky; top: 64px; }
.directory-books { min-width: 0; }
.directory-node { display: flex; align-items: center; height: 48px; min-width: 0; padding-inline-end: 8px; }
.directory-node__spacer { flex: 0 0 40px; }
.directory-node__select { display: flex; gap: 0.5rem; align-items: center; justify-content: space-between; flex: 1; min-width: 0; min-height: 40px; padding: 6px; text-align: start; border-inline-start: 3px solid transparent; }
.directory-node__select--active { border-inline-start-color: rgb(var(--v-theme-primary)); font-weight: 700; background: rgba(var(--v-theme-primary), .12); }
.directory-node__select:focus-visible { outline: 2px solid rgb(var(--v-theme-on-surface)); outline-offset: -2px; }
.directory-node__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.directory-path { overflow-wrap: anywhere; }
@media (max-width: 800px) {
    .directory-browser { grid-template-columns: minmax(0, 1fr); }
    .directory-sidebar { position: static; }
}
</style>
