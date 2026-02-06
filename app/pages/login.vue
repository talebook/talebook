
<template>
    <div class="login-container">
        <v-row
            justify="center"
            class="mt-8"
        >
            <v-col
                cols="12"
                sm="8"
                md="4"
            >
                <v-card
                    v-if="show_login"
                    class="elevation-12"
                >
                    <v-toolbar
                        dark
                        color="primary"
                    >
                        <v-toolbar-title>欢迎访问</v-toolbar-title>
                        <v-spacer />
                        <v-btn
                            v-if="allowRegister"
                            rounded
                            color="success"
                            variant="elevated"
                            to="/signup"
                            class="text-white mr-4"
                        >
                            注册
                        </v-btn>
                    </v-toolbar>
                    <v-card-text>
                        <v-form @submit.prevent="do_login">
                            <v-text-field
                                v-model="username"
                                prepend-icon="mdi-account"
                                label="用户名"
                                type="text"
                            />
                            <v-text-field
                                id="password"
                                v-model="password"
                                prepend-icon="mdi-lock"
                                label="密码"
                                type="password"
                            />
                            <p class="text-right">
                                <a
                                    class="press-content"
                                    href="javascript:void(0)"
                                    @click="show_login = !show_login"
                                > 忘记密码? </a>
                            </p>
                            <div align="center">
                                <v-btn
                                    type="submit"
                                    large
                                    rounded
                                    color="primary"
                                    :loading="loading"
                                >
                                    登录
                                </v-btn>
                            </div>
                        </v-form>
                    </v-card-text>

                    <v-card-text v-if="socials && socials.length > 0">
                        <v-divider />
                        <div align="center">
                            <br />
                            <small>使用社交网络账号登录</small>
                            <br />
                            <template
                                v-for="s in socials"
                                :key="s.text"
                            >
                                <v-btn
                                    small
                                    outlined
                                    :href="'/auth/login/' + s.value"
                                    class="ma-1"
                                >
                                    {{ s.text }}
                                </v-btn>
                            </template>
                        </div>
                    </v-card-text>
                    <v-alert
                        v-if="alert.msg"
                        :type="alert.type"
                        class="ma-2"
                    >
                        {{ alert.msg }}
                    </v-alert>
                </v-card>

                <v-card
                    v-else
                    class="elevation-12"
                >
                    <v-toolbar
                        dark
                        color="red"
                    >
                        <v-toolbar-title>重置密码</v-toolbar-title>
                    </v-toolbar>
                    <v-card-text>
                        <v-form @submit.prevent="do_reset">
                            <v-text-field
                                v-model="username"
                                prepend-icon="mdi-account"
                                label="用户名"
                                type="text"
                            />
                            <v-text-field
                                v-model="email"
                                prepend-icon="mdi-email"
                                label="注册邮箱"
                                type="text"
                                autocomplete="old-email"
                            />
                            <div
                                align="center"
                                class="mt-4"
                            >
                                <v-btn
                                    rounded
                                    color=""
                                    class="mr-5"
                                    @click="show_login = !show_login"
                                >
                                    返回
                                </v-btn>
                                <v-btn
                                    rounded
                                    dark
                                    color="red"
                                    type="submit"
                                    :loading="loading"
                                >
                                    重置密码
                                </v-btn>
                            </div>
                        </v-form>
                    </v-card-text>
                    <v-alert
                        v-if="alert.msg"
                        :type="alert.type"
                        class="ma-2"
                    >
                        {{ alert.msg }}
                    </v-alert>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMainStore } from '@/stores/main';

const router = useRouter();
const store = useMainStore();
const { $backend } = useNuxtApp();

const username = ref('');
const password = ref('');
const email = ref('');
const show_login = ref(true);
const loading = ref(false);
const alert = ref({
    type: 'error',
    msg: '',
});

// 控制是否显示导航栏（可作为开关使用）
const showNavbar = true; // 后期可通过配置或环境变量控制
store.setNavbar(showNavbar);

// Fetch user info on mount/creation to check login status
// Note: In Nuxt 3, useAsyncData is preferred for SSR, but client-side is fine for login check
onMounted(async () => {
    try {
        const rsp = await $backend('/user/info');
        store.login(rsp);
        if (rsp.user && rsp.user.is_login) {
            router.push('/');
        }
    } catch (e) {
        // ignore error
    }
});

const socials = computed(() => store.sys.socials || []);
const allowRegister = computed(() => store.sys.allow ? store.sys.allow.register : false);

const do_login = async () => {
    loading.value = true;
    alert.value.msg = '';
    
    var data = new URLSearchParams();
    data.append('username', username.value);
    data.append('password', password.value);
    
    try {
        const rsp = await $backend('/user/sign_in', {
            method: 'POST',
            body: data,
        });
        
        if (rsp.err != 'ok') {
            alert.value.type = 'error';
            alert.value.msg = rsp.msg;
        } else {
            store.setNavbar(true);
            // Refresh user info
            const info = await $backend('/user/info');
            store.login(info);
            router.push('/');
        }
    } catch (e) {
        alert.value.type = 'error';
        alert.value.msg = '网络错误';
    } finally {
        loading.value = false;
    }
};

const do_reset = async () => {
    loading.value = true;
    alert.value.msg = '';
    
    var data = new URLSearchParams();
    data.append('username', username.value);
    data.append('email', email.value);
    
    try {
        const rsp = await $backend('/user/reset', {
            method: 'POST',
            body: data,
        });
        
        if (rsp.err == 'ok') {
            alert.value.type = 'success';
            alert.value.msg = '重置成功！请查阅密码通知邮件。';
        } else {
            alert.value.type = 'error';
            alert.value.msg = rsp.msg;
        }
    } catch (e) {
        alert.value.type = 'error';
        alert.value.msg = '网络错误';
    } finally {
        loading.value = false;
    }
};

useHead({
    title: '登录'
});
</script>

<style scoped>
.login-container {
    min-height: calc(100vh - 120px);
}
</style>
