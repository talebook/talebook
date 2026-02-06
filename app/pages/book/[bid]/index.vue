<template>
    <div>
        <!-- Main Content -->
        <v-row align="start">
            <v-col cols="12">
                <!-- Kindle Push Dialog -->
                <v-dialog v-model="dialog_kindle" persistent width="300">
                    <v-card>
                        <v-card-title>推送到Kindle</v-card-title>
                        <v-card-text>
                            <p class="mb-4">填写Kindle收件人邮箱地址：</p>
                            <v-combobox
                                :items="email_items"
                                :rules="[check_email]"
                                variant="outlined"
                                density="compact"
                                v-model="mail_to"
                                label="Email*"
                                auto-select-first
                                required
                            ></v-combobox>
                            <small>* 请先将本站邮箱加入到Kindle发件人中:<br/>{{ kindle_sender }}</small>
                        </v-card-text>
                        <v-card-actions>
                            <v-btn variant="text" @click="dialog_kindle = false">取消</v-btn>
                            <v-spacer></v-spacer>
                            <v-btn color="primary" variant="text" @click="sendto_kindle">发送</v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>

                <!-- Download Dialog -->
                <v-dialog v-model="dialog_download" persistent width="300">
                    <v-card>
                        <v-card-title>下载书籍</v-card-title>
                        <v-card-text>
                            <v-list v-if="book.files && book.files.length > 0">
                                <v-list-item :key="'file-'+file.format" v-for="file in book.files" target="_blank"
                                             :href="file.href">
                                    <template v-slot:prepend>
                                        <v-avatar color="primary">
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
                            <v-btn variant="text" @click="dialog_download = false">关闭</v-btn>
                            <v-spacer></v-spacer>
                        </v-card-actions>
                    </v-card>
                </v-dialog>

                <!-- Internet Sync Dialog -->
                <v-dialog v-model="dialog_refer" persistent width="800">
                    <v-card>
                        <v-toolbar flat density="compact" color="primary">
                            <v-toolbar-title>从互联网同步书籍信息</v-toolbar-title>
                            <v-spacer></v-spacer>
                            <v-btn variant="outlined" @click="dialog_refer = false">取消</v-btn>
                        </v-toolbar>
                        <v-card-text class="pt-4">
                            <p class="py-6 text-center" v-if="refer_books_loading">
                                <v-progress-circular indeterminate color="primary"></v-progress-circular>
                            </p>
                            <p class="py-6 text-center" v-else-if="refer_books.length === 0">无匹配的书籍信息</p>
                            <template v-else>
                                <p class="mb-4">请选择最匹配的记录复制为本书的描述信息：</p>
                                <BookCards :books="refer_books">
                                    <template #actions="{ book: referBook }">
                                        <v-card-actions>
                                            <v-chip class="mr-1" size="small" v-if="referBook.author_sort">{{ referBook.author_sort }}</v-chip>
                                            <v-chip class="mr-1" size="small" v-if="referBook.publisher">{{ referBook.publisher }}</v-chip>
                                            <v-chip size="small" v-if="referBook.pubyear">{{ referBook.pubyear }}</v-chip>
                                        </v-card-actions>
                                        <v-divider></v-divider>
                                        <v-card-actions>
                                            <v-chip
                                                size="small"
                                                :href="referBook.website"
                                                target="_blank"
                                                :color="referBook.source === '豆瓣' ? 'green' : 'blue'"
                                            >{{ referBook.source }}</v-chip>
                                            <v-spacer></v-spacer>
                                            <v-menu offset-y location="right">
                                                <template v-slot:activator="{ props }">
                                                    <v-btn color="primary" size="small" rounded v-bind="props"
                                                           :loading="refer_books_setting_btn_loading">
                                                        <v-icon size="small">mdi-check</v-icon>
                                                        设置
                                                    </v-btn>
                                                </template>
                                                <v-list density="compact">
                                                    <v-list-item @click="set_refer(referBook.provider_key, referBook.provider_value)">
                                                        <v-list-item-title>设置书籍信息及图片</v-list-item-title>
                                                    </v-list-item>
                                                    <v-list-item
                                                        @click="set_refer(referBook.provider_key, referBook.provider_value, { only_meta: 'yes' })">
                                                        <v-list-item-title>仅设置书籍信息</v-list-item-title>
                                                    </v-list-item>
                                                    <v-list-item
                                                        @click="set_refer(referBook.provider_key, referBook.provider_value, { only_cover: 'yes' })">
                                                        <v-list-item-title>仅设置书籍图片</v-list-item-title>
                                                    </v-list-item>
                                                </v-list>
                                            </v-menu>
                                        </v-card-actions>
                                    </template>
                                </BookCards>
                            </template>
                        </v-card-text>
                    </v-card>
                </v-dialog>

                <!-- Main Book Info -->
                <v-card>
                    <v-toolbar flat density="compact" color="white">
                        <v-btn icon size="small" @click="dialog_download = true">
                            <v-icon>mdi-download</v-icon>
                        </v-btn>

                        <v-spacer></v-spacer>

                        <v-btn color="primary" variant="elevated" class="mx-2" :href="'/read/' + book.id" target="_blank">
                            <v-icon start>mdi-book-open-page-variant</v-icon>
                            阅读
                        </v-btn>

                        <v-btn color="primary" variant="elevated" class="mx-2" @click="dialog_kindle = !dialog_kindle">
                            <v-icon start>mdi-email</v-icon>
                            推送
                        </v-btn>

                        <template v-if="book.is_owner">
                            <v-menu offset-y>
                                <template v-slot:activator="{ props }">
                                    <v-btn v-bind="props" color="primary" variant="elevated" class="ml-2 mr-4">
                                        管理
                                        <v-icon size="small">mdi-dots-vertical</v-icon>
                                    </v-btn>
                                </template>
                                <v-list density="compact">
                                    <v-list-item :to="'/book/' + book.id + '/edit'">
                                        <template v-slot:prepend>
                                            <v-icon>mdi-cog</v-icon>
                                        </template>
                                        <v-list-item-title>编辑书籍信息</v-list-item-title>
                                    </v-list-item>
                                    <v-list-item @click="get_refer">
                                        <template v-slot:prepend>
                                            <v-icon>mdi-apps</v-icon>
                                        </template>
                                        <v-list-item-title>从互联网更新信息</v-list-item-title>
                                    </v-list-item>
                                    <v-divider></v-divider>
                                    <v-list-item @click="delete_book">
                                        <template v-slot:prepend>
                                            <v-icon color="error">mdi-delete-forever</v-icon>
                                        </template>
                                        <v-list-item-title>删除此书</v-list-item-title>
                                    </v-list-item>
                                </v-list>
                            </v-menu>
                        </template>
                    </v-toolbar>
                    <v-row>
                        <v-col class="mx-auto" cols="8" sm="4">
                            <v-img class="book-img" :src="book.img" :aspect-ratio="11 / 15" max-height="500px" contain></v-img>
                        </v-col>
                        <v-col cols="12" sm="8">
                            <v-card-text>
                                <div>
                                    <p class="text-h5 mb-2">{{ book.title }}</p>
                                    <span class="text-grey">{{ book.author }}著，{{ pub_year }}年版</span>
                                    <span
                                        v-if="book.files && book.files.length > 0 && book.files[0].format === 'PDF' && book.files[0].size >= 1048576"
                                        class="text-grey font-weight-bold"
                                    >&nbsp;&nbsp;&nbsp;[文件格式: PDF - {{ parseInt(book.files[0].size / 1048576) }}MB]</span>
                                    <span
                                        v-else-if="book.files && book.files.length > 0 && book.files[0].format === 'PDF' && book.files[0].size < 1048576"
                                        class="text-grey font-weight-bold"
                                    >&nbsp;&nbsp;&nbsp;[文件格式: PDF - {{ parseInt(book.files[0].size / 1024) }}KB]</span>
                                </div>
                                <v-rating v-model="book.rating" color="yellow-darken-2" length="10" readonly density="compact" size="small"></v-rating>
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
                                    <v-chip class="ma-1" size="small" color="indigo" v-if="book.series" :to="'/series/' + encodeURIComponent(book.series)" variant="flat">
                                        <v-icon start>mdi-bookshelf</v-icon>
                                        丛书: {{ book.series }}
                                    </v-chip>
                                    <v-chip class="ma-1" size="small" color="grey" v-if="book.isbn" variant="flat">
                                        <v-icon start>mdi-barcode</v-icon>
                                        ISBN：{{ book.isbn }}
                                    </v-chip>
                                    <v-chip v-for="tag in book.tags" :key="'tag-' + tag" class="ma-1" size="small" color="grey" v-if="tag" :to="'/tag/' + encodeURIComponent(tag)" variant="flat">
                                        <v-icon start>mdi-tag</v-icon>
                                        {{ tag }}
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
        </v-row>

        <!-- Action Buttons Below Main Content -->
        <v-row class="mt-4">
            <v-col cols="12">
                <v-row justify="space-around">
                    <v-col cols="12" sm="6" md="auto" class="flex-grow-1">
                        <v-card variant="outlined" class="mb-2 h-100">
                            <v-list density="compact">
                                <v-list-item :href="'/read/' + book.id" target="_blank" class="w-100">
                                    <template v-slot:prepend>
                                        <v-avatar color="primary">
                                            <v-icon color="white">mdi-book-open-page-variant</v-icon>
                                        </v-avatar>
                                    </template>
                                    <v-list-item-title>在线阅读</v-list-item-title>
                                    <template v-slot:append>
                                        <v-icon>mdi-chevron-right</v-icon>
                                    </template>
                                </v-list-item>
                            </v-list>
                        </v-card>
                    </v-col>

                    <v-col cols="12" sm="6" md="auto" class="flex-grow-1" v-if="is_txt">
                        <v-card variant="outlined" class="mb-2 h-100">
                            <v-list density="compact">
                                <v-list-item :href="'/book/' + book.id + '/readtxt'" target="_blank" class="w-100">
                                    <template v-slot:prepend>
                                        <v-avatar color="primary">
                                            <v-icon color="white">mdi-text-box</v-icon>
                                        </v-avatar>
                                    </template>
                                    <v-list-item-title>Txt在线阅读({{ txt_parse_inited ? '已解析' : '未解析' }})</v-list-item-title>
                                    <template v-slot:append>
                                        <v-icon>mdi-chevron-right</v-icon>
                                    </template>
                                </v-list-item>
                            </v-list>
                        </v-card>
                    </v-col>

                    <v-col cols="12" sm="6" md="auto" class="flex-grow-1">
                        <v-card variant="outlined" class="mb-2 h-100">
                            <v-list density="compact">
                                <v-list-item @click="dialog_download = !dialog_download" class="w-100">
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

                    <v-col cols="12" sm="6" md="auto" class="flex-grow-1">
                        <v-card variant="outlined" class="mb-2 h-100">
                            <v-list density="compact">
                                <v-list-item @click="dialog_kindle = !dialog_kindle" class="w-100">
                                    <template v-slot:prepend>
                                        <v-avatar color="primary">
                                            <v-icon color="white">mdi-email</v-icon>
                                        </v-avatar>
                                    </template>
                                    <v-list-item-title>推送至Kindle</v-list-item-title>
                                    <template v-slot:append>
                                        <v-icon>mdi-chevron-right</v-icon>
                                    </template>
                                </v-list-item>
                            </v-list>
                        </v-card>
                    </v-col>
                </v-row>
            </v-col>
        </v-row>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMainStore } from '@/stores/main'
