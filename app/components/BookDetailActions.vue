<template>
    <section
        class="book-actions"
        data-testid="book-action-section"
        aria-labelledby="book-actions-title"
    >
        <h2
            id="book-actions-title"
            class="book-actions__title"
        >
            <v-icon size="small">
                mdi-bookmark-outline
            </v-icon>
            <span>{{ t('book.readerActions') }}</span>
        </h2>
        <div class="book-actions__body">
            <div class="book-actions__grid">
                <v-btn
                    v-if="book.id > 0 && hasCompatibleFormats"
                    color="primary"
                    variant="flat"
                    :href="readerPath"
                    target="_blank"
                    data-testid="open-online-reader"
                >
                    <v-icon start>
                        mdi-book-open-page-variant
                    </v-icon>
                    {{ t('common.read') }}
                </v-btn>
                <v-btn
                    v-else-if="book.id > 0"
                    color="grey"
                    variant="tonal"
                    disabled
                    data-testid="online-reading-unsupported"
                >
                    <v-icon start>
                        mdi-book-off-outline
                    </v-icon>
                    {{ book.media_type === 'comic' ? t('book.comicReadUnsupported') : t('book.onlineReadUnsupported') }}
                </v-btn>

                <v-btn
                    color="primary"
                    variant="tonal"
                    data-testid="book-action-download"
                    @click="emit('download')"
                >
                    <v-icon start>
                        mdi-download
                    </v-icon>
                    {{ t('common.download') }}
                </v-btn>

                <v-btn
                    color="primary"
                    variant="tonal"
                    data-testid="book-action-send"
                    @click="emit('send-to-device')"
                >
                    <v-icon start>
                        mdi-devices
                    </v-icon>
                    {{ t('book.sendToDevice') }}
                </v-btn>

                <v-btn
                    v-if="book.id > 0 && isLoggedIn"
                    :color="isInShelf ? 'orange' : 'primary'"
                    variant="tonal"
                    :loading="readingStateLoading"
                    data-testid="book-action-shelf"
                    @click="emit('toggle-shelf')"
                >
                    <v-icon start>
                        mdi-bookshelf
                    </v-icon>
                    {{ isInShelf ? t('book.removeFromWantToRead') : t('book.wantToRead') }}
                </v-btn>

                <v-btn
                    v-if="book.id > 0 && isLoggedIn"
                    :color="readingStateText.color"
                    variant="tonal"
                    data-testid="book-action-reading-state"
                    @click="emit('change-reading-state')"
                >
                    <v-icon start>
                        {{ readingStateText.icon }}
                    </v-icon>
                    {{ readingStateText.label }}
                </v-btn>

                <v-btn
                    v-if="book.id > 0 && book.media_type !== 'comic'"
                    color="amber-darken-3"
                    variant="tonal"
                    :to="`/book/${book.id}/audios`"
                    data-testid="open-audiobook"
                >
                    <v-icon start>
                        mdi-book-music
                    </v-icon>
                    {{ t('audiobook.title') }}
                </v-btn>
            </div>

            <div
                v-if="readingState > 0"
                class="book-actions__status"
                aria-live="polite"
            >
                <v-chip
                    size="small"
                    :color="readingState === 1 ? 'blue' : 'grey'"
                    variant="tonal"
                >
                    {{ readingState === 1 ? t('book.currentlyReading') : t('book.alreadyFinished') }}
                </v-chip>
            </div>

            <div
                v-if="book.is_owner"
                class="book-actions__owner"
            >
                <h3 class="book-actions__subtitle">
                    {{ t('book.ownerActions') }}
                </h3>
                <div class="book-actions__grid book-actions__grid--owner">
                    <v-menu location="bottom start">
                        <template #activator="{ props: menuProps }">
                            <v-btn
                                v-bind="menuProps"
                                color="primary"
                                variant="outlined"
                                data-testid="book-action-process"
                            >
                                <v-icon start>
                                    mdi-file-cog
                                </v-icon>
                                {{ t('book.process') }}
                                <v-icon
                                    end
                                    size="small"
                                >
                                    mdi-chevron-down
                                </v-icon>
                            </v-btn>
                        </template>
                        <v-list density="compact">
                            <v-list-item
                                :disabled="!canSaveMetadata"
                                @click="emit('save-meta')"
                            >
                                <template #prepend>
                                    <v-icon>mdi-file-sync</v-icon>
                                </template>
                                <v-list-item-title>{{ t('book.saveMetaToFile') }}</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="emit('convert')">
                                <template #prepend>
                                    <v-icon>mdi-swap-horizontal</v-icon>
                                </template>
                                <v-list-item-title>{{ t('book.convert') }}</v-list-item-title>
                            </v-list-item>
                            <v-list-item
                                :disabled="book.files && book.files.length <= 1"
                                @click="emit('separate')"
                            >
                                <template #prepend>
                                    <v-icon>mdi-content-copy</v-icon>
                                </template>
                                <v-list-item-title>{{ t('book.seperate') }}</v-list-item-title>
                            </v-list-item>
                            <v-list-item
                                :disabled="book.files && book.files.length <= 1"
                                @click="emit('delete-format')"
                            >
                                <template #prepend>
                                    <v-icon>mdi-file-document-remove-outline</v-icon>
                                </template>
                                <v-list-item-title>{{ t('book.deleteFormat') }}</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="emit('upload-format')">
                                <template #prepend>
                                    <v-icon>mdi-file-upload-outline</v-icon>
                                </template>
                                <v-list-item-title>{{ t('book.uploadNewFormat') }}</v-list-item-title>
                            </v-list-item>
                            <template v-if="bookToolActions.length > 0">
                                <v-divider />
                                <v-list-subheader>{{ t('book.pluginTools') }}</v-list-subheader>
                                <v-list-item
                                    v-for="action in bookToolActions"
                                    :key="action.plugin_key"
                                    :to="{ path: action.route, query: { book_id: book.id } }"
                                    :data-testid="`book-tool-${action.plugin_key}`"
                                >
                                    <template #prepend>
                                        <v-icon>{{ action.icon }}</v-icon>
                                    </template>
                                    <v-list-item-title>{{ action.name }}</v-list-item-title>
                                </v-list-item>
                            </template>
                            <template v-if="hasMixedMediaFormats">
                                <v-divider />
                                <v-list-subheader>{{ t('book.chooseMediaType') }}</v-list-subheader>
                                <v-list-item
                                    data-testid="set-media-type-comic"
                                    :disabled="settingMediaType"
                                    @click="emit('set-media-type', 'comic')"
                                >
                                    <template #prepend>
                                        <v-icon>mdi-image-multiple</v-icon>
                                    </template>
                                    <v-list-item-title>{{ t('book.setAsComic') }}</v-list-item-title>
                                    <template #append>
                                        <v-icon
                                            v-if="book.media_type === 'comic'"
                                            color="success"
                                        >
                                            mdi-check-circle
                                        </v-icon>
                                    </template>
                                </v-list-item>
                                <v-list-item
                                    data-testid="set-media-type-ebook"
                                    :disabled="settingMediaType"
                                    @click="emit('set-media-type', 'ebook')"
                                >
                                    <template #prepend>
                                        <v-icon>mdi-book-outline</v-icon>
                                    </template>
                                    <v-list-item-title>{{ t('book.setAsEbook') }}</v-list-item-title>
                                    <template #append>
                                        <v-icon
                                            v-if="book.media_type === 'ebook'"
                                            color="success"
                                        >
                                            mdi-check-circle
                                        </v-icon>
                                    </template>
                                </v-list-item>
                            </template>
                        </v-list>
                    </v-menu>

                    <v-menu location="bottom start">
                        <template #activator="{ props: menuProps }">
                            <v-btn
                                v-bind="menuProps"
                                color="primary"
                                variant="outlined"
                                data-testid="book-action-manage"
                            >
                                <v-icon start>
                                    mdi-book-cog-outline
                                </v-icon>
                                {{ t('common.manage') }}
                                <v-icon
                                    end
                                    size="small"
                                >
                                    mdi-chevron-down
                                </v-icon>
                            </v-btn>
                        </template>
                        <v-list density="compact">
                            <v-list-item :to="`/book/${book.id}/edit`">
                                <template #prepend>
                                    <v-icon>mdi-cog</v-icon>
                                </template>
                                <v-list-item-title>{{ t('book.editInfo') }}</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="emit('get-refer')">
                                <template #prepend>
                                    <v-icon>mdi-apps</v-icon>
                                </template>
                                <v-list-item-title>{{ t('book.updateFromInternet') }}</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="emit('set-scope')">
                                <template #prepend>
                                    <v-icon>{{ book.scope === 'private' ? 'mdi-earth-off' : 'mdi-earth' }}</v-icon>
                                </template>
                                <v-list-item-title>{{ book.scope === 'private' ? t('book.setPublic') : t('book.setPrivate') }}</v-list-item-title>
                            </v-list-item>
                            <v-divider />
                            <v-list-item @click="emit('delete-book')">
                                <template #prepend>
                                    <v-icon color="error">
                                        mdi-delete-forever
                                    </v-icon>
                                </template>
                                <v-list-item-title>{{ t('book.deleteBook') }}</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

