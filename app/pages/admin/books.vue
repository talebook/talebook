
<template>
    <v-card>
        <v-card-title> 图书管理 <v-chip size="small" class="primary ml-2">Beta</v-chip> </v-card-title>
        <v-card-text> 此表格仅展示图书的部分字段，点击即可快捷修改。完整图书信息请点击链接查看书籍详情页面</v-card-text>
        <v-card-actions>
            <v-btn :disabled="loading" variant="outlined" color="primary"
                @click="getDataFromApi"><v-icon start>mdi-reload</v-icon>刷新</v-btn>
            <v-btn :disabled="loading" variant="outlined" color="info"
                @click="show_dialog_auto_file"><v-icon start>mdi-information</v-icon>自动更新图书信息... </v-btn>
            <v-btn v-if="books_selected.length > 0" :disabled="loading" variant="outlined" color="error"
                @click="delete_selected_books"><v-icon start>mdi-delete-alert</v-icon>批量删除 ({{ books_selected.length
                }})</v-btn>
            <v-spacer></v-spacer>
            <v-text-field density="compact" v-model="search" append-inner-icon="mdi-magnify" label="搜索" single-line
                hide-details></v-text-field>
        </v-card-actions>
        
        <v-data-table-server
            density="compact"
            class="elevation-1 text-body-2"
            show-select
            v-model="books_selected"
            item-value="id"
            :search="search"
            :headers="headers"
            :items="items"
            :items-length="total"
            :loading="loading"
            :items-per-page="itemsPerPage"
            @update:options="updateOptions"
        >
            <template v-slot:item.status="{ item }">
                <v-chip size="small" v-if="item.status == 'ready'" color="success">可导入</v-chip>
                <v-chip size="small" v-else-if="item.status == 'exist'" color="grey-lighten-2">已存在</v-chip>
                <v-chip size="small" v-else-if="item.status == 'imported'" color="primary">导入成功</v-chip>
                <v-chip size="small" v-else-if="item.status == 'new'" color="grey">待扫描</v-chip>
                <v-chip size="small" v-else color="info">{{ item.status }}</v-chip>
            </template>
            
            <template v-slot:item.img="{ item }">
                <v-img :src="item.img" width="40" height="60" cover class="cursor-pointer" @click="editCover(item)"></v-img>
            </template>
            
            <template v-slot:item.id="{ item }">
                <a class="press-content" target="_blank" :href="`/book/${item.id}`">{{ item.id }}</a>
            </template>
            
            <template v-slot:item.title="{ item }">
                <div class="cursor-pointer" @click="editField(item, 'title', '书名')">
                    {{ item.title }}
                </div>
            </template>

            <template v-slot:item.authors="{ item }">
                <div class="cursor-pointer" @click="editField(item, 'authors', '作者')">
                    <span v-if="item.authors">{{ item.authors.join("/") }}</span>
                    <span v-else> - </span>
                </div>
            </template>

            <template v-slot:item.rating="{ item }">
                <div class="cursor-pointer" @click="editField(item, 'rating', '评分')">
                    <span v-if="item.rating != null">{{ item.rating }} 星</span>
                    <span v-else> - </span>
                </div>
            </template>

            <template v-slot:item.publisher="{ item }">
                <div class="cursor-pointer" @click="editField(item, 'publisher', '出版社')">
                    {{ item.publisher || '-' }}
                </div>
            </template>

            <template v-slot:item.tags="{ item }">
                <div class="cursor-pointer" @click="editField(item, 'tags', '标签')">
                    <span v-if="item.tags">{{ item.tags.join("/") }}</span>
                    <span v-else> - </span>
                </div>
            </template>

            <template v-slot:item.comments="{ item }">
                <div class="cursor-pointer text-truncate" style="max-width: 200px;" @click="editField(item, 'comments', '简介')">
                    {{ item.comments || '-' }}
                </div>
            </template>

            <template v-slot:item.actions="{ item }">
                <v-menu>
                    <template v-slot:activator="{ props }">
                        <v-btn color="primary" size="small" v-bind="props">操作 <v-icon size="small">mdi-dots-vertical</v-icon></v-btn>
                    </template>
                    <v-list density="compact">
                        <v-list-item @click="delete_book(item)">
                            <v-list-item-title>删除此书</v-list-item-title>
                        </v-list-item>
                    </v-list>
                </v-menu>
            </template>
        </v-data-table-server>

        <!-- 通用编辑对话框 -->
        <v-dialog v-model="editDialog" width="500">
            <v-card>
                <v-card-title>修改{{ editFieldLabel }}</v-card-title>
                <v-card-text>
                    <v-text-field v-if="['title', 'publisher'].includes(editingField)" v-model="editingValue" :label="editFieldLabel"></v-text-field>
                    <v-textarea v-else-if="editingField === 'comments'" v-model="editingValue" :label="editFieldLabel"></v-textarea>
                    <v-rating v-else-if="editingField === 'rating'" v-model="editingValue" length="10" dense></v-rating>
                    <v-combobox v-else-if="['authors', 'tags'].includes(editingField)" v-model="editingValue" :items="editingValue" multiple chips></v-combobox>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn text @click="editDialog = false">取消</v-btn>
                    <v-btn color="primary" @click="saveField">保存</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- 封面编辑对话框 -->
        <v-dialog v-model="coverDialog" width="500">
            <v-card>
                <v-card-title>修改封面图</v-card-title>
                <v-card-text>
                    <v-row>
                        <v-col cols="12" sm="6">
                            <v-img :src="editingItem?.img" max-height="200" class="mb-4" contain></v-img>
                        </v-col>
                        <v-col cols="12" sm="6">
                            <v-file-input v-model="coverFile" accept="image/jpeg, image/png, image/gif"
                                label="选择封面图" prepend-icon="mdi-image"
                                @change="onCoverFileChange"></v-file-input>
                            <small class="text-caption">支持JPG、PNG、GIF格式，大小不超过5MB</small>
                        </v-col>
                    </v-row>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn text @click="coverDialog = false">取消</v-btn>
                    <v-btn color="primary" @click="saveCover">保存</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- 小浮窗提醒 -->
        <v-snackbar v-model="snack" top :timeout="3000" :color="snackColor">
            {{ snackText }}
            <template v-slot:actions>
                <v-btn variant="text" @click="snack = false"> 关闭 </v-btn>
            </template>
        </v-snackbar>

        <!-- 提醒拉取图书的规则说明 -->
        <v-dialog v-model="meta_dialog" persistent transition="dialog-bottom-transition" width="500">
            <v-card>
                <v-toolbar flat density="compact" dark color="primary"> 提醒 </v-toolbar>
                <v-card-text class="pt-4">
                    <p> 即将从互联网拉取所有图书的书籍信息，请了解以下功能限制：</p>
                    <p> 1. 请在「系统设置」中配置好「互联网书籍信息源」，启用豆瓣插件；</p>
                    <p> 2. 本操作只更新「没有封面」或「没有简介」的图书；</p>
                    <p> 3. 受限于豆瓣等服务的限制，每秒钟仅更新1本书; </p>
                    <br/>
                    <template v-if="progress.total > 0">
                        <p>当前进展：<v-btn size="small" variant="text" @click="refresh_progress">刷新</v-btn></p>
                        <p>总共 {{ progress.total }} 本书籍，已更新 {{ progress.done }} 本，更新失败 {{ progress.fail }} 本，无需处理 {{
                            progress.skip }} 本。</p>
                    </template>
                    <p v-else> 预计需要运行 {{ auto_fill_mins }} 分钟，在此期间请不要停止程序</p>
                </v-card-text>
                <v-card-actions>
                    <v-btn @click="meta_dialog = !meta_dialog">取消</v-btn>
                    <v-spacer></v-spacer>
                    <v-btn color="primary" @click="auto_fill">开始执行！</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- 批量删除确认对话框 -->
        <v-dialog v-model="delete_dialog" persistent width="500">
            <v-card>
                <v-toolbar flat density="compact" dark color="error"> 确认删除 </v-toolbar>
                <v-card-text class="pt-4">
                    <p> 您确定要删除选中的 {{ books_selected.length }} 本书籍吗？</p>
                    <p class="text-medium-emphasis"> 此操作不可逆，请谨慎操作！</p>
                </v-card-text>
                <v-card-actions>
                    <v-btn @click="delete_dialog = !delete_dialog">取消</v-btn>
                    <v-spacer></v-spacer>
                    <v-btn color="error" @click="confirm_delete_books">确定删除</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

    </v-card>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useMainStore } from '@/stores/main'