import BookCards from '~/components/BookCards.vue'

const route = useRoute()
const router = useRouter()
const store = useMainStore()
const { $backend, $alert } = useNuxtApp()
const cookie = useCookie('last_mailto')

const bookid = route.params.bid
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
})

// Dialogs
const dialog_download = ref(false)
const dialog_kindle = ref(false)
const dialog_refer = ref(false)

// Kindle
const mail_to = ref('')
const kindle_sender = ref('')

// Refer books
const refer_books_loading = ref(false)
const refer_books_setting_btn_loading = ref(false)
const refer_books = ref([])

// TXT
const txt_parse_inited = ref(false)

store.setNavbar(true)

// Methods (must be defined before use)
const get_txt_parse_status = async () => {
    try {
        const res = await $backend(`/book/txt/init?id=${bookid}&test=1`)
        if (res.err === 'ok' && res.msg === '已解析') {
            txt_parse_inited.value = true
        }
    } catch (e) {
        console.error(e)
    }
}

// Fetch book data
const { data } = await useAsyncData(`book-${bookid}`, () => $backend(`/book/${bookid}`))

if (data.value) {
    if (data.value.err === 'ok') {
        book.value = data.value.book
        mail_to.value = data.value.user?.kindle_email || ''
        kindle_sender.value = data.value.kindle_sender || ''
        if (cookie.value) {
            mail_to.value = cookie.value
        }
        get_txt_parse_status()
    } else {
        if ($alert) $alert('error', data.value.msg, '/')
    }
}

