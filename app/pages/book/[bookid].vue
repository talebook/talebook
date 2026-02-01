
<template>
    <v-row align="start">
        <v-col cols="12">
            <!-- Download Dialog -->
            <v-dialog v-model="dialog_download" persistent width="300">
                <v-card>
                    <v-card-title color="primary" class="">下载书籍</v-card-title>
                    <v-card-text>
                        <v-list v-if="book.files && book.files.length > 0">
                            <v-list-item :key="'file-'+file.format" v-for="file in book.files" target="_blank"
                                         :href="file.href">
                                <template v-slot:prepend>
                                    <v-avatar color='primary'>
                                        <v-icon color="white">mdi-download</v-icon>
                                    </v-avatar>
                                </template>
                                <v-list-item-title>{{ file.format }}</v-list-item-title>
                                <v-list-item-subtitle v-if="file.size>=1048576">{{ parseInt(file.size / 1048576) }}MB</v-list-item-subtitle>
                                <v-list-item-subtitle v-else>{{ parseInt(file.size / 1024) }}KB</v-list-item-subtitle>
                            </v-list-item>
                        </v-list>
                        <p v-else><br/>本书暂无可供下载的文件格式</p>
                    </v-card-text>
                    <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn text @click="dialog_download = false">关闭</v-btn>
                        <v-spacer></v-spacer>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- Main Book Info -->
            <v-card>
                <v-toolbar flat density="compact" color="white">
                    <v-btn icon size="small" @click="dialog_download = true">
                        <v-icon>mdi-download</v-icon>
                    </v-btn>
                    
                    <v-spacer></v-spacer>
                    
                    <v-btn color="primary" class="mx-2" :href="'/read/' + book.id" target="_blank">
                        <v-icon start>mdi-book-open-page-variant</v-icon>
                        阅读
                    </v-btn>
                </v-toolbar>
                <v-row>
                    <v-col class="mx-auto" cols="8" sm="4">
                        <v-img class="book-img" :src="book.img" :aspect-ratio="11 / 15" max-height="500px" contain></v-img>
                    </v-col>
                    <v-col cols="12" sm="8">
                        <v-card-text>
                            <div>
                                <p class='text-h5 mb-2'>{{ book.title }}</p>
                                <span class="text-grey">{{ book.author }}著，{{ pub_year }}年版</span>
                            </div>
                            <v-rating v-model="book.rating" color="yellow-accent-4" length="10" readonly density="compact" size="small"></v-rating>
                            <br/>
                            <div class="tag-chips mt-2">
                                <v-chip v-for="author in book.authors" :key="'author-' + author" class="ma-1" size="small" color="indigo" :to="'/author/' + encodeURIComponent(author)" variant="flat">
                                    <v-icon start>mdi-account</v-icon>
                                    {{ author }}
                                </v-chip>
                                <v-chip class="ma-1" size="small" color="indigo" :to="'/publisher/' + encodeURIComponent(book.publisher)" variant="flat">
                                    <v-icon start>mdi-domain</v-icon>
                                    出版：{{ book.publisher }}
                                </v-chip>
                                <v-chip class="ma-1" size="small" color="grey" v-if="book.isbn" variant="flat">
                                    <v-icon start>mdi-barcode</v-icon>
                                    ISBN：{{ book.isbn }}
                                </v-chip>
                            </div>
                        </v-card-text>
                        <v-card-text>
                            <p v-if="book.comments" v-html="book.comments"></p>
                            <p v-else>点击浏览详情</p>
                        </v-card-text>
                    </v-col>
                </v-row>
                <v-card-text class="text-right book-footer">
                    <span class="text-grey"> {{ book.collector }} @ {{ book.timestamp }} </span>
                </v-card-text>
            </v-card>
        </v-col>
        
        <!-- Sidebar Actions (Simplified) -->
        <v-col cols="12" sm="5" md="4">
            <v-card variant="outlined" class="mb-2">
                <v-list>
                    <v-list-item @click="dialog_download = !dialog_download">
                        <template v-slot:prepend>
                            <v-avatar color="primary">
                                <v-icon color="white">mdi-download</v-icon>
                            </v-avatar>
                        </template>
                        <v-list-item-title>下载</v-list-item-title>
                        <template v-slot:append>
                            <v-icon>mdi-chevron-right</v-icon>
                        </template>
                    </v-list-item>
                </v-list>
            </v-card>
        </v-col>
    </v-row>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useMainStore } from '@/stores/main'

const route = useRoute()
const store = useMainStore()
const { $backend, $alert } = useNuxtApp()

const bookid = route.params.bookid
const book = ref({id: 0, title: "", files: [], tags: [], pubdate: "", authors: [], publisher: "", comments: "", rating: 0, img: "", isbn: "", collector: "", timestamp: ""})
const dialog_download = ref(false)

// Set navbar
store.setNavbar(true)

const { data } = await useAsyncData(`book-${bookid}`, () => $backend(`/book/${bookid}`))

if (data.value) {
    if (data.value.err === 'ok') {
        book.value = data.value.book
    } else {
        if ($alert) $alert("error", data.value.msg, "/")
    }
}

useHead({
    title: book.value.title
})

const pub_year = computed(() => {
    if (!book.value || !book.value.pubdate) {
        return "N/A";
    }
    return book.value.pubdate.split("-")[0];
})
</script>

<style scoped>
.book-img {
    border-radius: 4px;
}
.tag-chips .v-chip {
    margin: 4px;
    color: white !important;
}
</style>
