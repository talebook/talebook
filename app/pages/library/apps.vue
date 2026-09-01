<template>
    <div>
        <RoutePageToolbar :description="t('navigationSections.libraryAppsDescription')" />
        <div class="app-access-page">
            <v-alert
                v-if="!store.user.is_login"
                type="info"
                variant="tonal"
                class="mb-4"
            >
                <div class="d-flex align-center flex-wrap ga-3">
                    <span>{{ t('appAccess.loginHint') }}</span>
                    <v-btn
                        size="small"
                        variant="text"
                        :to="{ path: '/login', query: { next: '/library/apps' } }"
                    >
                        {{ t('messages.pleaseLogin') }}
                    </v-btn>
                </div>
            </v-alert>

            <div class="app-access-grid">
                <article class="app-access-card">
                    <div class="app-access-card__icon">
                        <v-icon>mdi-book-open-page-variant-outline</v-icon>
                    </div>
                    <div class="app-access-card__body">
                        <div class="app-access-card__title">
                            <h2>Moke</h2>
                            <v-chip
                                color="primary"
                                size="x-small"
                                variant="tonal"
                            >
                                {{ t('appAccess.officialClient') }}
                            </v-chip>
                        </div>
                        <p>{{ t('appAccess.mokeDescription') }}</p>
                        <div
                            v-if="store.user.is_login"
                            class="app-access-card__connection"
                        >
                            <span>{{ t('appAccess.serverAddress') }}</span>
                            <code>{{ origin }}</code>
                        </div>
                        <v-btn
                            href="https://github.com/talebook/moke/releases"
                            target="_blank"
                            rel="noopener noreferrer"
                            size="small"
                            variant="text"
                            append-icon="mdi-open-in-new"
                        >
                            {{ t('appAccess.downloadMoke') }}
                        </v-btn>
                    </div>
                </article>

                <article
                    id="opds-guide"
                    class="app-access-card"
                >
                    <div class="app-access-card__icon">
                        <v-icon>mdi-rss</v-icon>
                    </div>
                    <div class="app-access-card__body">
                        <div class="app-access-card__title">
                            <h2>OPDS</h2>
                            <v-chip
                                v-if="store.user.is_login"
                                :color="opdsEnabled ? 'success' : undefined"
                                size="x-small"
                                variant="tonal"
                            >
                                {{ opdsEnabled ? t('appAccess.enabled') : t('appAccess.disabled') }}
                            </v-chip>
                        </div>
                        <p>{{ t('appAccess.opdsDescription') }}</p>
                        <div
                            v-if="store.user.is_login"
                            class="app-access-card__connection"
                        >
                            <span>{{ t('appAccess.connectionAddress') }}</span>
                            <code>{{ opdsUrl }}</code>
                            <small>{{ t('appAccess.accountHint') }}</small>
                        </div>
                        <v-alert
                            v-if="store.user.is_login && !opdsEnabled"
                            type="warning"
                            variant="tonal"
                            density="compact"
                            class="mb-3"
                        >
                            {{ t('opdsPage.closedMessage') }}
                        </v-alert>
                        <div class="app-access-card__guide">
                            <section>
                                <h3>{{ t('opdsPage.commonReaders') }}</h3>
                                <ul>
                                    <li>
                                        <strong>KyBook</strong>：{{ t('opdsPage.iosReaderDesc') }}
                                        <a
                                            href="https://apps.apple.com/app/kybook/id1049898139"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >{{ t('opdsPage.download') }}</a>
                                    </li>
                                    <li>
                                        <strong>静读天下</strong>：{{ t('opdsPage.androidReaderDesc') }}
                                        <a
                                            href="https://play.google.com/store/apps/details?id=com.flyersoft.moonreader"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >{{ t('opdsPage.download') }}</a>
                                    </li>
                                </ul>
                            </section>
                            <section>
                                <h3>{{ t('opdsPage.configGuide') }}</h3>
                                <ol>
                                    <li>{{ t('opdsPage.steps.addLibrary') }}</li>
                                    <li>{{ t('opdsPage.steps.enterLink') }}</li>
                                    <li>{{ t('opdsPage.steps.authenticate') }}</li>
                                    <li>{{ t('opdsPage.steps.browse') }}</li>
                                </ol>
                            </section>
                            <section>
                                <h3>{{ t('opdsPage.noteTitle') }}</h3>
                                <p>{{ t('opdsPage.readerNote') }}</p>
                                <ul>
                                    <li>{{ t('opdsPage.noteAllowDownload') }}</li>
                                </ul>
                            </section>
                            <p class="app-access-card__related-guide">
                                {{ t('opdsPage.webdavDesc') }}
                                <a href="#webdav-guide">{{ t('opdsPage.webdavLink') }}</a>
                            </p>
                        </div>
                    </div>
                </article>

                <article
                    id="webdav-guide"
                    class="app-access-card"
                >
                    <div class="app-access-card__icon">
                        <v-icon>mdi-folder-network-outline</v-icon>
                    </div>
                    <div class="app-access-card__body">
                        <div class="app-access-card__title">
                            <h2>WebDAV</h2>
                            <v-chip
                                v-if="store.user.is_login"
                                :color="webdavEnabled ? 'success' : undefined"
                                size="x-small"
                                variant="tonal"
                            >
                                {{ webdavEnabled ? t('appAccess.enabled') : t('appAccess.disabled') }}
                            </v-chip>
                        </div>
                        <p>{{ t('appAccess.webdavDescription') }}</p>
                        <div
                            v-if="store.user.is_login"
                            class="app-access-card__connection"
                        >
                            <span>{{ t('appAccess.connectionAddress') }}</span>
                            <code>{{ webdavUrl }}</code>
                            <small>{{ t('appAccess.accountHint') }}</small>
                        </div>
                        <v-alert
                            v-if="store.user.is_login && !webdavEnabled"
                            type="warning"
                            variant="tonal"
                            density="compact"
                            class="mb-3"
                        >
                            {{ t('webdavPage.closedMessage') }}
                        </v-alert>
                        <div class="app-access-card__guide">
                            <p>{{ t('webdavPage.accountTip') }}</p>
                            <section>
                                <h3>{{ t('webdavPage.commonClients') }}</h3>
                                <ul>
                                    <li><strong>Windows 文件资源管理器</strong>：{{ t('webdavPage.windowsDesc') }}</li>
                                    <li><strong>macOS Finder</strong>：{{ t('webdavPage.macosDesc') }}</li>
                                    <li><strong>ES 文件浏览器 / Solid Explorer</strong>：{{ t('webdavPage.androidDesc') }}</li>
                                </ul>
                            </section>
                            <section>
                                <h3>{{ t('webdavPage.configGuide') }}</h3>
                                <ol>
                                    <li>{{ t('webdavPage.steps.openClient') }}</li>
                                    <li>{{ t('webdavPage.steps.enterLink') }}</li>
                                    <li>{{ t('webdavPage.steps.enterAccount') }}</li>
                                    <li>{{ t('webdavPage.steps.browse') }}</li>
                                </ol>
                            </section>
                            <section>
                                <h3>{{ t('webdavPage.noteTitle') }}</h3>
                                <p>{{ t('webdavPage.clientNote') }}</p>
                                <ul>
                                    <li>{{ t('webdavPage.noteUseAccount') }}</li>
                                </ul>
                            </section>
                        </div>
                    </div>
                </article>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import RoutePageToolbar from '@/components/RoutePageToolbar.vue';
