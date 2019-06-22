<template>
    <v-layout row wrap >
        <v-flex xs10 offset-xs1 >
            <v-card>
                <v-card-actions>
                    <v-btn icon @click="show1 = !show1">
                        <v-icon>{{ show1 ? 'keyboard_arrow_down' : 'keyboard_arrow_up' }}</v-icon>
                    </v-btn>
                    <v-card-title>网站基础信息配置</v-card-title>
                </v-card-actions>
                <v-card-text v-show="show1">
                    <v-text-field prepend-icon="person" v-model="site_title" label="网站标题" type="text"></v-text-field>
                    <v-checkbox v-model="enable_secret_login" label="开启私人图书馆模式"></v-checkbox>
                    <template v-if="enable_secret_login">
                        <v-text-field prepend-icon="person" v-model="login_pass" label="私人访问密码" type="text"></v-text-field>
                    </template>
                    <v-checkbox v-model="enable_email_push" label="开启Kindle邮件推送"></v-checkbox>
                    <template v-if="enable_email_push">
                        <v-text-field prepend-icon="person" v-model="smtp_server" label="SMTP服务器" type="text"></v-text-field>
                        <v-text-field prepend-icon="person" v-model="smtp_username" label="用户名" type="text"></v-text-field>
                        <v-text-field prepend-icon="person" v-model="smtp_password" label="密码" type="text"></v-text-field>
                    </template>
                </v-card-text>
            </v-card>


            <v-card>
                <v-card-actions>
                    <v-btn icon @click="show3 = !show3">
                        <v-icon>{{ show3 ? 'keyboard_arrow_down' : 'keyboard_arrow_up' }}</v-icon>
                    </v-btn>
                    <v-card-title>用户管理</v-card-title>
                </v-card-actions>
                <v-card-text v-show="show3">
                    <v-checkbox v-model="enable_local" label="允许游客以邮箱注册账户"></v-checkbox>
                    <template v-if="enable_local">
                        <v-text-field prepend-icon="person" v-model="signup_msg" label="注册欢迎语" type="text"></v-text-field>
                    </template>

                    <v-checkbox v-model="enable_qq" label="允许游客以QQ账号登录"></v-checkbox>
                    <template v-if="enable_qq">
                        <v-text-field prepend-icon="person" v-model="social_auth_qq_key" label="QQ API KEY" type="text"></v-text-field>
                        <v-text-field prepend-icon="person" v-model="social_auth_qq_secret" label="QQ API SECRET" type="text"></v-text-field>
                    </template>

                    <v-checkbox v-model="enable_weibo" label="允许游客以微博账号登录"></v-checkbox>
                    <template v-if="enable_weibo">
                        <v-text-field prepend-icon="person" v-model="social_auth_weibo_key" label="WEIBO API KEY" type="text"></v-text-field>
                        <v-text-field prepend-icon="person" v-model="social_auth_weibo_secret" label="WEIBO API SECRET" type="text"></v-text-field>
                    </template>

                    <v-checkbox v-model="enable_weixin" label="允许游客以微信账号登录"></v-checkbox>
                    <template v-if="enable_weixin">
                        <v-text-field prepend-icon="person" v-model="social_auth_weixin_key" label="WEIXIN API KEY" type="text"></v-text-field>
                        <v-text-field prepend-icon="person" v-model="social_auth_weixin_secret" label="WEIXIN API SECRET" type="text"></v-text-field>
                    </template>

                    <v-checkbox v-model="enable_github" label="允许游客以Github账号登录"></v-checkbox>
                    <template v-if="enable_github">
                        <v-text-field prepend-icon="person" v-model="social_auth_github_key" label="GITHUB API KEY" type="text"></v-text-field>
                        <v-text-field prepend-icon="person" v-model="social_auth_github_secret" label="GITHUB API SECRET" type="text"></v-text-field>
                    </template>

                </v-card-text>
            </v-card>

            <v-card>
                <v-card-actions>
                    <v-btn icon @click="show2 = !show2">
                        <v-icon>{{ show2 ? 'keyboard_arrow_down' : 'keyboard_arrow_up' }}</v-icon>
                    </v-btn>
                    <v-card-title>系统路径配置</v-card-title>
                </v-card-actions>
                <v-card-text v-show="show2">
                    <v-text-field prepend-icon="person" v-model="path_library" label="GITHUB API KEY" type="text"></v-text-field>
                </v-card-text>
            </v-card>
        </v-flex>

        <v-flex xs10 offset-xs1 >
            <br/>
            <div class="text-xs-center">
                <v-btn color="primary" @click="save_settings">保存</v-btn>
            </div>
        </v-flex>
    </v-layout>
</template>

<script>
  export default {
    data: () => ({
        show1: false,
        show2: false,
        show3: false,
        enable_secret_login: false,
        enable_email_push: false,
        enable_local: false,
        enable_qq: false,
        enable_weixin: false,
        enable_weibo: false,
        enable_github: false,
        site_title: "",
        social_auth_github_key: "",
        path_library: "",
    }),
    methods: {
        save_settings: function() {
            alert("test ok");
        },
    },
  }
</script>

<style>

</style>
