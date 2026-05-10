<template>
    <div>
        <!-- Main Content -->
        <v-row align="start">
            <v-col cols="12">
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
                            <p class="mb-4">
                                {{ t('book.selectDevice') }}:
                                <span class="text-caption text-medium-emphasis">
                                    ({{ t('messages.willSendFormat', { format: selectedFormat }) }})
                                </span>
                            </p>
                            <v-radio-group v-model="selectedDeviceOption">
                                <v-radio
                                    v-for="(device, idx) in devices"
                                    :key="'device-' + idx"
                                    :value="'saved-' + idx"
                                >
                                    <template #label>
                                        <span v-if="device.type === 'kindle'">
                                            {{ device.name }} ({{ getDeviceTypeText(device.type) }}) - {{ device.mailbox }}
                                        </span>
                                        <span v-else>
                                            {{ device.name }} ({{ getDeviceTypeText(device.type) }}) - {{ device.ip }}:{{ device.port }}
                                        </span>
                                    </template>
                                </v-radio>
                                <v-radio
                                    value="temporary"
                                    :label="t('book.temporaryDevice')"
                                />
                            </v-radio-group>

                            <!-- 临时设备输入框 -->
                            <div
                                v-if="selectedDeviceOption === 'temporary'"
                                class="mt-4 pl-8"
                            >
                                <v-select
                                    v-model="tempDevice.type"
                                    :items="deviceTypes"
                                    item-title="text"
                                    item-value="value"
                                    :label="t('book.deviceType') + ' *'"
                                    variant="outlined"
                                    density="compact"
                                />
                                <v-text-field
                                    v-model="tempDevice.ip"
                                    :label="t('book.deviceIP') + ' *'"
                                    variant="outlined"
                                    density="compact"
                                    placeholder="192.168.1.100"
                                />
                                <v-text-field
                                    v-model="tempDevice.port"
                                    :label="t('book.devicePort') + ' *'"
                                    variant="outlined"
                                    density="compact"
                                    type="number"
                                    placeholder="8080"
                                />
                                <v-alert
                                    v-if="tempDevice.type === 'kindle'"
                                    type="info"
                                    variant="tonal"
                                    density="compact"
                                    class="mt-2"
                                >
                                    {{ t('book.kindleNotSupportTemporary') }}
                                </v-alert>
                            </div>

                            <div
                                v-if="devices.length === 0 && selectedDeviceOption !== 'temporary'"
                                class="text-center py-4"
                            >
                                <v-icon
                                    size="48"
                                    color="grey"
                                >
                                    mdi-device-unknown
                                </v-icon>
                                <p class="mt-2 text-medium-emphasis">
                                    {{ t('book.noDevices') }}<br>
                                    {{ t('book.configDeviceDesc') }}
                                </p>
                            </div>
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
                                @click="sendToDevice"
                                :disabled="!canSendToDevice"
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
                    <v-card>
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
                        <v-card-text class="pt-4">
                            <p
                                v-if="refer_books_loading"
                                class="py-6 text-center"
                            >
                                <v-progress-circular
                                    indeterminate
                                    color="primary"
                                />
                            </p>
                            <p
                                v-else-if="refer_books.length === 0"
                                class="py-6 text-center"
                            >
                                {{ t('book.noMatchingBooks') }}
                            </p>
                            <template v-else>
                                <p class="mb-4">
                                    {{ t('book.selectMatchingBook') }}
                                </p>
                                <BookCards_Small :books="refer_books" :max-columns="2">
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
                                accept=".epub,.mobi,.azw,.azw3,.pdf,.txt"
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

                <!-- Main Book Info -->
                <v-card>
                    <v-toolbar
                        flat
                        density="compact"
                        :color="store.theme === 'light' ? 'white' : 'grey-darken-4'"
                    >
                        <v-btn
                            icon
                            size="small"
                            @click="dialog_download = true"
                        >
                            <v-icon>mdi-download</v-icon>
                        </v-btn>

                        <v-spacer />

                        <v-btn
                            color="primary"
                            variant="elevated"
                            class="mx-2"
                            @click="dialog_send_to_device = !dialog_send_to_device"
                        >
                            <v-icon start>
                                mdi-devices
                            </v-icon>
                            {{ t('book.sendToDevice') }}
                        </v-btn>

                        <v-btn
                            v-if="book.id > 0 && store.user.is_login"
                            color="primary"
                            variant="elevated"
                            class="mx-2"
                            :loading="readingStateLoading"
                            @click="handleReadingStateChange"
                        >
                            {{ readingStateButtonText }}
                        </v-btn>

                        <v-btn
                            v-if="book.id > 0"
                            color="primary"
                            variant="elevated"
                            class="mx-2"
                            :href="is_txt ? '/book/' + book.id + '/readtxt' : '/read/' + book.id"
                            target="_blank"
                        >
                            <v-icon start>
                                mdi-book-open-page-variant
                            </v-icon>
                            {{ t('common.read') }}
                        </v-btn>

                        <template v-if="book.is_owner">
                            <v-menu offset-y>
                                <template #activator="{ props }">
                                    <v-btn
                                        v-bind="props"
                                        color="primary"
                                        variant="elevated"
                                        class="ml-2"
                                    >
                                        <v-icon start>
                                            mdi-file-cog
                                        </v-icon>
                                        {{ t('book.process') }}
                                        <v-icon size="small">
                                            mdi-dots-vertical
                                        </v-icon>
                                    </v-btn>
                                </template>
                                <v-list density="compact">
                                    <v-list-item :disabled="!hasEpubAzw3OrPDF" @click="save_meta_to_file">
                                        <template #prepend>
                                            <v-icon>mdi-file-sync</v-icon>
                                        </template>
                                        <v-list-item-title>{{ t('book.saveMetaToFile') }}</v-list-item-title>
                                    </v-list-item>
                                    <v-list-item :disabled="!hasEBooks" @click="convert_book">
                                        <template #prepend>
                                            <v-icon>mdi-swap-horizontal</v-icon>
                                        </template>
                                        <v-list-item-title>{{ t('book.convert') }}</v-list-item-title>
                                    </v-list-item>
                                    <v-list-item :disabled="!hasEBooks || hasPDF" @click="convert_to_pdf">
                                        <template #prepend>
                                            <v-icon>mdi-file-pdf-box</v-icon>
                                        </template>
                                        <v-list-item-title>{{ t('book.convert_to_pdf') }}</v-list-item-title>
                                    </v-list-item>
                                    <v-list-item @click="seperate_book" :disabled="book.files && book.files.length <= 1">
                                        <template #prepend>
                                            <v-icon>mdi-content-copy</v-icon>
                                        </template>
                                        <v-list-item-title>{{ t('book.seperate') }}</v-list-item-title>
                                    </v-list-item>
                                    <v-list-item @click="show_delete_format_dialog" :disabled="book.files && book.files.length <= 1">
                                        <template #prepend>
                                            <v-icon>mdi-file-document-remove-outline</v-icon>
                                        </template>
                                        <v-list-item-title>{{ t('book.deleteFormat') }}</v-list-item-title>
                                    </v-list-item>
                                    <v-list-item @click="show_upload_format_dialog">
                                        <template #prepend>
                                            <v-icon>mdi-file-upload-outline</v-icon>
                                        </template>
                                        <v-list-item-title>{{ t('book.uploadNewFormat') }}</v-list-item-title>
                                    </v-list-item>
                                </v-list>
                            </v-menu>

                            <v-menu offset-y>
                                <template #activator="{ props }">
                                    <v-btn
                                        v-bind="props"
                                        color="primary"
                                        variant="elevated"
                                        class="ml-2 mr-4"
                                    >
                                        {{ t('common.manage') }}
                                        <v-icon size="small">
                                            mdi-dots-vertical
                                        </v-icon>
                                    </v-btn>
                                </template>
                                <v-list density="compact">
                                    <v-list-item :to="'/book/' + book.id + '/edit'">
                                        <template #prepend>
                                            <v-icon>mdi-cog</v-icon>
                                        </template>
                                        <v-list-item-title>{{ t('book.editInfo') }}</v-list-item-title>
                                    </v-list-item>
                                    <v-list-item @click="get_refer">
                                        <template #prepend>
                                            <v-icon>mdi-apps</v-icon>
                                        </template>
                                        <v-list-item-title>{{ t('book.updateFromInternet') }}</v-list-item-title>
                                    </v-list-item>
                                    <v-list-item @click="set_scope">
                                        <template #prepend>
                                            <v-icon>{{ book.scope === 'private' ? 'mdi-earth-off' : 'mdi-earth' }}</v-icon>
                                        </template>
                                        <v-list-item-title>{{ book.scope === 'private' ? t('book.setPublic') : t('book.setPrivate') }}</v-list-item-title>
                                    </v-list-item>
                                    <v-divider />
                                    <v-list-item @click="delete_book">
                                        <template #prepend>
                                            <v-icon color="error">
                                                mdi-delete-forever
                                            </v-icon>
                                        </template>
                                        <v-list-item-title>{{ t('book.deleteBook') }}</v-list-item-title>
                                    </v-list-item>
                                </v-list>
                            </v-menu>
                        </template>
                    </v-toolbar>
                    <v-row>
                        <v-col
                            class="mx-auto"
                            cols="8"
                            sm="4"
                        >
                            <div style="position: relative; display: inline-block; width: 100%;">
                                <v-img
                                    class="book-img"
                                    :src="book.img"
                                    :aspect-ratio="11 / 15"
                                    max-height="500px"
                                    contain
                                    style="border-radius: 14px;"
                                />
                                <div
                                    v-if="readingState === READING_STATE.FINISHED"
                                    style="
                                        position: absolute;
                                        top: 95%;
                                        left: 0;
                                        right: 0;
                                        height: 40px;
                                        background: rgba(158, 158, 158, 0.7);
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        z-index: 2;
                                        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                                        backdrop-filter: blur(2px);
                                    "
                                >
                                    <span
                                        style="
                                            color: white;
                                            font-size: 1.2rem;
                                            font-weight: bold;
                                            text-shadow: 1px 1px 3px rgba(0,0,0,0.7);
                                            line-height: 1;
                                            letter-spacing: 2px;
                                        "
                                    >
                                        {{ t('readingState.finished') }}
                                    </span>
                                </div>
                            </div>
                        </v-col>
                        <v-col
                            cols="12"
                            sm="8"
                        >
                            <v-card-text>
                                <div v-if="book.id > 0 && store.user.is_login">
                                    <p class="text-h5 mb-2">
                                        {{ book.title }}
                                        <v-tooltip bottom>
                                            <template #activator="{ props }">
                                                <v-btn
                                                    v-bind="props"
                                                    icon
                                                    size="x-small"
                                                    class="ml-2"
                                                    :color="isWants ? 'orange' : 'grey'"
                                                    @click="toggleWants"
                                                >
                                                    <v-icon>
                                                        {{ isWants ? 'mdi-bookmark-plus' : 'mdi-bookmark-plus-outline' }}
                                                    </v-icon>
                                                </v-btn>
                                            </template>
                                            <span>{{ t('readingState.wantsHint') }}</span>
                                        </v-tooltip>
                                    </p>
                                </div>
                                <div v-else>
                                    <p class="text-h5 mb-2">
                                        {{ book.title }}
                                    </p>
                                </div>
                                <div>
                                    <span class="text-grey">{{ book.author }}著，{{ pub_year }}年版</span>
                                    <span
                                        v-if="book.files && book.files.length > 0"
                                        class="text-grey font-weight-bold"
                                    >&nbsp;&nbsp;&nbsp;[{{ book.files.map(f => f.format).join(', ') }}<span v-if="book.files[0].size >= 1048576"> - {{ parseInt(book.files[0].size / 1048576) }}MB</span><span v-else-if="book.files[0].size > 0"> - {{ parseInt(book.files[0].size / 1024) }}KB</span>]</span>
                                </div>
                                <v-rating
                                    v-model="book.rating"
                                    color="yellow-darken-2"
                                    length="10"
                                    readonly
                                    density="compact"
                                    size="small"
                                />
                                <div
                                    v-if="readingState === READING_STATE.READING"
                                    class="mt-2"
                                >
                                    <v-chip
                                        size="small"
                                        color="indigo"
                                    >
                                        <v-icon
                                            size="small"
                                            start
                                        >
                                            mdi-book-open
                                        </v-icon>
                                        {{ readingDaysText }}
                                    </v-chip>
                                </div>
                                <div
                                    v-else-if="readingState === READING_STATE.FINISHED"
                                    class="mt-2"
                                >
                                    <v-chip
                                        size="small"
                                        color="grey"
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
                                <br>
                                <div class="tag-chips mt-2">
                                    <v-chip
                                        v-for="author in book.authors"
                                        :key="'author-' + author"
                                        class="ma-1"
                                        size="small"
                                        color="indigo"
                                        :to="'/author/' + encodeURIComponent(author)"
                                        variant="flat"
                                    >
                                        <v-icon start>
                                            mdi-account
                                        </v-icon>
                                        {{ author }}
                                    </v-chip>
                                    <v-chip
                                        class="ma-1"
                                        size="small"
                                        color="indigo"
                                        :to="'/publisher/' + encodeURIComponent(book.publisher)"
                                        variant="flat"
                                    >
                                        <v-icon start>
                                            mdi-domain
                                        </v-icon>
                                        {{ t('book.publisher') }}：{{ book.publisher }}
                                    </v-chip>
                                    <v-chip
                                        v-if="book.series"
                                        class="ma-1"
                                        size="small"
                                        color="indigo"
                                        :to="'/series/' + encodeURIComponent(book.series)"
                                        variant="flat"
                                    >
                                        <v-icon start>
                                            mdi-bookshelf
                                        </v-icon>
                                        {{ t('book.series') }}: {{ book.series }}
                                    </v-chip>
                                    <v-chip
                                        v-if="book.isbn"
                                        class="ma-1"
                                        size="small"
                                        color="grey"
                                        variant="flat"
                                    >
                                        <v-icon start>
                                            mdi-barcode
                                        </v-icon>
                                        ISBN：{{ book.isbn }}
                                    </v-chip>
                                    <template v-for="tag in book.tags">
                                        <v-chip
                                            v-if="tag"
                                            :key="'tag-' + tag"
                                            class="ma-1"
                                            size="small"
                                            color="grey"
                                            :to="'/tag/' + encodeURIComponent(tag)"
                                            variant="flat"
                                        >
                                            <v-icon start>
                                                mdi-tag
                                            </v-icon>
                                            {{ tag }}
                                        </v-chip>
                                    </template>
                                    <v-chip
                                        v-if="book.scope"
                                        class="ma-1"
                                        size="small"
                                        :color="book.scope === 'private' ? 'orange' : 'teal'"
                                        variant="flat"
                                    >
                                        <v-icon start>
                                            {{ book.scope === 'private' ? 'mdi-earth-off' : 'mdi-earth' }}
                                        </v-icon>
                                        {{ book.scope === 'private' ? t('book.scopePrivate') : t('book.scopePublic') }}
                                    </v-chip>
                                </div>
                            </v-card-text>
                            <v-card-text>
                                <p
                                    v-if="book.id > 0 && book.comments && book.comments !== '暂无简介'"
                                    v-html="book.comments"
                                />
                                <p v-else-if="book.id > 0">
                                    {{ t('book.viewDetails') }}
                                </p>
                            </v-card-text>
                        </v-col>
                    </v-row>
                    <v-card-text class="text-right book-footer">
                        <span class="text-grey"> {{ book.collector }} @ {{ book.timestamp }} </span>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <!-- Action Buttons Below Main Content -->
        <v-row class="mt-4">
            <v-col cols="12">
                <v-row justify="space-around">
                    <v-col
                        v-if="book.id > 0 && !is_txt"
                        cols="12"
                        sm="6"
                        md="auto"
                        class="flex-grow-1"
                    >
                        <v-card
                            variant="outlined"
                            class="mb-2 h-100"
                        >
                            <v-list density="compact">
                                <v-list-item
                                    :href="'/read/' + book.id"
                                    target="_blank"
                                    class="w-100"
                                >
                                    <template #prepend>
                                        <v-avatar color="primary">
                                            <v-icon color="white">
                                                mdi-book-open-page-variant
                                            </v-icon>
                                        </v-avatar>
                                    </template>
                                    <v-list-item-title>{{ t('book.onlineRead') }}</v-list-item-title>
                                    <template #append>
                                        <v-icon>mdi-chevron-right</v-icon>
                                    </template>
                                </v-list-item>
                            </v-list>
                        </v-card>
                    </v-col>

                    <v-col
                        v-if="book.id > 0 && is_txt"
                        cols="12"
                        sm="6"
                        md="auto"
                        class="flex-grow-1"
                    >
                        <v-card
                            variant="outlined"
                            class="mb-2 h-100"
                        >
                            <v-list density="compact">
                                <v-list-item
                                    :href="'/book/' + book.id + '/readtxt'"
                                    target="_blank"
                                    class="w-100"
                                >
                                    <template #prepend>
                                        <v-avatar color="primary">
                                            <v-icon color="white">
                                                mdi-text-box
                                            </v-icon>
                                        </v-avatar>
                                    </template>
                                    <v-list-item-title>{{ t('book.txtOnlineRead') }}({{ txt_parse_inited ? t('book.parsed') : t('book.unparsed') }})</v-list-item-title>
                                    <template #append>
                                        <v-icon>mdi-chevron-right</v-icon>
                                    </template>
                                </v-list-item>
                            </v-list>
                        </v-card>
                    </v-col>

                    <v-col
                        cols="12"
                        sm="6"
                        md="auto"
                        class="flex-grow-1"
                    >
                        <v-card
                            variant="outlined"
                            class="mb-2 h-100"
                        >
                            <v-list density="compact">
                                <v-list-item
                                    class="w-100"
                                    @click="dialog_download = !dialog_download"
                                >
                                    <template #prepend>
                                        <v-avatar color="primary">
                                            <v-icon color="white">
                                                mdi-download
                                            </v-icon>
                                        </v-avatar>
                                    </template>
                                    <v-list-item-title>{{ t('common.download') }}</v-list-item-title>
                                    <template #append>
                                        <v-icon>mdi-chevron-right</v-icon>
                                    </template>
                                </v-list-item>
                            </v-list>
                        </v-card>
                    </v-col>

                    <v-col
                        cols="12"
                        sm="6"
                        md="auto"
                        class="flex-grow-1"
                    >
                        <v-card
                            variant="outlined"
                            class="mb-2 h-100"
                        >
                            <v-list density="compact">
                                <v-list-item
                                    class="w-100"
                                    @click="dialog_send_to_device = !dialog_send_to_device"
                                >
                                    <template #prepend>
                                        <v-avatar color="primary">
                                            <v-icon color="white">
                                                mdi-devices
                                            </v-icon>
                                        </v-avatar>
                                    </template>
                                    <v-list-item-title>
                                        {{ t('book.sendToDevice') }}
                                    </v-list-item-title>
                                    <template #append>
                                        <v-icon>mdi-chevron-right</v-icon>
                                    </template>
                                </v-list-item>
                            </v-list>
                        </v-card>
                    </v-col>
                </v-row>
            </v-col>
        </v-row>

        <v-row v-if="book.id > 0 && store.user.is_login" class="mt-4">
            <v-col cols="12">
                <v-card variant="outlined">
                    <v-card-text>
                        <div class="d-flex flex-wrap align-center ga-2">
                            <v-btn
                                variant="tonal"
                                :color="isWants ? 'orange' : 'grey'"
                                size="small"
                                @click="toggleWants"
                            >
                                <v-icon start>
                                    {{ isWants ? 'mdi-bookmark' : 'mdi-bookmark-outline' }}
                                </v-icon>
                                {{ isWants ? t('book.removeFromWantToRead') : t('book.wantToRead') }}
                            </v-btn>

                            <v-btn
                                variant="tonal"
                                :color="readingStateText.color"
                                size="small"
                                @click="handleReadingStateChange"
                            >
                                <v-icon start>
                                    {{ readingStateText.icon }}
                                </v-icon>
                                {{ readingStateText.label }}
                            </v-btn>

                            <v-chip
                                v-if="readingState > 0"
                                size="small"
                                :color="readingState === 1 ? 'blue' : 'grey'"
                                class="ml-2"
                            >
                                {{ readingState === 1 ? t('book.currentlyReading') : t('book.alreadyFinished') }}
                            </v-chip>
                        </div>
                    </v-card-text>
                </v-card>
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

