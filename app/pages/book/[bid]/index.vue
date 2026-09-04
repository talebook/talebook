<template>
    <div>
        <!-- Main Content -->
        <v-row align="start">
            <v-col cols="12">
                <BookConvertDialog
                    v-model="dialog_convert"
                    :book-title="book.title"
                    :files="book.files"
                    :options="conversion_options"
                    :loading="converting_book"
                    @confirm="confirm_conversion"
                />

                <v-dialog
                    v-model="showReadingLoginDialog"
                    max-width="420"
                >
                    <v-card data-testid="reading-login-dialog">
                        <v-card-title>{{ t('messages.pleaseLogin') }}</v-card-title>
                        <v-card-text>{{ t('book.readingStateLoginHint') }}</v-card-text>
                        <v-card-actions>
                            <v-spacer />
                            <v-btn
                                variant="text"
                                @click="showReadingLoginDialog = false"
                            >
                                {{ t('common.cancel') }}
                            </v-btn>
                            <v-btn
                                color="primary"
                                variant="flat"
                                :to="loginPath"
                                @click="showReadingLoginDialog = false"
                            >
                                {{ t('auth.signIn') }}
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>

                <!-- Send to Device Dialog -->
                <v-dialog
                    v-model="dialog_send_to_device"
                    persistent
                    max-width="600"
                >
                    <v-card>
                        <v-card-title>
                            <v-icon class="mr-2">
                                mdi-devices
                            </v-icon>
                            {{ t('book.sendToDevice') }}
                        </v-card-title>
                        <v-card-text>
                            <p class="mb-4 text-body-2 text-medium-emphasis">
                                {{ t('messages.willSendFormat', { format: selectedFormat }) }}
                            </p>
                            <v-alert
                                v-if="deviceTypes.length === 0"
                                type="info"
                                variant="tonal"
                                density="compact"
                            >
                                {{ t('book.noEnabledDeviceTypes') }}
                            </v-alert>
                            <template v-else>
                                <v-select
                                    v-model="selectedDeviceType"
                                    data-testid="send-device-type"
                                    :items="deviceTypes"
                                    item-title="text"
                                    item-value="value"
                                    :label="t('book.deviceType') + ' *'"
                                    variant="outlined"
                                    density="compact"
                                    :hint="selectedDeviceType ? '' : t('book.deviceTypeFirstHint')"
                                    persistent-hint
                                    @update:model-value="handleDeviceTypeChange"
                                />
                                <div
                                    v-if="selectedDeviceType"
                                    class="device-target mt-3"
                                >
                                    <v-select
                                        v-if="matchingSavedDevices.length > 0"
                                        v-model="selectedSavedDeviceOption"
                                        data-testid="send-device-saved"
                                        :items="savedDeviceItems"
                                        item-title="title"
                                        item-value="value"
                                        :label="t('book.savedDevice')"
                                        variant="outlined"
                                        density="compact"
                                        hide-details="auto"
                                        @update:model-value="handleSavedDeviceChange"
                                    />
                                    <v-text-field
                                        v-if="isKindleDevice"
                                        v-model="deviceTarget.mailbox"
                                        data-testid="send-device-mailbox"
                                        :label="t('book.kindleMailbox') + ' *'"
                                        variant="outlined"
                                        density="compact"
                                        type="email"
                                        placeholder="reader@kindle.com"
                                        hide-details="auto"
                                    />
                                    <div
                                        v-else
                                        class="device-target__network"
                                    >
                                        <v-text-field
                                            v-model="deviceTarget.ip"
                                            data-testid="send-device-ip"
                                            :label="t('book.deviceIP') + ' *'"
                                            variant="outlined"
                                            density="compact"
                                            placeholder="192.168.1.100"
                                            hide-details="auto"
                                        />
                                        <v-text-field
                                            v-model="deviceTarget.port"
                                            data-testid="send-device-port"
                                            :label="t('book.devicePort') + ' *'"
                                            variant="outlined"
                                            density="compact"
                                            type="number"
                                            placeholder="8080"
                                            hide-details="auto"
                                        />
                                    </div>
                                </div>
                            </template>
                        </v-card-text>
                        <v-card-actions>
                            <v-spacer />
                            <v-btn
                                variant="text"
                                @click="closeDeviceDialog"
                            >
                                {{ t('common.cancel') }}
                            </v-btn>
                            <v-btn
                                color="primary"
                                variant="flat"
                                :loading="sending_to_device"
                                :disabled="!canSendToDevice"
                                @click="sendToDevice"
                            >
                                {{ t('common.send') }}
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>

                <!-- Download Dialog -->
                <v-dialog
                    v-model="dialog_download"
                    persistent
                    width="300"
                >
                    <v-card data-testid="book-download-dialog">
                        <v-card-title>{{ t('book.download') }}</v-card-title>
                        <v-card-text>
                            <v-list v-if="book.files && book.files.length > 0">
                                <v-list-item
                                    v-for="file in book.files"
                                    :key="'file-'+file.format"
                                    target="_blank"
                                    :href="file.href"
                                >
                                    <template #prepend>
                                        <v-avatar color="primary">
                                            <v-icon color="white">
                                                mdi-download
                                            </v-icon>
                                        </v-avatar>
                                    </template>
                                    <v-list-item-title>{{ file.format }}</v-list-item-title>
                                    <v-list-item-subtitle v-if="file.size>=1048576">
                                        {{ parseInt(file.size / 1048576) }}MB
                                    </v-list-item-subtitle>
                                    <v-list-item-subtitle v-else>
                                        {{ parseInt(file.size / 1024) }}KB
                                    </v-list-item-subtitle>
                                </v-list-item>
                            </v-list>
                            <p v-else>
                                <br>{{ t('book.noDownloadFormats') }}
                            </p>
                        </v-card-text>
                        <v-card-actions>
                            <v-spacer />
                            <v-btn
                                variant="text"
                                @click="dialog_download = false"
                            >
                                {{ t('common.close') }}
                            </v-btn>
                            <v-spacer />
                        </v-card-actions>
                    </v-card>
                </v-dialog>

                <!-- Internet Sync Dialog -->
                <v-dialog
                    v-model="dialog_refer"
                    persistent
                    width="800"
                    class="refer-dialog"
                >
                    <v-card>
                        <v-toolbar
                            flat
                            density="compact"
                            color="primary"
                        >
                            <v-toolbar-title>{{ t('book.internetSync') }}</v-toolbar-title>
                            <v-spacer />
                            <v-btn
                                variant="outlined"
                                @click="dialog_refer = false"
                            >
                                {{ t('common.cancel') }}
                            </v-btn>
                        </v-toolbar>
                        <v-card-text class="refer-dialog__body pt-3">
                            <section
                                class="refer-progress mb-4"
                                aria-live="polite"
                            >
                                <div class="refer-progress__label">
                                    <span>
                                        {{ refer_summary.total > 0
                                            ? t('book.referProgress', { completed: refer_summary.completed, total: refer_summary.total })
                                            : t('book.referProgressLoading') }}
                                    </span>
                                    <span v-if="refer_summary.total > 0">{{ refer_progress_percent }}%</span>
                                </div>
                                <v-progress-linear
                                    :model-value="refer_progress_percent"
                                    :indeterminate="refer_books_loading && refer_summary.total === 0"
                                    :aria-label="refer_summary.total > 0
                                        ? t('book.referProgress', { completed: refer_summary.completed, total: refer_summary.total })
                                        : t('book.referProgressLoading')"
                                    color="primary"
                                    height="4"
                                    rounded
                                />
                                <p
                                    v-if="refer_summary.failures.length > 0"
                                    class="refer-progress__failures"
                                >
                                    {{ t('book.referIncompleteSources', { sources: refer_failed_sources }) }}
                                </p>
                            </section>
                            <p
                                v-if="!refer_books_loading && refer_books.length === 0"
                                class="py-6 text-center"
                            >
                                {{ t(refer_summary.failures.length > 0 ? 'book.noMatchingBooksWithFailures' : 'book.noMatchingBooks') }}
                            </p>
                            <template v-else-if="refer_books.length > 0">
                                <p class="mb-4">
                                    {{ t('book.selectMatchingBook') }}
                                </p>
                                <BookCards_Small
                                    :books="refer_books"
                                    :max-columns="2"
                                >
                                    <template #actions="{ book: referBook }">
                                        <v-card-actions>
                                            <v-chip
                                                v-if="referBook.author_sort"
                                                class="mr-1"
                                                size="small"
                                            >
                                                {{ referBook.author_sort }}
                                            </v-chip>
                                            <v-chip
                                                v-if="referBook.publisher"
                                                class="mr-1"
                                                size="small"
                                            >
                                                {{ referBook.publisher }}
                                            </v-chip>
                                            <v-chip
                                                v-if="referBook.pubyear"
                                                size="small"
                                            >
                                                {{ referBook.pubyear }}
                                            </v-chip>
                                        </v-card-actions>
                                        <v-divider />
                                        <v-card-actions>
                                            <v-chip
                                                size="small"
                                                :href="referBook.website"
                                                target="_blank"
                                                :color="referBook.source === '豆瓣' ? 'green' : 'blue'"
                                            >
                                                {{ referBook.source }}
                                            </v-chip>
                                            <v-spacer />
                                            <v-menu
                                                offset-y
                                                location="right"
                                            >
                                                <template #activator="{ props }">
                                                    <v-btn
                                                        color="primary"
                                                        size="small"
                                                        rounded
                                                        v-bind="props"
                                                        :loading="refer_books_setting_btn_loading"
                                                    >
                                                        <v-icon size="small">
                                                            mdi-check
                                                        </v-icon>
                                                        {{ t('common.set') }}
                                                    </v-btn>
                                                </template>
                                                <v-list density="compact">
                                                    <v-list-item 
                                                        v-if="referBook.cover_url" 
                                                        @click="set_refer(referBook.provider_key, referBook.provider_value)"
                                                    >
                                                        <v-list-item-title>{{ t('book.setInfoAndImage') }}</v-list-item-title>
                                                    </v-list-item>
                                                    <v-list-item
                                                        @click="set_refer(referBook.provider_key, referBook.provider_value, { only_meta: 'yes' })"
                                                    >
                                                        <v-list-item-title>{{ t('book.setOnlyInfo') }}</v-list-item-title>
                                                    </v-list-item>
                                                    <v-list-item
                                                        v-if="referBook.cover_url"
                                                        @click="set_refer(referBook.provider_key, referBook.provider_value, { only_cover: 'yes' })"
                                                    >
                                                        <v-list-item-title>{{ t('book.setOnlyImage') }}</v-list-item-title>
                                                    </v-list-item>
                                                </v-list>
                                            </v-menu>
                                        </v-card-actions>
                                    </template>
                                </BookCards_Small>
                            </template>
                        </v-card-text>
                    </v-card>
                </v-dialog>

                <!-- Upload New Format Dialog -->
                <v-dialog
                    v-model="dialog_upload_format"
                    persistent
                    max-width="500"
                >
                    <v-card>
                        <v-card-title>
                            <v-icon class="mr-2">
                                mdi-file-upload-outline
                            </v-icon>
                            {{ t('book.uploadNewFormat') }}
                        </v-card-title>
                        <v-card-text>
                            <p class="mb-4">
                                {{ t('book.uploadNewFormatDesc') }}
                            </p>
                            <v-file-input
                                v-model="upload_format_file"
                                :label="t('book.selectFile')"
                                variant="outlined"
                                density="compact"
                                show-size
                                accept=".epub,.mobi,.azw,.azw3,.pdf,.txt,.cbz,.zip,.cbr,.rar"
                                prepend-icon="mdi-file-document"
                            />
                            <v-alert
                                type="info"
                                variant="tonal"
                                density="compact"
                                class="mt-4"
                            >
                                {{ t('book.supportedFormatsUpload') }}
                            </v-alert>
                        </v-card-text>
                        <v-card-actions>
                            <v-spacer />
                            <v-btn
                                variant="text"
                                @click="dialog_upload_format = false"
                            >
                                {{ t('common.cancel') }}
                            </v-btn>
                            <v-btn
                                color="primary"
                                variant="text"
                                :loading="uploading_format"
                                :disabled="!upload_format_file"
                                @click="confirmUploadFormat"
                            >
                                {{ t('book.upload') }}
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>

                <!-- Separate Format Dialog -->
                <v-dialog
                    v-model="dialog_separate"
                    persistent
                    max-width="500"
                >
                    <v-card>
                        <v-card-title>
                            <v-icon class="mr-2">
                                mdi-content-copy
                            </v-icon>
                            {{ t('book.seperate') }}
                        </v-card-title>
                        <v-card-text>
                            <p class="mb-4">
                                {{ t('book.selectFormatToSeparate') }}
                            </p>
                            <v-radio-group v-model="selectedSeparateFormat">
                                <v-radio
                                    v-for="file in book.files"
                                    :key="'sep-' + file.format"
                                    :value="file.format.toLowerCase()"
                                    :label="`${file.format} - ${formatFileSize(file.size)}`"
                                />
                            </v-radio-group>
                            <v-alert
                                type="info"
                                variant="tonal"
                                density="compact"
                                class="mt-4"
                            >
                                {{ t('book.separateHint') }}
                            </v-alert>
                        </v-card-text>
                        <v-card-actions>
                            <v-spacer />
                            <v-btn
                                variant="text"
                                @click="dialog_separate = false"
                            >
                                {{ t('common.cancel') }}
                            </v-btn>
                            <v-btn
                                color="primary"
                                variant="text"
                                :loading="separating_book"
                                :disabled="!selectedSeparateFormat"
                                @click="confirmSeparate"
                            >
                                {{ t('common.ok') }}
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>

                <!-- Delete Format Dialog -->
                <v-dialog
                    v-model="dialog_delete_format"
                    persistent
                    max-width="500"
                >
                    <v-card>
                        <v-card-title>
                            <v-icon class="mr-2">
                                mdi-file-document-remove-outline
                            </v-icon>
                            {{ t('book.deleteFormat') }}
                        </v-card-title>
                        <v-card-text>
                            <p class="mb-4">
                                {{ t('book.selectFormatToDelete') }}
                            </p>
                            <v-radio-group v-model="selectedDeletedFormat">
                                <v-radio
                                    v-for="file in book.files"
                                    :key="'del-' + file.format"
                                    :value="file.format.toLowerCase()"
                                    :label="`${file.format} - ${formatFileSize(file.size)}`"
                                />
                            </v-radio-group>
                            <v-alert
                                type="warning"
                                variant="tonal"
                                density="compact"
                                class="mt-4"
                            >
                                {{ t('book.deleteFormatWarning') }}
                            </v-alert>
                        </v-card-text>
                        <v-card-actions>
                            <v-spacer />
                            <v-btn
                                variant="text"
                                @click="dialog_delete_format = false"
                            >
                                {{ t('common.cancel') }}
                            </v-btn>
                            <v-btn
                                color="error"
                                variant="text"
                                :loading="deleting_format"
                                :disabled="!selectedDeletedFormat"
                                @click="confirmDeleteFormat"
                            >
                                {{ t('common.delete') }}
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>

                <!-- Zone 1: Book title -->
                <header
                    class="book-title-block"
                    data-testid="book-title-section"
                >
                    <h1 class="book-title">
                        {{ book.title }}
                    </h1>
                </header>

                <!-- Zone 2: Cover and metadata -->
                <section
                    class="book-overview"
                    data-testid="book-metadata-section"
                >
                    <v-row
                        no-gutters
                        align="start"
                    >
                        <v-col
                            class="book-cover-column"
                            cols="12"
                            sm="4"
                        >
                            <div class="book-cover-wrap">
                                <v-img
                                    class="book-img"
                                    :src="book.img"
                                    :alt="`${book.title} ${t('book.cover')}`"
                                    :aspect-ratio="11 / 15"
                                    max-height="500"
                                    contain
                                />
                                <div
                                    v-if="readingState === READING_STATE.FINISHED"
                                    class="book-cover-status"
                                >
                                    {{ t('readingState.finished') }}
                                </div>
                            </div>
                        </v-col>
                        <v-col
                            cols="12"
                            sm="8"
                        >
                            <div class="book-metadata">
                                <dl class="book-facts">
                                    <div
                                        v-if="book.authors && book.authors.length > 0"
                                        class="book-facts__row"
                                    >
                                        <dt>{{ t('book.field.authors') }}</dt>
                                        <dd class="book-chip-list">
                                            <v-chip
                                                v-for="author in book.authors"
                                                :key="'author-' + author"
                                                size="small"
                                                color="primary"
                                                :to="'/author/' + encodeURIComponent(author)"
                                                variant="tonal"
                                            >
                                                <v-icon start>
                                                    mdi-account
                                                </v-icon>
                                                {{ author }}
                                            </v-chip>
                                        </dd>
                                    </div>
                                    <div
                                        v-if="book.aliases && book.aliases.length > 0"
                                        class="book-facts__row"
                                        data-testid="book-aliases-row"
                                    >
                                        <dt>{{ t('book.alias') }}</dt>
                                        <dd class="book-chip-list">
                                            <v-chip
                                                v-for="alias in book.aliases"
                                                :key="'alias-' + alias"
                                                size="small"
                                                color="secondary"
                                                :to="'/search?name=' + encodeURIComponent(alias)"
                                                variant="outlined"
                                            >
                                                <v-icon start>
                                                    mdi-text-box-outline
                                                </v-icon>
                                                {{ alias }}
                                            </v-chip>
                                        </dd>
                                    </div>
                                    <div
                                        v-if="book.series"
                                        class="book-facts__row"
                                    >
                                        <dt>{{ t('book.series') }}</dt>
                                        <dd>
                                            <v-chip
                                                size="small"
                                                color="primary"
                                                :to="'/series/' + encodeURIComponent(book.series)"
                                                variant="tonal"
                                            >
                                                <v-icon start>
                                                    mdi-bookshelf
                                                </v-icon>
                                                {{ book.series }}
                                            </v-chip>
                                        </dd>
                                    </div>
                                    <div class="book-facts__row">
                                        <dt>{{ t('book.field.rating') }}</dt>
                                        <dd>
                                            <v-rating
                                                v-model="book.rating"
                                                :aria-label="`${t('book.field.rating')} ${book.rating}`"
                                                color="yellow-darken-2"
                                                length="10"
                                                readonly
                                                density="compact"
                                                size="small"
                                            />
                                        </dd>
                                    </div>
                                    <div
                                        v-if="book.publisher"
                                        class="book-facts__row"
                                    >
                                        <dt>{{ t('book.publisher') }}</dt>
                                        <dd>
                                            <v-chip
                                                size="small"
                                                color="primary"
                                                :to="'/publisher/' + encodeURIComponent(book.publisher)"
                                                variant="tonal"
                                            >
                                                <v-icon start>
                                                    mdi-domain
                                                </v-icon>
                                                {{ book.publisher }}
                                            </v-chip>
                                        </dd>
                                    </div>
                                    <div class="book-facts__row">
                                        <dt>{{ t('book.field.pubdate') }}</dt>
                                        <dd>{{ pub_year }}</dd>
                                    </div>
                                    <div
                                        v-if="book.isbn"
                                        class="book-facts__row"
                                    >
                                        <dt>{{ t('book.isbn') }}</dt>
                                        <dd>{{ book.isbn }}</dd>
                                    </div>
                                    <div
                                        v-if="book.files && book.files.length > 0"
                                        class="book-facts__row"
                                    >
                                        <dt>{{ t('book.format') }}</dt>
                                        <dd class="book-format-list">
                                            <v-chip
                                                v-for="file in book.files"
                                                :key="file.format"
                                                size="small"
                                                color="blue-grey"
                                                variant="tonal"
                                                role="button"
                                                :aria-label="`${t('common.download')} ${file.format}`"
                                                :data-testid="`book-format-${file.format.toLowerCase()}`"
                                                @click="dialog_download = true"
                                            >
                                                {{ file.format }} · {{ formatFileSize(file.size) }}
                                            </v-chip>
                                        </dd>
                                    </div>
                                    <div
                                        v-if="bookProvenanceText"
                                        class="book-facts__row"
                                        data-testid="book-provenance-row"
                                    >
                                        <dt>{{ t('book.addedBy') }}</dt>
                                        <dd>{{ bookProvenanceText }}</dd>
                                    </div>
                                    <div
                                        v-if="book.id > 0"
                                        class="book-facts__row book-facts__row--state"
                                        data-testid="metadata-reading-row"
                                    >
                                        <dt>{{ t('book.readingStatus') }}</dt>
                                        <dd
                                            class="book-state-control"
                                            aria-live="polite"
                                        >
                                            <div
                                                class="book-reading-state-options"
                                                role="group"
                                                :aria-label="t('book.readingStatus')"
                                                data-testid="metadata-reading-options"
                                            >
                                                <v-tooltip
                                                    v-for="option in readingStateOptions"
                                                    :key="option.key"
                                                    location="top"
                                                    :text="option.tooltip"
                                                >
                                                    <template #activator="{ props: tooltipProps }">
                                                        <v-chip
                                                            v-bind="tooltipProps"
                                                            class="book-reading-state-option"
                                                            size="small"
                                                            role="button"
                                                            :color="isReadingOptionSelected(option.value) ? 'success' : 'blue-grey'"
                                                            :variant="isReadingOptionSelected(option.value) ? 'tonal' : 'outlined'"
                                                            :aria-pressed="isReadingOptionSelected(option.value)"
                                                            :disabled="readingStateLoading"
                                                            :data-testid="`metadata-reading-option-${option.key}`"
                                                            @click="selectReadingOption(option.value)"
                                                        >
                                                            <v-icon
                                                                v-if="isReadingOptionSelected(option.value)"
                                                                start
                                                            >
                                                                mdi-check
                                                            </v-icon>
                                                            {{ option.label }}
                                                        </v-chip>
                                                    </template>
                                                </v-tooltip>
                                            </div>
                                            <template v-if="store.user.is_login && isInShelf">
                                                <span
                                                    class="book-shelf-remove-divider"
                                                    aria-hidden="true"
                                                />
                                                <v-btn
                                                    class="book-shelf-remove-action"
                                                    size="small"
                                                    color="grey-darken-1"
                                                    variant="text"
                                                    :loading="readingStateLoading"
                                                    data-testid="metadata-shelf-action"
                                                    @click="removeFromShelf"
                                                >
                                                    {{ t('book.removeFromWantToRead') }}
                                                </v-btn>
                                            </template>
                                        </dd>
                                    </div>
                                    <div
                                        v-if="hasBookLabels"
                                        class="book-facts__row book-facts__row--tags"
                                        data-testid="book-tags-row"
                                    >
                                        <dt>{{ t('book.field.tags') }}</dt>
                                        <dd class="tag-chips">
                                            <v-chip
                                                v-if="book.scope === 'private'"
                                                size="small"
                                                color="orange"
                                                variant="flat"
                                                data-testid="private-scope-chip"
                                            >
                                                <v-icon start>
                                                    mdi-earth-off
                                                </v-icon>
                                                {{ t('book.scopePrivate') }}
                                            </v-chip>
                                            <template v-for="tag in book.tags">
                                                <v-chip
                                                    v-if="tag"
                                                    :key="'tag-' + tag"
                                                    size="small"
                                                    color="primary"
                                                    :to="'/tag/' + encodeURIComponent(tag)"
                                                    variant="tonal"
                                                >
                                                    <v-icon start>
                                                        mdi-tag
                                                    </v-icon>
                                                    {{ tag }}
                                                </v-chip>
                                            </template>
                                            <v-chip
                                                v-if="book.media_type && book.media_type !== 'unknown'"
                                                size="small"
                                                :color="book.media_type === 'comic' ? 'deep-orange' : 'blue-grey'"
                                                variant="flat"
                                                data-testid="media-type-chip"
                                            >
                                                <v-icon start>
                                                    {{ book.media_type === 'comic' ? 'mdi-image-multiple' : 'mdi-book-outline' }}
                                                </v-icon>
                                                {{ book.media_type === 'comic' ? t('book.mediaTypeComic') : t('book.mediaTypeEbook') }}
                                            </v-chip>
                                        </dd>
                                    </div>
                                </dl>

                                <div
                                    v-if="readingState === READING_STATE.FINISHED"
                                    class="mt-3"
                                >
                                    <v-chip
                                        size="small"
                                        color="grey"
                                        variant="tonal"
                                    >
                                        <v-icon
                                            size="small"
                                            start
                                        >
                                            mdi-check
                                        </v-icon>
                                        {{ completedReadingText }}
                                    </v-chip>
                                </div>
                                <v-alert
                                    v-if="book.media_type === 'comic' && !hasCompatibleFormats"
                                    type="info"
                                    variant="tonal"
                                    density="compact"
                                    class="mt-3"
                                    data-testid="comic-reader-notice"
                                >
                                    {{ t('book.comicReadUnsupportedDescription') }}
                                </v-alert>

                            </div>
                        </v-col>
                    </v-row>
                </section>

                <!-- Zone 3: Reader and owner actions -->
                <BookDetailActions
                    class="book-actions-section"
                    :book="book"
                    :reader-path="readerPath"
                    :has-compatible-formats="hasCompatibleFormats"
                    :can-save-metadata="hasEpubAzw3OrPDF"
                    :has-mixed-media-formats="hasMixedMediaFormats"
                    :book-tool-actions="bookToolActions"
                    :setting-media-type="setting_media_type"
                    @download="dialog_download = true"
                    @send-to-device="dialog_send_to_device = true"
                    @save-meta="save_meta_to_file"
                    @convert="show_conversion_dialog"
                    @separate="seperate_book"
                    @delete-format="show_delete_format_dialog"
                    @upload-format="show_upload_format_dialog"
                    @set-media-type="set_media_type"
                    @get-refer="get_refer"
                    @set-scope="set_scope"
                    @delete-book="delete_book"
                />

                <!-- Zone 4: Introduction and annotations -->
                <section
                    class="book-introduction"
                    data-testid="book-content-section"
                    aria-labelledby="book-introduction-title"
                >
                    <h2
                        id="book-introduction-title"
                        class="book-section-title"
                    >
                        <v-icon size="small">
                            mdi-text-box-outline
                        </v-icon>
                        <span>{{ t('book.introduction') }}</span>
                    </h2>
                    <div class="book-introduction__body">
                        <div
                            v-if="book.id > 0 && book.comments && book.comments !== '暂无简介'"
                            class="book-comments"
                            v-html="book.comments"
                        />
                        <p v-else-if="book.id > 0">
                            {{ t('book.viewDetails') }}
                        </p>
                    </div>
                </section>

                <AnnotationPanel
                    v-if="book.id > 0 && store.user.is_login"
                    class="book-annotations"
                    :book-id="book.id"
                    hide-when-empty
                    @locate="openAnnotationInReader"
                />
            </v-col>
        </v-row>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useAsyncData, useNuxtApp } from 'nuxt/app';