const store = useMainStore()
const { $backend, $alert } = useNuxtApp()

store.setNavbar(true)

const snack = ref(false)
const snackColor = ref("")
const snackText = ref("")
const meta_dialog = ref(false)
const delete_dialog = ref(false)
const coverFile = ref(null)

const books_selected = ref([])
const search = ref("")
const items = ref([])
const total = ref(0)
const loading = ref(false)
const itemsPerPage = ref(10)
const options = ref({ page: 1, itemsPerPage: 10, sortBy: [{ key: 'id', order: 'desc' }] })

const headers = [
    { title: "封面", key: "img", sortable: false, width: "80px" },
    { title: "ID", key: "id", sortable: true, width: "80px" },
    { title: "书名", key: "title", sortable: true },
    { title: "作者", key: "authors", sortable: true, width: "100px" },
    { title: "评分", key: "rating", sortable: false, width: "60px" },
    { title: "出版社", key: "publisher", sortable: false },
    { title: "标签", key: "tags", sortable: true, width: "100px" },
    { title: "简介", key: "comments", sortable: true },
    { title: "操作", key: "actions", sortable: false },
]

const progress = ref({
    skip: 0,
    fail: 0,
    done: 0,
    total: 0,
    status: "finish",
})

const auto_fill_mins = computed(() => Math.floor(total.value / 60) + 1)

