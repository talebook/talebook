<template>
    <v-row
        justify="center"
        class="fill-center"
    >
        <v-col
            xs="12"
            sm="8"
            md="4"
        >
            <v-card class="elevation-12">
                <v-toolbar
                    dark
                    color="primary"
                >
                    <v-toolbar-title>填写注册信息</v-toolbar-title>
                </v-toolbar>
                <v-card-text>
                    <v-form
                        ref="form"
                        @submit.prevent="signup"
                    >
                        <v-text-field
                            v-model="username"
                            required
                            prepend-icon="person"
                            label="用户名"
                            type="text"
                            autocomplete="new-username"
                            :rules="[rules.user]"
                        />
                        <v-text-field
                            v-model="password"
                            required
                            prepend-icon="lock"
                            label="密码"
                            type="password"
                            autocomplete="new-password"
                            :rules="[rules.pass]"
                        />
                        <v-text-field
                            v-model="password2"
                            required
                            prepend-icon="lock"
                            label="确认密码"
                            type="password"
                            autocomplete="new-password2"
                            :rules="[valid]"
                        />
                        <v-text-field
                            v-model="nickname"
                            required
                            prepend-icon="face"
                            label="昵称"
                            type="text"
                            autocomplete="new-nickname"
                            :rules="[rules.nick]"
                        />
                        <v-text-field
                            v-model="email"
                            required
                            prepend-icon="email"
                            label="Email"
                            type="text"
                            autocomplete="new-email"
                            :rules="[rules.email]"
                        />
                    </v-form>
                    <div align="center">
                        <v-btn
                            dark
                            large
                            rounded
                            color="red"
                            @click="signup"
                        >
                            注册
                        </v-btn>
                    </div>
                </v-card-text>

                <v-alert
                    v-if="failmsg"
                    type="error"
                >
                    {{ failmsg }}
                </v-alert>
            </v-card>
        </v-col>
    </v-row>
</template>

<script>
export default {
    data: () => ({
        username: '',
        password: '',
        password2: '',
        nickname: '',
        email: '',
        failmsg: '',
        validmsg: '',
        rules: {
            user: v => ( 20 >= v.length && v.length >= 5) || '用户名长度必须在5-20个字符之间',
            pass: v => ( 20 >= v.length && v.length >= 8) || '密码长度必须在8-20个字符之间',
            nick: v => v.length >= 2 || '昵称长度至少为2个字符',
            email: function (email) {
                var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                return re.test(email) || '邮箱格式不正确';
            },
        },

    }),
    head: () => ({
        title: '注册',
    }),
    created() {
        this.$store.commit('navbar', false);
        // 检查注册功能是否开启
        this.$backend('/user/info')
            .then( rsp => {
                if (rsp.err === 'ok' && !rsp.sys.allow.register) {
                // 注册功能已关闭，重定向到登录页面
                    this.$router.push('/login');
                }
            });
    },
    methods: {
        valid: function(v) {
            if ( v.length < 8 ) {
                return '密码长度必须在8-20个字符之间';
            }
            return v == this.password || '两次输入的密码不一致';
        },
        signup: function() {
            if ( ! this.$refs.form.validate() ) {
                return false;
            }

            var data = new URLSearchParams();
            data.append('username', this.username);
            data.append('password', this.password);
            data.append('nickname', this.nickname);
            data.append('email', this.email);
            this.$backend('/user/sign_up', {
                method: 'POST',
                body: data,
            })
                .then( rsp => {
                    if ( rsp.err != 'ok' ) {
                        this.failmsg = rsp.msg;
                    } else {
                        this.$store.commit('navbar', true);
                        this.$router.push('/');
                    }
                });
        }
    },
};
</script>

<style>
.fill-center {
    margin-top: 6%;
}
</style>