import { useMainStore } from '@/stores/main';
import BookCards_Small from '~/components/BookCards_Small.vue';
import BookConvertDialog from '~/components/BookConvertDialog.vue';
import BookDetailActions from '~/components/BookDetailActions.vue';
import AnnotationPanel from '~/components/AnnotationPanel.vue';
import { READING_STATE, useBookReadingState } from '~/composables/useBookReadingState';
import { readerPathForBook } from '~/utils/comic-reader';

const route = useRoute();
const router = useRouter();
const store = useMainStore();
const { $backend, $backend_stream, $alert } = useNuxtApp();
const { t } = useI18n();
const showReadingLoginDialog = ref(false);
const loginPath = computed(() => ({
    path: '/login',
    query: { next: route.fullPath },
}));

const routeBookId = computed(() => {
    return typeof route.params.bid === 'string' && route.params.bid
        ? route.params.bid
        : null;
});
const bookid = ref(routeBookId.value);
watch(routeBookId, (newBookId) => {
    if (newBookId) {
        bookid.value = newBookId;
    }
});
const book = ref({
    id: 0,
    title: '',
    files: [],
    tags: [],
    aliases: [],
    pubdate: '',
    authors: [],
    publisher: '',
    comments: '',
    rating: 0,
    img: '',
    isbn: '',
    collector: '',
    timestamp: '',
    is_owner: false,
    series: '',
    media_type: 'unknown',
    media_type_locked: false,
    online_readable: null
});
const hasBookLabels = computed(() => (
    book.value.tags?.some(Boolean)
    || (book.value.media_type && book.value.media_type !== 'unknown')
    || book.value.scope === 'private'
));
const bookProvenanceText = computed(() => (
    [book.value.collector, book.value.timestamp].filter(Boolean).join(' @ ')
));
const bookToolActions = ref([]);