defineProps({
    book: { type: Object, required: true },
    readerPath: { type: String, default: '' },
    hasCompatibleFormats: { type: Boolean, default: false },
    canSaveMetadata: { type: Boolean, default: false },
    hasMixedMediaFormats: { type: Boolean, default: false },
    bookToolActions: { type: Array, default: () => [] },
    settingMediaType: { type: Boolean, default: false },
    isLoggedIn: { type: Boolean, default: false },
    isInShelf: { type: Boolean, default: false },
    readingState: { type: Number, default: 0 },
    readingStateLoading: { type: Boolean, default: false },
    readingStateText: {
        type: Object,
        default: () => ({ label: '', icon: '', color: 'primary' }),
    },
});

const emit = defineEmits([
    'download',
    'send-to-device',
    'toggle-shelf',
    'change-reading-state',
    'save-meta',
    'convert',
    'separate',
    'delete-format',
    'upload-format',
    'set-media-type',
    'get-refer',
    'set-scope',
    'delete-book',
]);

const { t } = useI18n();
</script>

<style scoped>
.book-actions {
    padding-block: 2px;
}

.book-actions__title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 18px;
    font-size: 1.15rem;
    font-weight: 700;
}

.book-actions__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 168px), 1fr));
    gap: 10px;
}

.book-actions__grid :deep(.v-btn) {
    min-height: 44px;
    width: 100%;
    min-width: 0;
}

.book-actions__status {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
}

.book-actions__owner {
    margin-top: 28px;
}

.book-actions__subtitle {
    margin: 0 0 12px;
    color: rgba(var(--v-theme-on-surface), .72);
    font-size: .82rem;
    font-weight: 700;
    letter-spacing: .04em;
}

.book-actions__grid--owner {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
}

@media (max-width: 480px) {
    .book-actions__grid,
    .book-actions__grid--owner {
        grid-template-columns: minmax(0, 1fr);
    }
}
</style>
