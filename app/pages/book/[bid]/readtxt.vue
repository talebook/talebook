<template>
    <div id="txt-main">
        <v-navigation-drawer
            v-model="sidebar"
            location="start"
            temporary
            width="240"
            class="d-flex flex-column"
            style="height: 100%"
        >
            <v-list-subheader style="height: 48px">
                {{ name }}
            </v-list-subheader>
            <v-virtual-scroll
                style="height: calc(100% - 48px)"
                :items="content"
                :item-height="40"
            >
                <template #default="{ item, index }">
                    <v-list-item
                        :key="item.title"
                        dense
                        :active="selected === index"
                        color="primary"
                        @click="getNovelContent(index)"
                    >
                        <v-list-item-title>
                            {{ item.title }}
                        </v-list-item-title>
                    </v-list-item>
                </template>
            </v-virtual-scroll>
        </v-navigation-drawer>

        <v-app-bar
            class="px-0"
            color="blue"
            density="compact"
            theme="dark"
        >
            <v-app-bar-title class="mr-12 align-center d-flex">
                <v-app-bar-nav-icon @click.stop="sidebar = !sidebar">
                    <v-icon>mdi-menu</v-icon>
                </v-app-bar-nav-icon>
                <span
                    class="cursor-pointer ml-2"
                    @click="router.push('/')"
                >
                    {{ name }}
                </span>
            </v-app-bar-title>
        </v-app-bar>

        <div style="margin-top: 64px;">
            <v-container>
                <v-card
                    v-if="!inited"
                    variant="outlined"
                    width="300"
                    style="margin: 0 auto"
                >
                    <v-card-title ref="tipTitle">
                        {{ tip.title }}
                    </v-card-title>
                    <v-card-text ref="tip">
                        {{ tip.content }}
                    </v-card-text>
                </v-card>
                <div v-else>
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
                        加载中...
                    </div>
                    <div
                        v-show="!loading"
                        style="word-wrap: break-word"
                        v-html="novelContent"
                    />
                    <div
                        v-show="novelContent && !loading"
                        class="d-flex justify-space-between mt-4"
                    >
                        <v-btn
                            color="info"
                            elevation="0"
                            :disabled="selected===0"
                            @click="getNovelContent(selected-1)"
                        >
                            上一章
                        </v-btn>
                        <v-btn
                            v-show="!sidebar"
                            variant="outlined"
                            elevation="0"
                            @click="sidebar=true"
                        >
                            目录
                        </v-btn>
                        <v-btn
                            color="primary"
                            elevation="0"
                            :disabled="selected===content.length-1"
                            @click="getNovelContent(selected+1)"
                        >
                            下一章
                        </v-btn>
                    </div>
                </div>
                <app-footer v-if="mainStore.nav" />
            </v-container>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useMainStore } from '@/stores/main';
import AppFooter from '~/components/AppFooter.vue';

definePageMeta({
    layout: 'blank'
});

const route = useRoute();
const router = useRouter();
const mainStore = useMainStore();
const { $backend } = useNuxtApp();

const bookid = route.params.bid;
const sidebar = ref(false);
const content = ref([]);
const inited = ref(false);
const wait = ref(0);
const name = ref(null);
const novelContent = ref('');
const selected = ref(-1);
const loading = ref(true);
const { t } = useI18n();
const tip = reactive({
    title: t('messages.parsing'),
    content: t('messages.parsingContent')
});

let intvl = null;

onMounted(() => {
    mainStore.setNavbar(false);
    init();
});

onUnmounted(() => {
    if (intvl) clearInterval(intvl);
});

const init = () => {
    loading.value = true;
    $backend(`/book/txt/init?id=${bookid}&test=0`)
        .then(rsp => {
            if (rsp.err !== 'ok') {
                tip.title = '错误';
                tip.content = rsp.msg;
                return;
            }
            if (rsp.msg === '已解析') {
                inited.value = true;
                content.value = rsp.data.content;
                name.value = rsp.data.name;
                getNovelContent(0);
            } else {
                wait.value = parseInt(rsp.data.wait);
                let queLen = parseInt(rsp.data.que);
                name.value = rsp.data.name;
                if (queLen > 0) {
                    tip.title = '队列中';
                    tip.content = '前方等待' + queLen + '个转换待完成，已步入后台队列';
                    return;
                }
                intvl = setInterval(() => {
                    wait.value--;
                    tip.content = '首次阅读，正在解析目录，请稍后... ' + wait.value;
                    if (wait.value <= 0) {
                        clearInterval(intvl);
                        tip.content = '超时未完成，可继续等待稍后刷新尝试';
                        tip.title = '解析超时';
                        return;
                    }
                    if (wait.value % 5 !== 0) return;
                    $backend(`/book/txt/init?id=${bookid}&test=1`,)
                        .then(res => {
                            if (res.err === 'ok' && res.msg === '已解析') {
                                inited.value = true;
                                content.value = res.data.content;
                                name.value = res.data.name;
                                getNovelContent(0);
                                clearInterval(intvl);
                            }
                        });
                }, 1000);
            }
        }).finally(() => {
            loading.value = false;
        });
};

const getNovelContent = (i) => {
    if (selected.value === i) return;
    selected.value = i;
    const {title, start, end} = {...content.value[i]};
    loading.value = true;
    // console.log(title, start, end)
    $backend(`/read/txt?id=${bookid}&start=${start}&end=${end}`)
        .then(res => {
            if (res.err !== 'ok') {
                novelContent.value = '获取正文失败！' + res.msg;
                return;
            }
            novelContent.value = `<h3>${title}</h3><br>${res.content}`;
        }).finally(() => {
            loading.value = false;
            if (process.client) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
};
</script>

<style scoped>
#txt-main {
    background-color: #f5f5f5;
    min-height: 100vh;
}
</style>