async function loadBookToolActions(currentBookId, isAdmin) {
    if (!currentBookId || !isAdmin) {
        bookToolActions.value = [];
        return;
    }
    try {
        const response = await $backend(`/plugins/tools/book-actions?book_id=${encodeURIComponent(currentBookId)}`);
        bookToolActions.value = response.err === 'ok' ? (response.actions || []) : [];
    } catch {
        bookToolActions.value = [];
    }
}

watch(
    [routeBookId, () => store.user.is_admin],
    ([currentBookId, isAdmin]) => loadBookToolActions(currentBookId, isAdmin),
    { immediate: true },
);

// Dialogs
const dialog_download = ref(false);
const dialog_send_to_device = ref(false);
const dialog_refer = ref(false);
const dialog_convert = ref(false);
const converting_book = ref(false);
const conversion_options = ref([]);

// Kindle sender for reference
const kindle_sender = ref('');

// Device management
const sending_to_device = ref(false);
const devices = ref([]);
const deviceTypes = ref([]);
const selectedDeviceType = ref('');
const selectedSavedDeviceOption = ref('temporary');
const deviceTarget = ref({
    mailbox: '',
    ip: '',
    port: '',
    schema: 'http',
});

// Refer books
const refer_books_loading = ref(false);
const refer_books_setting_btn_loading = ref(false);
const refer_books = ref([]);
const refer_summary = ref({ failures: [], total: 0, completed: 0 });
const refer_progress_percent = computed(() => {
    if (!refer_summary.value.total) return 0;
    return Math.min(100, Math.round((refer_summary.value.completed / refer_summary.value.total) * 100));
});
const refer_failed_sources = computed(() => {
    return [...new Set(refer_summary.value.failures.map(item => item.source).filter(Boolean))].join('、');
});

