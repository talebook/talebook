<!-- 网站公告 -->
<template>
    <v-row
        v-if="show_press"
        class="mb-3"
    >
        <v-col cols="12">
            <v-alert
                outlined
                closable
                border="start"
                type="info"
                :color="store.theme === 'light' ? 'white' : 'grey-darken-4'"
                :class="store.theme === 'light' ? 'press-alert' : 'press-alert-dark'"
                @click:close="close"
            >
                <div
                    class="press-content"
                    v-html="press_message"
                />
            </v-alert>
        </v-col>
    </v-row>
</template>

<script setup>
import { useMainStore } from '@/stores/main';

const store = useMainStore();
const cookie = useCookie('close_press', { default: () => 'none' });

const has_press = computed(() => store.sys.header != undefined);
const press_message = computed(() => {
    if ( store.sys.header != undefined ) {
        return store.sys.header;
    }
    return '';
});

function hashCode(s) {
    var hash = 0, i, chr;
    if (s.length === 0) return hash;
    for (i = 0; i < s.length; i++) {
        chr   = s.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

const show_press = computed(() => {
    if (!has_press.value) {
        return false;
    }
    var msg = press_message.value;
    var hash = hashCode(press_message.value);
    
    if ( msg == '' || hash == cookie.value ) {
        return false;
    }

    return true;
});

function close() {
    var hash = hashCode(press_message.value);
    cookie.value = hash;
}
</script>

<style scoped>
/* 白天模式样式 */
.press-alert :deep(.v-alert__border) {
    border-color: #6200ea !important;
    opacity: 1 !important;
}
.press-alert {
    border: 1px solid #000000 !important;
}

/* 夜间模式样式 */
.press-alert-dark :deep(.v-alert__border) {
    border-color: #6200ea !important;
    opacity: 1 !important;
}
.press-alert-dark {
    border: 1px solid #ffffff !important;
    background-color: #1e1e1e !important;
}
.press-alert-dark :deep(.v-alert__content) {
    color: #ffffff !important;
}
.press-alert-dark :deep(.press-content a),
.press-alert-dark :deep(a.press-content) {
    color: #1976d2 !important;
}
</style>
