<template>
    <v-row align="start">
        <v-col cols="12">
            <v-card>
                <v-toolbar
                    dark
                    color="primary"
                >
                    <v-toolbar-title align-center>
                        {{ t('book.editBookInfo') }}
                    </v-toolbar-title>
                    <v-spacer />
                    <v-btn
                        class="mr-2"
                        color="red"
                        variant="elevated"
                        :to="'/book/'+book.id"
                    >
                        {{ t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        class="mr-4"
                        color="green"
                        variant="elevated"
                        @click="save_book"
                    >
                        {{ t('common.save') }}
                    </v-btn>
                </v-toolbar>
                <v-card-text class="pa-0 pa-md-2">
                    <v-form>
                        <v-container>
                            <v-row>
                                <v-col cols="12">
                                    <h3>{{ t('book.coverImage') }}</h3>
                                    <v-row>
                                        <v-col
                                            cols="12"
                                            sm="4"
                                        >
                                            <v-img
                                                :src="book.img"
                                                max-height="200"
                                                contain
                                                class="mb-4"
                                            />
                                        </v-col>
                                        <v-col
                                            cols="12"
                                            sm="8"
                                        >
                                            <v-file-input
                                                v-model="coverFile"
                                                accept="image/jpeg, image/png, image/gif"
                                                :label="t('book.selectCover')"
                                                prepend-icon="mdi-image"
                                                @change="onCoverFileChange"
                                            />
                                            <small class="text-caption">{{ t('book.coverSupported') }}</small>
                                            <div class="mt-2">
                                                <v-btn
                                                    color="primary"
                                                    small
                                                    :disabled="!coverFile"
                                                    @click="uploadCover"
                                                >
                                                    {{ t('book.uploadCover') }}
                                                </v-btn>
                                            </div>
                                        </v-col>
                                    </v-row>
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="12"
                                    sm="6"
                                >
                                    <v-text-field
                                        v-model="book.title"
                                        :label="t('book.field.title')"
                                    />
                                </v-col>
                                <v-col
                                    class="py-4"
                                    cols="12"
                                    sm="6"
                                >
                                    <v-rating
                                        v-model="book.rating"
                                        label="Rating"
                                        color="yellow accent-4"
                                        length="10"
                                        dense
                                    />
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="12"
                                    sm="6"
                                >
                                    <!-- AUTHORS -->
                                    <v-combobox
                                        v-model="book.authors"
                                        v-model:search-input="author_input"
                                        :items="book.authors"
                                        :label="t('book.field.authors')"
                                        hide-selected
                                        multiple
                                        small-chips
                                    >
                                        <template #no-data>
                                            <v-list-item>
                                                <span v-if="! author_input">{{ t('book.enterNewName') }}</span>
                                                <div v-else>
                                                    <span class="subheading">{{ t('common.add') }}</span>
                                                    <v-chip
                                                        color="green lighten-3"
                                                        label
                                                        small
                                                        rounded
                                                    >
                                                        {{ 
                                                            author_input
                                                        }}
                                                    </v-chip>
                                                </div>
                                            </v-list-item>
                                        </template>
                                        <!-- author chip & close -->
                                        <template #selection="{ attrs, item, index, selected }">
                                            <v-chip
                                                v-bind="attrs"
                                                color="green lighten-3"
                                                :input-value="selected"
                                                label
                                                small
                                                closable
                                                @click:close="book.authors.splice(index, 1)"
                                            >
                                                <span class="pr-2">{{ item.title || item }}</span>
                                            </v-chip>
                                        </template>
                                    </v-combobox>
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="12"
                                    sm="6"
                                >
                                    <v-text-field
                                        v-model="book.series"
                                        :label="t('book.series')"
                                    />
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="12"
                                    sm="6"
                                >
                                    <v-text-field
                                        v-model="book.publisher"
                                        :label="t('book.field.publisher')"
                                    />
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="12"
                                    sm="6"
                                >
                                    <v-text-field
                                        v-model="book.pubdate"
                                        :label="t('book.field.pubdate')"
                                    />
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="12"
                                    sm="6"
                                >
                                    <v-text-field
                                        v-model="book.isbn"
                                        :label="t('book.isbn')"
                                    />
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="12"
                                    sm="6"
                                >
                                    <v-text-field
                                        v-model="book.language"
                                        :label="t('book.language')"
                                    />
                                </v-col>


                                <v-col
                                    class="py-0"
                                    cols="12"
                                >
                                    <!-- TAGS -->
                                    <v-combobox
                                        v-model="book.tags"
                                        v-model:search-input="tag_input"
                                        :items="book.tags"
                                        :label="t('book.field.tags')"
                                        hide-selected
                                        multiple
                                        small-chips
                                    >
                                        <template #no-data>
                                            <v-list-item>
                                                <span v-if="! tag_input">{{ t('book.enterNewTagName') }}</span>
                                                <div v-else>
                                                    <span class="subheading">{{ t('book.addTag') }}</span>
                                                    <v-chip
                                                        color="green lighten-3"
                                                        label
                                                        small
                                                        rounded
                                                    >
                                                        {{ 
                                                            tag_input
                                                        }}
                                                    </v-chip>
                                                </div>
                                            </v-list-item>
                                        </template>
                                        <!-- tag chip & close -->
                                        <template #selection="{ attrs, item, index, selected }">
                                            <v-chip
                                                v-bind="attrs"
                                                color="green lighten-3"
                                                :input-value="selected"
                                                label
                                                small
                                                closable
                                                @click:close="book.tags.splice(index, 1)"
                                            >
                                                <span class="pr-2">{{ item.title || item }}</span>
                                            </v-chip>
                                        </template>
                                    </v-combobox>
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="12"
                                >
                                    <v-textarea
                                        v-model="book.comments"
                                        small
                                        outlined
                                        rows="15"
                                        :label="t('book.field.comments')"
                                    />
                                </v-col>
                                <v-divider />
                                <v-col
                                    align="center"
                                    cols="12"
                                >
                                    <v-btn
                                        dark
                                        color="green"
                                        @click="save_book"
                                    >
                                        {{ t('common.save') }}
                                    </v-btn>
                                </v-col>
                            </v-row>
                        </v-container>
                    </v-form>
                </v-card-text>
            </v-card>
        </v-col>
    </v-row>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useAsyncData, useNuxtApp } from 'nuxt/app';

const route = useRoute();
const router = useRouter();
const { $backend, $alert } = useNuxtApp();
const { t } = useI18n();

const bookid = route.params.bid;
const book = ref({'id': 0, 'files': [], 'tags': [], 'pubdate': ''});
const author_input = ref(null);
const tag_input = ref(null);
const coverFile = ref(null);
const saving = ref(false);

const pub_year = computed(() => {
    if (!book.value || !book.value.pubdate) {
        return '';
    }
    return book.value.pubdate.split('-')[0];
});

// 修复1: 移除 await，正确使用 useAsyncData
const { data, refresh } = useAsyncData(`book-edit-${bookid}`, async () => {
    try {
        const response = await $backend(`/book/${bookid}`);
        return response;
    } catch (error) {
        console.error('获取书籍信息失败:', error);
        return { err: 'error', msg: '获取书籍信息失败' };
    }
});

// 修复2: 使用 watch 监听 data 变化来处理数据
watch(data, (newData) => {
    if (newData && newData.err === 'ok') {
        book.value = newData.book;
    } else if (newData && newData.err !== 'ok') {
        if ($alert) $alert('error', newData.msg || '获取书籍信息失败');
    }
}, { immediate: true });

// 修复3: useHead 使用函数形式
useHead({
    title: () => `${t('actions.edit')} ${book.value?.title || t('common.book')}`
});

const onCoverFileChange = (file) => {
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            $alert('error', t('errors.coverTooLarge'));
            coverFile.value = null;
        }
    }
};