// Upload format
const dialog_upload_format = ref(false);
const upload_format_file = ref(null);
const uploading_format = ref(false);
const setting_media_type = ref(false);

// Separate format
const dialog_separate = ref(false);
const selectedSeparateFormat = ref('');
const separating_book = ref(false);

// Delete format
const dialog_delete_format = ref(false);
const selectedDeletedFormat = ref('');
const deleting_format = ref(false);

// 数据获取状态
const pending = ref(true);
const error = ref(null);

store.setNavbar(true);

// 数据获取逻辑
const bookDataKey = computed(() => `book-${bookid.value}`);
const { data: fetchData, error: fetchError, pending: fetchPending, refresh } = useAsyncData(bookDataKey, async () => {
    const response = await $backend(`/book/${bookid.value}`);
    
    if (response.err === 'ok') {
        return response;
    } else {
        throw new Error(response.msg || '获取书籍信息失败');
    }
}, {
    lazy: false,
    default: () => null,
    server: true
});

// 监听数据变化并更新 book.value
watch(() => fetchData.value, (newData) => {
    if (newData && newData.book) {
        // 直接更新 book.value 的所有属性，保持响应式
        Object.assign(book.value, newData.book);
        kindle_sender.value = newData.kindle_sender || '';
        conversion_options.value = newData.conversion_options || [];
    }
}, { immediate: true });

