
<template>
    <ClientOnly>
    <v-row align="center" justify="center">
        <v-col cols="12" sm="8" md="4">
            <v-card class="elevation-12">
                <v-toolbar dark color="primary">
                    <v-toolbar-title>安装 TaleBook</v-toolbar-title>
                </v-toolbar>
                <v-card-text>
                    <v-form ref="form" @submit.prevent="do_install">
                        <v-text-field required prepend-icon="mdi-home" v-model="title" label="网站标题" type="text"></v-text-field>
                        <v-text-field required prepend-icon="mdi-account" v-model="username" label="管理员用户名"   type="text" autocomplete="new-username" :rules="[rules.user]"  ></v-text-field>
                        <v-text-field required prepend-icon="mdi-lock"   v-model="password" label="管理员登录密码" type="password" autocomplete="new-password" :rules="[rules.pass]"  ></v-text-field>
                        <v-text-field required prepend-icon="mdi-email"  v-model="email"    label="管理员Email"    type="text" autocomplete="new-email"    :rules="[rules.email]" ></v-text-field>
                        <v-checkbox v-model="invite" label="开启私人图书馆模式"></v-checkbox>
                        <template v-if="invite">
                            <v-text-field required prepend-icon="mdi-lock"  v-model="code"    label="访问码"    type="text" autocomplete="new-code" ></v-text-field>
                        </template>
                        <div align="center" class="mt-4">
                            <v-btn type="submit" color="primary" :loading="loading">完成设置</v-btn>
                        </div>
                    </v-form>
                    <v-alert class="mt-4" type="info" v-if="tips" v-html="tips"></v-alert>
                </v-card-text>
            </v-card>
        </v-col>
    </v-row>
    </ClientOnly>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMainStore } from '@/stores/main'

const router = useRouter()
const store = useMainStore()
const { $backend, $alert } = useNuxtApp()

definePageMeta({
  layout: 'blank'
})

const form = ref(null)
const username = ref("admin")
const password = ref("")
const email = ref("")
const code = ref("")
const invite = ref(false)
const title = ref("TaleBook")
const tips = ref("")
const loading = ref(false)
let retry = 20

const rules = {
    user: v => ( v && 20 >= v.length && v.length >= 5) || '6 ~ 20 characters',
    pass: v => ( v && 20 >= v.length && v.length >= 8) || '8 ~ 20 characters',
    email: function (email) {
        var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email) || "Invalid email format";
    },
}

const check_install = () => {
    fetch("/api/index").then( rsp => {
        if ( rsp.status == 200 ) {
            tips.value += "<br/>API服务正常<br/>安装成功，跳转到主页";
            
            // force refresh index.html logic equivalent
            // Fetching random param to bypass cache not strictly needed if we just nav
            // But let's follow logic: reload user/sys info then push
            setTimeout(() => {
                store.setNavbar(true)
                // We might need to reload sys info in store
                window.location.href = "/"
            }, 1000)
        } else {
            retry -= 1;
            if ( retry > 0 ) {
                setTimeout( () => {
                    check_install();
                }, 1000);
            } else {
                tips.value += "<br/>超时，请刷新重试";
                loading.value = false
            }
        }
    });
}

const do_install = async () => {
    const { valid } = await form.value.validate()
    if (!valid) return

    loading.value = true
    var data = new URLSearchParams();
    data.append('username', username.value);
    data.append('password', password.value);
    data.append('email', email.value);
    data.append('code', code.value);
    data.append('invite', invite.value);
    data.append('title', title.value);
    
    tips.value = "正在写入配置文件...";
    
    try {
        const rsp = await $backend('/admin/install', {
            method: 'POST',
            body: data,
        })
        
        if ( rsp.err != 'ok' ) {
            if ($alert) $alert("error", rsp.msg);
            loading.value = false
        } else {
            tips.value += "<br/>配置写入成功！<br/>正在检测服务器...";
            setTimeout( () => {
                check_install();
            }, 5000);
        }
    } catch (e) {
        console.error(e)
        loading.value = false
        if ($alert) $alert("error", "网络错误");
    }
}

useHead({
    title: "安装 TaleBook"
})
</script>