const route = useRoute();
const router = useRouter();
const store = useMainStore();
const { $backend, $alert } = useNuxtApp();
const { t } = useI18n();

const bookid = route.params.bid;
const book = ref({
    id: 0,
    title: '',
    files: [],
    tags: [],
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
    series: ''
});

// Dialogs
const dialog_download = ref(false);
const dialog_send_to_device = ref(false);
const dialog_refer = ref(false);

// Kindle sender for reference
const kindle_sender = ref('');

// Device management
const sending_to_device = ref(false);
const devices = ref([]);
const selectedDeviceOption = ref(null);
const tempDevice = ref({
    type: '',
    ip: '',
    port: ''
});
const deviceTypes = ref([]);

// Refer books
const refer_books_loading = ref(false);
const refer_books_setting_btn_loading = ref(false);
const refer_books = ref([]);

// TXT
const txt_parse_inited = ref(false);

// Upload format
const dialog_upload_format = ref(false);
const upload_format_file = ref(null);
const uploading_format = ref(false);

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

// Methods
const get_txt_parse_status = async () => {
    try {
        const res = await $backend(`/book/txt/init?id=${bookid}&test=1`);
        if (res.err === 'ok' && res.msg === '已解析') {
            txt_parse_inited.value = true;
        }
    } catch (e) {
        console.error(e);
    }
};

