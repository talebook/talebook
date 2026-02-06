
<template>
<v-row justify="center" class='fill-center'>
    <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12">
            <v-toolbar dark color="primary">
                <v-toolbar-title align-center >请输入访问密码</v-toolbar-title>
            </v-toolbar>
            <v-card-text>
                <p class="py-6 body-3 text-center" >{{welcome}}</p>
                <v-form @submit.prevent="welcome_login" >
                    <v-text-field prepend-icon="mdi-lock" v-model="invite_code" required
                        label="访问密码" type="password" :error="is_err" :error-messages="is_err ? msg : ''" :loading="loading"></v-text-field>
                    <p v-if="!is_err && msg" class="text-success text-center mt-2">{{ msg }}</p>
                </v-form>
            </v-card-text>

            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn @click="welcome_login" color="primary">Login</v-btn>
                <v-spacer></v-spacer>
            </v-card-actions>

        </v-card>
    </v-col>
</v-row>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMainStore } from '@/stores/main'

const router = useRouter()
const route = useRoute()
const store = useMainStore()
const { $backend } = useNuxtApp()

definePageMeta({
  layout: 'blank'
})

const is_err = ref(false)
const msg = ref("")
const welcome = ref("本站为私人图书馆，需输入密码才可进行访问")
const loading = ref(false)
const invite_code = ref("")

// Initial check
const { data: welcomeData } = await useAsyncData('welcome', async () => {
    return $backend("/welcome")
})

if (welcomeData.value) {
    if (welcomeData.value.err === 'free') {
        router.push(route.query.next || "/")
    } else if (welcomeData.value.err === 'not_installed') {
        router.push("/install")
    }
}

const welcome_login = async () => {
    loading.value = true
    var data = new URLSearchParams()
    data.append('invite_code', invite_code.value)
    
    try {
        const rsp = await $backend("/welcome", {
            method: 'POST',
            body: data,
        })
        
        if (rsp.err != 'ok') {
                    is_err.value = true
                    msg.value = rsp.msg
                } else {
                    is_err.value = false
                    msg.value = "访问码正确，正在跳转..."
                    window.location.reload()
                }
    } finally {
        loading.value = false
    }
}

useHead({
    title: "私人图书馆"
})
</script>

<style scoped>
.fill-center {
    margin-top: 100px;
}
</style>
