<!-- 网站公告 -->
<template>
    <v-row v-if="show_press" >
        <v-col cols=12>
            <v-alert outlined colored-border closable @click:close="close"
               border="left" color="deep-purple accent-4" type="info">
                <div v-html="press_message"></div>
            </v-alert>
        </v-col>
    </v-row>
</template>

<script setup>
import { useMainStore } from '@/stores/main'

const store = useMainStore()
const cookie = useCookie('close_press', { default: () => 'none' })

const has_press = computed(() => store.sys.header != undefined)
const press_message = computed(() => {
    if ( store.sys.header != undefined ) {
        return store.sys.header;
    }
    return "";
})

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
    
    if ( msg == "" || hash == cookie.value ) {
        return false;
    }

    return true;
})

function close() {
    var hash = hashCode(press_message.value);
    cookie.value = hash;
}
</script>

<style>
</style>