// 数据获取逻辑
const { data: fetchData, error: fetchError, pending: fetchPending, refresh } = useAsyncData(`book-${bookid}`, async () => {
    const response = await $backend(`/book/${bookid}`);
    
    if (response.err === 'ok') {
        return response;
    } else {
        throw new Error(response.msg || '获取书籍信息失败');
    }
}, {
    lazy: false,
    default: () => null,
    server: true,
    getCachedData: key => useNuxtData(key).data.value
});

// 监听数据变化并更新 book.value
watch(() => fetchData.value, (newData) => {
    if (newData && newData.book) {
        // 直接更新 book.value 的所有属性，保持响应式
        Object.assign(book.value, newData.book);
        kindle_sender.value = newData.kindle_sender || '';

        // 获取 TXT 解析状态
        get_txt_parse_status();
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
});

// Computed properties
const pub_year = computed(() => {
    if (!book.value || !book.value.pubdate) {
        return 'N/A';
    }
    return book.value.pubdate.split('-')[0];
});

const is_txt = computed(() => {
    if (!book.value || !book.value.files) return false;
    const formats = book.value.files.map(x => x.format.toLowerCase());
    return formats.includes('txt');
});

const hasCompatibleFormats = computed(() => {
    if (!book.value || !book.value.files) return false;
    const formats = book.value.files.map(x => x.format.toLowerCase());
    const compatible = ['epub', 'azw3', 'pdf', 'txt', 'mobi', 'azw'];
    return formats.some(f => compatible.includes(f));
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

const canSendToDevice = computed(() => {
    if (!selectedDeviceOption.value) return false;

    if (selectedDeviceOption.value === 'temporary') {
        if (!tempDevice.value.type) return false;
        if (tempDevice.value.type === 'kindle') return false;
        return !!(tempDevice.value.ip && tempDevice.value.port);
    }

    const idx = parseInt(selectedDeviceOption.value.replace('saved-', ''));
    const device = devices.value[idx];
    if (!device) return false;
    if (device.type === 'kindle') return !!device.mailbox;
    return !!(device.ip && device.port);
});

const hasEBooks = computed(() => {
    if (!book.value || !book.value.files) {
        return false;
    }
    if (book.value.files.length === 0) {
        return false;
    }
    return true;
});

const hasPDF = computed(() => {
    if (!book.value || !book.value.files) return false;
    return book.value.files.some(file => file.format.toLowerCase() === 'pdf');
});

const hasEpubAzw3OrPDF = computed(() => {
    if (!book.value || !book.value.files) return false;
    const formats = book.value.files.map(f => f.format.toLowerCase());
    return formats.some(f => ['epub', 'azw3', 'pdf'].includes(f));
});

useHead({
    title: () => book.value.title || t('book.detailsTitle')
});

// Device methods
const getDeviceTypeText = (type) => {
    const keyMap = {
        'duokan': 'settings.deviceTypeDuokan',
        'ireader': 'settings.deviceTypeIreader',
        'hanwang': 'settings.deviceTypeHanwang',
        'boox': 'settings.deviceTypeBoox',
        'dangdang': 'settings.deviceTypeDangdang',
        'kindle': 'common.kindle',
        'purelibro': 'settings.deviceTypePurelibro',
    };
    if (keyMap[type]) return t(keyMap[type]) || type;
    return type;
};

const loadUserDevices = async () => {
    try {
        const rsp = await $backend('/user/devices');
        if (rsp.err === 'ok') {
            devices.value = rsp.devices || [];
        }
    } catch (e) {
        console.error('Failed to load user devices:', e);
    }
};

const loadDevicePreferences = () => {
    if (typeof localStorage === 'undefined') return;
    try {
        const savedOption = localStorage.getItem('last_selected_device_option');
        if (savedOption) {
            // Check if the saved option is still valid
            if (savedOption === 'temporary') {
                selectedDeviceOption.value = 'temporary';
            } else if (savedOption.startsWith('saved-') && devices.value.length > 0) {
                const idx = parseInt(savedOption.replace('saved-', ''));
                if (idx < devices.value.length) {
                    selectedDeviceOption.value = savedOption;
                }
            }
        }
        const savedTempDevice = localStorage.getItem('temp_device_info');
        if (savedTempDevice) {
            tempDevice.value = JSON.parse(savedTempDevice);
        }
    } catch (e) {
        console.error('Failed to load device preferences:', e);
    }
};

const closeDeviceDialog = () => {
    dialog_send_to_device.value = false;
};

const sendToDevice = async () => {
    if (!canSendToDevice.value) {
        if ($alert) $alert('error', t('book.completeDeviceInfo'));
        return;
    }

    sending_to_device.value = true;
    try {
        let deviceInfo;
        let deviceName;

        if (selectedDeviceOption.value === 'temporary') {
            deviceInfo = {
                type: tempDevice.value.type,
                ip: tempDevice.value.ip,
                port: tempDevice.value.port,
                schema: 'http'
            };
            deviceName = t('book.temporaryDevice');
        } else {
            const deviceIndex = parseInt(selectedDeviceOption.value.replace('saved-', ''));
            deviceInfo = devices.value[deviceIndex];
            deviceName = deviceInfo.name;
        }

        let requestBody;
        if (deviceInfo.type === 'kindle') {
            requestBody = {
                device_type: deviceInfo.type,
                mailbox: deviceInfo.mailbox
            };
        } else {
            const url = `${deviceInfo.schema || 'http'}://${deviceInfo.ip}:${deviceInfo.port}`;
            requestBody = {
                device_type: deviceInfo.type,
                device_url: url
            };
        }

        const response = await $backend(`/book/${bookid}/send_to_device`, {
            method: 'POST',
            body: JSON.stringify(requestBody),
        });

        if (response.err === 'ok') {
            if ($alert) $alert('success', t('book.sendToDeviceSuccess', { deviceName }));
            dialog_send_to_device.value = false;
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

    try {
        const rsp = await $backend(`/book/${bookid}/refer`);
        refer_books.value = rsp.books.map((b) => {
            b.href = '';
            // 如果没有封面地址，使用默认封面
            if (!b.cover_url || b.cover_url === '') {
                b.img = '/get/cover/0';
            } else {
                b.img = '/get/pcover?url=' + encodeURIComponent(b.cover_url);
            }
            return b;
        });
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
        const rsp = await $backend(`/book/${bookid}/refer`, {
            method: 'POST',
            body: data,
        });

        dialog_refer.value = false;
        if (rsp.err === 'ok') {
            if ($alert) $alert('success', t('book.setSuccess'));
            router.push(`/book/${bookid}`);
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
        const rsp = await $backend(`/book/${bookid}/setscope`, {
            method: 'POST',
        });

        if (rsp.err === 'ok') {
            if ($alert) $alert('success', rsp.msg);
            const refreshRsp = await $backend(`/book/${bookid}`);
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
        const rsp = await $backend(`/book/${bookid}/delete`, {
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

const convert_book = () => {
    // 转换书籍格式
    $backend('/book/' + book.value.id + '/convert', {
        method: 'POST',
        body: new URLSearchParams({reset: 'yes'}),
    }).then((rsp) => {
        if (rsp.err === 'ok') {
            $alert('success', t('book.convertSuccessful'));
            router.push('/book/' + book.value.id);
        } else {
            $alert('error', rsp.msg);
        }
    });
};

const convert_to_pdf = () => {
    // 转换为PDF
    $backend('/book/' + book.value.id + '/topdf', {
        method: 'POST',
        body: new URLSearchParams({reset: 'yes'}),
    }).then((rsp) => {
        if (rsp.err === 'ok') {
            $alert('success', t('book.convertSuccessful'));
        } else {
            $alert('error', rsp.msg);
        }
    });
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

// Watch tempDevice changes, auto-fill port based on type
watch(() => tempDevice.value.type, (newType) => {
    const portMap = {
        duokan: '12121',
        boox: '8085',
        hanwang: '9310',
        ireader: '10123',
        dangdang: '11111',
    };
    if (portMap[newType]) {
        tempDevice.value.port = portMap[newType];
    }
});

// Watch dialog_send_to_device open, auto-select default device
watch(dialog_send_to_device, (isOpen) => {
    if (!isOpen) return;
    if (selectedDeviceOption.value) return;

    if (devices.value && devices.value.length > 0) {
        selectedDeviceOption.value = 'saved-0';
    } else {
        selectedDeviceOption.value = 'temporary';
    }
});

// Watch tempDevice changes, persist to localStorage
watch(tempDevice, (newVal) => {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('temp_device_info', JSON.stringify(newVal));
    }
}, { deep: true });

// Watch selectedDeviceOption changes, persist to localStorage
watch(selectedDeviceOption, (newValue) => {
    if (typeof localStorage !== 'undefined' && newValue) {
        localStorage.setItem('last_selected_device_option', newValue);
    }
});

const READING_STATE = { UNREAD: 0, READING: 1, FINISHED: 2 };

const isWants = ref(false);
const readingState = ref(0);
const readingStateLoading = ref(false);
const readDays = ref(0);
const lastReadTime = ref('');

const loadReadingState = async () => {
    if (!store.user.is_login || !book.value.id) return;
    try {
        const rsp = await $backend(`/book/${book.value.id}/readstate`);
        if (rsp.err === 'ok') {
            isWants.value = !!rsp.wants;
            readingState.value = rsp.read_state || 0;
            readDays.value = rsp.read_days || 0;
            lastReadTime.value = rsp.read_date || '';
        }
        if (book.value.state) {
            if (!rsp || rsp.err !== 'ok') {
                isWants.value = !!book.value.state.wants;
                readingState.value = book.value.state.read_state || 0;
            }
            readDays.value = book.value.state.read_days || 0;
            lastReadTime.value = book.value.state.last_read_time || '';
        }
    } catch (e) {
        console.error('Failed to load reading state:', e);
    }
};

const toggleWants = async () => {
    readingStateLoading.value = true;
    try {
        const rsp = await $backend(`/book/${book.value.id}/wants`, {
            method: 'POST',
            body: JSON.stringify({ wants: !isWants.value }),
        });
        if (rsp.err === 'ok') {
            isWants.value = !isWants.value;
        }
    } catch (e) {
        console.error('Wants error:', e);
    } finally {
        readingStateLoading.value = false;
    }
};

const handleReadingStateChange = async () => {
    readingStateLoading.value = true;
    try {
        let newState = READING_STATE.READING;
        if (readingState.value === READING_STATE.READING) {
            newState = READING_STATE.FINISHED;
        } else if (readingState.value === READING_STATE.FINISHED) {
            newState = READING_STATE.UNREAD;
        }

        const rsp = await $backend(`/book/${book.value.id}/readstate`, {
            method: 'POST',
            body: JSON.stringify({ read_state: newState }),
        });
        if (rsp.err === 'ok') {
            readingState.value = newState;
            if (newState === READING_STATE.READING) {
                isWants.value = false;
                readDays.value = 0;
            }
            if (newState === READING_STATE.FINISHED) {
                readDays.value = 0;
                lastReadTime.value = new Date().toISOString().slice(0, 10);
            }
            if (newState === READING_STATE.UNREAD) {
                readDays.value = 0;
                lastReadTime.value = '';
            }
        }
    } catch (e) {
        console.error('Reading state error:', e);
    } finally {
        readingStateLoading.value = false;
    }
};

const readingStateText = computed(() => {
    if (readingState.value === READING_STATE.UNREAD || readingState.value === READING_STATE.FINISHED) {
        return { label: t('book.setAsReading'), icon: 'mdi-book-open-outline', color: 'primary' };
    }
    return { label: t('book.markAsFinished'), icon: 'mdi-check-circle-outline', color: 'success' };
});

const readingDaysText = computed(() => {
    if (readingState.value !== READING_STATE.READING) return '';
    const days = readDays.value;
    if (days === 0) {
        return t('readingState.readingWithinOneDay');
    }
    return t('readingState.readingDays', { days });
});

const completedReadingText = computed(() => {
    if (readingState.value !== READING_STATE.FINISHED) return '';
    return t('readingState.completedReading', { date: lastReadTime.value });
});

const readingStateButtonText = computed(() => {
    if (readingState.value === READING_STATE.READING) {
        return t('readingState.setDone');
    }
    return t('readingState.setReading');
});

watch(() => book.value.id, (newId) => {
    if (newId) {
        loadReadingState();
    }
});

// Load devices on mount
const loadDevices = async () => {
    if (store.user?.is_login) {
        await loadUserDevices();
        loadDevicePreferences();
    }
};

// Watch user login state
watch(() => store.user?.is_login, async (isLogin) => {
    if (isLogin) {
        await loadDevices();
    }
});

onMounted(async () => {
    deviceTypes.value = [
        { text: t('settings.deviceTypeDuokan'), value: 'duokan' },
        { text: t('settings.deviceTypeIreader'), value: 'ireader' },
        { text: t('settings.deviceTypeHanwang'), value: 'hanwang' },
        { text: t('settings.deviceTypeBoox'), value: 'boox' },
        { text: t('settings.deviceTypeDangdang'), value: 'dangdang' },
        { text: t('common.kindle') || 'Kindle', value: 'kindle' },
        { text: t('settings.deviceTypePurelibro') || 'PureLibro', value: 'purelibro' },
    ];
    await loadDevices();
});
</script>

<style scoped>
.book-img {
    border-radius: 4px;
}

.align-right {
    text-align: right;
}

.book-footer {
    padding-top: 0;
    padding-bottom: 3px;
}

.tag-chips a {
    margin: 4px 2px;
}

.tag-chips :deep(.v-chip) {
    color: white !important;
}

/* 减小管理菜单图标和文字的间距 */
:deep(.v-list-item__spacer) {
    width: 8px !important;
}
</style>