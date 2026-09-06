
<template>
    <div class="webdav-page">
        <template v-if="webdavEnabled">
            <h1>{{ t('webdavPage.title') }}</h1>
            <section>
                <h2>{{ t('webdavPage.links') }}</h2>
                <p>{{ t('webdavPage.yourLink') }} <code>{{ webdavUrl }}</code></p>
                <p>{{ t('webdavPage.accountTip') }}</p>
            </section>
            <section>
                <h2>{{ t('webdavPage.commonClients') }}</h2>
                <ul>
                    <li>
                        <strong>Windows 文件资源管理器</strong>：{{ t('webdavPage.windowsDesc') }}
                    </li>
                    <li>
                        <strong>macOS Finder</strong>：{{ t('webdavPage.macosDesc') }}
                    </li>
                    <li>
                        <strong>ES 文件浏览器 / Solid Explorer</strong>：{{ t('webdavPage.androidDesc') }}
                    </li>
                </ul>
            </section>
            <section>
                <h2>{{ t('webdavPage.configGuide') }}</h2>
                <ol>
                    <li>{{ t('webdavPage.steps.openClient') }}</li>
                    <li>{{ t('webdavPage.steps.enterLink') }}</li>
                    <li>{{ t('webdavPage.steps.enterAccount') }}</li>
                    <li>{{ t('webdavPage.steps.browse') }}</li>
                </ol>

                <h2>{{ t('webdavPage.noteTitle') }}</h2>
                <p>{{ t('webdavPage.clientNote') }}</p>
                <ol>
                    <li>{{ t('webdavPage.noteUseAccount') }}</li>
                </ol>
            </section>
        </template>
        <template v-else>
            <h1>{{ t('webdavPage.closedTitle') }}</h1>
            <section>
                <div class="error-message">
                    <p>{{ t('webdavPage.closedMessage') }}</p>
                </div>
            </section>
        </template>
    </div>
</template>

<script setup>
import { withBasePath } from '@/utils/base-path';
import { ref, onMounted } from 'vue';
import { useRequestURL, useNuxtApp } from 'nuxt/app';
import { useI18n } from 'vue-i18n';

const url = useRequestURL();
const webdavUrl = `${url.protocol}//${url.host}${withBasePath('/books/')}`;
const { $backend } = useNuxtApp();
const { t } = useI18n();
const webdavEnabled = ref(true);

onMounted(() => {
    // 获取 WebDAV 服务状态
    $backend('/admin/settings').then(rsp => {
        if (rsp.err === 'ok') {
            webdavEnabled.value = rsp.settings.ENABLE_WEBDAV_SERVICE !== false;
        }
    });
});

useHead(() => ({
    title: t('webdavPage.title')
}));
</script>

<style scoped>
.webdav-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
}

section {
  margin-bottom: 30px;
}

h2 {
  margin-bottom: 15px;
}

ul, ol {
  padding-left: 20px;
}

code {
  background: #f5f5f5;
  padding: 2px 5px;
  border-radius: 3px;
}
</style>
