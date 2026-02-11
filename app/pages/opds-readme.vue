
<template>
    <div class="opds-page">
        <template v-if="opdsEnabled">
                <h1>{{ t('opdsPage.title') }}</h1>
            <section>
                <h2>{{ t('opdsPage.links') }}</h2>
                <p>{{ t('opdsPage.yourLink') }} <code>{{ opdsUrl }}</code></p>
            </section>
            <section>
                <h2>{{ t('opdsPage.commonReaders') }}</h2>
                <ul>
                    <li>
                        <strong>KyBook</strong>：{{ t('opdsPage.iosReaderDesc') }} <a
                            href="https://apps.apple.com/app/kybook/id1049898139"
                            target="_blank"
                            rel="noopener noreferrer"
                        >{{ t('opdsPage.download') }}</a>
                    </li>
                    <li>
                        <strong>静读天下</strong>：{{ t('opdsPage.androidReaderDesc') }} <a
                            href="https://play.google.com/store/apps/details?id=com.flyersoft.moonreader"
                            target="_blank"
                            rel="noopener noreferrer"
                        >{{ t('opdsPage.download') }}</a>
                    </li>
                </ul>
            </section>
            <section>
                <h2>{{ t('opdsPage.configGuide') }}</h2>
                <ol>
                    <li>{{ t('opdsPage.steps.addLibrary') }}</li>
                    <li>{{ t('opdsPage.steps.enterLink') }}</li>
                    <li>{{ t('opdsPage.steps.authenticate') }}</li>
                    <li>{{ t('opdsPage.steps.browse') }}</li>
                </ol>

                <h2>{{ t('opdsPage.noteTitle') }}</h2>
                <p>{{ t('opdsPage.readerNote') }}</p>
                <ol>
                    <li>{{ t('opdsPage.noteAllowDownload') }}</li>
                </ol>
            </section>
        </template>
        <template v-else>
            <h1>{{ t('opdsPage.closedTitle') }}</h1>
            <section>
                <div class="error-message">
                    <p>{{ t('opdsPage.closedMessage') }}</p>
                </div>
            </section>
        </template>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRequestURL, useNuxtApp } from 'nuxt/app';
import { useI18n } from 'vue-i18n';

const url = useRequestURL();
const opdsUrl = `${url.protocol}//${url.host}/opds/`;
const { $backend } = useNuxtApp();
const { t } = useI18n();
const opdsEnabled = ref(true);

onMounted(() => {
    // 获取OPDS服务状态
    $backend('/admin/settings').then(rsp => {
        if (rsp.err === 'ok') {
            opdsEnabled.value = rsp.settings.OPDS_ENABLED !== false;
        }
    });
});

useHead(() => ({
    title: t('opds.title')
}));
</script>

<style scoped>
.opds-page {
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
