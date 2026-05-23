<template>
    <div
        id="txt-main"
        :class="mainStore.theme === 'dark' ? 'v-theme--dark' : 'v-theme--light'"
    >
        <v-navigation-drawer
            v-model="sidebar"
            :order="1"
            width="240"
            :theme="mainStore.theme"
        >
            <v-list-subheader
                class="d-flex align-center px-4"
                style="height: 48px; font-size: 14px; font-weight: 500;"
            >
                {{ name }}
            </v-list-subheader>
            <v-virtual-scroll
                style="height: calc(100% - 48px)"
                :items="chapters"
                :item-height="48"
            >
                <template #default="{ item, index }">
                    <v-list-item
                        :key="index"
                        :active="selected === index"
                        color="primary"
                        @click="getContent(index)"
                    >
                        <v-list-item-title style="font-size: 13px; font-weight: 500;">
                            {{ item.name }}
                        </v-list-item-title>
                    </v-list-item>
                </template>
            </v-virtual-scroll>
        </v-navigation-drawer>

        <v-app-bar
            class="px-0"
            :color="mainStore.theme === 'light' ? 'blue' : undefined"
            density="compact"
            :theme="mainStore.theme"
        >
            <v-app-bar-nav-icon @click.stop="sidebar = !sidebar" />
            <v-toolbar-title class="ml-2">
                {{ name }}
            </v-toolbar-title>
            <v-spacer />
            <v-btn
                icon
                @click="mainStore.toggleTheme()"
            >
                <v-icon>{{ mainStore.theme === 'light' ? 'mdi-weather-night' : 'mdi-weather-sunny' }}</v-icon>
            </v-btn>
        </v-app-bar>

        <div class="content-area">
            <v-container>
                <div
                    v-if="loading"
                    class="d-flex justify-center align-content-center"
                    style="margin-bottom: 20px"
                >
                    <v-progress-circular
                        color="primary"
                        indeterminate
                        size="28"
                        style="margin-right: 10px"
                    />
                    {{ t('book.loading') }}
                </div>
                <div
                    v-show="!loading"
                    class="novel-content"
                    v-html="novelContent"
                />
                <div
                    v-show="!loading"
                    class="d-flex justify-space-between mt-4"
                >
                    <v-btn
                        color="info"
                        elevation="0"
                        :disabled="selected === 0"
                        @click="getContent(selected - 1)"
                    >
                        {{ t('book.previousChapter') }}
                    </v-btn>
                    <v-btn
                        v-show="!sidebar"
                        variant="outlined"
                        elevation="0"
                        @click="sidebar = true"
                    >
                        {{ t('book.tableOfContents') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        elevation="0"
                        :disabled="selected === chapters.length - 1"
                        @click="getContent(selected + 1)"
                    >
                        {{ t('book.nextChapter') }}
                    </v-btn>
                </div>
            </v-container>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/stores/main';

definePageMeta({ layout: 'blank' });

const { t } = useI18n();
const route = useRoute();
const mainStore = useMainStore();
const { $backend } = useNuxtApp();

const sourceId = ref(route.query.source_id);
const sidebar = ref(false);
const chapters = ref([]);
const name = ref('');
const selected = ref(-1);
const novelContent = ref('');
const loading = ref(true);

const getContent = (i) => {
    if (i < 0 || i >= chapters.value.length || selected.value === i) return;
    selected.value = i;
    const ch = chapters.value[i];
    loading.value = true;
    $backend(
        `/network/content?source_id=${sourceId.value}&chapter_url=${encodeURIComponent(ch.url)}`,
    )
        .then((res) => {
            if (res.err !== 'ok') {
                novelContent.value = t('book.contentError') + (res.msg || res.err);
                return;
            }
            const body = (res.content || '').split('\n').map((p) => `<p>${p}</p>`).join('');
            novelContent.value = `<h3>${ch.name}</h3><br>${body}`;
        })
        .finally(() => {
            loading.value = false;
            if (process.client) window.scrollTo({ top: 0, behavior: 'smooth' });
        });
};

onMounted(() => {
    mainStore.setNavbar(false);
    if (process.client) {
        const raw = sessionStorage.getItem('network_toc');
        if (raw) {
            const data = JSON.parse(raw);
            chapters.value = data.chapters || [];
            name.value = data.name || '';
            if (data.sourceId) sourceId.value = data.sourceId;
        }
    }
    const idx = parseInt(route.query.index || '0');
    getContent(isNaN(idx) ? 0 : idx);
});
</script>

<style scoped>
#txt-main {
    background-color: #f5f5f5;
    min-height: 100vh;
}
#txt-main.v-theme--dark {
    background-color: #121212;
}
.content-area {
    color: #333;
}
#txt-main.v-theme--dark .content-area {
    color: #e0e0e0;
}
.novel-content {
    word-wrap: break-word;
    line-height: 1.8;
}
#txt-main.v-theme--dark .novel-content :deep(h3),
#txt-main.v-theme--dark .novel-content :deep(p) {
    color: #e0e0e0;
}
</style>