// 监听错误状态
watch(() => fetchError.value, (newError) => {
    error.value = newError;
    if (newError && $alert) {
        $alert('error', newError.message || t('book.fetchBookFailed'));
    }
});

// 监听加载状态
watch(() => fetchPending.value, (newPending) => {
    pending.value = newPending;
}, { immediate: true });

// Computed properties
const pub_year = computed(() => {
    if (!book.value || !book.value.pubdate) {
        return 'N/A';
    }
    return book.value.pubdate.split('-')[0];
});

const readerPath = computed(() => readerPathForBook(book.value));
const hasCompatibleFormats = computed(() => Boolean(readerPath.value));
const hasMixedMediaFormats = computed(() => {
    const formats = new Set((book.value.files || []).map(file => String(file.format || '').toLowerCase()));
    const hasComic = ['cbz', 'zip', 'cbr', 'rar'].some(format => formats.has(format));
    const hasEbook = ['epub', 'mobi', 'azw', 'azw3', 'pdf', 'txt'].some(format => formats.has(format));
    return hasComic && hasEbook;
});

const selectedFormat = computed(() => {
    if (!book.value || !book.value.files) return 'N/A';
    const formats = book.value.files.map(x => x.format.toLowerCase());
    const priority = ['epub', 'azw3', 'pdf', 'txt', 'mobi'];
    for (const fmt of priority) {
        if (formats.includes(fmt)) return fmt.toUpperCase();
    }
    return formats[0]?.toUpperCase() || 'N/A';
});

const matchingSavedDevices = computed(() => {
    return devices.value
        .map((device, index) => ({ device, index }))
        .filter(item => item.device.type === selectedDeviceType.value);
});

const savedDeviceItems = computed(() => {
    const items = matchingSavedDevices.value.map(({ device, index }) => {
        const target = device.type === 'kindle' ? device.mailbox : `${device.ip}:${device.port}`;
        return {
            title: `${device.name} · ${target}`,
            value: `saved-${index}`,
        };
    });
    return [...items, { title: t('book.temporaryDevice'), value: 'temporary' }];
});

const isKindleDevice = computed(() => selectedDeviceType.value === 'kindle');

const canSendToDevice = computed(() => {
    if (!selectedDeviceType.value) return false;
    if (isKindleDevice.value) return !!deviceTarget.value.mailbox.trim();
    return !!(deviceTarget.value.ip.trim() && String(deviceTarget.value.port).trim());
});