// Edit dialog state
const editDialog = ref(false)
const editingItem = ref(null)
const editingField = ref("")
const editingValue = ref(null)
const editFieldLabel = ref("")

const coverDialog = ref(false)

const updateOptions = (newOptions) => {
    options.value = newOptions
    getDataFromApi()
}

const getDataFromApi = () => {
    loading.value = true
    const { page, itemsPerPage, sortBy } = options.value
    
    // Vuetify 3 sortBy format: [{ key: 'id', order: 'desc' }]
    const sortKey = sortBy && sortBy.length ? sortBy[0].key : 'id'
    const sortOrder = sortBy && sortBy.length ? (sortBy[0].order === 'desc') : true

    var data = new URLSearchParams();
    if (page != undefined) data.append("page", page);
    data.append("sort", sortKey);
    data.append("desc", sortOrder);
    if (itemsPerPage != undefined) data.append("num", itemsPerPage);
    if (search.value) data.append("search", search.value);

    $backend("/admin/book/list?" + data.toString())
        .then((rsp) => {
            if (rsp.err != "ok") {
                items.value = [];
                total.value = 0;
                if ($alert) $alert("error", rsp.msg);
                return false;
            }
            items.value = rsp.items;
            total.value = rsp.total;
        })
        .finally(() => {
            loading.value = false;
        });
}

const refresh_progress = () => {
    $backend("/admin/book/fill", { method: "GET" })
        .then((rsp) => {
            progress.value = rsp.status;
        })
}

const show_dialog_auto_file = () => {
    meta_dialog.value = true;
    refresh_progress();
}

const auto_fill = () => {
    $backend("/admin/book/fill", {
        method: "POST",
        body: JSON.stringify({ "idlist": "all" }),
    })
        .then((rsp) => {
            meta_dialog.value = false;
            if (rsp.err != "ok") {
                if ($alert) $alert("error", rsp.msg);
            }
            snack.value = true;
            snackColor.value = "success";
            snackText.value = rsp.msg;
        })
}

