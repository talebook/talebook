
<template>
    <div class="opds-page">
        <!-- OPDS Section -->
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

        <hr
            v-if="opdsEnabled"
            class="my-6"
        >

        <!-- WebDAV Section -->
        <template v-if="webdavRunning">
            <h1>{{ t('opdsPage.webdavTitle') }}</h1>
            <section>
                <p>{{ t('opdsPage.webdavYourLink') }} <code>{{ webdavUrl }}</code></p>
                <p class="mt-2">{{ t('opdsPage.webdavNote') }}</p>
            </section>
            <section>
                <h2>{{ t('opdsPage.webdavClients') }}</h2>
                <ul>
                    <li>{{ t('opdsPage.webdavClientES') }}</li>
                    <li>{{ t('opdsPage.webdavClientDocuments') }}</li>
                    <li>{{ t('opdsPage.webdavClientJidu') }}</li>
                    <li>{{ t('opdsPage.webdavClientFinder') }}</li>
                </ul>
            </section>
            <section>
                <h2>{{ t('opdsPage.webdavSteps') }}</h2>
                <ol>
                    <li>{{ t('opdsPage.webdavStepUrl') }}</li>
                    <li>{{ t('opdsPage.webdavStepAuth') }}</li>
                    <li>{{ t('opdsPage.webdavStepBrowse') }}</li>
                </ol>
            </section>
        </template>
        <template v-else>
            <h1>{{ t('opdsPage.webdavDisabledTitle') }}</h1>
            <section>
                <div class="error-message">
                    <p>{{ t('opdsPage.webdavDisabledMessage') }}</p>
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
const webdavRunning = ref(false);
const webdavUrl = ref('');

onMounted(() => {
    $backend('/admin/settings').then(rsp => {
        if (rsp.err === 'ok') {
            opdsEnabled.value = rsp.settings.OPDS_ENABLED !== false;
        }
    });

    $backend('/webdav/status').then(rsp => {
        if (rsp && rsp.err === 'ok') {
            webdavRunning.value = rsp.running;
            webdavUrl.value = `${url.protocol}//${url.hostname}:${rsp.port}`;
        }
    });
});

useHead(() => ({
    title: t('opdsPage.pageTitle')
}));
</script>