const hasEpubAzw3OrPDF = computed(() => {
    if (!book.value || !book.value.files) return false;
    const formats = book.value.files.map(f => f.format.toLowerCase());
    return formats.some(f => ['epub', 'azw3', 'pdf'].includes(f));
});

const openAnnotationInReader = (annotation) => {
    const query = new URLSearchParams();
    if (annotation.cfi) query.set('cfi', annotation.cfi);
    if (annotation.chapter) query.set('chapter', annotation.chapter);
    window.open(`/read/${book.value.id}?${query.toString()}`, '_blank', 'noopener');
};

useHead({
    title: () => book.value.title || t('book.detailsTitle')
});

// Device methods
const resetDeviceTarget = () => {
    deviceTarget.value = {
        mailbox: '',
        ip: '',
        port: '',
        schema: 'http',
    };
};

const handleSavedDeviceChange = (option) => {
    selectedSavedDeviceOption.value = option || 'temporary';
    resetDeviceTarget();

    if (selectedSavedDeviceOption.value === 'temporary') {
        const type = deviceTypes.value.find(item => item.value === selectedDeviceType.value);
        if (!isKindleDevice.value && type?.default_port) {
            deviceTarget.value.port = String(type.default_port);
        }
        return;
    }

    const deviceIndex = Number.parseInt(selectedSavedDeviceOption.value.replace('saved-', ''), 10);
    const device = devices.value[deviceIndex];
    if (!device || device.type !== selectedDeviceType.value) {
        selectedSavedDeviceOption.value = 'temporary';
        return;
    }
    deviceTarget.value = {
        mailbox: device.mailbox || '',
        ip: device.ip || '',
        port: device.port ? String(device.port) : '',
        schema: device.schema || 'http',
    };
};

const handleDeviceTypeChange = (deviceType) => {
    selectedDeviceType.value = deviceType || '';
    resetDeviceTarget();
    const firstSaved = matchingSavedDevices.value[0];
    selectedSavedDeviceOption.value = firstSaved ? `saved-${firstSaved.index}` : 'temporary';
    handleSavedDeviceChange(selectedSavedDeviceOption.value);
};

const loadUserDevices = async () => {
    try {
        const rsp = await $backend('/user/devices');
        if (rsp.err === 'ok') {
            devices.value = rsp.devices || [];
            deviceTypes.value = rsp.device_types || [];
            if (!deviceTypes.value.some(item => item.value === selectedDeviceType.value)) {
                selectedDeviceType.value = '';
                selectedSavedDeviceOption.value = 'temporary';
                resetDeviceTarget();
            }
        }
    } catch (e) {
        console.error('Failed to load user devices:', e);
    }
};

const closeDeviceDialog = () => {
    dialog_send_to_device.value = false;
    selectedDeviceType.value = '';
    selectedSavedDeviceOption.value = 'temporary';
    resetDeviceTarget();
};

const sendToDevice = async () => {
    if (!canSendToDevice.value) {
        if ($alert) $alert('error', t('book.completeDeviceInfo'));
        return;
    }

    sending_to_device.value = true;
    try {
        const selectedType = deviceTypes.value.find(item => item.value === selectedDeviceType.value);
        const deviceIndex = selectedSavedDeviceOption.value.startsWith('saved-')
            ? Number.parseInt(selectedSavedDeviceOption.value.replace('saved-', ''), 10)
            : -1;
        const savedDevice = deviceIndex >= 0 ? devices.value[deviceIndex] : null;
        const deviceName = savedDevice?.name || selectedType?.text || t('book.temporaryDevice');

        let requestBody;
        if (isKindleDevice.value) {
            requestBody = {
                device_type: selectedDeviceType.value,
                mailbox: deviceTarget.value.mailbox.trim(),
            };
        } else {
            const url = `${deviceTarget.value.schema || 'http'}://${deviceTarget.value.ip.trim()}:${deviceTarget.value.port}`;
            requestBody = {
                device_type: selectedDeviceType.value,
                device_url: url,
            };
        }

        const response = await $backend(`/book/${bookid.value}/send_to_device`, {
            method: 'POST',
            body: JSON.stringify(requestBody),
        });

        if (response.err === 'ok') {
            if ($alert) $alert('success', t('book.sendToDeviceSuccess', { deviceName }));
            closeDeviceDialog();
        } else {
            if ($alert) $alert('error', response.msg || t('book.sendFailed'));
        }
    } catch (error) {
        if ($alert) $alert('error', t('book.sendRetry'));
    } finally {
        sending_to_device.value = false;
    }
};

