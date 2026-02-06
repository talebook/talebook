<template>
    <v-row align="start">
        <v-col cols="12">
            <v-card>
                <v-toolbar
                    dark
                    color="primary"
                >
                    <v-toolbar-title align-center>
                        编辑书籍信息
                    </v-toolbar-title>
                    <v-spacer />
                    <v-btn
                        class="mr-2"
                        color="red"
                        variant="elevated"
                        :to="'/book/'+book.id"
                    >
                        取消
                    </v-btn>
                    <v-btn
                        class="mr-4"
                        color="green"
                        variant="elevated"
                        @click="save_book"
                    >
                        保存
                    </v-btn>
                </v-toolbar>
                <v-card-text class="pa-0 pa-md-2">
                    <v-form>
                        <v-container>
                            <v-row>
                                <v-col cols="12">
                                    <h3>封面图</h3>
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
                                                label="选择封面图"
                                                prepend-icon="mdi-image"
                                                @change="onCoverFileChange"
                                            />
                                            <small class="text-caption">支持JPG、PNG、GIF格式，大小不超过5MB</small>
                                            <div class="mt-2">
                                                <v-btn
                                                    color="primary"
                                                    small
                                                    :disabled="!coverFile"
                                                    @click="uploadCover"
                                                >
                                                    上传封面
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
                                        label="书名"
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
                                        label="作者"
                                        hide-selected
                                        multiple
                                        small-chips
                                    >
                                        <template #no-data>
                                            <v-list-item>
                                                <span v-if="! author_input">请输入新的名称</span>
                                                <div v-else>
                                                    <span class="subheading">添加</span>
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
                                        label="丛书名称"
                                    >
                                        {{ book.series }}
                                    </v-text-field>
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="12"
                                    sm="6"
                                >
                                    <v-text-field
                                        v-model="book.publisher"
                                        label="出版社"
                                    />
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="12"
                                    sm="6"
                                >
                                    <v-text-field
                                        v-model="book.pubdate"
                                        label="出版日期"
                                    />
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="12"
                                    sm="6"
                                >
                                    <v-text-field
                                        v-model="book.isbn"
                                        label="ISBN编号"
                                    />
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="12"
                                    sm="6"
                                >
                                    <v-text-field
                                        v-model="book.language"
                                        label="语言"
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
                                        label="标签列表"
                                        hide-selected
                                        multiple
                                        small-chips
                                    >
                                        <template #no-data>
                                            <v-list-item>
                                                <span v-if="! tag_input">请输入新的标签名称</span>
                                                <div v-else>
                                                    <span class="subheading">添加标签</span>
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
                                        label="内容简介"
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
                                        保存
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
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const { $backend, $alert } = useNuxtApp();

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

const { data } = useAsyncData(`book-edit-${bookid}`, () => $backend(`/book/${bookid}`));

if (data.value && data.value.err === 'ok') {
    book.value = data.value.book;
}

useHead({
    title: `编辑 ${book.value.title || '书籍'}`
});

const onCoverFileChange = (file) => {
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            $alert('error', '封面图大小不能超过5MB');
            coverFile.value = null;
        }
    }
};

const uploadCover = async () => {
    if (!coverFile.value) {
        $alert('info', '请选择要上传的封面图');
        return;
    }
    
    saving.value = true;
    
    const formData = new FormData();
    formData.append('cover', coverFile.value);
    
    const coverRsp = await $backend('/book/' + book.value.id + '/edit', {
        method: 'POST',
        body: formData
    });
    
    if (coverRsp.err === 'ok') {
        $alert('success', '封面图上传成功！');
        const bookRsp = await $backend('/book/' + book.value.id);
        if (bookRsp.err === 'ok') {
            book.value = bookRsp.book;
        }
        coverFile.value = null;
    } else {
        $alert('error', '封面图上传失败：' + coverRsp.msg);
    }
    
    saving.value = false;
};

const save_book = async () => {
    saving.value = true;
    
    if (coverFile.value) {
        const formData = new FormData();
        formData.append('cover', coverFile.value);
        
        const coverRsp = await $backend('/book/' + book.value.id + '/edit', {
            method: 'POST',
            body: formData
        });
        
        if (coverRsp.err !== 'ok') {
            $alert('error', '封面图上传失败：' + coverRsp.msg);
            saving.value = false;
            return;
        }
    }
    
    const bookData = {...book.value};
    
    if (!bookData.tags || bookData.tags.length === 0) {
        bookData.tags = ['__DELETE__'];
    }
    if (!bookData.authors || bookData.authors.length === 0) {
        bookData.authors = ['__DELETE__'];
    }
    
    const fieldsToCheck = ['title', 'series', 'publisher', 'isbn', 'language', 'comments', 'pubdate'];
    for (const field of fieldsToCheck) {
        if (!bookData[field]) {
            bookData[field] = '__DELETE__';
        }
    }
    
    const rsp = await $backend('/book/' + book.value.id + '/edit', {
        method: 'POST',
        body: JSON.stringify(bookData),
    });
    
    if (rsp.err === 'ok') {
        $alert('success', '保存成功！');
        router.push('/book/' + book.value.id);
    } else {
        $alert('error', rsp.msg);
    }
    
    saving.value = false;
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
