<template>
<v-row align-center justify=center>
    <v-col xs=12 sm=8 md=4>
        <v-card class="elevation-12">
            <v-card-title align-center >calibre-webserver: 安装指引</v-card-title>

<v-stepper v-model="e1">
    <v-stepper-header>
        <v-stepper-step :complete="e1 > 1" step="1">网站配置</v-stepper-step>
        <v-divider></v-divider>
        <v-stepper-step :complete="e1 > 2" step="2">用户配置</v-stepper-step>
    </v-stepper-header>

    <v-stepper-items>
        <v-stepper-content step="1">
            <v-card class="mb-5">
                <v-card-text>
                    <v-form>
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
                    </v-form>
                </v-card-text>
            </v-card>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="primary" @click="e1 = 2" >继续</v-btn>
            </v-card-actions>
        </v-stepper-content>

        <v-stepper-content step="2">
            <v-card class="mb-5">
                <v-card-text>
                    <v-form>
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

                    </v-form>
                </v-card-text>
            </v-card>
            <v-card-actions>
                <v-btn color="" @click="e1 = 1" >上一步</v-btn>
                <v-spacer></v-spacer>
                <v-btn @click="do_install" color="primary">完成设置</v-btn>
            </v-card-actions>
        </v-stepper-content>
    </v-stepper-items>
</v-stepper>


        </v-card>
    </v-col>
</v-row>
</template>

<script>
export default {
    created() {
        this.$store.commit("navbar", false);
        this.$store.commit("loaded", true);
    },
    data: () => ({
        e1: 1,
        enable_secret_login: false,
        enable_email_push: false,
        enable_local: false,
        enable_qq: false,
        enable_weixin: false,
        enable_weibo: false,
        enable_github: false,
        drawer: null
    }),
    methods: {
        do_install: function() {
            alert("Test, Install success!");
            this.$store.commit("navbar", true);
            this.$router.push("/");
        },
    },

}
</script>