import { useMainStore } from '@/stores/main';
import { useI18n } from 'vue-i18n';

const store = useMainStore();
const { t } = useI18n();
const requestUrl = useRequestURL();
const origin = `${requestUrl.protocol}//${requestUrl.host}`;
const opdsUrl = `${origin}/opds/`;
const webdavUrl = `${origin}/books/`;
const opdsEnabled = computed(() => store.sys.opds_enabled !== false);
const webdavEnabled = computed(() => store.sys.webdav_enabled !== false);
</script>

<style scoped>
.app-access-page {
    margin: 0 auto;
    max-width: 960px;
}

.app-access-grid {
    display: grid;
    gap: 12px;
}

.app-access-card {
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 10px;
    display: grid;
    gap: 14px;
    grid-template-columns: 40px minmax(0, 1fr);
    padding: 18px;
    scroll-margin-top: 112px;
}

.app-access-card__icon {
    align-items: center;
    background: rgba(var(--v-theme-primary), .1);
    border-radius: 9px;
    color: rgb(var(--v-theme-primary));
    display: flex;
    height: 40px;
    justify-content: center;
    width: 40px;
}

.app-access-card__title {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.app-access-card h2 {
    font-size: 1.05rem;
    line-height: 1.4;
    margin: 0;
}

.app-access-card p {
    color: rgba(var(--v-theme-on-surface), .7);
    font-size: .875rem;
    margin: 4px 0 10px;
}

.app-access-card__connection {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
}

.app-access-card__connection span,
.app-access-card__connection small {
    color: rgba(var(--v-theme-on-surface), .62);
    font-size: .75rem;
}

.app-access-card__connection code {
    background: rgba(var(--v-theme-on-surface), .06);
    border-radius: 5px;
    max-width: 100%;
    overflow-wrap: anywhere;
    padding: 5px 7px;
}

.app-access-card__guide {
    border-top: 1px solid rgba(var(--v-theme-on-surface), .12);
    color: rgba(var(--v-theme-on-surface), .76);
    font-size: .875rem;
    margin-top: 14px;
    padding-top: 14px;
}

.app-access-card__guide section + section {
    margin-top: 16px;
}

.app-access-card__guide h3 {
    color: rgb(var(--v-theme-on-surface));
    font-size: .9375rem;
    line-height: 1.4;
    margin: 0 0 6px;
}

.app-access-card__guide p {
    color: inherit;
    margin: 0 0 8px;
}

.app-access-card__guide ul,
.app-access-card__guide ol {
    display: grid;
    gap: 5px;
    margin: 0;
    padding-inline-start: 22px;
}

.app-access-card__guide a {
    color: rgb(var(--v-theme-primary));
}

.app-access-card__related-guide {
    margin-top: 16px !important;
}

@media (max-width: 600px) {
    .app-access-card {
        grid-template-columns: 32px minmax(0, 1fr);
        padding: 14px;
    }

    .app-access-card__icon {
        height: 32px;
        width: 32px;
    }
}
</style>