const get_refer = async () => {
    dialog_refer.value = true;
    refer_books_loading.value = true;
    refer_books.value = [];
    refer_summary.value = { failures: [], total: 0, completed: 0 };

    let firstLine = true;
    try {
        for await (const data of $backend_stream(`/book/${bookid.value}/refer?stream=1`)) {
            if (firstLine) {
                firstLine = false;
                continue;
            }
            if (data.event === 'progress' || data.event === 'summary') {
                refer_summary.value = {
                    failures: Array.isArray(data.failures) ? data.failures : [],
                    total: data.total || 0,
                    completed: data.completed || 0,
                };
                if (data.event === 'summary') refer_books_loading.value = false;
            } else {
                data.href = '';
                if (!data.cover_url || data.cover_url === '') {
                    data.img = '/get/cover/0';
                } else {
                    data.img = '/get/pcover?url=' + encodeURIComponent(data.cover_url);
                }
                refer_books.value.push(data);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        refer_books_loading.value = false;
    }
};

const set_refer = async (provider_key, provider_value, opt = {}) => {
    if (refer_books_setting_btn_loading.value) return;

    refer_books_setting_btn_loading.value = true;

    const data = new URLSearchParams(opt);
    data.append('provider_key', provider_key);
    data.append('provider_value', provider_value);

    try {
        const rsp = await $backend(`/book/${bookid.value}/refer`, {
            method: 'POST',
            body: data,
        });

        dialog_refer.value = false;
        if (rsp.err === 'ok') {
            if ($alert) $alert('success', t('book.setSuccess'));
            router.push(`/book/${bookid.value}`);
            location.reload();
        } else {
            if ($alert) $alert('error', rsp.msg);
        }
    } catch (e) {
        if ($alert) $alert('error', t('book.setFailed'));
    } finally {
        refer_books_setting_btn_loading.value = false;
    }
};

const set_scope = async () => {
    try {
        const rsp = await $backend(`/book/${bookid.value}/setscope`, {
            method: 'POST',
        });

        if (rsp.err === 'ok') {
            if ($alert) $alert('success', rsp.msg);
            const refreshRsp = await $backend(`/book/${bookid.value}`);
            if (refreshRsp.err === 'ok' && refreshRsp.book) {
                Object.assign(book.value, refreshRsp.book);
            }
        } else {
            if ($alert) $alert('error', rsp.msg);
        }
    } catch (e) {
        if ($alert) $alert('error', t('book.setFailed'));
    }
};

const delete_book = async () => {
    if (!confirm(t('book.confirmDelete'))) return;

    try {
        const rsp = await $backend(`/book/${bookid.value}/delete`, {
            method: 'POST',
        });

        if (rsp.err === 'ok') {
            if ($alert) $alert('success', t('book.deleteSuccess'));
            router.push('/');
        } else {
            if ($alert) $alert('error', rsp.msg);
        }
    } catch (e) {
        if ($alert) $alert('error', t('book.deleteFailed'));
    }
};

const show_conversion_dialog = () => {
    dialog_convert.value = true;
};

watch(() => route.query.convert, (target) => {
    if (target === 'epub') dialog_convert.value = true;
}, { immediate: true });

const confirm_conversion = async (option) => {
    converting_book.value = true;
    try {
        const rsp = await $backend('/book/' + book.value.id + '/convert', {
            method: 'POST',
            body: new URLSearchParams({
                source_format: option.source_format,
                target_format: option.target_format,
            }),
        });
        if (rsp.err === 'ok') {
            $alert('success', t('book.convertSuccessful'));
            dialog_convert.value = false;
        } else {
            $alert('error', rsp.msg);
        }
    } finally {
        converting_book.value = false;
    }
};

const save_meta_to_file = () => {
    $backend('/book/' + book.value.id + '/savemeta', {
        method: 'POST',
    }).then((rsp) => {
        if (rsp.err === 'ok') {
            $alert('success', rsp.msg || t('book.saveMetaSuccess'));
        } else {
            $alert('error', rsp.msg || t('book.saveMetaFailed'));
        }
    }).catch(() => {
        $alert('error', t('book.saveMetaFailed'));
    });
};

const show_upload_format_dialog = () => {
    upload_format_file.value = null;
    dialog_upload_format.value = true;
};

const set_media_type = async (mediaType) => {
    setting_media_type.value = true;
    try {
        const rsp = await $backend(`/book/${book.value.id}/media_type`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ media_type: mediaType }),
        });
        if (rsp.err === 'ok') {
            book.value.media_type = rsp.media_type;
            book.value.media_type_locked = rsp.media_type_locked === true;
            $alert('success', rsp.msg || t('book.setMediaTypeSuccess'));
        } else {
            $alert('error', rsp.msg || t('book.setMediaTypeFailed'));
        }
    } catch (err) {
        console.error('Set media type error:', err);
        $alert('error', t('book.setMediaTypeFailed'));
    } finally {
        setting_media_type.value = false;
    }
};

const confirmUploadFormat = async () => {
    if (!upload_format_file.value) {
        $alert('error', t('book.selectFileToUpload'));
        return;
    }

    uploading_format.value = true;
    try {
        const data = new FormData();
        data.append('ebook', upload_format_file.value);

        const rsp = await $backend('/book/upload?bid=' + book.value.id, {
            method: 'POST',
            body: data,
        });

        if (rsp.err === 'ok') {
            dialog_upload_format.value = false;
            $alert('success', rsp.msg || t('book.uploadSuccess'));
            location.reload();
        } else if (rsp.err === 'samebook') {
            $alert('error', rsp.msg || t('book.formatAlreadyExists'));
        } else {
            $alert('error', rsp.msg || t('book.uploadFailed'));
        }
    } catch (err) {
        console.error('Upload error:', err);
        $alert('error', t('book.uploadFailed'));
    } finally {
        uploading_format.value = false;
    }
};

const formatFileSize = (size) => {
    if (size >= 1048576) {
        return parseInt(size / 1048576) + 'MB';
    } else if (size >= 1024) {
        return parseInt(size / 1024) + 'KB';
    }
    return size + 'B';
};

const seperate_book = () => {
    selectedSeparateFormat.value = '';
    dialog_separate.value = true;
};

const confirmSeparate = async () => {
    if (!selectedSeparateFormat.value) {
        $alert('error', t('book.selectFormatFirst'));
        return;
    }

    separating_book.value = true;
    try {
        const rsp = await $backend('/book/' + book.value.id + '/separate', {
            method: 'POST',
            body: JSON.stringify({ format: selectedSeparateFormat.value }),
        });

        if (rsp.err === 'ok') {
            dialog_separate.value = false;
            $alert('success', rsp.msg || t('book.separateSuccess'));
            location.reload();
        } else {
            $alert('error', rsp.msg || t('book.separateFailed'));
        }
    } catch (err) {
        console.error('Separate error:', err);
        $alert('error', t('book.separateFailed'));
    } finally {
        separating_book.value = false;
    }
};

const show_delete_format_dialog = () => {
    selectedDeletedFormat.value = '';
    dialog_delete_format.value = true;
};

const confirmDeleteFormat = async () => {
    if (!selectedDeletedFormat.value) {
        $alert('error', t('book.selectFormatFirst'));
        return;
    }

    deleting_format.value = true;
    try {
        const rsp = await $backend('/book/' + book.value.id + '/delete_format', {
            method: 'POST',
            body: JSON.stringify({ format: selectedDeletedFormat.value }),
        });

        if (rsp.err === 'ok') {
            dialog_delete_format.value = false;
            $alert('success', rsp.msg || t('book.deleteFormatSuccess'));
            location.reload();
        } else {
            $alert('error', rsp.msg || t('book.deleteFormatFailed'));
        }
    } catch (err) {
        console.error('Delete format error:', err);
        $alert('error', t('book.deleteFormatFailed'));
    } finally {
        deleting_format.value = false;
    }
};

const readingStateLoading = ref(false);
const {
    isInShelf,
    readingState,
    lastReadTime,
} = useBookReadingState({
    bookId: computed(() => Number(bookid.value) || 0),
    isLogin: computed(() => store.user?.is_login),
    backend: $backend,
});
const readingStateOptions = computed(() => [
    {
        key: 'wanted',
        value: READING_STATE.UNREAD,
        label: t('book.wantToReadStatus'),
        tooltip: t('book.readingStateTooltip', { state: t('book.wantToReadStatus') }),
    },
    {
        key: 'reading',
        value: READING_STATE.READING,
        label: t('readingState.reading'),
        tooltip: t('book.readingStateTooltip', { state: t('readingState.reading') }),
    },
    {
        key: 'finished',
        value: READING_STATE.FINISHED,
        label: t('readingState.done'),
        tooltip: t('book.readingStateTooltip', { state: t('readingState.done') }),
    },
]);

const isReadingOptionSelected = (state) => (
    store.user.is_login && isInShelf.value && readingState.value === state
);

const updateShelf = async (shelf) => {
    const rsp = await $backend(`/book/${book.value.id}/shelf`, {
        method: 'POST',
        body: JSON.stringify({ shelf }),
    });
    if (rsp.err !== 'ok') {
        return false;
    }
    isInShelf.value = shelf;
    return true;
};

