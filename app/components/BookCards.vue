<template>
    <div>
        <v-row>
            <v-col
                v-for="(book,idx) in render_books"
                :key="idx+'-books-'+book.id"
                cols="12"
                xs="12"
                sm="6"
                md="4"
                class="book-list-card"
            >
                <v-card :to="book.href">
                    <v-row>
                        <v-col
                            cols="3"
                            class="col-book-img"
                        >
                            <v-img
                                :src="book.img"
                                :aspect-ratio="11/15"
                                cover
                            />
                        </v-col>
                        <v-col
                            cols="9"
                            class="col-book-info"
                        >
                            <v-card-text
                                class="pb-0"
                                align-left
                            >
                                <div class="book-title">
                                    {{ book.title }}
                                </div>
                                <slot
                                    name="introduce"
                                    :book="book"
                                />
                                <div class="book-comments">
                                    <p
                                        v-if="book.comments"
                                        v-html="book.comments"
                                    />
                                    <p v-else>
                                        点击浏览详情
                                    </p>
                                </div>
                            </v-card-text>
                        </v-col>
                    </v-row>
                    <slot
                        name="actions"
                        :book="book"
                    />
                </v-card>
            </v-col>
        </v-row>
        
        <!-- 空状态提示 -->
        <v-row
            v-if="render_books.length === 0"
            class="empty-state"
        >
            <v-col cols="12">
                <v-card class="ma-1 pa-6 text-center">
                    <v-icon
                        large
                        color="grey lighten-2"
                    >
                        mdi-book-open-variant
                    </v-icon>
                    <h3 class="text-h6 grey--text">
                        本书库暂无藏书
                    </h3>
                    <p class="text-caption grey--text">
                        请先添加书籍到书库
                    </p>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<script setup>
const props = defineProps({
    books: {
        type: Array,
        default: () => [],
    },
});

const render_books = computed(() => {
    return props.books.map( b => {
        if ( b['href'] == undefined ) {
            b['href'] = '/book/' + b.id;
        }
        return b;
    });
});
</script>

<style scoped>
.book-title {
    display: block;
    /*height: 1em;*/
    overflow-y: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    text-overflow: clip;
    text-align: left;
    font-weight: bold;
}
.book-comments {
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    text-overflow: clip;
    margin-top: 6px;
    text-align: left;
}
.book-comments p {
    font-size: small;
    margin-bottom: 0px;
    line-height: 1.6;
}
.book-list-card .v-row {
    margin-bottom: 0px;
}
.page-title {
    font-weight: bold;
    text-align: left;
}
.new-legend {
    margin-top: 30px;
    margin-bottom: 20px;
}
.col-book-img {
    padding: 12px 0 0 12px;
}
.col-book-info {
    margin-left: -4px;
    padding: 8px 0;
}
</style>