useHead({
    title: book.value.title
})

// Computed
const pub_year = computed(() => {
    if (!book.value || !book.value.pubdate) {
        return 'N/A'
    }
    return book.value.pubdate.split('-')[0]
})

const is_txt = computed(() => {
    if (!book.value || !book.value.files) return false
    const formats = book.value.files.map(x => x.format.toLowerCase())
    return formats.includes('txt')
})

const email_items = computed(() => {
    const emails = [mail_to.value].filter(Boolean)
    if (cookie.value && !emails.includes(cookie.value)) {
        emails.push(cookie.value)
    }
    return emails
})

// Other methods
const sendto_kindle = async () => {
    if (!mail_to.value) {
        if ($alert) $alert('error', '请填写邮箱地址')
        return
    }

    cookie.value = mail_to.value

    try {
        const rsp = await $backend(`/book/${bookid}/push`, {
            method: 'POST',
            body: `mail_to=${encodeURIComponent(mail_to.value)}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        })

        dialog_kindle.value = false
        if (rsp.err === 'ok') {
            if ($alert) $alert('success', rsp.msg, '#')
        } else {
            if ($alert) $alert('error', rsp.msg, '#')
        }
    } catch (e) {
        if ($alert) $alert('error', '发送失败')
    }
}

const get_refer = async () => {
    dialog_refer.value = true
    refer_books_loading.value = true

    try {
        const rsp = await $backend(`/book/${bookid}/refer`)
        refer_books.value = rsp.books.map((b) => {
            b.href = ''
            b.img = '/get/pcover?url=' + encodeURIComponent(b.cover_url)
            return b
        })
    } catch (e) {
        console.error(e)
    } finally {
        refer_books_loading.value = false
    }
}

const set_refer = async (provider_key, provider_value, opt = {}) => {
    if (refer_books_setting_btn_loading.value) return

    refer_books_setting_btn_loading.value = true

    const data = new URLSearchParams(opt)
    data.append('provider_key', provider_key)
    data.append('provider_value', provider_value)

    try {
        const rsp = await $backend(`/book/${bookid}/refer`, {
            method: 'POST',
            body: data,
        })

        dialog_refer.value = false
        if (rsp.err === 'ok') {
            if ($alert) $alert('success', '设置成功！')
            router.push(`/book/${bookid}`)
            location.reload()
        } else {
            if ($alert) $alert('error', rsp.msg)
        }
    } catch (e) {
        if ($alert) $alert('error', '设置失败')
    } finally {
        refer_books_setting_btn_loading.value = false
    }
}

const delete_book = async () => {
    if (!confirm('确定要删除这本书吗？')) return

    try {
        const rsp = await $backend(`/book/${bookid}/delete`, {
            method: 'POST',
        })

        if (rsp.err === 'ok') {
            if ($alert) $alert('success', '删除成功')
            router.push('/')
        } else {
            if ($alert) $alert('error', rsp.msg)
        }
    } catch (e) {
        if ($alert) $alert('error', '删除失败')
    }
}

const check_email = (email) => {
    if (email === kindle_sender.value) {
        return '发件邮件不可作为收件人'
    }
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return re.test(email) || 'Email格式错误'
}
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