const uploadCover = async () => {
    if (!coverFile.value) {
        $alert('info', t('errors.chooseCover'));
        return;
    }
    
    saving.value = true;
    
    const formData = new FormData();
    formData.append('cover', coverFile.value);
    
    try {
        const coverRsp = await $backend('/book/' + book.value.id + '/edit', {
            method: 'POST',
            body: formData
        });
        
        if (coverRsp.err === 'ok') {
            $alert('success', t('messages.uploadCoverSuccess'));
            // 刷新书籍信息
            await refresh();
            coverFile.value = null;
        } else {
            $alert('error', t('errors.uploadCoverFailed') + (coverRsp.msg ? (': ' + coverRsp.msg) : ''));
        }
    } catch (error) {
        console.error('上传封面失败:', error);
        $alert('error', t('errors.uploadCoverFailed'));
    } finally {
        saving.value = false;
    }
};

const save_book = async () => {
    if (!book.value.id) {
        $alert('error', t('errors.bookInfoIncomplete'));
        return;
    }
    
    saving.value = true;
    
    try {
        // 如果有封面文件，先上传封面
        if (coverFile.value) {
            const formData = new FormData();
            formData.append('cover', coverFile.value);
            
            const coverRsp = await $backend('/book/' + book.value.id + '/edit', {
                method: 'POST',
                body: formData
            });
            
            if (coverRsp.err !== 'ok') {
                $alert('error', t('book.uploadCoverFailed') + (coverRsp.msg ? (': ' + coverRsp.msg) : ''));
                saving.value = false;
                return;
            }
        }
        
        // 准备书籍数据
        const bookData = {...book.value};
        
        // 处理空数组的情况
        if (!bookData.tags || bookData.tags.length === 0) {
            bookData.tags = ['__DELETE__'];
        }
        if (!bookData.authors || bookData.authors.length === 0) {
            bookData.authors = ['__DELETE__'];
        }
        
        // 处理空字段
        const fieldsToCheck = ['title', 'series', 'publisher', 'isbn', 'language', 'comments', 'pubdate'];
        for (const field of fieldsToCheck) {
            if (!bookData[field]) {
                bookData[field] = '__DELETE__';
            }
        }
        
        // 保存书籍信息
        const rsp = await $backend('/book/' + book.value.id + '/edit', {
            method: 'POST',
            body: JSON.stringify(bookData),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (rsp.err === 'ok') {
            $alert('success', t('messages.savedSuccessfully'));
            router.push('/book/' + book.value.id);
        } else {
            $alert('error', rsp.msg);
        }
    } catch (error) {
        console.error('保存书籍失败:', error);
        $alert('error', t('errors.saveFailed'));
    } finally {
        saving.value = false;
    }
};
</script>

<style>
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
</style>