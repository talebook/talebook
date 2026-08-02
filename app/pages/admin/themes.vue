<template>
    <div>
        <v-card class="my-2 elevation-4">
            <v-card-title class="theme-page-head">
                <span>{{ $t('theme.title') }}</span>
            </v-card-title>
            <v-card-text>
                <v-row class="theme-grid">
                    <v-col
                        v-for="theme in displayThemes"
                        :key="theme._key"
                        cols="12"
                        sm="6"
                        md="4"
                        class="theme-col"
                    >
                        <v-card
                            :color="theme.active ? 'primary' : undefined"
                            :variant="theme.active ? 'tonal' : 'outlined'"
                            :class="['theme-card', { 'theme-card--active': theme.active }]"
                            :data-theme-name="theme.name"
                        >
                            <div class="theme-card-head">
                                <v-icon
                                    :color="theme.active ? 'primary' : 'default'"
                                    class="theme-card-icon"
                                >
                                    {{ theme._isDefault ? 'mdi-palette-outline' : 'mdi-palette' }}
                                </v-icon>
                                <span class="theme-card-title">{{ theme.display_name || theme.name }}</span>
                                <v-icon
                                    v-if="theme.active"
                                    color="primary"
                                    class="theme-card-check"
                                >
                                    mdi-check-circle
                                </v-icon>
                                <v-chip
                                    v-if="theme.active"
                                    color="primary"
                                    size="x-small"
                                    class="theme-card-chip"
                                >
                                    {{ $t('theme.active') }}
                                </v-chip>
                            </div>
                            <div class="theme-card-meta text-caption text-medium-emphasis">
                                <template v-if="!theme._isDefault">
                                    v{{ theme.version }}
                                    <span v-if="theme.author"> · {{ theme.author }}</span>
                                </template>
                            </div>
                            <div class="theme-card-desc text-body-2">
                                {{ theme.description }}
                            </div>
                            <div class="theme-card-actions">
                                <v-btn
                                    size="small"
                                    :color="theme.active ? undefined : 'primary'"
                                    :variant="theme.active ? 'text' : 'tonal'"
                                    :disabled="theme.active"
                                    :loading="activating === theme._key"
                                    @click="activateTheme(theme._key)"
                                >
                                    {{ theme.active ? $t('theme.active') : $t('theme.activate') }}
                                </v-btn>
                            </div>
                        </v-card>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <v-snackbar
            v-model="snackbar.show"
            :color="snackbar.color"
            timeout="3000"
        >
            {{ snackbar.msg }}
        </v-snackbar>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useNuxtApp } from 'nuxt/app';
import { useThemeStore } from '@/stores/theme';
import { useMainStore } from '@/stores/main';
import { buildThemeDisplayList } from '@/utils/theme-display';

const { $backend } = useNuxtApp();
const { t } = useI18n();
const themeStore = useThemeStore();
const mainStore = useMainStore();

const themes = ref([]);
const activating = ref('');

const displayThemes = computed(() => buildThemeDisplayList(themes.value, t));

const snackbar = ref({ show: false, msg: '', color: 'success' });

function showMsg(msg, color = 'success') {
    snackbar.value = { show: true, msg, color };
}

async function fetchThemes() {
    const res = await $backend('/themes');
    if (res.err === 'ok') {
        themes.value = res.themes;
    }
}

async function activateTheme(key) {
    activating.value = key;
    try {
        let res;
        if (key === '__default__') {
            res = await themeStore.deactivate();
        } else {
            res = await themeStore.activate(key);
        }
        if (res.err === 'ok') {
            showMsg(res.msg || '已激活');
            // 激活会写入 auto.py 触发服务器自动重启，此处仅在本地翻转激活标记，
            // 不再重新拉取列表，避免请求撞上重启窗口而误报“服务器正在重启中”。
            themes.value = themes.value.map(theme => ({
                ...theme,
                active: key !== '__default__' && theme.name === key,
            }));
        } else {
            showMsg(res.msg || '激活失败', 'error');
        }
    } finally {
        activating.value = '';
    }
}

onMounted(async () => {
    mainStore.setNavbar(true);
    await fetchThemes();
});
</script>

<style scoped>
.theme-page-head {
    align-items: center;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    padding: 16px;
}

.theme-grid {
    align-items: stretch;
}

.theme-col {
    display: flex;
}

.theme-card {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 176px;
    padding: 16px;
    width: 100%;
}

.theme-card--active {
    border-color: rgb(var(--v-theme-primary)) !important;
    box-shadow: 0 0 0 1px rgba(var(--v-theme-primary), .36) !important;
}

.theme-card-head {
    align-items: center;
    display: flex;
    gap: 8px;
    min-height: 30px;
    min-width: 0;
}

.theme-card-icon {
    flex: 0 0 auto;
}

.theme-card-title {
    flex: 1 1 auto;
    font-weight: 700;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.theme-card-chip {
    flex: 0 0 auto;
}

.theme-card-check {
    flex: 0 0 auto;
    font-size: 20px;
}

.theme-card-meta {
    min-height: 20px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.theme-card-desc {
    display: -webkit-box;
    flex: 1 1 auto;
    line-clamp: 3;
    margin-top: 4px;
    min-height: 60px;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
}

.theme-card-actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
    min-height: 32px;
}
</style>