const delete_book = (book) => {
    loading.value = true;
    $backend("/book/" + book.id + "/delete", {
        method: "POST",
        body: "",
    })
        .then((rsp) => {
            if (rsp.err != "ok") {
                if ($alert) $alert("error", rsp.msg);
            }
            snack.value = true;
            snackColor.value = "success";
            snackText.value = rsp.msg;

            getDataFromApi();
        })
        .finally(() => {
            loading.value = false;
        });
}

const delete_selected_books = () => {
    if (books_selected.value.length === 0) {
        snack.value = true;
        snackColor.value = "warning";
        snackText.value = "请先勾选要删除的书籍";
        return;
    }
    delete_dialog.value = true;
}

const confirm_delete_books = () => {
    if (books_selected.value.length === 0) {
        delete_dialog.value = false;
        return;
    }

    loading.value = true;
    delete_dialog.value = false;

    // v-data-table-server v-model returns IDs if item-value is set? 
    // Vuetify 3: if return-object is false (default), it returns values.
    // Wait, let's check. item-value="id". So books_selected should be array of IDs.
    const selectedIds = books_selected.value;

    $backend("/admin/book/delete", {
        method: "POST",
        body: JSON.stringify({ idlist: selectedIds }),
    })
        .then((rsp) => {
            if (rsp.err != "ok") {
                if ($alert) $alert("error", rsp.msg);
            } else {
                snack.value = true;
                snackColor.value = "success";
                snackText.value = rsp.msg;
                books_selected.value = [];
                getDataFromApi();
            }
        })
        .finally(() => {
            loading.value = false;
        });
}

// Edit Field Logic
const editField = (item, field, label) => {
    editingItem.value = item
    editingField.value = field
    // Deep copy for arrays
    editingValue.value = Array.isArray(item[field]) ? [...item[field]] : item[field]
    editFieldLabel.value = label
    editDialog.value = true
}

const saveField = () => {
    const book = editingItem.value
    const field = editingField.value
    const value = editingValue.value
    
    var edit = {};
    edit[field] = value;
    
    $backend("/book/" + book.id + "/edit", {
        method: "POST",
        body: JSON.stringify(edit),
    }).then((rsp) => {
        if (rsp.err == "ok") {
            snack.value = true;
            snackColor.value = "success";
            snackText.value = rsp.msg;
            editDialog.value = false
            getDataFromApi()
        } else {
            if ($alert) $alert("error", rsp.msg);
        }
    });
}

// Cover Edit Logic
const editCover = (item) => {
    editingItem.value = item
    coverFile.value = null
    coverDialog.value = true
}

const onCoverFileChange = (e) => {
    // In Vuetify 3, v-file-input returns File[] or File.
    // v-model coverFile
    const file = Array.isArray(coverFile.value) ? coverFile.value[0] : coverFile.value
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            if ($alert) $alert("error", "封面图大小不能超过5MB");
            coverFile.value = null;
        }
    }
}

const saveCover = () => {
    const file = Array.isArray(coverFile.value) ? coverFile.value[0] : coverFile.value
    
    if (!file) {
        if ($alert) $alert("info", "请选择要上传的封面图");
        return;
    }

    loading.value = true;
    const formData = new FormData();
    formData.append("cover", file);

    $backend("/book/" + editingItem.value.id + "/edit", {
        method: "POST",
        body: formData
    }).then((rsp) => {
        if (rsp.err == "ok") {
            snack.value = true;
            snackColor.value = "success";
            snackText.value = rsp.msg;
            coverDialog.value = false
            getDataFromApi();
        } else {
            if ($alert) $alert("error", rsp.msg);
        }
    }).finally(() => {
        loading.value = false;
        coverFile.value = null;
    });
}

watch(search, () => {
    options.value.page = 1
    getDataFromApi()
})

useHead({
    title: "图书管理"
})
</script>

<style scoped>
.cursor-pointer {
    cursor: pointer;
}
</style>
