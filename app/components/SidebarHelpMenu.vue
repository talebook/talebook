<template>
    <div class="sidebar-help">
        <v-menu
            location="top right"
            :close-on-content-click="true"
        >
            <template #activator="{ props }">
                <v-btn
                    v-bind="props"
                    class="sidebar-help__trigger"
                    icon="mdi-help-circle-outline"
                    size="small"
                    variant="text"
                    :aria-label="t('navigationHelp.openMenu')"
                />
            </template>

            <v-card
                class="sidebar-help__card"
                min-width="212"
            >
                <div
                    v-if="store.sys.sidebar_extra_html"
                    class="sidebar-help__logo press-content"
                    data-testid="sidebar-help-logo"
                    v-html="store.sys.sidebar_extra_html"
                />
                <div
                    v-else
                    class="sidebar-help__fallback-logo"
                    data-testid="sidebar-help-logo"
                >
                    {{ store.sys.title || 'Talebook' }}
                </div>

                <v-divider />
                <v-list
                    class="sidebar-help__list"
                    density="compact"
                >
                    <v-list-item
                        class="sidebar-help__item"
                        href="https://github.com/talebook/talebook/releases"
                        target="_blank"
                        rel="noopener noreferrer"
                        prepend-icon="mdi-history"
                        :title="t('navigationHelp.changelog')"
                        append-icon="mdi-open-in-new"
                    />
                    <v-list-item
                        class="sidebar-help__item"
                        href="https://github.com/talebook/talebook"
                        target="_blank"
                        rel="noopener noreferrer"
                        prepend-icon="mdi-github"
                        :title="t('navigationHelp.github')"
                        append-icon="mdi-open-in-new"
                    />
                    <v-list-item
                        v-if="store.sys.allow?.FEEDBACK && store.sys.FEEDBACK_URL"
                        class="sidebar-help__item"
                        :href="store.sys.FEEDBACK_URL"
                        target="_blank"
                        rel="noopener noreferrer"
                        prepend-icon="mdi-message-outline"
                        :title="t('messages.feedback')"
                        append-icon="mdi-open-in-new"
                    />

                    <v-divider class="my-1" />
                    <v-list-item
                        class="sidebar-help__item sidebar-help__meta-item"
                        data-testid="sidebar-help-version"
                        prepend-icon="mdi-tag-outline"
                        :title="`${t('messages.systemVersion')} ${store.sys.version || '—'}`"
                    />
                    <v-list-item
                        class="sidebar-help__item sidebar-help__meta-item"
                        data-testid="sidebar-help-users"
                        prepend-icon="mdi-account-group-outline"
                        :title="`${t('messages.userCount')} ${store.sys.users ?? '—'}`"
                    />
                </v-list>
            </v-card>
        </v-menu>
    </div>
</template>

<script setup>
import { useMainStore } from '@/stores/main';
import { useI18n } from '#i18n';

const store = useMainStore();
const { t } = useI18n();
</script>

<style scoped>
.sidebar-help {
    align-items: center;
    display: flex;
    justify-content: flex-end;
    margin-top: auto;
    padding: 10px 12px 12px;
    flex: 0 0 auto;
}

.sidebar-help__trigger {
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.sidebar-help__card {
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.sidebar-help__list {
    padding-block: 4px;
}

.sidebar-help__item {
    font-size: 13px;
    min-height: 34px;
    padding-inline: 12px;
}

.sidebar-help__item :deep(.v-list-item-title) {
    font-size: inherit;
}

.sidebar-help__item :deep(.v-list-item__spacer) {
    width: 8px !important;
}

.sidebar-help__item :deep(.v-icon) {
    font-size: 18px;
}

.sidebar-help__item :deep(.v-list-item__append .v-icon) {
    font-size: 15px;
}

.sidebar-help__meta-item {
    color: rgba(var(--v-theme-on-surface), .62);
    font-size: 12px;
}

.sidebar-help__logo,
.sidebar-help__fallback-logo {
    align-items: center;
    display: flex;
    justify-content: center;
    overflow: hidden;
}

.sidebar-help__logo {
    inline-size: 100%;
    min-block-size: 196px;
    padding: 8px 12px;
}

.sidebar-help__logo :deep(img) {
    block-size: 180px !important;
    display: block;
    inline-size: 180px !important;
    margin: 0 !important;
    max-block-size: none !important;
    max-inline-size: none !important;
    object-fit: contain;
}

.sidebar-help__fallback-logo {
    font-size: .875rem;
    font-weight: 700;
    min-block-size: 40px;
    padding: 8px 12px;
}
</style>
