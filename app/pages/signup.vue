
<template>
    <div class="signup-container">
        <v-row
            justify="center"
            class="mt-8"
        >
            <v-col
                cols="12"
                sm="8"
                md="4"
            >
                <v-card class="elevation-12">
                    <v-toolbar
                        dark
                        color="primary"
                    >
                        <v-toolbar-title>填写注册信息</v-toolbar-title>
                        <v-spacer />
                        <v-btn
                            rounded
                            color="success"
                            variant="elevated"
                            to="/login"
                            class="text-white mr-4"
                        >
                            登录
                        </v-btn>
                    </v-toolbar>
                    <v-card-text>
                        <v-form
                            ref="form"
                            @submit.prevent="signup"
                        >
                            <v-text-field
                                v-model="username"
                                required
                                prepend-icon="mdi-account"
                                label="用户名"
                                type="text"
                                autocomplete="new-username"
                                :rules="[rules.user]"
                            />
                            <v-text-field
                                v-model="password"
                                required
                                prepend-icon="mdi-lock"
                                label="密码"
                                type="password"
                                autocomplete="new-password"
                                :rules="[rules.pass]"
                            />
                            <v-text-field
                                v-model="password2"
                                required
                                prepend-icon="mdi-lock"
                                label="确认密码"
                                type="password"
                                autocomplete="new-password2"
                                :rules="[validPwd]"
                            />
                            <v-text-field
                                v-model="nickname"
                                required
                                prepend-icon="mdi-face-man"
                                label="昵称"
                                type="text"
                                autocomplete="new-nickname"
                                :rules="[rules.nick]"
                            />
                            <v-text-field
                                v-model="email"
                                required
                                prepend-icon="mdi-email"
                                label="Email"
                                type="text"
                                autocomplete="new-email"
                                :rules="[rules.email]"
                            />
                            <div
                                align="center"
                                class="mt-4"
                            >
                                <v-btn
                                    dark
                                    large
                                    rounded
                                    color="red"
                                    type="submit"
                                    :loading="loading"
                                >
                                    注册
                                </v-btn>
                            </div>
                        </v-form>
                    </v-card-text>

                    <v-alert
                        v-if="failmsg"
                        type="error"
                        class="ma-2"
                    >
                        {{ failmsg }}
                    </v-alert>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMainStore } from '@/stores/main';

const router = useRouter();
const store = useMainStore();
const { $backend } = useNuxtApp();

const form = ref(null);
const username = ref('');
const password = ref('');
const password2 = ref('');
const nickname = ref('');
const email = ref('');
const failmsg = ref('');
const loading = ref(false);

// 控制是否显示导航栏（可作为开关使用）
const showNavbar = true; // 后期可通过配置或环境变量控制
store.setNavbar(showNavbar);

const rules = {
    user: v => ( v && 20 >= v.length && v.length >= 5) || '用户名长度必须在5-20个字符之间',
    pass: v => ( v && 20 >= v.length && v.length >= 8) || '密码长度必须在8-20个字符之间',
    nick: v => (v && v.length >= 2) || '昵称长度至少为2个字符',
    email: function (email) {
        var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email) || '邮箱格式不正确';
    },
};

const validPwd = (v) => {
    if ( v.length < 8 ) {
        return '密码长度必须在8-20个字符之间';
    }
    return v == password.value || '两次输入的密码不一致';
};

onMounted(async () => {
    // Check if registration is allowed
    try {
        const rsp = await $backend('/user/info');
        if (rsp.err === 'ok' && !rsp.sys.allow.register) {
            router.push('/login');
        }
    } catch (e) {
        console.error(e);
    }
});

const signup = async () => {
    const { valid } = await form.value.validate();
    if (!valid) return;

    loading.value = true;
    failmsg.value = '';

    var data = new URLSearchParams();
    data.append('username', username.value);
    data.append('password', password.value);
    data.append('nickname', nickname.value);
    data.append('email', email.value);
    
    try {
        const rsp = await $backend('/user/sign_up', {
            method: 'POST',
            body: data,
        });
        
        if ( rsp.err != 'ok' ) {
            failmsg.value = rsp.msg;
        } else {
            store.setNavbar(true);
            router.push('/');
        }
    } catch (e) {
        failmsg.value = '网络错误';
    } finally {
        loading.value = false;
    }
};

useHead({
    title: '注册'
});
</script>

<style scoped>
.signup-container {
    min-height: calc(100vh - 120px);
}
</style>
