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
                    variant="tonal"
                    :aria-label="t('navigationHelp.openMenu')"
                />
            </template>

            <v-card
                class="sidebar-help__card"
                min-width="212"
            >
                <v-list density="compact">
                    <v-list-item
                        href="https://github.com/talebook/talebook/releases"
                        target="_blank"
                        rel="noopener noreferrer"
                        prepend-icon="mdi-history"
                        :title="t('navigationHelp.changelog')"
                        append-icon="mdi-open-in-new"
                    />
                    <v-list-item
                        href="https://github.com/talebook/talebook"
                        target="_blank"
                        rel="noopener noreferrer"
                        prepend-icon="mdi-github"
                        :title="t('navigationHelp.github')"
                        append-icon="mdi-open-in-new"
                    />
                    <v-list-item
                        v-if="store.sys.allow?.FEEDBACK && store.sys.FEEDBACK_URL"
                        :href="store.sys.FEEDBACK_URL"
                        target="_blank"
                        rel="noopener noreferrer"
                        prepend-icon="mdi-message-outline"
                        :title="t('messages.feedback')"
                        append-icon="mdi-open-in-new"
                    />
                </v-list>

                <v-divider />
                <div class="sidebar-help__meta">
                    <span>{{ t('messages.systemVersion') }} {{ store.sys.version || '—' }}</span>
                    <span>{{ t('messages.userCount') }} {{ store.sys.users ?? '—' }}</span>
                </div>
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
}

.sidebar-help__trigger {
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.sidebar-help__card {
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.sidebar-help__meta {
    color: rgba(var(--v-theme-on-surface), .62);
    display: flex;
    flex-direction: column;
    font-size: .75rem;
    gap: 2px;
    padding: 10px 16px 6px;
}

.sidebar-help__logo,
.sidebar-help__fallback-logo {
    align-items: center;
    display: flex;
    justify-content: center;
    min-height: 42px;
    padding: 6px 16px 12px;
}

.sidebar-help__logo :deep(img) {
    display: block;
    margin: 0 auto;
    max-height: 30px;
    max-width: 100%;
}

.sidebar-help__fallback-logo {
    font-size: .875rem;
    font-weight: 700;
}
</style>