const applyReadingState = async (newState) => {
    const rsp = await $backend(`/book/${book.value.id}/readstate`, {
        method: 'POST',
        body: JSON.stringify({ read_state: newState }),
    });
    if (rsp.err !== 'ok') {
        return false;
    }

    readingState.value = newState;
    if (newState === READING_STATE.FINISHED) {
        lastReadTime.value = new Date().toISOString().slice(0, 10);
    } else if (newState === READING_STATE.UNREAD) {
        lastReadTime.value = '';
    }
    return true;
};

const selectReadingOption = async (newState) => {
    if (!store.user.is_login) {
        showReadingLoginDialog.value = true;
        return;
    }
    if (readingStateLoading.value || isReadingOptionSelected(newState)) {
        return;
    }

    readingStateLoading.value = true;
    try {
        if (!isInShelf.value && !await updateShelf(true)) {
            return;
        }
        if (readingState.value !== newState) {
            await applyReadingState(newState);
        }
    } catch (e) {
        console.error('Reading state update error:', e);
    } finally {
        readingStateLoading.value = false;
    }
};

const removeFromShelf = async () => {
    if (readingStateLoading.value || !isInShelf.value) {
        return;
    }

    readingStateLoading.value = true;
    try {
        await updateShelf(false);
    } catch (e) {
        console.error('Shelf error:', e);
    } finally {
        readingStateLoading.value = false;
    }
};

const completedReadingText = computed(() => {
    if (readingState.value !== READING_STATE.FINISHED) return '';
    return t('readingState.completedReading', { date: lastReadTime.value });
});

// Load devices on mount
const loadDevices = async () => {
    if (store.user?.is_login) {
        await loadUserDevices();
    }
};

// Watch user login state
watch(() => store.user?.is_login, async (isLogin) => {
    if (isLogin) {
        await loadDevices();
    }
});

onMounted(async () => {
    await loadDevices();
});
</script>

<style scoped>
.book-title-block {
    margin-bottom: clamp(18px, 2vw, 26px);
    padding: clamp(16px, 2vw, 24px) 4px 0;
}

.book-title {
    margin: 0;
    padding-inline-start: 1em;
    font-size: clamp(1.5rem, 3vw, 1.75rem);
    font-weight: 700;
    letter-spacing: -.015em;
    line-height: 1.2;
    overflow-wrap: anywhere;
}

.book-overview {
    margin-bottom: clamp(30px, 4vw, 46px);
    overflow: hidden;
}

.book-actions-section {
    margin-bottom: clamp(30px, 4vw, 46px);
}

.book-cover-column {
    padding: clamp(18px, 2.5vw, 26px);
    background: linear-gradient(
        145deg,
        rgba(var(--v-theme-primary), .075),
        rgba(var(--v-theme-primary), .025)
    );
    border-radius: 22px;
}

.book-cover-wrap {
    position: relative;
    width: min(100%, 320px);
    margin-inline: auto;
}

.book-img {
    border-radius: 14px;
    box-shadow: 0 12px 30px rgba(20, 35, 55, .14);
}

.book-cover-status {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    min-height: 42px;
    align-items: center;
    justify-content: center;
    color: white;
    background: rgba(55, 65, 81, .82);
    border-radius: 0 0 14px 14px;
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: .12em;
    backdrop-filter: blur(3px);
}

.book-metadata {
    min-width: 0;
    padding: 8px 24px 24px;
}

.book-facts {
    display: grid;
    gap: 8px;
    margin: 0;
}

.book-facts__row {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr);
    gap: 8px;
    min-height: 28px;
    align-items: center;
}

.book-facts dt {
    color: rgba(var(--v-theme-on-surface), .62);
    font-size: .875rem;
    font-weight: 650;
}

.book-facts dd {
    display: flex;
    min-height: 28px;
    flex-wrap: wrap;
    align-items: center;
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
}

.book-facts__row--state {
    align-items: center;
}

.book-facts__row--tags {
    align-items: start;
}

.book-state-control {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
}

.book-state-control :deep(.v-chip) {
    height: 26px;
    border-radius: 999px;
}

.book-reading-state-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
}

.book-reading-state-option {
    position: relative;
    justify-content: center;
    min-width: 64px;
    overflow: visible;
}

.book-reading-state-option::before {
    position: absolute;
    top: 50%;
    right: 0;
    left: 0;
    height: 36px;
    content: '';
    transform: translateY(-50%);
}

.book-state-control :deep(.v-icon) {
    font-size: 18px;
}

.book-state-control :deep(.v-btn) {
    justify-self: start;
    min-width: 0;
    overflow: visible;
    padding-inline: 8px;
}

.book-state-control :deep(.v-btn)::before {
    position: absolute;
    top: 50%;
    right: 0;
    left: 0;
    height: 36px;
    content: '';
    transform: translateY(-50%);
}

.book-shelf-remove-divider {
    width: 1px;
    height: 14px;
    flex: 0 0 1px;
    margin-inline-start: 2px;
    background: rgba(var(--v-theme-on-surface), .28);
}

.book-shelf-remove-action {
    opacity: .78;
    padding-inline: 4px !important;
}

.book-format-list,
.book-chip-list,
.tag-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.book-introduction {
    margin-bottom: 28px;
}

.book-section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 14px;
    font-size: 1.15rem;
    font-weight: 700;
}

.book-introduction__body {
    color: rgba(var(--v-theme-on-surface), .82);
}

.book-annotations {
    background: transparent;
    border: 0;
    border-radius: 0;
}

/* ponytail: pre-line 保留 \n 段落分隔、折叠多余空格、长行自动换行；不影响 v-html 中的 <br>/<p> 标签。 */
.book-comments {
    line-height: 1.8;
    overflow-wrap: anywhere;
    white-space: pre-line;
}

.refer-progress { padding:0 2px; }
.refer-progress__label { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:7px; color:rgba(var(--v-theme-on-surface),.72); font-size:12px; }
.refer-progress__failures { margin:7px 0 0; color:rgb(var(--v-theme-warning)); font-size:12px; line-height:1.4; overflow-wrap:anywhere; white-space:normal; }
:global(.refer-dialog .v-overlay__content) { scrollbar-width:none; }
:global(.refer-dialog .v-overlay__content::-webkit-scrollbar) { display:none; width:0; height:0; }
.device-target { display:grid; gap:12px; }
.device-target__network { display:grid; grid-template-columns:minmax(0,1fr) minmax(120px,.38fr); gap:12px; }

@media (max-width: 600px) {
    .book-overview,
    .book-actions-section {
        margin-bottom: 28px;
    }

    .book-title-block {
        margin-bottom: 16px;
        padding: 18px 0 0;
    }

    .book-title {
        font-size: clamp(1.5rem, 7vw, 1.75rem);
    }

    .book-cover-column,
    .book-metadata {
        padding: 18px;
    }

    .device-target__network { grid-template-columns:1fr; }
}

</style>
